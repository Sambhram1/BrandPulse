# WHY: Centralized config — all secrets loaded from .env (never hardcoded).
# Non-secret constants stay here so every module imports from one place.

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from repo root (one level up from this file)
load_dotenv(Path(__file__).parent.parent / ".env")

# ── Brand Identity ─────────────────────────────────────────────────────────────
BRAND_NAME = "Nykaa"
BRAND_TONE = "Bold, Gen-Z, Inclusive, Empowering"
TARGET_HASHTAGS = ["#SustainableBeauty", "#IndianSkincare", "#NaturalGlow", "#EcoBeauty"]
COMPETITORS = ["Mamaearth", "Plum", "Minimalist", "Dot&Key"]

# ── Databricks ─────────────────────────────────────────────────────────────────
DATABRICKS_WORKSPACE_URL = os.environ.get("DATABRICKS_WORKSPACE_URL", "")
DATABRICKS_TOKEN         = os.environ.get("DATABRICKS_TOKEN", "")

# ── Groq API ───────────────────────────────────────────────────────────────────
GROQ_API_KEY    = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL      = "llama-3.3-70b-versatile"
GROQ_API_BASE   = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MAX_TOKENS = 1000

# ── fal.ai ─────────────────────────────────────────────────────────────────────
FAL_API_KEY       = os.environ.get("FAL_API_KEY", "")
FAL_VIDEO_MODEL   = "fal-ai/veo3"
FAL_VIDEO_DURATION = 6
FAL_POLL_INTERVAL = 5
FAL_POLL_TIMEOUT  = 300

# ── Replicate (fallback) ───────────────────────────────────────────────────────
REPLICATE_API_TOKEN   = os.environ.get("REPLICATE_API_TOKEN", "")
REPLICATE_VIDEO_MODEL = "minimax/video-01"

# ── Apify ──────────────────────────────────────────────────────────────────────
APIFY_API_TOKEN           = os.environ.get("APIFY_API_TOKEN", "")
APIFY_ACTOR_ID            = "apify/instagram-scraper"
APIFY_RESULTS_PER_HASHTAG = 10
APIFY_MEMORY_MBYTES       = 512

# ── Delta Lake ─────────────────────────────────────────────────────────────────
DELTA_DATABASE     = "brandpulse"
BRONZE_PATH        = "/tmp/brandpulse/bronze/"
SILVER_TABLE       = "brandpulse.silver_trend_metrics"
GOLD_TABLE         = "brandpulse.gold_brand_insights"
GAPS_TABLE         = "brandpulse.competitor_gaps"
SUGGESTIONS_TABLE  = "brandpulse.content_suggestions"

# ── MLflow ─────────────────────────────────────────────────────────────────────
MLFLOW_EXPERIMENT_NAME = "/brandpulse/creative-director"

# ── Streaming ──────────────────────────────────────────────────────────────────
STREAM_BATCH_SIZE        = 20
STREAM_INTERVAL_SECONDS  = 300
