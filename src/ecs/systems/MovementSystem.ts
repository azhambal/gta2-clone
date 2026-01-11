import { query } from 'bitecs';
import type { GameWorld } from '../World.js';

/**
 * Система движения — применяет скорость к позиции
 */
export const createMovementSystem = () => {
  return (world: GameWorld, dt: number) => {
    const { Position, Velocity } = world.components;
    const entities = query(world, [Position, Velocity]);

    for (const eid of entities) {
      // Применяем скорость (dt в секундах)
      Position.x[eid] += Velocity.x[eid] * (dt / 1000);
      Position.y[eid] += Velocity.y[eid] * (dt / 1000);
      Position.z[eid] += Velocity.z[eid] * (dt / 1000);
    }

    return world;
  };
};

// Синглтон системы
export const movementSystem = createMovementSystem();
