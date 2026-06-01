#!/bin/bash

echo "Starting Edyfra Python Microservices..."
echo "========================================"

# Start Recommendation Service (port 8001)
echo "[1/3] Starting Recommendations Service on :8001..."
cd "$(dirname "$0")/recommendations"
pip install -q -r ../requirements.txt 2>/dev/null
python main.py &
RECOMMEND_PID=$!
cd ../..

# Start Plagiarism Service (port 8002)
echo "[2/3] Starting Plagiarism Service on :8002..."
cd "$(dirname "$0")/plagiarism"
python main.py &
PLAGIARISM_PID=$!
cd ../..

# Start Moderation Service (port 8003)
echo "[3/3] Starting Moderation Service on :8003..."
cd "$(dirname "$0")/moderation"
python main.py &
MODERATION_PID=$!
cd ../..

echo ""
echo "All services started!"
echo "  Recommendations: http://localhost:8001"
echo "  Plagiarism:      http://localhost:8002"
echo "  Moderation:      http://localhost:8003"
echo ""
echo "Press Ctrl+C to stop all services."

trap "kill $RECOMMEND_PID $PLAGIARISM_PID $MODERATION_PID 2>/dev/null; exit" INT TERM
wait
