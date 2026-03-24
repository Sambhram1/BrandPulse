# BrandPulse — Autonomous AI Influencer Strategist with Live Video Generation

> **One-line pitch:** BrandPulse ingests real-time social trends into Delta Lake, finds competitor content gaps with Spark ML, writes Instagram captions with Mosaic AI Llama 3, and generates a live 6-second video reel the moment a human approves — all inside Databricks.

---

## The Problem

Meet Priya.

Priya is a senior brand manager at Nykaa. Every Monday morning she opens 14 browser tabs — Instagram, X, Google Trends, three competitor feeds, two agency Slack channels — and spends three hours manually figuring out which hashtag is trending, whether Mamaearth just posted something Nykaa should respond to, and what the creative brief for this week's reel should say.

By Wednesday, the brief is ready. By Friday, it's reviewed. The video shoots the following week. By the time Nykaa's content goes live, the trend has peaked, the competitor has already captured the conversation, and Priya is back at her 14 tabs starting over.

**BrandPulse gives Priya her Monday mornings back.** The moment a trend spikes, the pipeline fires, a competitor gap is detected, three campaign options are drafted by Llama 3, and — on Priya's single click of Approve — a real Instagram-ready video reel is generated and logged. Total time from trend to video: under 10 minutes.

---

## Architecture

```
Social APIs (simulated)
        │
        ▼
[Auto Loader — Spark Structured Streaming]
        │  JSON batches land in BRONZE_PATH
        ▼
Bronze Delta Table  ←  @dlt.expect quality gates
(raw_social_posts)
        │
        ▼
[DLT Pipeline — Silver transform]
  • explode hashtags       • engagement_rate
  • sentiment UDF          • hour_of_day
        │
        ▼
Silver Delta Table
(cleaned_trend_metrics)
        │
        ▼
[DLT Pipeline — Gold aggregation]
  • competitor_dominance   • brand_fit_score
  • opportunity_gap        • trend_velocity
        │
        ▼
Gold Delta Table
(brand_insights)
        │
        ├──────────────────────────────────────────┐
        ▼                                          ▼
[Spark ML Job]                          [Mosaic AI — Llama 3]
 TF-IDF + KMeans                         Reads Gold + Gaps
 Competitor gap clusters                 Generates 3 captions
 MLflow tracked                          + image prompts
        │                                          │
        ▼                                          ▼
Gaps Delta Table              Suggestions Delta Table
(competitor_gaps)             (content_suggestions)
                                         │
                                         ▼
                              [Databricks App — Dash]
                               Human-in-the-loop UI
                               Approve / Tweak / Reject
                                         │
                                   (on Approve)
                                         ▼
                              [fal.ai Veo3 API]
                               6-second video reel
                               generated async
                                         │
                                         ▼
                              Video URL → Delta Table
                                         │
                                         ▼
                              App shows live video player
```

---

## Databricks Features — Why Each One Is Essential

| Databricks Feature | Why it's essential (not just what it does) |
|---|---|
| **Delta Lake** | Every table — Bronze, Silver, Gold, Gaps, Suggestions — uses Delta format. ACID transactions mean the App and the ML job read consistent snapshots simultaneously without locking. Time travel lets judges replay any historical state. |
| **Delta Live Tables (DLT)** | Declarative Bronze → Silver → Gold pipeline with `@dlt.expect` data quality enforcement. DLT handles incremental processing, retries, and lineage automatically — no custom orchestration code needed. |
| **Spark Structured Streaming** | Auto Loader (`cloudFiles`) ingests JSON batches from object storage with exactly-once semantics. `read_stream` propagates micro-batch processing end-to-end from Bronze through Silver so every new social post flows through enrichment in real time. |
| **Spark ML** | KMeans + TF-IDF pipeline runs natively on Delta DataFrames — no data movement, no serialisation overhead. Scales to millions of posts without code changes. The Pipeline API chains all transforms into a single reusable, MLflow-loggable artifact. |
| **MLflow** | Every ML run, every Mosaic AI call, every human approval and rejection is tracked. Judges can browse the Experiment UI and see the full decision trail — making BrandPulse auditable and reproducible, not a black box. |
| **Mosaic AI Model Serving** | Llama 3 runs inside the Databricks security perimeter — brand data never leaves the workspace. The endpoint auto-scales to zero between demo runs, costs nothing idle, and is governed by workspace IAM. |
| **Databricks Apps (Dash)** | The UI runs inside Databricks — it calls `spark.sql()` directly on Delta tables without an external backend, API layer, or egress cost. Workspace IAM governs who can approve content. |
| **Unity Catalog** | All Delta tables are registered in the `brandpulse` database, making them discoverable, governable, and shareable across the workspace without path management. |

