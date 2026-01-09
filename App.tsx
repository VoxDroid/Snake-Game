import React, { useState, useEffect, useRef, useCallback } from 'react';
import SnakeCanvas from './components/SnakeCanvas';
import InfoPanel from './components/InfoPanel';
import { GameState, Direction } from './types';
import { GRID_SIZE, INITIAL_SNAKE, INITIAL_SPEED } from './constants';
import { getBestMove, checkCollision, spawnFood } from './utils/gameLogic';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    snake: INITIAL_SNAKE,
    food: { x: 10, y: 5 },
    score: 0,
    gameOver: false,
    gridSize: GRID_SIZE,
    direction: Direction.RIGHT,
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [highScore, setHighScore] = useState(0);

  // Refs for loop
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const gameStateRef = useRef(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const handleGameOver = useCallback(() => {
    setIsPlaying(false);
    if (gameStateRef.current.score > highScore) {
      setHighScore(gameStateRef.current.score);
    }
  }, [highScore]);

  const updateGame = useCallback(() => {
    const current = gameStateRef.current;
    if (current.gameOver) return;

    let nextDir = current.direction;

    // AI Logic
    const bestMove = getBestMove(current.snake, current.food);
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

    // Check Collision passing the 'willEat' flag
    if (checkCollision(newHead, current.snake, willEat)) {
      setGameState(prev => ({ ...prev, gameOver: true }));
      handleGameOver();
      return;
    }

    const newSnake = [newHead, ...current.snake];
    let newScore = current.score;
    let newFood = current.food;

    if (willEat) {
      newScore += 1;
      const spawned = spawnFood(newSnake);
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

  const animate = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;

    if (deltaTime >= speed) {
      updateGame();
      lastTimeRef.current = time;
    }

    if (gameStateRef.current.gameOver || !isPlaying) return;
    requestRef.current = requestAnimationFrame(animate);
  }, [speed, isPlaying, updateGame]);

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

  const resetGame = () => {
    const initialState = {
      snake: INITIAL_SNAKE,
      food: spawnFood(INITIAL_SNAKE),
      score: 0,
      gameOver: false,
      gridSize: GRID_SIZE,
      direction: Direction.RIGHT,
    };
    setGameState(initialState);
    gameStateRef.current = initialState;
    setIsPlaying(true);
  };

  const togglePause = () => setIsPlaying(!isPlaying);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="mb-6 text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
          Snake Game
        </h1>
      </div>

      <div className="relative">
        <SnakeCanvas gameState={gameState} />

        {(!isPlaying || gameState.gameOver) && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-10">
            {gameState.gameOver ? (
              <div className="text-center animate-in fade-in zoom-in duration-300">
                <h2 className="text-4xl font-bold text-red-500 mb-2">GAME OVER</h2>
                <p className="text-white mb-6">Score: {gameState.score}</p>
                <button
                  onClick={resetGame}
                  className="px-6 py-3 bg-white text-slate-900 font-bold rounded-full hover:scale-105 transition-transform"
                >
                  Restart
                </button>
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
        highScore={highScore}
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
      </div>
    </div>
  );
};

export default App;