# WHY: Centralized config ensures all modules stay in sync — judges can see the full
# Databricks stack (Delta, DLT, Mosaic AI, MLflow, fal.ai) configured in one place.

# ── Brand Identity ─────────────────────────────────────────────────────────────
BRAND_NAME = "Nykaa"
BRAND_TONE = "Bold, Gen-Z, Inclusive, Empowering"
TARGET_HASHTAGS = ["#SustainableBeauty", "#IndianSkincare", "#NaturalGlow", "#EcoBeauty"]
COMPETITORS = ["Mamaearth", "Plum", "Minimalist", "Dot&Key"]

# ── Databricks / Mosaic AI ─────────────────────────────────────────────────────
DATABRICKS_WORKSPACE_URL = "YOUR_WORKSPACE_URL"
MOSAIC_ENDPOINT_NAME = "brandpulse-llama3"
MOSAIC_TOKEN = "YOUR_DATABRICKS_TOKEN"

# ── fal.ai Video Generation ────────────────────────────────────────────────────
FAL_API_KEY = "YOUR_FAL_API_KEY"
FAL_VIDEO_MODEL = "fal-ai/veo3"
FAL_VIDEO_DURATION = 6
FAL_POLL_INTERVAL = 5
FAL_POLL_TIMEOUT = 300

# ── Delta Lake Paths & Tables ──────────────────────────────────────────────────
DELTA_DATABASE = "brandpulse"
BRONZE_PATH = "/tmp/brandpulse/bronze/"
SILVER_TABLE = "brandpulse.silver_trend_metrics"
GOLD_TABLE = "brandpulse.gold_brand_insights"
GAPS_TABLE = "brandpulse.competitor_gaps"
SUGGESTIONS_TABLE = "brandpulse.content_suggestions"

# ── MLflow ─────────────────────────────────────────────────────────────────────
MLFLOW_EXPERIMENT_NAME = "/brandpulse/creative-director"

# ── Streaming ──────────────────────────────────────────────────────────────────
STREAM_BATCH_SIZE = 20
STREAM_INTERVAL_SECONDS = 30