---

## Setup in 5 Steps

### Step 1 — Configure credentials

Edit `config.py` and replace the three placeholder values:

```python
DATABRICKS_WORKSPACE_URL = "https://<your-workspace>.azuredatabricks.net"
MOSAIC_TOKEN             = "<your-databricks-personal-access-token>"
FAL_API_KEY              = "<your-fal-ai-api-key>"
```

### Step 2 — Generate mock data and start the stream

```bash
# From the Databricks workspace terminal or a local shell with BRONZE_PATH mounted
python brandpulse/mock_data_generator.py
```

This writes one batch immediately, then streams a new batch every 30 seconds into `BRONZE_PATH`.

### Step 3 — Run the DLT pipeline

1. In Databricks UI → **Workflows → Delta Live Tables → Create Pipeline**
2. Set **Source code** to `brandpulse/dlt_pipeline.py`
3. Set **Target schema** to `brandpulse`
4. Click **Start** — Bronze → Silver → Gold tables appear in the pipeline graph

### Step 4 — Run the ML gap detection job

```bash
# As a Databricks Job or in a notebook cell:
%run brandpulse/spark_ml_gaps
# or
python brandpulse/spark_ml_gaps.py
```

MLflow experiment `/brandpulse/creative-director` will show the run with silhouette score and cluster summary artifact.

### Step 5 — Generate suggestions and launch the App

```bash
# Generate AI content suggestions (writes to brandpulse.content_suggestions)
python brandpulse/mosaic_creative_director.py

# Launch the Databricks App
python brandpulse/app.py
# Open http://localhost:8050  (or the Databricks Apps URL in production)
```

---

## Demo Script — What to Say and Click in 5 Minutes

### Minute 1 — The Problem (narrative)
> "Priya, our brand manager, spends every Monday in 14 browser tabs figuring out what to post. By the time content goes live, the trend has moved on. BrandPulse solves this in three layers — data, AI, and human approval."

**Show:** The running `mock_data_generator.py` terminal — point out JSON batches landing in real time.

### Minute 2 — The Data Pipeline
> "Auto Loader picks up every new social post into our Bronze Delta table. DLT enforces quality — posts without captions are dropped before they pollute our analytics. The Silver layer explodes hashtags and scores sentiment. Gold aggregates competitor dominance per hashtag."

**Show:** DLT pipeline graph in Databricks UI — Bronze → Silver → Gold with green quality indicators. Click on a table, show the Delta history (time travel).

### Minute 3 — The Intelligence
> "Spark ML runs TF-IDF plus KMeans to cluster hashtag content territories. This cluster — [point to gap cluster] — is 74% owned by Mamaearth and Plum with zero posts from Nykaa. That's the gap we're about to fill."

**Show:** MLflow Experiment UI — open the `competitor_gap_detection` run, show silhouette score metric, open `cluster_summary.json` artifact.

### Minute 4 — The AI Creative Director
> "We feed that gap signal plus the top trending hashtag into Mosaic AI Llama 3, running inside our Databricks workspace. It returns three Instagram post options — ranked by a viral score it calculates based on trend alignment. Every call is logged in MLflow."

**Show:** The Databricks App at `localhost:8050`. Point to the amber gap alert. Show the three suggestion cards with viral scores 94, 87, 79. Click "Show prompt" on card 1 to reveal the image direction.

### Minute 5 — The Moment of Truth
> "Priya reviews the options and clicks Approve."

**Click:** "✓ Approve + Generate Video" on the highest-scored card.

