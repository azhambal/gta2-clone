import { query } from 'bitecs';
import type { GameWorld } from '../World.js';
import { PlayerControlled } from '../components/index.js';
import { Debug } from '../../utils/Debug.js';

/**
 * Система движения — применяет скорость к позиции
 */
export const createMovementSystem = () => {
  return (world: GameWorld, dt: number) => {
    const { Position, Velocity } = world.components;
    // Note: We need to filter manually if we only want Position+Velocity entites?
    // query(world, [Position, Velocity]) gets entities with BOTH.
    const entities = query(world, [Position, Velocity]);

    for (const eid of entities) {
      const prevX = Position.x[eid];
      const prevY = Position.y[eid];

      // Применяем скорость (dt в секундах)
      Position.x[eid] += Velocity.x[eid] * (dt / 1000);
      Position.y[eid] += Velocity.y[eid] * (dt / 1000);
      Position.z[eid] += Velocity.z[eid] * (dt / 1000);

      // Debug log for player
      if (world.components.PlayerControlled[eid] !== undefined) {
        if (Math.abs(Velocity.x[eid]) > 0.1 || Math.abs(Velocity.y[eid]) > 0.1) {
          Debug.log('Movement', `Player Vel: (${Velocity.x[eid].toFixed(2)}, ${Velocity.y[eid].toFixed(2)}) Pos: (${Position.x[eid].toFixed(2)}, ${Position.y[eid].toFixed(2)}) dt: ${dt}`);
        }
      }
    }

    return world;
  };
};

// Синглтон системы
export const movementSystem = createMovementSystem();
