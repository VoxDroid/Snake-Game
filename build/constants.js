"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_SPEED = exports.INITIAL_SNAKE = exports.CANVAS_SIZE = exports.CELL_SIZE = exports.GRID_SIZE = void 0;
exports.GRID_SIZE = 20;
exports.CELL_SIZE = 25;
exports.CANVAS_SIZE = exports.GRID_SIZE * exports.CELL_SIZE;
exports.INITIAL_SNAKE = [
    { x: 5, y: 10 },
    { x: 4, y: 10 },
    { x: 3, y: 10 },
];
exports.INITIAL_SPEED = 50; // ms per frame
