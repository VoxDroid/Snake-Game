/*
 Simple server that connects to TikTok Live (via tiktok-live-connector) for a username
 and forwards gift events to WebSocket clients.

 Usage:
 1) cd server && npm install
 2) TIKTOK_USERNAME=izenovis node index.js
 3) Client connects to ws://localhost:4000

 NOTE: This is an unofficial connector (community package). You can replace this with
 an official webhook implementation if you obtain TikTok developer access.
*/

const express = require('express');
// Load local env (.env.local) when present so you can set TIKTOK_USERNAME there for development
try { require('dotenv').config({ path: '.env.local' }); } catch (e) { /* dotenv not installed yet */ }
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const ttc = require('tiktok-live-connector');
console.log('tiktok-live-connector exports:', ttc && typeof ttc === 'object' ? Object.keys(ttc) : typeof ttc);
const Live = (ttc && (ttc.Live || ttc.default)) || ttc;

const PORT = process.env.PORT || 4000;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME/* || 'izenovis'*/;console.log('Using TIKTOK_USERNAME:', TIKTOK_USERNAME);
const app = express();
app.use(bodyParser.json());

// CORS for local development: allow the game dev server (localhost:3000) to call /simulate
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function startServer(port) {
  const s = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
  s.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} busy, trying ${port + 1}`);
      startServer(port + 1);
    } else {
      console.error('Server listen error', err);
      process.exit(1);
    }
  });
  return s;
}

const server = startServer(PORT);

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Browser client connected');
  ws.send(JSON.stringify({ type: 'connected' }));
});

function broadcast(obj) {
  const s = JSON.stringify(obj);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(s);
  });
}

// Simulate events (for local testing via HTTP)
// Accepts { type: 'gift'|'like', ...payload }
app.post('/simulate', (req, res) => {
  const body = req.body || {};
  const type = body.type || 'gift';
  console.log('Simulate event', type, body);

  if (type === 'gift') {
    const tier = body.tier || 1;
    broadcast({ type: 'gift', data: { tier, simulated: true, raw: body } });
    return res.json({ ok: true });
  }

  if (type === 'like') {
    const payload = {
      userId: body.userId || 'sim-user',
      nickname: body.nickname || 'sim-nick',
      uniqueId: body.uniqueId || 'sim-uid',
      likeCount: body.likeCount || (body.count || 1),
      totalLikeCount: body.totalLikeCount || body.total || 100,
      simulated: true,
    };
    broadcast({ type: 'like', data: payload });
    return res.json({ ok: true });
  }

  broadcast({ type, data: body });
  res.json({ ok: true });
});

// Start TikTok Live client using available constructors and robust event handlers
let live = null;
const Connector = ttc.TikTokLiveConnection || ttc.TikTokWebClient || ttc.TikTokWebcastPush || null;
if (!Connector) {
  console.warn('No known TikTok Live connector export found; running in simulate-only mode');
} else {
  try {
    // Try common constructor signatures
    try {
      live = new Connector({ uniqueId: TIKTOK_USERNAME });
    } catch (e1) {
      try {
        live = new Connector(TIKTOK_USERNAME);
      } catch (e2) {
        live = null;
      }
    }

    if (!live) {
      console.warn('Could not instantiate TikTok connector; running in simulate-only mode');
    } else {
      // Log available event map keys to help debugging
      if (ttc.WebcastEventMap) {
        console.log('WebcastEventMap keys sample:', Object.keys(ttc.WebcastEventMap).slice(0,20));
      }

      // Attach handlers
      const handleGiftCandidate = (gift) => {
        if (!gift) return;

        // Detect like payloads embedded in gift-like objects
        const isLike = (() => {
          if (!gift) return false;
          if (gift.likeCount || gift.totalLikeCount) return true;
          if (gift.common && typeof gift.common.method === 'string' && /Like/i.test(gift.common.method)) return true;
          const keys = Object.keys(gift);
          if (keys.some(k => /like|liked|totalLike|likeCount/i.test(k))) return true;
          return false;
        })();

        if (isLike) {
          const possible = gift;
          const likePayload = {
            userId: possible.user?.userId || possible.userId || possible.uid || possible.user_id || possible.sender || possible.fromId,
            nickname: possible.user?.nickname || possible.nickname || possible.nick || possible.userName || possible.displayName,
            uniqueId: possible.user?.uniqueId || possible.uniqueId || possible.unique_id || possible.uid || possible.userId,
            likeCount: possible.likeCount || possible.like || possible.count || possible.like_count || 1,
            totalLikeCount: possible.totalLikeCount || possible.totalLike || possible.total_like_count || possible.total || 0,
            raw: possible,
          };
          console.log('Detected like in giftCandidate, broadcasting like:', likePayload);
          broadcast({ type: 'like', data: likePayload });
          return;
        }

        // Otherwise treat as a gift
        // Heuristic extraction of gift value
        const value = gift?.diamondCount || gift?.diamond_count || gift?.repeatCount || gift?.repeat_count || gift?.repeatEnd || gift?.coins || gift?.cost || gift?.price || 1;
        let tier = 1;
        if (value >= 50) tier = 3;
        else if (value >= 10) tier = 2;

        const payload = { tier, raw: gift };
        console.log('Received gift -> tier', tier, 'payload', payload);
        broadcast({ type: 'gift', data: payload });
      };

      // Preferred event names
      const preferredEvents = ['gift', 'reward', 'sendGift', 'gift_send', 'webcast_gift', 'giftBag', 'GIFT', 'Reward', 'DANMU_MSG', 'like', 'LIKE', 'like_count', 'liked'];
      if (typeof live.on === 'function') {
        const isLikePayload = (p) => {
        if (!p) return false;
        if (p.likeCount || p.totalLikeCount) return true;
        if (p.common && typeof p.common.method === 'string' && /Like/i.test(p.common.method)) return true;
        const keys = Object.keys(p);
        if (keys.some(k => /like|liked|totalLike|likeCount/i.test(k))) return true;
        return false;
      };

      preferredEvents.forEach(ev => {
          try {
            live.on(ev, (data) => {
              // Preferentially detect like events and broadcast them as 'like'
              try {
                if (isLikePayload(data)) {
                  const possible = data;
                  const likePayload = {
                    userId: possible.user?.userId || possible.userId || possible.uid || possible.user_id || possible.sender || possible.fromId,
                    nickname: possible.user?.nickname || possible.nickname || possible.nick || possible.userName || possible.displayName,
                    uniqueId: possible.user?.uniqueId || possible.uniqueId || possible.unique_id || possible.uid || possible.userId,
                    likeCount: possible.likeCount || possible.like || possible.count || possible.like_count || 1,
                    totalLikeCount: possible.totalLikeCount || possible.totalLike || possible.total_like_count || possible.total || 0,
                    raw: possible
                  };
                  console.log('Detected like via preferred event:', likePayload);
                  broadcast({ type: 'like', data: likePayload });
                  return;
                }
              } catch (inner) {}

              // Otherwise treat as gift-like
              handleGiftCandidate(data);
            });
          } catch (e) {
            // ignore attach errors
          }
        });

        // Fallback: generic raw event handler (if available)
        try {
          live.on('event', (evt) => {
            // Try to detect gift-like or like-like payloads inside the event
            try {
              const possible = evt?.data || evt?.body || evt;
              if (possible) {
                // Likes
                const likeKeys = Object.keys(possible).filter(k => /like|liked|likeCount|totalLike/i.test(k));
                if (likeKeys.length > 0) {
                  const likePayload = {
                    userId: possible.userId || possible.uid || possible.user_id || possible.openId || possible.sender || possible.fromId,
                    nickname: possible.nickname || possible.nick || possible.userName || possible.displayName,
                    uniqueId: possible.uniqueId || possible.unique_id || possible.unique || possible.uid || possible.userId,
                    likeCount: possible.likeCount || possible.like || possible.count || possible.like_count || 1,
                    totalLikeCount: possible.totalLikeCount || possible.totalLike || possible.total_like_count || possible.total || possible.totalLikeCount || 0,
                  };
                  console.log('Detected like event via raw event:', likePayload);
                  broadcast({ type: 'like', data: likePayload });
                  return;
                }

                // Gifts
                if (possible.gift || possible.reward || possible.send_gift) {
                  handleGiftCandidate(possible.gift || possible.reward || possible.send_gift);
                  return;
                }

                // Heuristic: if object contains diamondCount / coins etc.
                const keys = Object.keys(possible);
                if (keys.some(k => /diamond|coin|gift|reward/i.test(k))) {
                  handleGiftCandidate(possible);
                  return;
                }
              }
            } catch (inner) {}
          });
        } catch (e) {
          // not all connectors expose a generic 'event' name; skip silently
        }

        // Attempt to connect if possible
        if (typeof live.connect === 'function') {
          try {
            const p = live.connect();
            if (p && typeof p.then === 'function') {
              p.then(() => console.log('Connected to TikTok live client for', TIKTOK_USERNAME)).catch((err) => console.warn('TikTok connect failed:', err && err.message ? err.message : err));
            } else {
              console.log('TikTok client connect invoked');
            }
          } catch (err) {
            console.warn('TikTok connect threw:', err && err.message ? err.message : err);
          }
        } else {
          console.warn('TikTok connector missing connect(); running simulate-only');
        }

        // Also listen for errors
        try {
          live.on('error', (err) => console.warn('TikTok client error:', err && err.message ? err.message : err));
        } catch (e) {}
      } else {
        console.warn('TikTok connector instance has no .on(); running simulate-only mode');
      }
    }
  } catch (err) {
    console.warn('Failed to initialize TikTok Live client, running in simulate-only mode:', err && err.message ? err.message : err);
    live = null;
  }
}

process.on('SIGINT', () => {
  console.log('Shutting down');
  if (live && typeof live.disconnect === 'function') {
    try {
      live.disconnect();
    } catch (e) {
      console.warn('Error disconnecting live client', e && e.message ? e.message : e);
    }
  }
  server.close(() => process.exit(0));
});
