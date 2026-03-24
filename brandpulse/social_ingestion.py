# WHY: Apify's Instagram Scraper actor gives us real public Instagram posts for any
# hashtag without requiring an Instagram Developer account or app review.
# We fetch posts for TARGET_HASHTAGS + competitor brand names, normalise them
# into our Delta Lake schema, and write NDJSON files to BRONZE_PATH so that
# Auto Loader picks them up exactly the same way as the mock generator did.
# The mock_data_generator is kept as a silent fallback so the demo never breaks.

import json
import os
import re
import time
import uuid
from datetime import datetime, timezone

from config import (
    APIFY_ACTOR_ID,
    APIFY_API_TOKEN,
    APIFY_MEMORY_MBYTES,
    APIFY_RESULTS_PER_HASHTAG,
    BRAND_NAME,
    BRONZE_PATH,
    COMPETITORS,
    STREAM_INTERVAL_SECONDS,
    TARGET_HASHTAGS,
)

# ── Optional dependency ────────────────────────────────────────────────────────
try:
    from apify_client import ApifyClient
    APIFY_AVAILABLE = True
except ImportError:
    APIFY_AVAILABLE = False
    print("[WARN] apify-client not installed. Run:  pip install apify-client")


# ── All hashtags we care about ─────────────────────────────────────────────────
SEARCH_HASHTAGS = TARGET_HASHTAGS + [
    "#GlassSkin", "#ToxicFreeBeauty", "#HeritageSkincare",
    "#AyurvedicSkincare", "#CleanBeauty", "#SkincareRoutine",
    "#GlowUp", "#IndianBeauty",
]

# Strip '#' — Apify expects bare words
_BARE_HASHTAGS = [h.lstrip("#") for h in SEARCH_HASHTAGS]

# Brand keywords for detection (lower-cased)
ALL_BRANDS      = COMPETITORS + [BRAND_NAME]
_BRAND_KEYS     = {b.lower(): b for b in ALL_BRANDS}


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _detect_brand(caption: str, username: str) -> str:
    """
    Scan caption + username for known brand names.
    Returns the matched brand or "Unknown".
    """
    text = f"{caption} {username}".lower()
    for key, brand in _BRAND_KEYS.items():
        if key in text:
            return brand
    return "Unknown"


def _extract_hashtags(caption: str, raw_tags: list) -> list[str]:
    """
    Prefer the hashtags list the scraper already parsed.
    Fall back to regex extraction from caption if list is empty.
    Prefix with '#' and deduplicate.
    """
    if raw_tags:
        tags = [f"#{t.lstrip('#')}" for t in raw_tags if t]
    else:
        tags = [f"#{m}" for m in re.findall(r'#(\w+)', caption or "")]
    return list(dict.fromkeys(tags))[:10]   # deduplicate, cap at 10


def _normalise(raw: dict) -> dict | None:
    """
    Convert one Apify Instagram post record into BrandPulse Delta schema.
    Returns None if the record is missing essential fields.
    """
    caption = (raw.get("caption") or "").strip()
    if not caption or len(caption) < 10:
        return None

    hashtags  = _extract_hashtags(caption, raw.get("hashtags") or [])
    username  = raw.get("ownerUsername") or raw.get("ownerId") or ""
    brand     = _detect_brand(caption, username)

    # Engagement — Instagram does not expose shares via public API
    likes    = int(raw.get("likesCount")    or raw.get("likes")    or 0)
    comments = int(raw.get("commentsCount") or raw.get("comments") or 0)
    # Estimate shares as ~5 % of likes (conservative proxy)
    shares   = max(int(likes * 0.05), 0)

    # Timestamp — Apify returns ISO 8601
    raw_ts = raw.get("timestamp") or raw.get("takenAtTimestamp") or ""
    try:
        ts = datetime.fromisoformat(raw_ts.replace("Z", "+00:00"))
        ts_str = ts.replace(tzinfo=timezone.utc).isoformat()
    except (ValueError, AttributeError):
        ts_str = datetime.utcnow().isoformat()

    return {
        "post_id":       str(raw.get("id") or raw.get("shortCode") or uuid.uuid4()),
        "platform":      "Instagram",
        "brand":         brand,
        "hashtags":      hashtags,
        "caption":       caption[:500],
        "likes":         likes,
        "comments":      comments,
        "shares":        shares,
        "timestamp":     ts_str,
        "is_competitor": brand != BRAND_NAME and brand != "Unknown",
    }


# ══════════════════════════════════════════════════════════════════════════════
# Apify fetcher
# ══════════════════════════════════════════════════════════════════════════════