> "BrandPulse calls fal.ai Veo3 — an AI video model — with the image prompt. The video URL is written back to our Delta table. Thirty seconds later, the card refreshes and shows a live, playable Instagram reel. From trend spike to approved video: under 10 minutes."

**Show:** Video player appearing in the card. Open MLflow and show the `video_gen_*` run with `generation_time_seconds` metric. Show the `brandpulse.content_suggestions` Delta table in the Databricks UI — the `video_url` and `status='video_ready'` columns.

> "Every approval and rejection feeds back into the next generation cycle — you can see that in the Model Learning chart at the bottom. BrandPulse gets smarter with every campaign."

---

## MLflow Experiment Structure

Judges will see this in **Experiments → /brandpulse/creative-director**:

```
/brandpulse/creative-director
├── Run: competitor_gap_detection
│   ├── Params:  n_clusters=5, model=kmeans_tfidf, input_rows=N
│   ├── Metrics: silhouette_score=0.XXXX, n_gap_clusters=N
│   └── Artifact: cluster_summary.json
│       └── [{"cluster_id": 0, "top_hashtags": [...], "is_gap_cluster": true}, ...]
│
├── Run: content_generation
│   ├── Params:  top_hashtag=#SustainableBeauty, gap_hashtag=#ToxicFreeBeauty,
│   │            brand_name=Nykaa, model=brandpulse-llama3
│   ├── Metrics: avg_viral_score=86.67, max_viral_score=94
│   ├── Tags:    source=mosaic_ai  (or "mock" if endpoint unavailable)
│   └── Artifact: suggestions.json
│       └── [{"caption": "...", "viral_score": 94, ...}, ...]
│
├── Run: approve_<suggestion_id>
│   ├── Params:  suggestion_id=<uuid>
│   ├── Metrics: approved=1
│   └── Tags:    action=approve
│
├── Run: video_gen_<suggestion_id>
│   ├── Params:  suggestion_id=<uuid>, model=fal-ai/veo3, prompt=<first 100 chars>
│   ├── Metrics: generation_time_seconds=42.3, poll_attempts=8
│   ├── Params:  video_url=https://...
│   └── Tags:    source=fal_ai, status=success
│
└── Run: reject_<suggestion_id>
    ├── Params:  suggestion_id=<uuid>, reason=Wrong tone
    ├── Metrics: rejected=1
    └── Tags:    action=reject
```

---

## File Structure

```
brandpulse/
├── config.py                   # All credentials and constants — single source of truth
├── mock_data_generator.py      # Simulates live social API feed → BRONZE_PATH
├── dlt_pipeline.py             # DLT Bronze → Silver → Gold pipeline
├── spark_ml_gaps.py            # Spark ML KMeans + TF-IDF competitor gap detection
├── mosaic_creative_director.py # Mosaic AI Llama 3 caption + image prompt generation
├── video_generator.py          # fal.ai Veo3 async video generation
├── feedback_logger.py          # Human approval/rejection → Delta + MLflow
├── app.py                      # Databricks App (Dash) — human-in-the-loop UI
└── README.md                   # This file
```

---

## Scoring Alignment

| Criterion | How BrandPulse scores |
|---|---|
| **Databricks Usage (30%)** | Delta Lake (all 5 tables), DLT (3-layer pipeline with quality gates), Spark Structured Streaming (Auto Loader), Spark ML (Pipeline + KMeans + TF-IDF), MLflow (every run logged), Mosaic AI (Llama 3 endpoint), Databricks Apps |
| **Accuracy (25%)** | Competitor dominance calculated from real post-level data; sentiment UDF on actual captions; silhouette score validates cluster quality; mock fallbacks are schema-identical to live data |
| **Innovation (25%)** | Full trend-to-video loop inside a single Databricks workspace; human-in-the-loop governance with MLflow audit trail; fal.ai Veo3 integration for generative video; feedback closes the RLHF loop |
| **Demo (20%)** | App works offline with mock data; video player always shows a real MP4; 5-minute script hits every judge touchpoint; MLflow UI shows live experiment data |
