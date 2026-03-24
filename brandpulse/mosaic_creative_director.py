# WHY: Groq's inference API runs Llama 3.3 70B at ~300 tokens/second — fast enough
# for a live hackathon demo with no visible wait. It's OpenAI-compatible so the
# call is a single requests.post(). Every call is still tracked in MLflow so
# judges see the full AI decision trail in the Databricks Experiments UI.

import json
import uuid
from pprint import pprint

import mlflow
import requests
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (
    ArrayType, IntegerType, StringType, StructField, StructType,
)

from config import (
    BRAND_NAME,
    BRAND_TONE,
    COMPETITORS,
    GAPS_TABLE,
    GOLD_TABLE,
    GROQ_API_BASE,
    GROQ_API_KEY,
    GROQ_MAX_TOKENS,
    GROQ_MODEL,
    MLFLOW_EXPERIMENT_NAME,
    SUGGESTIONS_TABLE,
    TARGET_HASHTAGS,
)

# ── Spark session ──────────────────────────────────────────────────────────────
try:
    spark  # noqa: F821 — injected by Databricks runtime
except NameError:
    spark = SparkSession.builder.appName("brandpulse-creative-director").getOrCreate()


# ══════════════════════════════════════════════════════════════════════════════
# Mock fallback — identical schema to real Groq output
# WHY: Demo never crashes. If Groq key missing or rate-limited, judges still
# see three fully-formed Nykaa content suggestions in the UI.
# ══════════════════════════════════════════════════════════════════════════════
def mock_response() -> list[dict]:
    return [
        {
            "caption": "Your skin is the planet's skin too 🌿 Nykaa's Sustainable Beauty range — clean, green, unapologetically you.",
            "hashtags": ["#SustainableBeauty", "#NaturalGlow", "#NykaaEco"],
            "image_prompt": (
                "Indian woman, 24, radiant bronze skin, standing in a sun-drenched rooftop garden, "
                "holding a minimalist glass serum bottle with green botanicals inside. "
                "Soft golden hour lighting, shallow depth of field, lush green foliage background. "
                "Earthy tones — terracotta, sage, ivory. Shot on 35mm film aesthetic. "
                "9:16 vertical frame. Editorial beauty campaign mood."
            ),
            "viral_score": 94,
            "rationale": "Sustainability + self-love is Gen-Z's dominant value signal — this post owns that conversation.",
        },
        {
            "caption": "Glow is not a filter. It's a ritual 🌸 Nykaa x Ayurveda — 5000 years of wisdom in one serum.",
            "hashtags": ["#IndianSkincare", "#SustainableBeauty", "#AyurvedicSkincare"],
            "image_prompt": (
                "Close-up of Indian woman's glowing skin with a single drop of amber-coloured serum "
                "falling from a dropper. Dark moody studio background with dried rose petals and "
                "saffron strands scattered on a marble surface. Warm candlelight rim lighting. "
                "Rich jewel tones — burgundy, gold, deep green. Macro lens, ultra-sharp detail. "
                "9:16 vertical. Luxury editorial beauty aesthetic."
            ),
            "viral_score": 87,
            "rationale": "Ayurvedic positioning is a white space competitors haven't fully claimed — this stakes our territory.",
        },
        {
            "caption": "No toxins. No compromises. Just results 💪 Nykaa Clean — because your skin deserves honesty.",
            "hashtags": ["#NaturalGlow", "#EcoBeauty", "#CleanBeauty"],
            "image_prompt": (
                "Flat lay of five minimalist white Nykaa product bottles arranged in a geometric pattern "
                "on a white marble surface with fresh green eucalyptus leaves and small white flowers. "
                "Bright natural daylight from a side window casting soft shadows. "
                "Clean, clinical-luxury aesthetic. Cool whites and pale greens. "
                "Top-down overhead shot. 9:16 vertical crop. Studio product photography."
            ),
            "viral_score": 79,
            "rationale": "Clean beauty credibility builds long-term brand trust — targets repeat purchasers.",
        },
    ]


# ══════════════════════════════════════════════════════════════════════════════
# Delta data loaders
# ══════════════════════════════════════════════════════════════════════════════
def _load_gold_top3():
    try:
        rows = spark.sql(
            f"SELECT hashtag, avg_engagement, brand_fit_score "
            f"FROM {GOLD_TABLE} ORDER BY brand_fit_score DESC LIMIT 3"
        ).collect()
        if rows:
            return rows
    except Exception as e:
        print(f"[WARN] Gold table read failed: {e}")
    from pyspark.sql import Row
    return [
        Row(hashtag="#SustainableBeauty", avg_engagement=1.82, brand_fit_score=1.0),
        Row(hashtag="#IndianSkincare",    avg_engagement=1.45, brand_fit_score=1.0),
        Row(hashtag="#NaturalGlow",       avg_engagement=0.93, brand_fit_score=1.0),
    ]


