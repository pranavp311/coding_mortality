#!/bin/bash

# ╔═════════════════════════════════════╗
# ║     CONTINUUM SYSTEMS LAUNCHER      ║
# ║     Your Legacy, Optimized          ║
# ╚═════════════════════════════════════╝

cd "$(dirname "$0")"

# Kill anything on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Kill any existing cloudflared tunnels
pkill -f "cloudflared tunnel" 2>/dev/null
sleep 1

# Start cloudflared in background, capture the URL
TUNNEL_LOG=$(mktemp)
cloudflared tunnel --url http://localhost:3000 2>&1 | tee "$TUNNEL_LOG" &
TUNNEL_PID=$!

# Wait for the tunnel URL to appear
echo "⏳ Waiting for Cloudflare tunnel..."
TUNNEL_URL=""
for i in $(seq 1 30); do
  TUNNEL_URL=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$TUNNEL_LOG" | head -1)
  if [ -n "$TUNNEL_URL" ]; then
    break
  fi
  sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
  echo "❌ Failed to get tunnel URL after 30s. Check your internet connection."
  kill $TUNNEL_PID 2>/dev/null
  rm "$TUNNEL_LOG"
  exit 1
fi

echo ""
echo "✅ Tunnel ready: $TUNNEL_URL"
echo ""

# Start the server with the tunnel URL
HOST_URL="$TUNNEL_URL" node server/index.js &
SERVER_PID=$!
sleep 1

echo ""
echo "════════════════════════════════════════════════"
echo "  PRESENTER: http://localhost:3000/presenter"
echo "  PLAYERS:   $TUNNEL_URL/play"
echo "════════════════════════════════════════════════"
echo ""
echo "  Press Ctrl+C to stop everything."
echo ""

rm "$TUNNEL_LOG"

# Cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $SERVER_PID 2>/dev/null
  kill $TUNNEL_PID 2>/dev/null
  lsof -ti:3000 | xargs kill -9 2>/dev/null
  pkill -f "cloudflared tunnel" 2>/dev/null
  echo "Done."
  exit 0
}

trap cleanup INT TERM

# Keep running until Ctrl+C
wait
