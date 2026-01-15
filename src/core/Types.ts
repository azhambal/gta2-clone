/**
 * 2D вектор
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * 3D вектор (для позиции с учётом высоты Z)
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Прямоугольная область
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Границы (AABB)
 */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Размеры
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Конфигурация игры
 */
export interface GameConfig {
  width: number;
  height: number;
  backgroundColor: number;
  targetFps: number;
}

/**
 * Игровые константы
 */
export const GAME_CONSTANTS = {
  BLOCK_SIZE: 64,           // Размер блока в пикселях
  CHUNK_SIZE: 16,           // Размер чанка в блоках
  MAP_DEPTH: 8,             // Количество уровней Z
  FIXED_TIMESTEP: 1000 / 60, // Фиксированный шаг времени (мс)
} as const;
