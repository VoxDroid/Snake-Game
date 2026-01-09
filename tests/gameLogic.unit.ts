import { getBestMove } from '../utils/gameLogic';
import { Direction } from '../types';
import assert from 'assert';

// Test: When food is at right border and there is a path via the tail, ensure a valid move is found
(function testFoodOnBorder() {
    const snake = [
        {x:5,y:5},
        {x:4,y:5},
        {x:3,y:5},
        {x:2,y:5},
    ];
    const food = {x:9,y:5};
    const move = getBestMove(snake, food);
    console.log('food-on-border move:', move);
    assert(move !== null, 'Expected a non-null move when food is reachable at border');
    console.log('✅ testFoodOnBorder passed');
})();

(function testCornerFood() {
    const snake = [
        {x:1,y:1},
        {x:1,y:2},
        {x:1,y:3},
        {x:2,y:3},
        {x:3,y:3},
    ];
    const food = {x:0,y:0};
    const move = getBestMove(snake, food);
    console.log('corner-food move:', move);
    assert(move !== null, 'Expected a non-null move when corner food is reachable');
    console.log('✅ testCornerFood passed');
})();
