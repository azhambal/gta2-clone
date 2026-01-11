import type { Vector2 } from '../core/Types.js';
import { GAME_CONSTANTS } from '../core/Types.js';

const { BLOCK_SIZE } = GAME_CONSTANTS;

/**
 * Угол изометрической проекции (в GTA2 примерно 30°)
 */
export const ISO_ANGLE = 26.565; // arctan(0.5)
export const ISO_RATIO = 0.5;    // Соотношение высоты к ширине

/**
 * Утилиты для изометрической проекции
 */
export class IsometricUtils {
  /**
   * Конвертация мировых 3D координат в 2D экранные
   */
  public static worldToScreen(worldX: number, worldY: number, worldZ: number = 0): Vector2 {
    // В GTA2-стиле: плоский вид сверху с лёгким наклоном
    // X экрана = X мира
    // Y экрана = Y мира - Z * высота_блока (для поднятия объектов)
    return {
      x: worldX,
      y: worldY - worldZ * BLOCK_SIZE * ISO_RATIO,
    };
  }

  /**
   * Конвертация блочных координат в экранные
   */
  public static blockToScreen(blockX: number, blockY: number, blockZ: number = 0): Vector2 {
    const worldX = blockX * BLOCK_SIZE;
    const worldY = blockY * BLOCK_SIZE;
    return this.worldToScreen(worldX, worldY, blockZ);
  }

  /**
   * Конвертация экранных координат в мировые (для Z=0)
   */
  public static screenToWorld(screenX: number, screenY: number): Vector2 {
    // Обратное преобразование (для Z=0)
    return {
      x: screenX,
      y: screenY,
    };
  }

  /**
   * Вычисление глубины для сортировки (depth sorting)
   * Больше = ближе к камере = рисуется позже
   */
  public static calculateDepth(worldY: number, worldZ: number, spriteHeight: number = 0): number {
    // Объекты с большим Y (южнее) рисуются поверх
    // Объекты на большей высоте Z рисуются поверх
    return worldY + worldZ * 1000 + spriteHeight;
  }

  /**
   * Получение размеров блока на экране
   */
  public static getBlockScreenSize(): { width: number; topHeight: number; sideHeight: number } {
    return {
      width: BLOCK_SIZE,
      topHeight: BLOCK_SIZE,
      sideHeight: BLOCK_SIZE * ISO_RATIO,
    };
  }
}
