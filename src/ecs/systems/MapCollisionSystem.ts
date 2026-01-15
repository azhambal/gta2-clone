import { query } from 'bitecs';
import type { GameWorld } from '../World.js';
import type { GameMap } from '../../world/GameMap.js';
import { blockRegistry } from '../../world/BlockRegistry.js';
import { CollisionType } from '../../world/BlockTypes.js';
import { GAME_CONSTANTS } from '../../core/Types.js';
import { Position, Velocity, Collider } from '../components/index.js';
import { eventBus } from '../../core/EventBus.js';

const { BLOCK_SIZE } = GAME_CONSTANTS;

/**
 * Minimum penetration depth to trigger collision response
 * Prevents jittering from floating-point precision issues
 */
const MIN_PENETRATION_THRESHOLD = 0.5;

/**
 * Position correction factor (0-1)
 * Lower values provide smoother correction over multiple frames
 */
const POSITION_CORRECTION_FACTOR = 0.8;

/**
 * Результат проверки коллизии
 */
interface CollisionResult {
  collided: boolean;
  normalX: number;
  normalY: number;
  penetration: number;
  blockX: number;
  blockY: number;
  blockZ: number;
}

/**
 * Создание системы коллизий с картой
 *
 * IMPORTANT: This system runs AFTER MovementSystem, so Position is already updated.
 * We check if the CURRENT position (after movement) is colliding, and if so,
 * push the entity out and stop velocity in the direction of the collision.
 */
export const createMapCollisionSystem = (gameMap: GameMap) => {
  return (world: GameWorld, _dt: number) => {
    const entities = query(world, [Position, Velocity, Collider]);

    for (const eid of entities) {
      // Get CURRENT position (already updated by MovementSystem)
      const x = Position.x[eid];
      const y = Position.y[eid];
      const z = Math.floor(Position.z[eid]);

      // Get collider radius
      const colliderType = Collider.type[eid];
      const radius = colliderType === 2 ? Collider.radius[eid] : Collider.width[eid] / 2;

      // Check if current position is colliding
      const collisionResult = checkCurrentPositionCollision(gameMap, x, y, z, radius);

      if (collisionResult.collided) {
        // Apply collision response
        applyCollisionResponse(eid, collisionResult);

        // Emit collision event
        eventBus.emit('collision:map', {
          entity: eid,
          blockX: collisionResult.blockX,
          blockY: collisionResult.blockY,
          blockZ: collisionResult.blockZ,
          normalX: collisionResult.normalX,
          normalY: collisionResult.normalY,
          penetration: collisionResult.penetration,
        });
      }
    }

    return world;
  };
};

/**
 * Check if the current position is colliding with the map
 */
function checkCurrentPositionCollision(
  map: GameMap,
  x: number,
  y: number,
  z: number,
  radius: number,
): CollisionResult {
  const result: CollisionResult = {
    collided: false,
    normalX: 0,
    normalY: 0,
    penetration: 0,
    blockX: 0,
    blockY: 0,
    blockZ: z,
  };

  // Определение блоков для проверки
  const minBlockX = Math.floor((x - radius) / BLOCK_SIZE);
  const maxBlockX = Math.floor((x + radius) / BLOCK_SIZE);
  const minBlockY = Math.floor((y - radius) / BLOCK_SIZE);
  const maxBlockY = Math.floor((y + radius) / BLOCK_SIZE);

  for (let bx = minBlockX; bx <= maxBlockX; bx++) {
    for (let by = minBlockY; by <= maxBlockY; by++) {
      const block = map.getBlock(bx, by, z);
      const blockDef = blockRegistry.get(block.getType());

      // Проверка только твёрдых блоков (SLOPE = 2 не блокирует движение)
      if (!blockDef || blockDef.collision !== CollisionType.SOLID) {
        continue;
      }

      // Границы блока
      const blockLeft = bx * BLOCK_SIZE;
      const blockRight = (bx + 1) * BLOCK_SIZE;
      const blockTop = by * BLOCK_SIZE;
      const blockBottom = (by + 1) * BLOCK_SIZE;

      // AABB vs Circle collision - Find closest point on block to circle center
      const closestX = Math.max(blockLeft, Math.min(x, blockRight));
      const closestY = Math.max(blockTop, Math.min(y, blockBottom));

      const distX = x - closestX;
      const distY = y - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq < radius * radius) {
        result.collided = true;
        result.blockX = bx;
        result.blockY = by;

        const dist = Math.sqrt(distSq);
        if (dist > 0) {
          // Normal points FROM wall TO entity (push direction)
          result.normalX = distX / dist;
          result.normalY = distY / dist;
          result.penetration = radius - dist;
        } else {
          // Entity center is inside the block - push towards center
          // Find the closest edge
          const distToLeft = x - blockLeft;
          const distToRight = blockRight - x;
          const distToTop = y - blockTop;
          const distToBottom = blockBottom - y;

          const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

          if (minDist === distToLeft) {
            result.normalX = -1;
            result.normalY = 0;
          } else if (minDist === distToRight) {
            result.normalX = 1;
            result.normalY = 0;
          } else if (minDist === distToTop) {
            result.normalX = 0;
            result.normalY = -1;
          } else {
            result.normalX = 0;
            result.normalY = 1;
          }
          result.penetration = radius + minDist;
        }

        return result;
      }
    }
  }

  return result;
}

