# BrandPulse API — complete flow:
# Brand Setup → Live Trends → Groq Ideas → fal.ai Video → Download

import json
import os
import re
import sys
import time
import uuid
import threading
import httpx
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

sys.path.insert(0, os.path.dirname(__file__))
from config import (
    APIFY_API_TOKEN, APIFY_ACTOR_ID, APIFY_RESULTS_PER_HASHTAG, APIFY_MEMORY_MBYTES,
    FAL_API_KEY, FAL_VIDEO_MODEL, FAL_POLL_INTERVAL, FAL_POLL_TIMEOUT,
    REPLICATE_API_TOKEN, REPLICATE_VIDEO_MODEL,
    GROQ_API_KEY, GROQ_MODEL, GROQ_API_BASE, GROQ_MAX_TOKENS,
)

app = FastAPI(title="BrandPulse API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# ── In-memory stores (persist to JSON for restarts) ───────────────────────────
BRAND_FILE  = os.path.join(os.path.dirname(__file__), "brand_config.json")
video_jobs  = {}   # job_id → {request_id, status, video_url, prompt, idea}

# ── Models ─────────────────────────────────────────────────────────────────────
class BrandConfig(BaseModel):
    name:        str
    tone:        str
    audience:    str
    competitors: list[str]
    hashtags:    list[str]
    industry:    Optional[str] = "Beauty & Skincare"

class GenerateRequest(BaseModel):
    brand:  BrandConfig
    trends: dict   # full trends summary object {posts, top_hashtags, gap_hashtag, …}

class VideoRequest(BaseModel):
    idea:  dict
    brand: BrandConfig

# ── Brand config persistence ───────────────────────────────────────────────────
@app.post("/api/brand")
def save_brand(config: BrandConfig):
    with open(BRAND_FILE, "w") as f:
        json.dump(config.model_dump(), f, indent=2)
    return {"status": "saved", "brand": config.model_dump()}

@app.get("/api/brand")
def get_brand():
    if os.path.exists(BRAND_FILE):
        with open(BRAND_FILE) as f:
            return json.load(f)
    return None

# ── Trend fetching ─────────────────────────────────────────────────────────────
def _fetch_apify(hashtags: list[str]) -> list[dict]:
    try:
        from apify_client import ApifyClient
        if not APIFY_API_TOKEN or APIFY_API_TOKEN == "YOUR_APIFY_API_TOKEN":
            raise ValueError("No Apify token")
        client = ApifyClient(APIFY_API_TOKEN)
        bare   = [h.lstrip("#") for h in hashtags]
        run    = client.actor(APIFY_ACTOR_ID).call(
            run_input={
                "hashtags": bare,
                "resultsType": "posts",
                "resultsLimit": APIFY_RESULTS_PER_HASHTAG,
                "addParentData": False,
            },
            memory_mbytes=APIFY_MEMORY_MBYTES,
        )
        posts = []
        for raw in client.dataset(run["defaultDatasetId"]).iterate_items():
            caption = (raw.get("caption") or "").strip()
            if not caption or len(caption) < 10:
                continue
            raw_tags = raw.get("hashtags") or []
            tags     = [f"#{t.lstrip('#')}" for t in raw_tags if t][:8]
            if not tags:
                tags = [f"#{m}" for m in re.findall(r'#(\w+)', caption)][:8]
            likes    = int(raw.get("likesCount") or 0)
            comments = int(raw.get("commentsCount") or 0)
            posts.append({
                "post_id":    str(raw.get("id") or uuid.uuid4()),
                "platform":   "Instagram",
                "username":   raw.get("ownerUsername") or "unknown",
                "caption":    caption[:300],
                "hashtags":   tags,
                "likes":      likes,
                "comments":   comments,
                "shares":     max(int(likes * 0.05), 0),
                "timestamp":  raw.get("timestamp") or "",
                "thumbnail":  raw.get("displayUrl") or raw.get("previewUrl") or "",
                "post_url":   f"https://instagram.com/p/{raw.get('shortCode','')}" if raw.get("shortCode") else "",
            })
        return posts
    except Exception as e:
        print(f"[Apify] failed: {e}")
        return []

def _mock_trends(hashtags: list[str]) -> list[dict]:
    import random
    captions = [
        "Your skin deserves only the best 🌿 Natural ingredients that actually work. No compromises. Ever.",
        "Glass skin is achievable. Our Vitamin C range makes it real ✨ Shop now.",
        "Ayurvedic wisdom meets modern science. Feel the difference 🌸 Toxin-free formula.",
        "We said NO to parabens before it was cool 💪 Clean beauty that delivers results.",
        "Real ingredients. Real results. Zero toxins 🌱 Your skin will thank you.",
        "Glow from within ☀️ Our new serum is packed with Niacinamide for that glass skin moment.",
        "Heritage ingredients. Future formulas 🏺 Sustainable packaging. Shop the range.",
        "Gen-Z approved ✅ Vitamin C meets innovation. Because you deserve better skincare.",
    ]
    usernames = ["glowwithme.in", "skincarebypriya", "beautyobsessed.ig",
                 "naturalbyheart", "cleanbeautychapter", "radiantindian", "ecobeautylover"]
    posts = []
    for i in range(20):
        ht    = random.choice(hashtags)
        likes = random.randint(500, 45000)
        posts.append({
            "post_id":   str(uuid.uuid4()),
            "platform":  "Instagram",
            "username":  random.choice(usernames),
            "caption":   random.choice(captions),
            "hashtags":  random.sample(hashtags, min(3, len(hashtags))),
            "likes":     likes,
            "comments":  random.randint(20, int(likes * 0.08)),
            "shares":    random.randint(5, int(likes * 0.05)),
            "timestamp": "",
            "thumbnail": "",
            "post_url":  "",
        })
    return posts

def _build_trend_summary(posts: list[dict], brand: BrandConfig) -> dict:
    """Aggregate posts into trend signals for the prompt and UI."""
    from collections import Counter
    all_tags = [t for p in posts for t in p["hashtags"]]
    tag_counts = Counter(all_tags)

    # Engagement per hashtag
    tag_engagement = {}
    for p in posts:
        eng = p["likes"] + p["comments"]
        for t in p["hashtags"]:
            tag_engagement.setdefault(t, []).append(eng)
    tag_avg_eng = {t: int(sum(v)/len(v)) for t, v in tag_engagement.items()}

    # Competitor mentions
    comp_lower = [c.lower() for c in brand.competitors]
    competitor_posts = [p for p in posts if any(c in p["caption"].lower() or c in p["username"].lower() for c in comp_lower)]

    top_tags = sorted(tag_avg_eng.items(), key=lambda x: x[1], reverse=True)

    # Gap: hashtags with no brand mentions but high competitor activity
    brand_lower  = brand.name.lower()
    brand_posts  = [p for p in posts if brand_lower in p["caption"].lower() or brand_lower in p["username"].lower()]
    brand_tags   = {t for p in brand_posts for t in p["hashtags"]}
    gap_tags     = [(t, e) for t, e in top_tags if t not in brand_tags]

    return {
        "posts":          posts[:12],
        "top_hashtags":   [{"tag": t, "avg_engagement": e, "count": tag_counts.get(t, 0)} for t, e in top_tags[:8]],
        "competitor_count": len(competitor_posts),
        "brand_post_count": len(brand_posts),
        "gap_hashtag":    gap_tags[0][0] if gap_tags else (brand.hashtags[0] if brand.hashtags else "#Trending"),
        "gap_engagement": gap_tags[0][1] if gap_tags else 0,
        "total_posts":    len(posts),
    }

@app.post("/api/trends")
def get_trends(brand: BrandConfig):
    hashtags = brand.hashtags or ["#Beauty", "#Skincare"]
    posts    = _fetch_apify(hashtags)
    if not posts:
        posts = _mock_trends(hashtags)
    summary  = _build_trend_summary(posts, brand)
    return summary

# ── Groq content generation ────────────────────────────────────────────────────
def _call_groq(system_prompt: str) -> list[dict]:
    if not GROQ_API_KEY or GROQ_API_KEY == "YOUR_GROQ_API_KEY":
        raise ValueError("GROQ_API_KEY not set")
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": "Generate now. Return ONLY the JSON array."},
        ],
        "max_tokens":  GROQ_MAX_TOKENS,
        "temperature": 0.88,
    }
    resp = requests.post(GROQ_API_BASE, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"].strip()
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
        content = content.strip()
    return json.loads(content)

def _mock_ideas(brand: BrandConfig) -> list[dict]:
    return [
        {
            "caption": f"Your skin is the planet's skin too 🌿 {brand.name}'s clean range — no toxins, no compromises.",
            "hashtags": (brand.hashtags or ["#CleanBeauty"])[:2] + ["#NaturalGlow"],
            "image_prompt": f"Young Indian woman, radiant glowing skin, rooftop garden, golden hour, holding a minimalist serum bottle, 9:16 vertical frame, editorial beauty campaign, earthy tones — terracotta sage ivory.",
            "viral_score": 94,
            "rationale": "Sustainability + authenticity is the dominant Gen-Z value signal right now.",
        },
        {
            "caption": f"Glow is not a filter. It's a ritual 🌸 {brand.name} — science meets nature in every drop.",
            "hashtags": (brand.hashtags or ["#Skincare"])[:2] + ["#GlassSkin"],
            "image_prompt": f"Close-up of glowing Indian skin, single drop of amber serum falling from dropper, marble surface, saffron strands, warm candlelight, macro lens, 9:16 vertical, luxury editorial.",
            "viral_score": 87,
            "rationale": "Ritual-based skincare content consistently outperforms product-push posts by 3x.",
        },
        {
            "caption": f"Real ingredients. Real results 💪 {brand.name} Clean — because your skin deserves honesty.",
            "hashtags": (brand.hashtags or ["#Beauty"])[:2] + ["#SkincareRoutine"],
            "image_prompt": f"Overhead flat lay of {brand.name} products on white marble, eucalyptus leaves, white flowers, bright natural daylight, geometric arrangement, top-down shot, 9:16 vertical, studio photography.",
            "viral_score": 79,
            "rationale": "Ingredient transparency builds long-term brand trust and repeat purchaser loyalty.",
        },
    ]

@app.post("/api/generate")
def generate_ideas(req: GenerateRequest):
    brand  = req.brand
    trends = req.trends

    top_tags = trends.get("top_hashtags", [])
    top_tag  = top_tags[0]["tag"]    if top_tags else (brand.hashtags[0] if brand.hashtags else "#Trending")
    top_eng  = top_tags[0]["avg_engagement"] if top_tags else 0
    rise_tag = top_tags[1]["tag"]    if len(top_tags) > 1 else (brand.hashtags[1] if len(brand.hashtags)>1 else top_tag)
    gap_tag  = trends.get("gap_hashtag", top_tag)
    comp_str = ", ".join(brand.competitors) if brand.competitors else "Competitors"

    prompt = f"""You are the Creative Director for {brand.name} ({brand.industry}).
Brand tone: {brand.tone}
Target audience: {brand.audience}

LIVE Instagram trend data right now:
- Top trending hashtag: {top_tag} (avg {top_eng:,} engagements per post)
- Rising hashtag: {rise_tag}
- Competitor gap: {comp_str} are dominating {gap_tag} — {brand.name} has 0 posts there
- Total posts analysed: {trends.get('total_posts', 0)}

Generate exactly 3 Instagram Reel concepts as a JSON array.
Each concept must be designed to go viral based on the live trend data above.

Rules:
- caption: max 150 chars, punchy, fits brand tone, no generic AI phrases, include 1-2 emojis
- hashtags: array of exactly 3 hashtags, must include {top_tag}
- image_prompt: rich visual direction for AI video generation — describe lighting, talent, colours, mood, props, camera angle, aspect ratio 9:16, motion style
- viral_score: integer 1-100 based on trend alignment
- rationale: one sentence why this will perform based on the data above

Return ONLY a valid JSON array. No markdown, no explanation.
[
  {{"caption":"...","hashtags":["..."],"image_prompt":"...","viral_score":0,"rationale":"..."}},
  ...
]"""

    try:
        ideas = _call_groq(prompt)
        if not isinstance(ideas, list) or len(ideas) < 1:
            raise ValueError("bad response")
        # Validate + fill defaults
        for idea in ideas:
            if not isinstance(idea.get("hashtags"), list):
                idea["hashtags"] = [top_tag]
            idea["viral_score"] = int(idea.get("viral_score") or 80)
        return {"ideas": ideas[:3], "source": "groq"}
    except Exception as e:
        print(f"[Groq] failed: {e} — using mock ideas")
        return {"ideas": _mock_ideas(brand), "source": "mock"}

# ── fal.ai video generation ────────────────────────────────────────────────────
def _fal_headers():
    return {"Authorization": f"Key {FAL_API_KEY}", "Content-Type": "application/json"}

def _poll_fal(job_id: str, request_id: str):
    """Poll fal.ai queue until COMPLETED or FAILED."""
    poll_url = f"https://queue.fal.run/{FAL_VIDEO_MODEL}/requests/{request_id}/status"
    elapsed  = 0
    while elapsed < FAL_POLL_TIMEOUT:
        time.sleep(FAL_POLL_INTERVAL)
        elapsed += FAL_POLL_INTERVAL
        try:
            r      = requests.get(poll_url, headers=_fal_headers(), timeout=15)
            status = r.json().get("status", "UNKNOWN")
            video_jobs[job_id]["fal_status"] = status
            print(f"[fal.ai] {elapsed}s — {status}")
            if status == "COMPLETED":
                res_url   = f"https://queue.fal.run/{FAL_VIDEO_MODEL}/requests/{request_id}"
                res       = requests.get(res_url, headers=_fal_headers(), timeout=15)
                video_url = res.json()["video"]["url"]
                video_jobs[job_id].update({"status": "ready", "video_url": video_url})
                print(f"[fal.ai] ✓ video ready: {video_url[:80]}")
                return
            if status == "FAILED":
                raise RuntimeError("fal.ai returned FAILED status")
        except Exception as e:
            print(f"[fal.ai poll error] {e}")
            break
    video_jobs[job_id].update({"status": "failed", "error": "fal.ai timeout/failed", "is_mock": True})


def _poll_replicate(job_id: str, prediction_id: str):
    """Poll Replicate prediction until succeeded or failed."""
    url     = f"https://api.replicate.com/v1/predictions/{prediction_id}"
    headers = {"Authorization": f"Bearer {REPLICATE_API_TOKEN}", "Content-Type": "application/json"}
    elapsed = 0
    while elapsed < FAL_POLL_TIMEOUT:
        time.sleep(FAL_POLL_INTERVAL)
        elapsed += FAL_POLL_INTERVAL
        try:
            r    = requests.get(url, headers=headers, timeout=15)
            data = r.json()
            st   = data.get("status", "")
            print(f"[Replicate] {elapsed}s — {st}")
            if st == "succeeded":
                output    = data.get("output")
                video_url = output[0] if isinstance(output, list) else output
                video_jobs[job_id].update({"status": "ready", "video_url": video_url})
                print(f"[Replicate] ✓ video ready: {str(video_url)[:80]}")
                return
            if st in ("failed", "canceled"):
                err = data.get("error", "Replicate generation failed")
                raise RuntimeError(err)
        except Exception as e:
            print(f"[Replicate poll error] {e}")
            break
    video_jobs[job_id].update({"status": "failed", "error": "Replicate timeout/failed", "is_mock": True})

@app.post("/api/video")
def start_video(req: VideoRequest, background_tasks: BackgroundTasks):
    idea  = req.idea
    brand = req.brand

    job_id = str(uuid.uuid4())
    enhanced_prompt = (
        f"{idea.get('image_prompt', '')}. "
        f"Brand: {brand.name}. Tone: {brand.tone}. "
        "Vertical 9:16 format for Instagram Reels. Cinematic quality. "
        "Smooth motion. No text overlay. 6 seconds."
    )

    video_jobs[job_id] = {
        "status":    "generating",
        "video_url": None,
        "idea":      idea,
        "brand":     brand.name,
        "prompt":    enhanced_prompt,
        "is_mock":   False,
    }

    # ── Try fal.ai first ──────────────────────────────────────────────────────
    fal_ok = FAL_API_KEY and FAL_API_KEY != "YOUR_FAL_API_KEY"
    rep_ok = REPLICATE_API_TOKEN and REPLICATE_API_TOKEN != "YOUR_REPLICATE_API_TOKEN"

    if fal_ok:
        try:
            print(f"[fal.ai] submitting to {FAL_VIDEO_MODEL} …")
            submit = requests.post(
                f"https://queue.fal.run/{FAL_VIDEO_MODEL}",
                headers=_fal_headers(),
                json={"prompt": enhanced_prompt, "aspect_ratio": "9:16", "duration": "8s"},
                timeout=30,
            )
            print(f"[fal.ai] {submit.status_code} — {submit.text[:200]}")
            if submit.status_code == 403 and "Exhausted balance" in submit.text:
                raise RuntimeError("fal.ai balance exhausted — trying Replicate fallback")
            submit.raise_for_status()
            request_id = submit.json()["request_id"]
            video_jobs[job_id]["request_id"] = request_id
            video_jobs[job_id]["provider"]   = "fal.ai"
            threading.Thread(target=_poll_fal, args=(job_id, request_id), daemon=True).start()
            return {"job_id": job_id, "status": "generating", "provider": "fal.ai"}
        except Exception as e:
            print(f"[fal.ai] failed: {e}")
            video_jobs[job_id]["fal_error"] = str(e)
            # Fall through to Replicate

    # ── Fallback: Replicate ───────────────────────────────────────────────────
    if rep_ok:
        try:
            print(f"[Replicate] submitting {REPLICATE_VIDEO_MODEL} …")
            r = requests.post(
                f"https://api.replicate.com/v1/models/{REPLICATE_VIDEO_MODEL}/predictions",
                headers={"Authorization": f"Bearer {REPLICATE_API_TOKEN}", "Content-Type": "application/json"},
                json={"input": {"prompt": enhanced_prompt, "aspect_ratio": "9:16"}},
                timeout=30,
            )
            print(f"[Replicate] {r.status_code} — {r.text[:200]}")
            r.raise_for_status()
            pred_id = r.json()["id"]
            video_jobs[job_id]["provider"] = "replicate"
            threading.Thread(target=_poll_replicate, args=(job_id, pred_id), daemon=True).start()
            return {"job_id": job_id, "status": "generating", "provider": "replicate"}
        except Exception as e:
            print(f"[Replicate] failed: {e}")
            video_jobs[job_id].update({"status": "failed", "error": str(e), "is_mock": True})
            return {"job_id": job_id, "status": "failed"}

    # ── No keys configured ────────────────────────────────────────────────────
    video_jobs[job_id].update({"status": "no_key", "is_mock": True})

    return {"job_id": job_id, "status": "generating"}

@app.get("/api/video/{job_id}")
def get_video_status(job_id: str):
    job = video_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id":    job_id,
        "status":    job["status"],
        "video_url": job.get("video_url"),
        "is_mock":   job.get("is_mock", False),
        "error":     job.get("error"),
        "fal_status":job.get("fal_status"),
        "idea":      job.get("idea"),
        "brand":     job.get("brand"),
    }

@app.get("/api/download/{job_id}")
def download_video(job_id: str):
    """Proxy the video through our server so the browser download works cross-origin."""
    job = video_jobs.get(job_id)
    if not job or not job.get("video_url"):
        raise HTTPException(status_code=404, detail="Video not ready")
    video_url = job["video_url"]
    brand     = (job.get("brand") or "brandpulse").replace(" ", "_").lower()
    filename  = f"{brand}_reel.mp4"

    def stream():
        with httpx.stream("GET", video_url) as r:
            for chunk in r.iter_bytes(chunk_size=8192):
                yield chunk

    return StreamingResponse(
        stream(),
        media_type="video/mp4",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
