import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import SnakeCanvas from './components/SnakeCanvas';
import InfoPanel from './components/InfoPanel';
import { GameState, Direction, Point } from './types';
import { GRID_SIZE, INITIAL_SNAKE, INITIAL_SPEED } from './constants';
import { getBestMove, checkCollision, spawnFood } from './utils/gameLogic';
import tiktokConnector from './services/tiktok-connector';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    snake: INITIAL_SNAKE,
    food: { x: 10, y: 5 },
    score: 0,
    gameOver: false,
    gridSize: GRID_SIZE,
    direction: Direction.RIGHT,
    obstacles: [],
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  // Live likes counter
  const [liveLikes, setLiveLikes] = useState(0);
  // Show last like briefly
  const [lastLike, setLastLike] = useState<{nickname?:string;likeCount?:number;totalLikeCount?:number}|null>(null);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  // Track last processed likes (we only count *new* likes since this value)
  const lastProcessedLikesRef = useRef<number | null>(null);

  // Gift effects mapping (tier -> effect) - used as fallback when diamonds not present
  const GIFT_EFFECTS: Record<number, { obstacles?: number; boost?: { mult: number; duration: number } }> = {
    1: { boost: { mult: 2, duration: 2000 } },        // small gift: temporary speed x2
    2: { boost: { mult: 4, duration: 2000 } },        // medium gift: temporary speed x4
    3: { obstacles: 1 },                             // large gift: spawn 1 obstacle
    4: { obstacles: 3 },                             // very large: spawn 3
    5: { obstacles: 5 },                             // ultra: spawn 5
  };

  // Diamond-based point system
  const POINTS_PER_OBSTACLE = 5; // configurable: 5 diamonds => 1 obstacle
  const giftPointsRef = useRef<number>(0); // accumulated diamond points for current round

  const [giftNotification, setGiftNotification] = useState<{nickname?: string; tier?: number; obstacles?: number; diamonds?: number; pointsRemaining?: number} | null>(null);
  const [recentGifts, setRecentGifts] = useState<Array<{nickname?: string; tier?: number; obstacles?: number; diamonds?: number; pointsRemaining?: number; time: number}>>([]);
  // Boost queue (non-stacking): queue boosts and apply one at a time.
  const boostQueueRef = useRef<Array<{id:string;value:number;duration:number}>>([]);
  const [queueCount, setQueueCount] = useState(0);
  const activeBoostRef = useRef<{id:string;value:number} | null>(null);
  const [activeMultiplier, setActiveMultiplier] = useState(1);
  const wsRef = useRef<WebSocket | null>(null);

  // Refs for loop
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const restartTimeoutRef = useRef<number | null>(null);
  const restartIntervalRef = useRef<number | null>(null);
  const [restartCountdown, setRestartCountdown] = useState<number | null>(null);

  const clearRestartTimers = () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    if (restartIntervalRef.current) {
      clearInterval(restartIntervalRef.current);
      restartIntervalRef.current = null;
    }
    setRestartCountdown(null);
  };

  const resetGame = useCallback(() => {
    // Clear any pending restart timers
    clearRestartTimers();

    const initialState = {
      snake: INITIAL_SNAKE,
      food: spawnFood(INITIAL_SNAKE, []),
      score: 0,
      gameOver: false,
      gridSize: GRID_SIZE,
      direction: Direction.RIGHT,
      obstacles: [],
    };
    setGameState(initialState);
    gameStateRef.current = initialState;
    // Reset boosts and queue
    setActiveMultiplier(1);
    boostQueueRef.current = [];
    setQueueCount(0);
    // Reset like baseline to current liveLikes so we don't retroactively spawn
    lastProcessedLikesRef.current = liveLikes;
    setIsPlaying(true);
  }, [liveLikes]);

  const handleGameOver = useCallback(() => {
    setIsPlaying(false);
    // Clear boosts/queue and reset multiplier
    setActiveMultiplier(1);
    boostQueueRef.current = [];
    setQueueCount(0);
    // Clear obstacles on death (they persist until you die)
    setGameState(prev => ({ ...prev, obstacles: [] }));

    // Start automatic restart countdown (5s)
    clearRestartTimers();
    setRestartCountdown(5);
    restartIntervalRef.current = window.setInterval(() => {
      setRestartCountdown((c) => {
        if (!c) return null;
        if (c <= 1) {
          // final tick will be handled by timeout
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    restartTimeoutRef.current = window.setTimeout(() => {
      clearRestartTimers();
      // Call resetGame (defined later)
      try { resetGame(); } catch (e) { console.warn('Failed to auto-restart', e); }
    }, 5000);
  }, [resetGame]);

  const updateGame = useCallback(() => {
    const current = gameStateRef.current;
    if (current.gameOver) return;

    let nextDir = current.direction;

    // AI Logic (now considers external obstacles)
    const bestMove = getBestMove(current.snake, current.food, current.obstacles || []);
    if (bestMove) {
      nextDir = bestMove;
    }

    const head = current.snake[0];
    const newHead = { ...head };

    switch (nextDir) {
      case Direction.UP: newHead.y -= 1; break;
      case Direction.DOWN: newHead.y += 1; break;
      case Direction.LEFT: newHead.x -= 1; break;
      case Direction.RIGHT: newHead.x += 1; break;
    }

    // Determine if we will eat BEFORE collision check
    // This is critical because if we eat, tail stays. If we don't, tail moves.
    const willEat = newHead.x === current.food.x && newHead.y === current.food.y;

    // Check Collision passing the 'willEat' flag and external obstacles
    if (checkCollision(newHead, current.snake, willEat, current.obstacles || [])) {
      setGameState(prev => ({ ...prev, gameOver: true }));
      handleGameOver();
      return;
    }

    const newSnake = [newHead, ...current.snake];
    let newScore = current.score;
    let newFood = current.food;

    if (willEat) {
      newScore += 1;
      const spawned = spawnFood(newSnake, current.obstacles || []);
      if (spawned.x === -1) {
        // Victory / Game Complete logic could go here, for now just no food
        // setGameState(victory...)
        console.log("Victory!");
      } else {
        newFood = spawned;
      }
    } else {
      newSnake.pop(); // Remove tail
    }

    setGameState({
      ...current,
      snake: newSnake,
      food: newFood,
      score: newScore,
      direction: nextDir,
    });
  }, [handleGameOver]);

  const effectiveMultiplier = useMemo(() => activeMultiplier, [activeMultiplier]);

  const effectiveSpeed = useMemo(() => Math.max(5, Math.round(speed / effectiveMultiplier)), [speed, effectiveMultiplier]);

  const animate = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;

    if (deltaTime >= effectiveSpeed) {
      updateGame();
      lastTimeRef.current = time;
    }

    if (gameStateRef.current.gameOver || !isPlaying) return;
    requestRef.current = requestAnimationFrame(animate);
  }, [effectiveSpeed, isPlaying, updateGame]);

  useEffect(() => {
    if (isPlaying && !gameState.gameOver) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, animate, gameState.gameOver]);

  const togglePause = () => setIsPlaying(!isPlaying);

  // Helpers for live events (queue-based: boosts don't stack, they queue)
  const enqueueBoost = (mult: number, durationMs: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    const item = { id, value: mult, duration: durationMs };
    if (!activeBoostRef.current) {
      startBoost(item);
    } else {
      boostQueueRef.current.push(item);
      setQueueCount(boostQueueRef.current.length);
    }
  };

  const startBoost = (item: { id: string; value: number; duration: number }) => {
    activeBoostRef.current = { id: item.id, value: item.value };
    setActiveMultiplier(item.value);
    setQueueCount(boostQueueRef.current.length);

    setTimeout(() => {
      // end boost
      activeBoostRef.current = null;
      setActiveMultiplier(1);
      const next = boostQueueRef.current.shift();
      setQueueCount(boostQueueRef.current.length);
      if (next) startBoost(next);
    }, item.duration);
  };

  const findEmptyCell = (snake: Point[], food: Point, obstacles: Point[] = []): Point | null => {
    const used = new Set<string>();
    snake.forEach(s => used.add(`${s.x},${s.y}`));
    obstacles.forEach(o => used.add(`${o.x},${o.y}`));
    used.add(`${food.x},${food.y}`);

    // Random tries
    for (let i = 0; i < 100; i++) {
      const candidate = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
      if (!used.has(`${candidate.x},${candidate.y}`)) return candidate;
    }

    // Exhaustive
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        if (!used.has(`${x},${y}`)) return { x, y };
      }
    }

    return null;
  };

  const addObstacle = () => {
    const current = gameStateRef.current;
    const cell = findEmptyCell(current.snake, current.food, current.obstacles || []);
    if (!cell) return null;
    setGameState(prev => ({ ...prev, obstacles: [...(prev.obstacles || []), cell] }));
    return cell;
  };

  const determineTierFromGift = (detail: any) => {
    if (!detail) return 1;
    if (detail.tier) return detail.tier;
    const value = detail?.tierValue || detail?.diamondCount || detail?.diamond_count || detail?.coins || detail?.repeatCount || 1;
    if (value >= 50) return 3;
    if (value >= 10) return 2;
    return 1;
  };

  const handleGift = (detail: any) => {
    // Ignore unfinished combo gifts
    if (detail?.isStreakable && detail?.streaking) return;

    const nickname = detail?.user?.nickname || detail?.nickname || detail?.userName || detail?.user?.uniqueId || 'Unknown';

    // Compute diamonds (support several payload shapes)
    const per = Number(detail?.diamondCount || detail?.diamond_count || detail?.diamonds || detail?.raw?.diamondCount || 0) || 0;
    const repeat = Number(detail?.repeatCount || detail?.repeat_count || detail?.repeat || detail?.raw?.repeatCount || 1) || 1;
    const diamonds = per * repeat;

    console.log('Gift received', { nickname, diamonds, detail });

    let spawned = 0;

    if (diamonds > 0) {
      // Use diamond point system
      giftPointsRef.current += diamonds;
      const toSpawn = Math.floor(giftPointsRef.current / POINTS_PER_OBSTACLE);
      if (toSpawn > 0) {
        for (let i = 0; i < toSpawn; i++) {
          const cell = addObstacle();
          if (cell) spawned++;
        }
        // subtract used points
        giftPointsRef.current -= toSpawn * POINTS_PER_OBSTACLE;
      }

      // Notify
      if (spawned > 0) {
        setGiftNotification({ nickname, diamonds, obstacles: spawned, pointsRemaining: giftPointsRef.current });
        setRecentGifts(prev => [{ nickname, diamonds, tier: undefined, obstacles: spawned, pointsRemaining: giftPointsRef.current, time: Date.now() }, ...prev].slice(0, 6));
        setTimeout(() => setGiftNotification(null), 3000);
      }

      console.log(`Diamonds processed: +${diamonds}, spawned ${spawned} obstacles, remaining points ${giftPointsRef.current}`);
      return;
    }

    // Fallback: compute tier-based behavior if diamonds not provided
    const tier = detail?.tier || determineTierFromGift(detail);
    const effect = GIFT_EFFECTS[tier] || (tier >= 3 ? { obstacles: Math.min(5, tier) } : { obstacles: 0 });

    // Apply boost if present
    if (effect.boost) {
      enqueueBoost(effect.boost.mult, effect.boost.duration);
    }

    if (effect.obstacles && effect.obstacles > 0) {
      for (let i = 0; i < effect.obstacles; i++) {
        const cell = addObstacle();
        if (cell) spawned++;
      }
    }

    if (spawned > 0 || effect.boost) {
      setGiftNotification({ nickname, tier, obstacles: spawned });
      setRecentGifts(prev => [{ nickname, tier, obstacles: spawned, time: Date.now() }, ...prev].slice(0, 6));
      setTimeout(() => setGiftNotification(null), 3000);
    }

    console.log(`Gift handled (fallback): tier=${tier} boost=${!!effect.boost} spawned=${spawned}`);
  };

  // WebSocket connection to local server (server uses tiktok-live-connector)
  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      clearRestartTimers();
    };
  }, []);

  const toggleConnect = () => {
    console.log('toggleConnect clicked; wsRef.current:', wsRef.current);
    if (wsRef.current) {
      console.log('Closing existing WS connection');
      wsRef.current.close();
      wsRef.current = null;
      setTiktokConnected(false);
    } else {
      try {
        console.log('Creating new WebSocket to ws://localhost:4000');
        const ws = new WebSocket('ws://localhost:4000');
        ws.onopen = () => { console.log('WS connected'); setTiktokConnected(true); };
        const onmessage = (ev: any) => {
          console.log('Raw WS message received:', ev.data);
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'gift') handleGift(msg.data);
            if (msg.type === 'like') {
              // Update live likes counter and show a temporary UI indicator
              const d = msg.data || {};
              const total = Number(d.totalLikeCount || d.total || d.likeCount || 0);
              const prev = liveLikes;
              console.log('Like detected! raw payload:', d, 'prevLikes:', prev, 'newTotal:', total);

              // Update UI
              setLiveLikes(total);
              console.log('liveLikes state updated:', total);
              setLastLike({ nickname: d.nickname || d.userId, likeCount: Number(d.likeCount || 0), totalLikeCount: total });

              // Spawn obstacles for every 100 *new* likes since last processed value
              if (lastProcessedLikesRef.current === null) {
                // First time seeing likes: set baseline and do not spawn retroactively
                lastProcessedLikesRef.current = total;
                console.log('Setting initial lastProcessedLikes to', total);
              } else {
                const prevLikes = lastProcessedLikesRef.current;
                const prevThreshold = Math.floor(prevLikes / 100);
                const newThreshold = Math.floor(total / 100);
                const toSpawn = Math.max(0, newThreshold - prevThreshold);
                if (toSpawn > 0) {
                  console.log(`Likes crossed ${toSpawn} threshold(s) (${prevThreshold} -> ${newThreshold}), spawning ${toSpawn} obstacle(s)`);
                  for (let i = 0; i < toSpawn; i++) {
                    const cell = addObstacle();
                    if (cell) console.log('Spawned obstacle at', cell);
                  }
                }
                lastProcessedLikesRef.current = total;
              }

              // Clear the notification after 2.5s
              setTimeout(() => setLastLike(null), 2500);
            }
          } catch (err) {
            console.warn('Invalid ws message', err);
          }
        };
        ws.onclose = (ev) => { console.log('WS closed', ev); setTiktokConnected(false); };
        ws.onerror = (e) => { console.warn('ws error', e); try { ws.close(); } catch(_){} };
        ws.onmessage = onmessage;
        wsRef.current = ws;
      } catch (err) {
        console.warn('Failed to create WebSocket', err);
        setTiktokConnected(false);
      }
    }
  };

  const simulateGift = (tier: number) => {
    // If server running, call simulate endpoint; else fallback to local mock
    fetch('http://localhost:4000/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier }) })
      .catch(() => {
        tiktokConnector.simulateGift(tier);
      });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="relative">
        <SnakeCanvas gameState={gameState} />

        {(!isPlaying || gameState.gameOver) && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10">
            {gameState.gameOver ? (
              <div className="text-center animate-in fade-in zoom-in duration-300">
                <h2 className="text-4xl font-bold text-red-500 mb-2">GAME OVER</h2>
                <p className="text-white mb-2">Score: {gameState.score}</p>
                {restartCountdown !== null ? (
                  <p className="text-sm text-slate-300 mb-4">Restarting in {restartCountdown}s...</p>
                ) : null}
                <div className="flex items-center gap-3 justify-center">
                  <button
                    onClick={resetGame}
                    className="px-6 py-3 bg-white text-slate-900 font-bold rounded-full hover:scale-105 transition-transform"
                  >
                    Restart
                  </button>
                  <button
                    onClick={() => { clearRestartTimers(); }}
                    className="px-4 py-2 bg-slate-700 text-white rounded-full text-sm"
                  >
                    Cancel Auto-Restart
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsPlaying(true)}
                className="px-8 py-4 bg-cyan-500 text-white font-bold rounded-full hover:bg-cyan-400 shadow-lg shadow-cyan-500/30 transition-all hover:scale-110"
              >
                Start
              </button>
            )}
          </div>
        )}
      </div>

      <InfoPanel
        score={gameState.score}
        liveLikes={liveLikes}
        lastLike={lastLike}
        giftNotification={giftNotification}
        recentGifts={recentGifts}
      />

      <div className="mt-8 flex flex-wrap gap-4 justify-center items-center">

        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-lg border border-slate-800">
          <span className="text-xs font-bold text-slate-400 px-2">SPEED</span>
          <input
            type="range"
            min="10"
            max="100"
            step="10"
            value={110 - speed}
            onChange={(e) => setSpeed(110 - parseInt(e.target.value))}
            className="w-32 accent-cyan-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <button
          onClick={togglePause}
          disabled={gameState.gameOver}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-medium transition-colors text-sm"
        >
          {isPlaying ? "PAUSE" : "RESUME"}
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleConnect}
            className={`px-3 py-2 rounded-lg font-medium ${tiktokConnected ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-300'}`}
          >
            {tiktokConnected ? 'Disconnect TikTok' : 'Connect TikTok'}
          </button>

          <div className="flex gap-2">
            <button onClick={() => simulateGift(1)} className="px-3 py-1 bg-slate-700 rounded-md text-slate-200 text-sm">Sim Tier 1</button>
            <button onClick={() => simulateGift(2)} className="px-3 py-1 bg-slate-700 rounded-md text-slate-200 text-sm">Sim Tier 2</button>
            <button onClick={() => simulateGift(3)} className="px-3 py-1 bg-rose-600 rounded-md text-white text-sm">Sim Tier 3</button>
          </div>
        </div>

        <div className="mt-2 text-xs text-slate-400">
          <div>Active Boost: {activeMultiplier > 1 ? `x${activeMultiplier}` : 'none'}</div>
          <div>Queued Boosts: {queueCount}</div>
          <div>Obstacles: {(gameState.obstacles || []).length}</div>
        </div>
      </div>
    </div>
  );
};

export default App;