/**
 * Apply collision response to an entity
 * Pushes entity out of collision AND stops velocity in the collision direction
 */
function applyCollisionResponse(eid: number, collision: CollisionResult): void {
  // Skip tiny penetrations to prevent jitter
  if (collision.penetration < MIN_PENETRATION_THRESHOLD) {
    return;
  }

  const nx = collision.normalX;
  const ny = collision.normalY;
  const vx = Velocity.x[eid];
  const vy = Velocity.y[eid];

  // Calculate velocity component along the normal
  const velAlongNormal = vx * nx + vy * ny;

  // Only apply response if moving toward the wall (velocity opposes normal)
  // Normal points FROM wall TO entity, so velAlongNormal < 0 means moving INTO wall
  if (velAlongNormal < 0) {
    // === POSITION CORRECTION ===
    // Push entity out of collision
    const correctionAmount = collision.penetration * POSITION_CORRECTION_FACTOR;
    Position.x[eid] += nx * correctionAmount;
    Position.y[eid] += ny * correctionAmount;

    // === VELOCITY RESPONSE ===
    // Remove velocity component toward the wall (set to 0, not just reduce)
    // This prevents the shaking/stuck behavior!
    // Formula: newVelocity = velocity - (velocity · normal) × normal
    const newVx = vx - velAlongNormal * nx;
    const newVy = vy - velAlongNormal * ny;

    // Apply a small amount of friction to the remaining velocity (sliding)
    const SLIDING_FRICTION = 0.9;
    Velocity.x[eid] = newVx * SLIDING_FRICTION;
    Velocity.y[eid] = newVy * SLIDING_FRICTION;
  }
}

/**
 * Вспомогательная функция: проверка, можно ли двигаться в точку
 */
export function canMoveTo(
  map: GameMap,
  x: number,
  y: number,
  z: number,
  radius: number,
): boolean {
  const minBlockX = Math.floor((x - radius) / BLOCK_SIZE);
  const maxBlockX = Math.floor((x + radius) / BLOCK_SIZE);
  const minBlockY = Math.floor((y - radius) / BLOCK_SIZE);
  const maxBlockY = Math.floor((y + radius) / BLOCK_SIZE);

  for (let bx = minBlockX; bx <= maxBlockX; bx++) {
    for (let by = minBlockY; by <= maxBlockY; by++) {
      const block = map.getBlock(bx, by, z);
      const blockDef = blockRegistry.get(block.getType());

      // SLOPE = 2 не блокирует движение
      if (!blockDef || blockDef.collision !== CollisionType.SOLID) {
        continue;
      }

      // Проверяем пересечение с блоком
      const blockLeft = bx * BLOCK_SIZE;
      const blockRight = (bx + 1) * BLOCK_SIZE;
      const blockTop = by * BLOCK_SIZE;
      const blockBottom = (by + 1) * BLOCK_SIZE;

      const closestX = Math.max(blockLeft, Math.min(x, blockRight));
      const closestY = Math.max(blockTop, Math.min(y, blockBottom));

      const distSq = (x - closestX) ** 2 + (y - closestY) ** 2;
      if (distSq < radius * radius) {
        return false;
      }
    }
  }

  return true;
}