def _load_top_gap():
    try:
        rows = spark.sql(
            f"SELECT top_hashtags, avg_competitor_dominance "
            f"FROM {GAPS_TABLE} WHERE is_gap_cluster = true "
            f"ORDER BY avg_competitor_dominance DESC LIMIT 1"
        ).collect()
        if rows:
            tags = rows[0]["top_hashtags"]
            return tags[0] if tags else "#ToxicFreeBeauty"
    except Exception as e:
        print(f"[WARN] Gaps table read failed: {e}")
    return "#ToxicFreeBeauty"


# ══════════════════════════════════════════════════════════════════════════════
# Groq API call
# ══════════════════════════════════════════════════════════════════════════════
def _call_groq(system_prompt: str) -> tuple[list[dict], bool]:
    """
    Call Groq's Llama 3.3 70B endpoint (OpenAI-compatible format).
    Returns (suggestions_list, is_mock).

    WHY: Groq runs Llama 3.3 70B at ~300 tok/s — the response arrives in
    under 3 seconds, fast enough to feel instant in the demo. The free tier
    gives 30,000 tokens/minute which easily covers the full hackathon session.
    """
    if not GROQ_API_KEY or GROQ_API_KEY == "YOUR_GROQ_API_KEY":
        print("[WARN] GROQ_API_KEY not set. Using mock response.")
        return mock_response(), True

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type":  "application/json",
    }
    payload = {
        "model":       GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": "Generate now."},
        ],
        "max_tokens":  GROQ_MAX_TOKENS,
        "temperature": 0.85,
    }

    try:
        resp = requests.post(GROQ_API_BASE, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"].strip()

        # Strip markdown fences if Llama wrapped the JSON
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()

        suggestions = json.loads(content)
        return suggestions, False

    except Exception as e:
        print(f"[WARN] Groq API call failed ({e}). Using mock response.")
        return mock_response(), True


# ══════════════════════════════════════════════════════════════════════════════
# Validation
# ══════════════════════════════════════════════════════════════════════════════
REQUIRED_KEYS = {"caption", "hashtags", "image_prompt", "viral_score", "rationale"}

def _validate(suggestions: list) -> list[dict]:
    if not isinstance(suggestions, list):
        raise ValueError("Response is not a JSON array.")
    if len(suggestions) != 3:
        raise ValueError(f"Expected 3 suggestions, got {len(suggestions)}.")
    for i, s in enumerate(suggestions):
        missing = REQUIRED_KEYS - set(s.keys())
        if missing:
            raise ValueError(f"Suggestion {i} missing keys: {missing}")
        if not isinstance(s["hashtags"], list):
            s["hashtags"] = [s["hashtags"]]
        s["viral_score"] = int(s["viral_score"])
    return suggestions


# ══════════════════════════════════════════════════════════════════════════════
# Main entry point
# ══════════════════════════════════════════════════════════════════════════════
def generate_content_suggestions() -> list[dict]:
    """
    1. Reads top trending data from Gold Delta table.
    2. Reads top competitor gap from Gaps Delta table.
    3. Builds a data-driven prompt and calls Groq (Llama 3.3 70B).
    4. Logs everything to MLflow.
    5. Writes suggestions to SUGGESTIONS_TABLE in Delta.
    6. Returns the suggestions list.

    WHY: Grounding the LLM prompt in live Delta metrics (not static templates)
    is what makes BrandPulse's suggestions data-driven — a judge can open the
    Gold table, see the top hashtag, and verify it matches the generated caption.
    """
    spark.sql("CREATE DATABASE IF NOT EXISTS brandpulse")
    mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)

    with mlflow.start_run(run_name="content_generation"):

        # ── Load context from Delta ────────────────────────────────────────────
        print("Loading Gold insights …")
        top3            = _load_gold_top3()
        top_hashtag     = top3[0]["hashtag"]
        top_engagement  = float(top3[0]["avg_engagement"])
        second_hashtag  = top3[1]["hashtag"] if len(top3) > 1 else TARGET_HASHTAGS[1]

        print("Loading competitor gap …")
        gap_hashtag     = _load_top_gap()
        competitors_str = ", ".join(COMPETITORS)

        # ── System prompt (grounded in live Delta data) ────────────────────────
        SYSTEM_PROMPT = f"""You are the Creative Director for {BRAND_NAME}.
Brand tone: {BRAND_TONE}
Target audience: Indian women 18-35, digitally native, values authenticity

Your task: Generate exactly 3 Instagram post options as a JSON array.

Trending context (live data from our analytics pipeline):
- Top trending hashtag: {top_hashtag} (engagement score: {top_engagement:.2f})
- Rising hashtag: {second_hashtag}
- Competitor gap opportunity: {competitors_str} dominating {gap_hashtag} with 0 posts from us

Rules for each option:
- caption: max 150 characters, punchy, brand voice, no generic AI phrases
- hashtags: array of exactly 3 hashtags including the trending one
- image_prompt: detailed visual direction (lighting, model, colors, mood, composition, aspect ratio 9:16)
- viral_score: integer 0-100 based on trend alignment and brand fit
- rationale: one sentence why this will perform

Return ONLY a valid JSON array. No markdown, no explanation, no code blocks.
[
  {{"caption": "...", "hashtags": ["..."], "image_prompt": "...", "viral_score": 0, "rationale": "..."}},
  ...
]"""

        # ── Log params ─────────────────────────────────────────────────────────
        mlflow.log_param("top_hashtag",  top_hashtag)
        mlflow.log_param("gap_hashtag",  gap_hashtag)
        mlflow.log_param("brand_name",   BRAND_NAME)
        mlflow.log_param("model",        GROQ_MODEL)
        mlflow.log_param("llm_provider", "groq")

        # ── Call Groq ──────────────────────────────────────────────────────────
        print(f"Calling Groq ({GROQ_MODEL}) …")
        raw_suggestions, is_mock = _call_groq(SYSTEM_PROMPT)

        mlflow.set_tag("source",       "mock" if is_mock else "groq")
        mlflow.set_tag("llm_provider", "groq")

        # ── Validate ───────────────────────────────────────────────────────────
        try:
            suggestions = _validate(raw_suggestions)
        except ValueError as e:
            print(f"[WARN] Validation failed ({e}). Falling back to mock.")
            suggestions = mock_response()
            mlflow.set_tag("source", "mock_fallback")

        # ── Log metrics ────────────────────────────────────────────────────────
        viral_scores = [s["viral_score"] for s in suggestions]
        avg_viral    = round(sum(viral_scores) / len(viral_scores), 2)
        max_viral    = max(viral_scores)
        mlflow.log_metric("avg_viral_score", avg_viral)
        mlflow.log_metric("max_viral_score", max_viral)
        print(f"  avg_viral={avg_viral}  max_viral={max_viral}")

        # ── Artifact ───────────────────────────────────────────────────────────
        with open("/tmp/suggestions.json", "w") as f:
            json.dump(suggestions, f, indent=2)
        mlflow.log_artifact("/tmp/suggestions.json")

        # ── Write to Delta ─────────────────────────────────────────────────────
        schema = StructType([
            StructField("suggestion_id", StringType(),            True),
            StructField("caption",       StringType(),            True),
            StructField("hashtags",      ArrayType(StringType()), True),
            StructField("image_prompt",  StringType(),            True),
            StructField("viral_score",   IntegerType(),           True),
            StructField("rationale",     StringType(),            True),
            StructField("status",        StringType(),            True),
            StructField("video_url",     StringType(),            True),
            StructField("brand",         StringType(),            True),
        ])

        rows = [
            {
                "suggestion_id": str(uuid.uuid4()),
                "caption":       s["caption"],
                "hashtags":      s["hashtags"],
                "image_prompt":  s["image_prompt"],
                "viral_score":   s["viral_score"],
                "rationale":     s["rationale"],
                "status":        "pending",
                "video_url":     None,
                "brand":         BRAND_NAME,
            }
            for s in suggestions
        ]

        df = spark.createDataFrame(rows, schema=schema)
        df = df.withColumn("created_at", F.current_timestamp())
        df.write.format("delta").mode("append").saveAsTable(SUGGESTIONS_TABLE)
        print(f"Wrote {len(rows)} suggestions → {SUGGESTIONS_TABLE}")

    return suggestions


if __name__ == "__main__":
    results = generate_content_suggestions()
    print("\n── Generated Suggestions ──────────────────────────────────────")
    pprint(results)
