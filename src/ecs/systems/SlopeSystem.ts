import { query } from 'bitecs';
import type { GameWorld } from '../World.js';
import type { GameMap } from '../../world/GameMap.js';
import {
  getSlopeDirection,
  calculateZOnSlope,
  getLocalCoordinates,
} from '../../world/SlopeUtils.js';
import { blockRegistry } from '../../world/BlockRegistry.js';
import { CollisionType } from '../../world/BlockTypes.js';
import { GAME_CONSTANTS } from '../../core/Types.js';

const { BLOCK_SIZE } = GAME_CONSTANTS;

/**
 * SlopeSystem — система обработки наклонных блоков
 *
 * Обновляет Z-координату сущностей, находящихся на наклонных блоках.
 * Также обрабатывает падение с уступов.
 */
export const createSlopeSystem = (gameMap: GameMap) => {
  return (world: GameWorld) => {
    const { Position, Velocity } = world.components;

    // Запрос всех движущихся сущностей (позиция и скорость)
    const entities = query(world, [Position, Velocity]);

    for (const eid of entities) {
      const worldX = Position.x[eid];
      const worldY = Position.y[eid];
      const currentZ = Position.z[eid];

      // Проверяем, движется ли объект
      const isMoving = Math.abs(Velocity.x[eid]) > 0.1 || Math.abs(Velocity.y[eid]) > 0.1;

      // Координаты блока
      const blockX = Math.floor(worldX / BLOCK_SIZE);
      const blockY = Math.floor(worldY / BLOCK_SIZE);

      // Определяем целевой Z уровень
      let targetZ = currentZ;

      // Проверяем блок на текущем Z уровне
      const blockAtCurrentZ = gameMap.getBlock(blockX, blockY, Math.floor(currentZ));

      if (!blockAtCurrentZ.isAir()) {
        const blockDefAtCurrentZ = blockRegistry.get(blockAtCurrentZ.getType());
        const isSlope = blockDefAtCurrentZ?.collision === CollisionType.SLOPE;

        if (isSlope) {
          // Находимся на наклоне — вычисляем новую Z
          const slopeDir = getSlopeDirection(blockAtCurrentZ.getType());
          if (slopeDir !== null) {
            const localCoords = getLocalCoordinates(worldX, worldY);
            const baseZ = Math.floor(currentZ);
            targetZ = calculateZOnSlope(localCoords.x, localCoords.y, slopeDir, baseZ);

            // Плавно обновляем Z при движении по наклону
            Position.z[eid] = targetZ;
          }
        } else if (blockDefAtCurrentZ?.collision === CollisionType.SOLID) {
          // CollisionType.SOLID — твёрдый блок, остаёмся на этом уровне
          Position.z[eid] = Math.floor(currentZ);
        }
      } else {
        // Блок на текущем Z пуст — проверяем, нет ли блока ниже
        let foundGround = false;
        for (let checkZ = Math.floor(currentZ) - 1; checkZ >= 0; checkZ--) {
          const blockBelow = gameMap.getBlock(blockX, blockY, checkZ);
          if (!blockBelow.isAir()) {
            const blockDefBelow = blockRegistry.get(blockBelow.getType());
            const isSlopeBelow = blockDefBelow?.collision === CollisionType.SLOPE;
            const isSolidBelow = blockDefBelow?.collision === CollisionType.SOLID;

            if (isSlopeBelow || isSolidBelow) {
              // Нашли опору ниже
              if (isSlopeBelow) {
                const slopeDir = getSlopeDirection(blockBelow.getType());
                if (slopeDir !== null) {
                  const localCoords = getLocalCoordinates(worldX, worldY);
                  targetZ = calculateZOnSlope(localCoords.x, localCoords.y, slopeDir, checkZ);
                }
              } else {
                targetZ = checkZ;
              }

              // Плавное падение
              const fallSpeed = isMoving ? 0.15 : 0.05;
              if (currentZ > targetZ) {
                Position.z[eid] = Math.max(targetZ, currentZ - fallSpeed);
              }
              foundGround = true;
              break;
            }
          }
        }

        // Не нашли опору — падаем на землю
        if (!foundGround) {
          const groundLevel = gameMap.getGroundLevel(blockX, blockY);
          if (currentZ > groundLevel) {
            const fallSpeed = isMoving ? 0.2 : 0.1;
            Position.z[eid] = Math.max(groundLevel, currentZ - fallSpeed);
          } else {
            Position.z[eid] = groundLevel;
          }
        }
      }
    }

    return world;
  };
};

/**
 * Вспомогательная функция: получить Z-координату для позиции
 *
 * Учитывает наклонные блоки и возвращает корректную высоту.
 */
export function getZAtPosition(
  map: GameMap,
  worldX: number,
  worldY: number,
  currentZ: number
): number {
  const blockX = Math.floor(worldX / BLOCK_SIZE);
  const blockY = Math.floor(worldY / BLOCK_SIZE);
  const blockZ = Math.floor(currentZ);

  const block = map.getBlock(blockX, blockY, blockZ);
  const blockDef = blockRegistry.get(block.getType());

  if (blockDef?.collision === CollisionType.SLOPE) {
    // Наклонный блок
    const slopeDir = getSlopeDirection(block.getType());
    if (slopeDir !== null) {
      const localCoords = getLocalCoordinates(worldX, worldY);
      return calculateZOnSlope(localCoords.x, localCoords.y, slopeDir, blockZ);
    }
  }

  return currentZ;
}

/**
 * Вспомогательная функция: проверить, находится ли позиция на наклоне
 */
export function isOnSlope(map: GameMap, worldX: number, worldY: number, z: number): boolean {
  const blockX = Math.floor(worldX / BLOCK_SIZE);
  const blockY = Math.floor(worldY / BLOCK_SIZE);
  const blockZ = Math.floor(z);

  const block = map.getBlock(blockX, blockY, blockZ);
  const blockDef = blockRegistry.get(block.getType());

  return blockDef?.collision === CollisionType.SLOPE;
}
