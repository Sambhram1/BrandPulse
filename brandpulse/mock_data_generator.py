# WHY: Spark Structured Streaming needs a continuous file source to demo real-time
# ingestion into Delta Lake Bronze. This generator simulates a live social API feed
# by writing JSON batches to BRONZE_PATH, which Auto Loader picks up automatically.

import json
import os
import random
import time
import uuid
from datetime import datetime, timedelta

from config import (
    BRAND_NAME,
    COMPETITORS,
    STREAM_BATCH_SIZE,
    STREAM_INTERVAL_SECONDS,
    TARGET_HASHTAGS,
    BRONZE_PATH,
)

# ── Hashtag pool ───────────────────────────────────────────────────────────────
HASHTAG_POOL = TARGET_HASHTAGS + [
    "#GlassSkin",
    "#ToxicFreeBeauty",
    "#HeritageSkincare",
    "#AyurvedicSkincare",
    "#CleanBeauty",
    "#SkincareRoutine",
    "#GlowUp",
    "#IndianBeauty",
]

# ── Realistic caption templates ────────────────────────────────────────────────
# WHY: Varied captions give the TF-IDF vectoriser in Spark ML meaningful signal
# to cluster content into competitor gap themes.
CAPTION_TEMPLATES = [
    "Your skin deserves only the best 🌿 {ingredient} powered formula for a natural {result}. No compromises. Ever.",
    "We said NO to {bad_thing} before it was cool. {brand_adj} skincare that actually works for Indian skin ✨",
    "Glow from within 🌸 Our {product} is packed with {ingredient} to give you that glass skin moment every day.",
    "Indian skin has its own rules. We play by them 💛 {ingredient}-rich {product} now available. Link in bio.",
    "Why settle for less? {brand_adj} formula. {result}. {ingredient} goodness in every drop. Shop now 🌱",
    "Real ingredients. Real results. Zero toxins 🧪 Meet our new {product} — your skin will thank you.",
    "Gen-Z approved ✅ {ingredient} meets innovation in our latest {product}. Because you deserve better.",
    "Radiance isn't a filter — it's a routine 🌞 {brand_adj} {product} with {ingredient} for that lit-from-within glow.",
    "Your skin, your rules. Our {product} respects that 💪 {ingredient}-infused, {result}, cruelty-free.",
    "The {result} you've been chasing? It's finally here 🙌 {ingredient} + {brand_adj} formula = your new holy grail.",
]

INGREDIENTS = [
    "Niacinamide", "Vitamin C", "Hyaluronic Acid", "Retinol", "Turmeric",
    "Rose Hip", "Bakuchiol", "Saffron", "Ashwagandha", "Aloe Vera",
]
RESULTS = [
    "glow", "radiance", "clarity", "hydration", "brightness",
    "even skin tone", "smooth texture", "pore-minimizing finish",
]
PRODUCTS = [
    "serum", "face oil", "moisturiser", "toner", "under-eye cream",
    "sunscreen", "face mist", "exfoliator", "sleeping mask", "lip balm",
]
BAD_THINGS = [
    "parabens", "sulphates", "synthetic fragrances", "harmful chemicals",
    "animal testing", "microplastics", "mineral oil",
]
BRAND_ADJS = [
    "dermatologist-tested", "clinically proven", "toxin-free",
    "Ayurvedic", "plant-powered", "science-backed", "eco-conscious",
]

PLATFORMS = ["Instagram", "X"]
ALL_BRANDS = COMPETITORS + [BRAND_NAME]


def _random_caption() -> str:
    """Pick a random template and fill placeholders with realistic values."""
    template = random.choice(CAPTION_TEMPLATES)
    caption = template.format(
        ingredient=random.choice(INGREDIENTS),
        result=random.choice(RESULTS),
        product=random.choice(PRODUCTS),
        bad_thing=random.choice(BAD_THINGS),
        brand_adj=random.choice(BRAND_ADJS),
    )
    # Trim to 150 chars max to stay realistic
    return caption[:150]


def _random_timestamp() -> str:
    """Return an ISO timestamp within the last 24 hours."""
    seconds_ago = random.randint(0, 86400)
    ts = datetime.utcnow() - timedelta(seconds=seconds_ago)
    return ts.isoformat()


def generate_batch(n: int = STREAM_BATCH_SIZE) -> list[dict]:
    """
    WHY: Generates n synthetic social posts. The schema mirrors what real Instagram /
    X APIs return so the DLT Bronze Auto Loader schema inference works without changes.
    """
    posts = []
    for _ in range(n):
        brand = random.choice(ALL_BRANDS)
        num_tags = random.randint(2, 4)
        hashtags = random.sample(HASHTAG_POOL, num_tags)

        post = {
            "post_id": str(uuid.uuid4()),
            "platform": random.choice(PLATFORMS),
            "brand": brand,
            "hashtags": hashtags,
            "caption": _random_caption(),
            "likes": random.randint(100, 50000),
            "comments": random.randint(10, 5000),
            "shares": random.randint(5, 2000),
            "timestamp": _random_timestamp(),
            "is_competitor": brand != BRAND_NAME,
        }
        posts.append(post)
    return posts


def write_single_batch() -> None:
    """
    WHY: Writes one batch immediately so the DLT pipeline / tests can be run
    without waiting for the streaming interval.
    """
    os.makedirs(BRONZE_PATH, exist_ok=True)
    batch = generate_batch()
    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    filename = os.path.join(BRONZE_PATH, f"batch_{ts}.json")
    with open(filename, "w") as f:
        # Auto Loader expects newline-delimited JSON (one record per line)
        for post in batch:
            f.write(json.dumps(post) + "\n")
    print(f"Wrote batch {ts} with {len(batch)} posts → {filename}")


def simulate_stream() -> None:
    """
    WHY: Continuously writes batches at STREAM_INTERVAL_SECONDS to simulate a live
    social API feed. Auto Loader detects new files and processes them incrementally,
    demonstrating Spark Structured Streaming's micro-batch ingestion into Delta Lake.
    """
    os.makedirs(BRONZE_PATH, exist_ok=True)
    batch_num = 0
    print(f"Starting stream simulation — batch every {STREAM_INTERVAL_SECONDS}s. Ctrl-C to stop.")
    while True:
        batch_num += 1
        batch = generate_batch()
        ts = datetime.utcnow().strftime("%Y%m%dT%H%M%S%f")
        filename = os.path.join(BRONZE_PATH, f"batch_{ts}.json")
        with open(filename, "w") as f:
            for post in batch:
                f.write(json.dumps(post) + "\n")
        print(f"Wrote batch {batch_num} with {len(batch)} posts → {filename}")
        time.sleep(STREAM_INTERVAL_SECONDS)


if __name__ == "__main__":
    # WHY: Write one immediate batch so judges can trigger the DLT pipeline right away,
    # then keep streaming so the Live indicator in the App stays active.
    write_single_batch()
    simulate_stream()
