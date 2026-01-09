import React, { useEffect, useRef, useState } from 'react';
import { GameState, Point, Direction } from '../types';
import { CELL_SIZE, GRID_SIZE } from '../constants';

interface SnakeCanvasProps {
  gameState: GameState;
}

const SnakeCanvas: React.FC<SnakeCanvasProps> = ({ gameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headImage = useRef<HTMLImageElement | null>(null);
  const bodyImage = useRef<HTMLImageElement | null>(null);
  const tailImage = useRef<HTMLImageElement | null>(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  useEffect(() => {
    const head = new Image();
    const body = new Image();
    const tail = new Image();

    let loadedCount = 0;
    const checkLoaded = () => {
      loadedCount++;
      if (loadedCount === 3) setAssetsLoaded(true);
    };

    head.src = '/assets/snake-head.svg';
    body.src = '/assets/snake-body.svg';
    tail.src = '/assets/snake-tail.svg';

    head.onload = checkLoaded;
    body.onload = checkLoaded;
    tail.onload = checkLoaded;

    headImage.current = head;
    bodyImage.current = body;
    tailImage.current = tail;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Board Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Pixelated Board Pattern (Shaders/Texture)
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        // Subtle checkerboard/noise pattern for pixel art feel
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        // Corner "pixel" highlights for individual tiles
        ctx.fillStyle = '#334155';
        ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, 4, 4);
        ctx.fillRect(x * CELL_SIZE + CELL_SIZE - 4, y * CELL_SIZE + CELL_SIZE - 4, 4, 4);
      }
    }

    // Draw Grid Overlay (Subtle)
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(canvas.width, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw Food (Pixelated Glow)
    const { food } = gameState;
    ctx.fillStyle = '#f43f5e';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#f43f5e';
    // Draw a square-ish pixelated apple
    ctx.fillRect(
      food.x * CELL_SIZE + CELL_SIZE / 4,
      food.y * CELL_SIZE + CELL_SIZE / 4,
      CELL_SIZE / 2,
      CELL_SIZE / 2
    );
    ctx.fillStyle = '#fff';
    ctx.fillRect(
      food.x * CELL_SIZE + CELL_SIZE / 4 + 2,
      food.y * CELL_SIZE + CELL_SIZE / 4 + 2,
      4,
      4
    );
    ctx.shadowBlur = 0;

    // Draw Snake
    const { snake } = gameState;
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      const isTail = index === snake.length - 1 && snake.length > 1;
      const x = segment.x * CELL_SIZE;
      const y = segment.y * CELL_SIZE;

      if (assetsLoaded && headImage.current && bodyImage.current && tailImage.current) {
        ctx.save();
        ctx.translate(x + CELL_SIZE / 2, y + CELL_SIZE / 2);

        let img = bodyImage.current;
        let angle = 0;

        if (isHead) {
          img = headImage.current;
          if (gameState.direction === Direction.UP) angle = -Math.PI / 2;
          if (gameState.direction === Direction.DOWN) angle = Math.PI / 2;
          if (gameState.direction === Direction.LEFT) angle = Math.PI;
          if (gameState.direction === Direction.RIGHT) angle = 0;
        } else if (isTail) {
          img = tailImage.current;
          const prev = snake[index - 1];
          // Tail points AWAY from the segment before it
          if (segment.x < prev.x) angle = Math.PI;
          if (segment.x > prev.x) angle = 0;
          if (segment.y < prev.y) angle = -Math.PI / 2;
          if (segment.y > prev.y) angle = Math.PI / 2;
        } else {
          // Body segments also rotate to match the flow
          const next = snake[index - 1]; // Segment closer to head
          if (segment.x < next.x) angle = 0;    // Moving right
          if (segment.x > next.x) angle = Math.PI; // Moving left
          if (segment.y < next.y) angle = Math.PI / 2; // Moving down
          if (segment.y > next.y) angle = -Math.PI / 2; // Moving up
        }

        ctx.rotate(angle);
        ctx.drawImage(img, -CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
        ctx.restore();
      } else {
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }
    });

  }, [gameState, assetsLoaded]);

  return (
    <canvas
      ref={canvasRef}
      width={GRID_SIZE * CELL_SIZE}
      height={GRID_SIZE * CELL_SIZE}
      className="bg-slate-900 rounded-xl shadow-[0_0_50px_-12px_rgba(6,182,212,0.5)] border-2 border-slate-800"
    />
  );
};

export default SnakeCanvas;