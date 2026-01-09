import React, { useEffect, useRef } from 'react';
import { GameState, Point, Direction } from '../types';
import { CELL_SIZE, GRID_SIZE } from '../constants';

interface SnakeCanvasProps {
  gameState: GameState;
}

const SnakeCanvas: React.FC<SnakeCanvasProps> = ({ gameState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Optional, subtle)
    ctx.strokeStyle = '#1e293b';
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

    // Draw Food
    const { food } = gameState;
    ctx.fillStyle = '#ef4444'; // Red-500
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ef4444';
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Snake
    const { snake } = gameState;
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? '#22d3ee' : '#0ea5e9'; // Cyan-400 head, Sky-500 body
      
      if (isHead) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#22d3ee';
      } else {
        ctx.shadowBlur = 0;
      }

      // Slightly smaller than cell for grid effect
      const x = segment.x * CELL_SIZE + 1;
      const y = segment.y * CELL_SIZE + 1;
      const size = CELL_SIZE - 2;
      
      ctx.fillRect(x, y, size, size);

      // Draw eyes if head
      if (isHead) {
        ctx.fillStyle = '#000';
        const eyeSize = 3;
        // Simple eyes based on current direction could be added here, 
        // but simple center dots work for top-down abstract view
        ctx.fillRect(x + 5, y + 5, eyeSize, eyeSize);
        ctx.fillRect(x + size - 5 - eyeSize, y + 5, eyeSize, eyeSize);
      }
    });

  }, [gameState]);

  return (
    <canvas
      ref={canvasRef}
      width={GRID_SIZE * CELL_SIZE}
      height={GRID_SIZE * CELL_SIZE}
      className="bg-slate-900 rounded-lg shadow-2xl border border-slate-700"
    />
  );
};

export default SnakeCanvas;