#!/usr/bin/env bash
# Run BrandPulse backend + frontend in parallel
# Usage: bash start.sh

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ██████╗ ██████╗  █████╗ ███╗   ██╗██████╗ ██████╗ ██╗   ██╗██╗     ███████╗███████╗"
echo "  ██╔══██╗██╔══██╗██╔══██╗████╗  ██║██╔══██╗██╔══██╗██║   ██║██║     ██╔════╝██╔════╝"
echo "  ██████╔╝██████╔╝███████║██╔██╗ ██║██║  ██║██████╔╝██║   ██║██║     ███████╗█████╗  "
echo "  ██╔══██╗██╔══██╗██╔══██║██║╚██╗██║██║  ██║██╔═══╝ ██║   ██║██║     ╚════██║██╔══╝  "
echo "  ██████╔╝██║  ██║██║  ██║██║ ╚████║██████╔╝██║     ╚██████╔╝███████╗███████║███████╗"
echo ""

# ── Install Python dependencies ──────────────────────────────────────────────
echo "[1/3] Checking Python dependencies…"
pip install fastapi uvicorn --quiet 2>/dev/null || true

# ── Install npm dependencies ──────────────────────────────────────────────────
echo "[2/3] Installing frontend dependencies…"
cd "$ROOT/frontend"
npm install --silent

# ── Start both servers ────────────────────────────────────────────────────────
echo "[3/3] Starting servers…"
echo ""
echo "  → Backend API : http://localhost:8000"
echo "  → React UI    : http://localhost:3000"
echo ""

# Start FastAPI in background
cd "$ROOT/brandpulse"
uvicorn api:app --host 0.0.0.0 --port 8000 --reload &
BACK_PID=$!

# Start Vite dev server
cd "$ROOT/frontend"
npm run dev &
FRONT_PID=$!

# Cleanup on Ctrl-C
trap "kill $BACK_PID $FRONT_PID 2>/dev/null; echo 'Stopped.'" INT TERM
wait
