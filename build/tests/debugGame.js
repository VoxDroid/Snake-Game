"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var gameLogic_1 = require("../utils/gameLogic");
var types_1 = require("../types");
var dirToStr = function (d) { return d === null ? 'null' : types_1.Direction[d]; };
// Scenario 1: Snake in middle, food at right border
var snake1 = [
    { x: 5, y: 5 },
    { x: 4, y: 5 },
    { x: 3, y: 5 },
    { x: 2, y: 5 },
];
var food1 = { x: 9, y: 5 }; // border (assuming GRID_SIZE=10)
console.log('Scenario 1 move:', dirToStr((0, gameLogic_1.getBestMove)(snake1, food1)));
// Scenario 2: Snake hugging top wall, food in corner
var snake2 = [
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 1, y: 3 },
    { x: 2, y: 3 },
    { x: 3, y: 3 },
];
var food2 = { x: 0, y: 0 };
console.log('Scenario 2 move:', dirToStr((0, gameLogic_1.getBestMove)(snake2, food2)));
// Scenario 3: Complex near-tail path via tail cell
var snake3 = [
    { x: 5, y: 5 },
    { x: 5, y: 6 },
    { x: 5, y: 7 },
    { x: 4, y: 7 },
    { x: 3, y: 7 },
    { x: 3, y: 6 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
];
var food3 = { x: 6, y: 5 }; // border-ish
console.log('Scenario 3 move:', dirToStr((0, gameLogic_1.getBestMove)(snake3, food3)));
// Show spawned food doesn't pick an occupied tile
var spawned = (0, gameLogic_1.spawnFood)(snake1);
console.log('Spawned food:', spawned);
