# Changelog

## Unreleased

- Fix: Avoid treating the tail as an immovable obstacle when pathfinding to food; this prevented the AI from finding valid paths when food was placed on borders/corners. (Fixed in `utils/gameLogic.ts`)
