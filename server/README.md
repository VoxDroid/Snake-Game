# TikTok Live Event Forwarder (local)

This small server connects to a TikTok Live stream (via `tiktok-live-connector`) and forwards gift events to WebSocket clients.

Quick start:

1. cd server
2. npm install
3. TIKTOK_USERNAME=izenovis npm start
4. In the browser client, connect to ws://localhost:4000 (the app will try that URL by default)

For local testing you can POST /simulate with JSON { "tier": 2 } to broadcast a synthetic gift.