def fetch_from_apify(hashtags: list[str] | None = None, limit_per_tag: int | None = None) -> list[dict]:
    """
    Run the Apify Instagram Scraper actor for the given hashtags.
    Returns a list of normalised post dicts.

    WHY: Apify handles Instagram's anti-scraping measures, rate limits, and
    session management — we get clean JSON without maintaining cookies or proxies.
    The actor bills per result (~$0.0005/post), so limit_per_tag controls cost.
    """
    if not APIFY_AVAILABLE:
        raise RuntimeError("apify-client not installed.")
    if not APIFY_API_TOKEN or APIFY_API_TOKEN == "YOUR_APIFY_API_TOKEN":
        raise RuntimeError("APIFY_API_TOKEN not set in config.py.")

    tags     = [h.lstrip("#") for h in (hashtags or SEARCH_HASHTAGS)]
    per_tag  = limit_per_tag or APIFY_RESULTS_PER_HASHTAG
    client   = ApifyClient(APIFY_API_TOKEN)

    # WHY: We search by hashtag rather than profile so we capture competitor
    # posts and organic mentions across the full Instagram public feed —
    # not just posts from accounts we follow.
    run_input = {
        "hashtags":          tags,
        "resultsType":       "posts",
        "resultsLimit":      per_tag,
        "addParentData":     False,
        "scrapePostsUntilDate": None,
    }

    print(f"[Apify] Starting actor {APIFY_ACTOR_ID} for {len(tags)} hashtags "
          f"({per_tag} posts each) …")
    t0 = time.time()

    run = client.actor(APIFY_ACTOR_ID).call(
        run_input=run_input,
        memory_mbytes=APIFY_MEMORY_MBYTES,
    )

    elapsed = round(time.time() - t0, 1)
    dataset_id = run.get("defaultDatasetId", "")
    print(f"[Apify] Actor finished in {elapsed}s. Dataset: {dataset_id}")

    posts = []
    for raw in client.dataset(dataset_id).iterate_items():
        normalised = _normalise(raw)
        if normalised:
            posts.append(normalised)

    print(f"[Apify] Fetched {len(posts)} valid posts.")
    return posts


# ══════════════════════════════════════════════════════════════════════════════
# Writer
# ══════════════════════════════════════════════════════════════════════════════

def _write_batch(posts: list[dict], label: str = "") -> str:
    """Write posts as newline-delimited JSON to BRONZE_PATH."""
    os.makedirs(BRONZE_PATH, exist_ok=True)
    ts  = datetime.utcnow().strftime("%Y%m%dT%H%M%S%f")
    tag = f"_{label}" if label else ""
    filename = os.path.join(BRONZE_PATH, f"instagram{tag}_{ts}.json")
    with open(filename, "w", encoding="utf-8") as f:
        for post in posts:
            f.write(json.dumps(post, ensure_ascii=False) + "\n")
    print(f"[Writer] Wrote {len(posts)} posts → {filename}")
    return filename


# ══════════════════════════════════════════════════════════════════════════════
# Public API
# ══════════════════════════════════════════════════════════════════════════════

def ingest_once(hashtags: list[str] | None = None) -> list[dict]:
    """
    Fetch one batch of real Instagram posts and write to BRONZE_PATH.
    Falls back to mock data if Apify is unavailable or credentials are missing.

    WHY: Single-shot ingestion is used by the DLT pipeline startup script and by
    the Databricks Job that runs before each demo to pre-warm the Bronze table.
    """
    try:
        posts = fetch_from_apify(hashtags)
        if posts:
            _write_batch(posts, label="live")
            return posts
        print("[WARN] Apify returned 0 posts. Falling back to mock data.")
    except Exception as exc:
        print(f"[WARN] Apify ingestion failed: {exc}")
        print("[INFO] Falling back to mock_data_generator …")

    # ── Mock fallback ──────────────────────────────────────────────────────────
    from mock_data_generator import generate_batch
    posts = generate_batch()
    _write_batch(posts, label="mock")
    return posts


def stream_forever(interval: int = STREAM_INTERVAL_SECONDS) -> None:
    """
    Continuously ingest real Instagram posts and write to BRONZE_PATH.
    Auto Loader picks up each new file within seconds.

    Interval defaults to STREAM_INTERVAL_SECONDS (5 min) to stay well within
    Apify's free-tier credit limits (~$5/month ≈ 10,000 posts free).
    """
    batch_num = 0
    print(f"[Stream] Starting real-time Instagram ingestion every {interval}s. Ctrl-C to stop.")
    while True:
        batch_num += 1
        print(f"\n[Stream] ── Batch {batch_num} ─────────────────────────────────────")
        posts = ingest_once()
        print(f"[Stream] Batch {batch_num} complete: {len(posts)} posts written.")
        print(f"[Stream] Sleeping {interval}s …")
        time.sleep(interval)


if __name__ == "__main__":
    # Write one batch immediately (so DLT pipeline has data right away)
    print("=== BrandPulse Real-Time Instagram Ingestion ===")
    ingest_once()
    # Then stream continuously
    stream_forever()
