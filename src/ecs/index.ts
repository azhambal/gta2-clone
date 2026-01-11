export { ECSWorld, ecsWorld, type GameWorld } from './World.js';
export { SystemManager } from './SystemManager.js';
export { EntityFactory } from './EntityFactory.js';

// Компоненты
export * from './components/index.js';

// Системы
export { movementSystem } from './systems/MovementSystem.js';
export { animationSystem } from './systems/AnimationSystem.js';
