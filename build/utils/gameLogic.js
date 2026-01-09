"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spawnFood = exports.checkCollision = exports.getBestMove = void 0;
var types_1 = require("../types");
var constants_1 = require("../constants");
var isSamePoint = function (p1, p2) { return p1.x === p2.x && p1.y === p2.y; };
// Standard BFS for shortest path
// Returns null if no path found
var bfs = function (start, target, obstacles) {
    var queue = [{ point: start, path: [] }];
    var visited = new Set();
    visited.add("".concat(start.x, ",").concat(start.y));
    while (queue.length > 0) {
        var _a = queue.shift(), point = _a.point, path = _a.path;
        if (isSamePoint(point, target)) {
            return path;
        }
        var neighbors = [
            { x: point.x, y: point.y - 1 },
            { x: point.x, y: point.y + 1 },
            { x: point.x - 1, y: point.y },
            { x: point.x + 1, y: point.y },
        ];
        for (var _i = 0, neighbors_1 = neighbors; _i < neighbors_1.length; _i++) {
            var n = neighbors_1[_i];
            if (n.x < 0 || n.x >= constants_1.GRID_SIZE || n.y < 0 || n.y >= constants_1.GRID_SIZE)
                continue;
            var key = "".concat(n.x, ",").concat(n.y);
            if (!visited.has(key) && !obstacles.has(key)) {
                visited.add(key);
                queue.push({ point: n, path: __spreadArray(__spreadArray([], path, true), [n], false) });
            }
        }
    }
    return null;
};
// Flood Fill to count accessible space from a point
var getAccessibleArea = function (start, obstacles, limit) {
    var queue = [start];
    var visited = new Set();
    visited.add("".concat(start.x, ",").concat(start.y));
    var count = 0;
    while (queue.length > 0 && count < limit) {
        var p = queue.shift();
        count++;
        var neighbors = [
            { x: p.x, y: p.y - 1 },
            { x: p.x, y: p.y + 1 },
            { x: p.x - 1, y: p.y },
            { x: p.x + 1, y: p.y },
        ];
        for (var _i = 0, neighbors_2 = neighbors; _i < neighbors_2.length; _i++) {
            var n = neighbors_2[_i];
            if (n.x < 0 || n.x >= constants_1.GRID_SIZE || n.y < 0 || n.y >= constants_1.GRID_SIZE)
                continue;
            var key = "".concat(n.x, ",").concat(n.y);
            if (!visited.has(key) && !obstacles.has(key)) {
                visited.add(key);
                queue.push(n);
            }
        }
    }
    return count;
};
var getDirection = function (from, to) {
    if (to.x < from.x)
        return types_1.Direction.LEFT;
    if (to.x > from.x)
        return types_1.Direction.RIGHT;
    if (to.y < from.y)
        return types_1.Direction.UP;
    if (to.y > from.y)
        return types_1.Direction.DOWN;
    return null;
};
var createObstacleSet = function (points) {
    return new Set(points.map(function (p) { return "".concat(p.x, ",").concat(p.y); }));
};
var getBestMove = function (snake, food) {
    var head = snake[0];
    var neighbors = [
        { x: head.x, y: head.y - 1, dir: types_1.Direction.UP },
        { x: head.x, y: head.y + 1, dir: types_1.Direction.DOWN },
        { x: head.x - 1, y: head.y, dir: types_1.Direction.LEFT },
        { x: head.x + 1, y: head.y, dir: types_1.Direction.RIGHT },
    ];
    // For initial valid move check, we assume we MIGHT NOT eat.
    // If we don't eat, tail moves. So we exclude tail from obstacles.
    var currentBodyObstacles = createObstacleSet(snake.slice(0, -1));
    var validNeighbors = neighbors.filter(function (n) {
        var inBounds = n.x >= 0 && n.x < constants_1.GRID_SIZE && n.y >= 0 && n.y < constants_1.GRID_SIZE;
        if (!inBounds)
            return false;
        return !currentBodyObstacles.has("".concat(n.x, ",").concat(n.y));
    });
    // STRATEGY 1: Find a SAFE path to food.
    var bestFoodMove = null;
    var _loop_1 = function (n) {
        var moveDir = n.dir;
        var startNode = { x: n.x, y: n.y };
        var staticSnakeObstacles = createObstacleSet(snake); // Treat snake as static for pathfinding
        var pathToFood = bfs(startNode, food, staticSnakeObstacles);
        if (pathToFood) {
            // Validate Safety: Can we reach tail after eating?
            var futureBodySet_1 = createObstacleSet(snake);
            pathToFood.forEach(function (p) { return futureBodySet_1.add("".concat(p.x, ",").concat(p.y)); });
            futureBodySet_1.delete("".concat(food.x, ",").concat(food.y)); // New Head
            var currentTail = snake[snake.length - 1];
            futureBodySet_1.delete("".concat(currentTail.x, ",").concat(currentTail.y)); // New Tail (Fixed)
            var pathToTail = bfs(food, currentTail, futureBodySet_1);
            if (pathToTail) {
                if (!bestFoodMove || pathToFood.length < bestFoodMove.length) {
                    bestFoodMove = { dir: moveDir, length: pathToFood.length };
                }
            }
        }
    };
    for (var _i = 0, validNeighbors_1 = validNeighbors; _i < validNeighbors_1.length; _i++) {
        var n = validNeighbors_1[_i];
        _loop_1(n);
    }
    if (bestFoodMove)
        return bestFoodMove.dir;
    // STRATEGY 2: Stall (Chase Tail)
    var bestStallMove = null;
    for (var _a = 0, validNeighbors_2 = validNeighbors; _a < validNeighbors_2.length; _a++) {
        var n = validNeighbors_2[_a];
        var moveDir = n.dir;
        var startNode = { x: n.x, y: n.y };
        var chaseTarget = snake[snake.length - 1]; // We chase the tail segment
        var stallObstacles = createObstacleSet(snake.slice(0, -1)); // Tail is moving, so it's a target, not obstacle
        var pathToTail = bfs(startNode, chaseTarget, stallObstacles);
        if (pathToTail) {
            // Prefer longest path to delay
            if (!bestStallMove || pathToTail.length > bestStallMove.length) {
                bestStallMove = { dir: moveDir, length: pathToTail.length };
            }
        }
    }
    if (bestStallMove)
        return bestStallMove.dir;
    // STRATEGY 3: Area Maximization (Flood Fill)
    // If we can't reach food safely and can't reach tail (very bad state), 
    // pick the neighbor that has the most open space to survive as long as possible.
    var bestAreaMove = null;
    for (var _b = 0, validNeighbors_3 = validNeighbors; _b < validNeighbors_3.length; _b++) {
        var n = validNeighbors_3[_b];
        var obstacles = createObstacleSet(snake.slice(0, -1));
        var area = getAccessibleArea({ x: n.x, y: n.y }, obstacles, snake.length * 2);
        if (!bestAreaMove || area > bestAreaMove.area) {
            bestAreaMove = { dir: n.dir, area: area };
        }
    }
    if (bestAreaMove)
        return bestAreaMove.dir;
    // Last Resort: Random valid
    if (validNeighbors.length > 0)
        return validNeighbors[0].dir;
    return null;
};
exports.getBestMove = getBestMove;
var checkCollision = function (head, snake, isGrowing) {
    if (isGrowing === void 0) { isGrowing = false; }
    // Wall collision
    if (head.x < 0 || head.x >= constants_1.GRID_SIZE || head.y < 0 || head.y >= constants_1.GRID_SIZE) {
        return true;
    }
    // Body collision
    // If we are growing (just ate), the tail does NOT move, so we must check against the full snake.
    // If we are NOT growing, the tail moves away, so we ignore the last segment.
    var checkLength = isGrowing ? snake.length : snake.length - 1;
    for (var i = 0; i < checkLength; i++) {
        if (isSamePoint(head, snake[i])) {
            return true;
        }
    }
    return false;
};
exports.checkCollision = checkCollision;
var spawnFood = function (snake) {
    var obstacleSet = createObstacleSet(snake);
    var food;
    // Try random first for performance
    for (var i = 0; i < 50; i++) {
        food = {
            x: Math.floor(Math.random() * constants_1.GRID_SIZE),
            y: Math.floor(Math.random() * constants_1.GRID_SIZE),
        };
        if (!obstacleSet.has("".concat(food.x, ",").concat(food.y)))
            return food;
    }
    // Exhaustive search
    var emptySpots = [];
    for (var x = 0; x < constants_1.GRID_SIZE; x++) {
        for (var y = 0; y < constants_1.GRID_SIZE; y++) {
            if (!obstacleSet.has("".concat(x, ",").concat(y))) {
                emptySpots.push({ x: x, y: y });
            }
        }
    }
    if (emptySpots.length === 0)
        return { x: -1, y: -1 };
    return emptySpots[Math.floor(Math.random() * emptySpots.length)];
};
exports.spawnFood = spawnFood;
