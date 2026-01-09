import { getBestMove, spawnFood } from '../utils/gameLogic';
import { Direction, Point } from '../types';

const dirToStr = (d: Direction | null) => d === null ? 'null' : Direction[d];

// Scenario 1: Snake in middle, food at right border
const snake1: Point[] = [
  {x:5,y:5},
  {x:4,y:5},
  {x:3,y:5},
  {x:2,y:5},
];
const food1: Point = {x:9,y:5}; // border (assuming GRID_SIZE=10)
console.log('Scenario 1 move:', dirToStr(getBestMove(snake1, food1)));

// Scenario 2: Snake hugging top wall, food in corner
const snake2: Point[] = [
  {x:1,y:1},
  {x:1,y:2},
  {x:1,y:3},
  {x:2,y:3},
  {x:3,y:3},
];
const food2: Point = {x:0,y:0};
console.log('Scenario 2 move:', dirToStr(getBestMove(snake2, food2)));

// Scenario 3: Complex near-tail path via tail cell
const snake3: Point[] = [
  {x:5,y:5},
  {x:5,y:6},
  {x:5,y:7},
  {x:4,y:7},
  {x:3,y:7},
  {x:3,y:6},
  {x:3,y:5},
  {x:4,y:5},
];
const food3: Point = {x:6,y:5}; // border-ish
console.log('Scenario 3 move:', dirToStr(getBestMove(snake3, food3)));

// Show spawned food doesn't pick an occupied tile
const spawned = spawnFood(snake1, []);
console.log('Spawned food:', spawned);
