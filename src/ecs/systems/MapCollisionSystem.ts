import { query } from 'bitecs';
import type { GameWorld } from '../World.js';
import type { GameMap } from '../../world/GameMap.js';
import { blockRegistry } from '../../world/BlockRegistry.js';
import { CollisionType } from '../../world/BlockTypes.js';
import { GAME_CONSTANTS } from '../../core/Types.js';

const { BLOCK_SIZE } = GAME_CONSTANTS;

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
 */
export const createMapCollisionSystem = (gameMap: GameMap) => {
  return (world: GameWorld, dt: number) => {
    const { Position, Velocity, Collider } = world.components;
    const entities = query(world, [Position, Velocity, Collider]);

    for (const eid of entities) {
      const x = Position.x[eid];
      const y = Position.y[eid];
      const z = Math.floor(Position.z[eid]);

      const vx = Velocity.x[eid];
      const vy = Velocity.y[eid];

      // Новая позиция после применения скорости
      const newX = x + vx * (dt / 1000);
      const newY = y + vy * (dt / 1000);

      // Радиус коллайдера (Circle = type 2, Box = type 1)
      const colliderType = Collider.type[eid];
      const radius = colliderType === 2 ? Collider.radius[eid] : Collider.width[eid] / 2;

      // Проверка коллизий по X
      const collisionX = checkAxisCollision(gameMap, x, y, z, newX, y, radius);
      if (collisionX.collided) {
        // Остановка по X и корректировка позиции
        Velocity.x[eid] = 0;
        Position.x[eid] = x + collisionX.normalX * collisionX.penetration;
      }

      // Проверка коллизий по Y
      const collisionY = checkAxisCollision(gameMap, x, y, z, x, newY, radius);
      if (collisionY.collided) {
        // Остановка по Y и корректировка позиции
        Velocity.y[eid] = 0;
        Position.y[eid] = y + collisionY.normalY * collisionY.penetration;
      }
    }

    return world;
  };
};

/**
 * Проверка коллизии по оси
 */
function checkAxisCollision(
  map: GameMap,
  oldX: number,
  oldY: number,
  z: number,
  newX: number,
  newY: number,
  radius: number
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
  const minBlockX = Math.floor((newX - radius) / BLOCK_SIZE);
  const maxBlockX = Math.floor((newX + radius) / BLOCK_SIZE);
  const minBlockY = Math.floor((newY - radius) / BLOCK_SIZE);
  const maxBlockY = Math.floor((newY + radius) / BLOCK_SIZE);

  for (let bx = minBlockX; bx <= maxBlockX; bx++) {
    for (let by = minBlockY; by <= maxBlockY; by++) {
      const block = map.getBlock(bx, by, z);
      const blockDef = blockRegistry.get(block.getType());

      // Проверка только твёрдых блоков
      if (!blockDef || blockDef.collision !== CollisionType.SOLID) {
        continue;
      }

      // Границы блока
      const blockLeft = bx * BLOCK_SIZE;
      const blockRight = (bx + 1) * BLOCK_SIZE;
      const blockTop = by * BLOCK_SIZE;
      const blockBottom = (by + 1) * BLOCK_SIZE;

      // AABB vs Circle collision
      const closestX = Math.max(blockLeft, Math.min(newX, blockRight));
      const closestY = Math.max(blockTop, Math.min(newY, blockBottom));

      const distX = newX - closestX;
      const distY = newY - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq < radius * radius) {
        result.collided = true;
        result.blockX = bx;
        result.blockY = by;

        const dist = Math.sqrt(distSq);
        if (dist > 0) {
          result.normalX = distX / dist;
          result.normalY = distY / dist;
          result.penetration = radius - dist;
        } else {
          // Внутри блока — выталкиваем к старой позиции
          const dx = newX - oldX;
          const dy = newY - oldY;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            result.normalX = -dx / len;
            result.normalY = -dy / len;
          }
          result.penetration = radius;
        }

        return result;
      }
    }
  }

  return result;
}

/**
 * Вспомогательная функция: проверка, можно ли двигаться в точку
 */
export function canMoveTo(
  map: GameMap,
  x: number,
  y: number,
  z: number,
  radius: number
): boolean {
  const minBlockX = Math.floor((x - radius) / BLOCK_SIZE);
  const maxBlockX = Math.floor((x + radius) / BLOCK_SIZE);
  const minBlockY = Math.floor((y - radius) / BLOCK_SIZE);
  const maxBlockY = Math.floor((y + radius) / BLOCK_SIZE);

  for (let bx = minBlockX; bx <= maxBlockX; bx++) {
    for (let by = minBlockY; by <= maxBlockY; by++) {
      const block = map.getBlock(bx, by, z);
      const blockDef = blockRegistry.get(block.getType());

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
