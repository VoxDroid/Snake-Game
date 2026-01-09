export interface Point {
  x: number;
  y: number;
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export interface GameState {
  snake: Point[];
  food: Point;
  score: number;
  gameOver: boolean;
  gridSize: number;
  direction: Direction;
}

export interface AiCommentary {
  text: string;
  mood: "hype" | "tense" | "analytical" | "funny";
}