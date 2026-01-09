import { Point, Direction } from '../types';
import { GRID_SIZE } from '../constants';

const isSamePoint = (p1: Point, p2: Point) => p1.x === p2.x && p1.y === p2.y;

// Standard BFS for shortest path
// Returns null if no path found
const bfs = (start: Point, target: Point, obstacles: Set<string>): Point[] | null => {
  const queue: { point: Point; path: Point[] }[] = [{ point: start, path: [] }];
  const visited = new Set<string>();
  visited.add(`${start.x},${start.y}`);
  
  while (queue.length > 0) {
    const { point, path } = queue.shift()!;

    if (isSamePoint(point, target)) {
      return path;
    }

    const neighbors = [
      { x: point.x, y: point.y - 1 },
      { x: point.x, y: point.y + 1 },
      { x: point.x - 1, y: point.y },
      { x: point.x + 1, y: point.y },
    ];

    for (const n of neighbors) {
      if (n.x < 0 || n.x >= GRID_SIZE || n.y < 0 || n.y >= GRID_SIZE) continue;
      
      const key = `${n.x},${n.y}`;
      if (!visited.has(key) && !obstacles.has(key)) {
        visited.add(key);
        queue.push({ point: n, path: [...path, n] });
      }
    }
  }

  return null;
};

// Flood Fill to count accessible space from a point
const getAccessibleArea = (start: Point, obstacles: Set<string>, limit: number): number => {
    const queue: Point[] = [start];
    const visited = new Set<string>();
    visited.add(`${start.x},${start.y}`);
    let count = 0;

    while (queue.length > 0 && count < limit) {
        const p = queue.shift()!;
        count++;

        const neighbors = [
            { x: p.x, y: p.y - 1 },
            { x: p.x, y: p.y + 1 },
            { x: p.x - 1, y: p.y },
            { x: p.x + 1, y: p.y },
        ];

        for (const n of neighbors) {
            if (n.x < 0 || n.x >= GRID_SIZE || n.y < 0 || n.y >= GRID_SIZE) continue;
            const key = `${n.x},${n.y}`;
            if (!visited.has(key) && !obstacles.has(key)) {
                visited.add(key);
                queue.push(n);
            }
        }
    }
    return count;
}

const getDirection = (from: Point, to: Point): Direction | null => {
    if (to.x < from.x) return Direction.LEFT;
    if (to.x > from.x) return Direction.RIGHT;
    if (to.y < from.y) return Direction.UP;
    if (to.y > from.y) return Direction.DOWN;
    return null;
};

const createObstacleSet = (points: Point[]): Set<string> => {
    return new Set(points.map(p => `${p.x},${p.y}`));
};

