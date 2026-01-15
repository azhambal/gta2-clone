/**
 * SlopeUtils - Утилиты для работы с наклонными блоками (slopes)
 *
 * Позволяет вычислять Z-координату на наклонном блоке в зависимости
 * от позиции внутри блока и направления наклона.
 */

import { BlockType } from './BlockTypes';
import { GAME_CONSTANTS } from '../core/Types';

const { BLOCK_SIZE } = GAME_CONSTANTS;

/**
 * Направление наклона блока
 */
export enum SlopeDirection {
  NORTH = 0, // Подъём на север (въезд с юга) - Z увеличивается к северу
  SOUTH = 1, // Подъём на юг (въезд с севера) - Z увеличивается к югу
  EAST = 2,  // Подъём на восток (въезд с запада) - Z увеличивается к востоку
  WEST = 3,  // Подъём на запад (въезд с востока) - Z увеличивается к западу
}

/**
 * Получить направление наклона по типу блока
 */
export function getSlopeDirection(blockType: BlockType): SlopeDirection | null {
  switch (blockType) {
    case BlockType.SLOPE_N:
      return SlopeDirection.NORTH;
    case BlockType.SLOPE_S:
      return SlopeDirection.SOUTH;
    case BlockType.SLOPE_E:
      return SlopeDirection.EAST;
    case BlockType.SLOPE_W:
      return SlopeDirection.WEST;
    default:
      return null;
  }
}

/**
 * Вычислить Z-координату на наклонном блоке
 *
 * @param localX - Позиция X внутри блока (0-64)
 * @param localY - Позиция Y внутри блока (0-64)
 * @param slopeDirection - Направление наклона
 * @param baseZ - Базовый Z-уровень блока
 * @returns Z-координата с учётом наклона (baseZ до baseZ + 1)
 */
export function calculateZOnSlope(
  localX: number,
  localY: number,
  slopeDirection: SlopeDirection,
  baseZ: number,
): number {
  let progress = 0;

  switch (slopeDirection) {
    case SlopeDirection.NORTH:
      // С юга на север: Z увеличивается при движении на север (Y уменьшается)
      progress = 1 - localY / BLOCK_SIZE;
      break;
    case SlopeDirection.SOUTH:
      // С севера на юг: Z увеличивается при движении на юг (Y увеличивается)
      progress = localY / BLOCK_SIZE;
      break;
    case SlopeDirection.EAST:
      // С запада на восток: Z увеличивается при движении на восток (X увеличивается)
      progress = localX / BLOCK_SIZE;
      break;
    case SlopeDirection.WEST:
      // С востока на запад: Z увеличивается при движении на запад (X уменьшается)
      progress = 1 - localX / BLOCK_SIZE;
      break;
  }

  return baseZ + progress;
}

/**
 * Вычислить высоту (Z offset) над базовым уровнем на наклоне
 *
 * @param localX - Позиция X внутри блока (0-64)
 * @param localY - Позиция Y внутри блока (0-64)
 * @param slopeDirection - Направление наклона
 * @returns Высота над базовым уровнем (0.0 - 1.0)
 */
export function calculateHeightOnSlope(
  localX: number,
  localY: number,
  slopeDirection: SlopeDirection,
): number {
  let progress = 0;

  switch (slopeDirection) {
    case SlopeDirection.NORTH:
      progress = 1 - localY / BLOCK_SIZE;
      break;
    case SlopeDirection.SOUTH:
      progress = localY / BLOCK_SIZE;
      break;
    case SlopeDirection.EAST:
      progress = localX / BLOCK_SIZE;
      break;
    case SlopeDirection.WEST:
      progress = 1 - localX / BLOCK_SIZE;
      break;
  }

  return progress;
}

/**
 * Проверить, находится ли точка внутри наклонного блока
 *
 * @param blockX - X координата блока
 * @param blockY - Y координата блока
 * @param worldX - Мировая X координата точки
 * @param worldY - Мировая Y координата точки
 * @returns true, если точка внутри блока
 */
export function isPointInBlock(
  blockX: number,
  blockY: number,
  worldX: number,
  worldY: number,
): boolean {
  const localX = worldX - blockX * BLOCK_SIZE;
  const localY = worldY - blockY * BLOCK_SIZE;
  return localX >= 0 && localX < BLOCK_SIZE && localY >= 0 && localY < BLOCK_SIZE;
}

/**
 * Получить локальные координаты внутри блока
 *
 * @param worldX - Мировая X координата
 * @param worldY - Мировая Y координата
 * @returns Локальные координаты {x, y} в пределах блока (0-64)
 */
export function getLocalCoordinates(worldX: number, worldY: number): { x: number; y: number } {
  const x = ((worldX % BLOCK_SIZE) + BLOCK_SIZE) % BLOCK_SIZE;
  const y = ((worldY % BLOCK_SIZE) + BLOCK_SIZE) % BLOCK_SIZE;
  return { x, y };
}

/**
 * Вычислить вектор нормали наклонной плоскости
 *
 * @param slopeDirection - Направление наклона
 * @returns Вектор нормали {x, y, z}
 */
export function getSlopeNormal(slopeDirection: SlopeDirection): { x: number; y: number; z: number } {
  // Для стандартного наклона 26.565° (отношение 1:2)
  const rise = 1; // Подъём на 1 блок
  const run = 2; // На протяжении 2 блоков

  switch (slopeDirection) {
    case SlopeDirection.NORTH:
      // Наклон к северу (вверх по -Y)
      return { x: 0, y: -run, z: rise };
    case SlopeDirection.SOUTH:
      // Наклон к югу (вверх по +Y)
      return { x: 0, y: run, z: rise };
    case SlopeDirection.EAST:
      // Наклон к востоку (вверх по +X)
      return { x: run, y: 0, z: rise };
    case SlopeDirection.WEST:
      // Наклон к западу (вверх по -X)
      return { x: -run, y: 0, z: rise };
  }
}

/**
 * Вычислить угол наклона в градусах
 *
 * @returns Угол наклона в градусах (~26.565° для стандартного наклона)
 */
export function getSlopeAngle(): number {
  // atan(1/2) ≈ 26.565°
  return Math.atan(1 / 2) * (180 / Math.PI);
}