export const getBestMove = (snake: Point[], food: Point, extraObstacles: Point[] = []): Direction | null => {
  const head = snake[0];
  const neighbors = [
    { x: head.x, y: head.y - 1, dir: Direction.UP },
    { x: head.x, y: head.y + 1, dir: Direction.DOWN },
    { x: head.x - 1, y: head.y, dir: Direction.LEFT },
    { x: head.x + 1, y: head.y, dir: Direction.RIGHT },
  ];

  // For initial valid move check, we assume we MIGHT NOT eat.
  // If we don't eat, tail moves. So we exclude tail from obstacles.
  const currentBodyObstacles = createObstacleSet([...snake.slice(0, -1), ...extraObstacles]); 
  
  const validNeighbors = neighbors.filter(n => {
      const inBounds = n.x >= 0 && n.x < GRID_SIZE && n.y >= 0 && n.y < GRID_SIZE;
      if (!inBounds) return false;
      return !currentBodyObstacles.has(`${n.x},${n.y}`);
  });

  // STRATEGY 1: Find a SAFE path to food.
  let bestFoodMove: { dir: Direction; length: number } | null = null;

  for (const n of validNeighbors) {
      const moveDir = n.dir;
      const startNode = { x: n.x, y: n.y };
      
      // Treat the snake as static for pathfinding but allow the tail to be traversed
      // because the tail will move while we're heading toward the food.
      const staticSnakeObstacles = createObstacleSet([...snake.slice(0, -1), ...extraObstacles]); // exclude tail
      const pathToFood = bfs(startNode, food, staticSnakeObstacles);
      
      if (pathToFood) {
          // Validate Safety: Can we reach tail after eating?
          const futureBodySet = createObstacleSet([...snake, ...extraObstacles]);
          pathToFood.forEach(p => futureBodySet.add(`${p.x},${p.y}`));
          
          futureBodySet.delete(`${food.x},${food.y}`); // New Head
          const currentTail = snake[snake.length - 1];
          futureBodySet.delete(`${currentTail.x},${currentTail.y}`); // New Tail (Fixed)
          
          const pathToTail = bfs(food, currentTail, futureBodySet);
          
          if (pathToTail) {
              if (!bestFoodMove || pathToFood.length < bestFoodMove.length) {
                  bestFoodMove = { dir: moveDir, length: pathToFood.length };
              }
          }
      }
  }

  if (bestFoodMove) return bestFoodMove.dir;

  // STRATEGY 2: Stall (Chase Tail)
  let bestStallMove: { dir: Direction; length: number } | null = null;
  
  for (const n of validNeighbors) {
      const moveDir = n.dir;
      const startNode = { x: n.x, y: n.y };
      const chaseTarget = snake[snake.length - 1]; // We chase the tail segment
      const stallObstacles = createObstacleSet([...snake.slice(0, -1), ...extraObstacles]); // Tail is moving, so it's a target, not obstacle
      
      const pathToTail = bfs(startNode, chaseTarget, stallObstacles);
      
      if (pathToTail) {
          // Prefer longest path to delay
          if (!bestStallMove || pathToTail.length > bestStallMove.length) {
              bestStallMove = { dir: moveDir, length: pathToTail.length };
          }
      }
  }
  
  if (bestStallMove) return bestStallMove.dir;
  
  // STRATEGY 3: Area Maximization (Flood Fill)
  // If we can't reach food safely and can't reach tail (very bad state), 
  // pick the neighbor that has the most open space to survive as long as possible.
  let bestAreaMove: { dir: Direction; area: number } | null = null;
  
  for (const n of validNeighbors) {
      const obstacles = createObstacleSet([...snake.slice(0, -1), ...extraObstacles]);
      const area = getAccessibleArea({x: n.x, y: n.y}, obstacles, snake.length * 2);
      
      if (!bestAreaMove || area > bestAreaMove.area) {
          bestAreaMove = { dir: n.dir, area };
      }
  }

  if (bestAreaMove) return bestAreaMove.dir;

  // Last Resort: Random valid
  if (validNeighbors.length > 0) return validNeighbors[0].dir;

  return null;
};

export const checkCollision = (head: Point, snake: Point[], isGrowing: boolean = false, extraObstacles: Point[] = []): boolean => {
  // Wall collision
  if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
    return true;
  }

  // External obstacle collision
  const extraSet = createObstacleSet(extraObstacles);
  if (extraSet.has(`${head.x},${head.y}`)) return true;
  
  // Body collision
  // If we are growing (just ate), the tail does NOT move, so we must check against the full snake.
  // If we are NOT growing, the tail moves away, so we ignore the last segment.
  const checkLength = isGrowing ? snake.length : snake.length - 1;
  
  for (let i = 0; i < checkLength; i++) {
    if (isSamePoint(head, snake[i])) {
      return true;
    }
  }
  return false;
};

export const spawnFood = (snake: Point[], extraObstacles: Point[] = []): Point => {
  const combined = [...snake, ...extraObstacles];
  const obstacleSet = createObstacleSet(combined);
  let food: Point;
  
  // Try random first for performance
  for(let i=0; i<50; i++) {
      food = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
      };
      if (!obstacleSet.has(`${food.x},${food.y}`)) return food;
  }
  
  // Exhaustive search
  const emptySpots: Point[] = [];
  for(let x=0; x<GRID_SIZE; x++) {
      for(let y=0; y<GRID_SIZE; y++) {
          if (!obstacleSet.has(`${x},${y}`)) {
              emptySpots.push({x,y});
          }
      }
  }
  if (emptySpots.length === 0) return {x:-1, y:-1}; 
  return emptySpots[Math.floor(Math.random() * emptySpots.length)];
};