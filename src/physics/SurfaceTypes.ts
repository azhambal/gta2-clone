/**
 * Типы поверхностей для физики транспорта
 *
 * Основано на спецификации из docs/implementation-plan/step-14-vehicle-physics.md
 *
 * Примечание: Этот enum использует значения, совместимые с BlockTypes.SurfaceType
 * Значения смещены на -1 для соответствия (BlockTypes.NONE = 0, PHYSICS.ROAD = 0)
 */

/**
 * Физический тип поверхности
 * Значения соответствуют BlockTypes.SurfaceType - 1 (кроме NONE)
 */
export enum SurfaceType {
  ROAD = 0,
  GRASS = 1,
  DIRT = 2,
  ICE = 3,
  OIL = 4,
  WATER = 5,
  SAND = 6,
  SNOW = 7, // Не в BlockTypes, но используется для physics
  MUD = 8,  // Альтернатива DIRT
}

/**
 * Параметры физики для поверхности
 */
export interface SurfaceProperties {
  /** Тип поверхности */
  type: SurfaceType;
  /** Название */
  name: string;
  /** Сцепление с дорогой (0.0 - 1.0) - влияет на занос */
  grip: number;
  /** Трение/замедление (0.0 - 1.0) - влияет на скорость */
  friction: number;
  /** Множитель скорости (0.0 - 1.0+) */
  speedFactor: number;
  /** Эффект (для визуализации/звука) */
  effect: string;
  /** Наносит ли урон */
  damaging: boolean;
  /** Урон в секунду (если damaging = true) */
  damagePerSecond: number;
}

/**
 * Определения всех типов поверхностей
 *
 * Based on implementation plan table:
 * | Surface | Grip | Friction | Effect |
 * |---------|------|----------|--------|
 * | Road    | 1.0  | 0.02     | Normal |
 * | Grass   | 0.7  | 0.05     | Slowdown |
 * | Ice     | 0.2  | 0.01     | Sliding |
 * | Oil     | 0.1  | 0.01     | No control |
 * | Water   | 0.5  | 0.10     | Splashes, damage |
 */
export const SURFACE_DEFINITIONS: Record<SurfaceType, SurfaceProperties> = {
  [SurfaceType.ROAD]: {
    type: SurfaceType.ROAD,
    name: 'Road',
    grip: 1.0,
    friction: 0.02,
    speedFactor: 1.0,
    effect: 'normal',
    damaging: false,
    damagePerSecond: 0,
  },

  [SurfaceType.GRASS]: {
    type: SurfaceType.GRASS,
    name: 'Grass',
    grip: 0.7,
    friction: 0.05,
    speedFactor: 0.8,
    effect: 'dust',
    damaging: false,
    damagePerSecond: 0,
  },

  [SurfaceType.DIRT]: {
    type: SurfaceType.DIRT,
    name: 'Dirt',
    grip: 0.6,
    friction: 0.04,
    speedFactor: 0.85,
    effect: 'dust_trail',
    damaging: false,
    damagePerSecond: 0,
  },

  [SurfaceType.ICE]: {
    type: SurfaceType.ICE,
    name: 'Ice',
    grip: 0.2,
    friction: 0.01,
    speedFactor: 1.2, // Скольжение - быстрее, но menos control
    effect: 'sliding',
    damaging: false,
    damagePerSecond: 0,
  },

  [SurfaceType.OIL]: {
    type: SurfaceType.OIL,
    name: 'Oil',
    grip: 0.1,
    friction: 0.01,
    speedFactor: 0.9,
    effect: 'slip',
    damaging: false,
    damagePerSecond: 0,
  },

  [SurfaceType.WATER]: {
    type: SurfaceType.WATER,
    name: 'Water',
    grip: 0.5,
    friction: 0.10,
    speedFactor: 0.4, // Сильное замедление
    effect: 'splash',
    damaging: true,
    damagePerSecond: 10,
  },

  [SurfaceType.SAND]: {
    type: SurfaceType.SAND,
    name: 'Sand',
    grip: 0.5,
    friction: 0.08,
    speedFactor: 0.5,
    effect: 'sand_spray',
    damaging: false,
    damagePerSecond: 0,
  },

  [SurfaceType.SNOW]: {
    type: SurfaceType.SNOW,
    name: 'Snow',
    grip: 0.4,
    friction: 0.03,
    speedFactor: 0.7,
    effect: 'snow_particles',
    damaging: false,
    damagePerSecond: 0,
  },

  [SurfaceType.MUD]: {
    type: SurfaceType.MUD,
    name: 'Mud',
    grip: 0.4,
    friction: 0.08,
    speedFactor: 0.6,
    effect: 'mud_splatter',
    damaging: false,
    damagePerSecond: 0,
  },
};

/**
 * Получить свойства поверхности по типу
 */
export function getSurfaceProperties(type: SurfaceType): SurfaceProperties {
  return SURFACE_DEFINITIONS[type];
}

/**
 * Рассчитать модифицированный grip с учётом поверхности
 */
export function calculateSurfaceGrip(baseGrip: number, surfaceType: SurfaceType): number {
  const surface = SURFACE_DEFINITIONS[surfaceType];
  return baseGrip * surface.grip;
}

/**
 * Рассчитать модифицированное трение с учётом поверхности
 */
export function calculateSurfaceFriction(baseFriction: number, surfaceType: SurfaceType): number {
  const surface = SURFACE_DEFINITIONS[surfaceType];
  return baseFriction + surface.friction;
}

/**
 * Рассчитать модифицированную максимальную скорость с учётом поверхности
 */
export function calculateSurfaceMaxSpeed(baseMaxSpeed: number, surfaceType: SurfaceType): number {
  const surface = SURFACE_DEFINITIONS[surfaceType];
  return baseMaxSpeed * surface.speedFactor;
}

/**
 * Проверить, наносит ли поверхность урон
 */
export function isSurfaceDamaging(surfaceType: SurfaceType): boolean {
  return SURFACE_DEFINITIONS[surfaceType].damaging;
}

/**
 * Получить урон от поверхности
 */
export function getSurfaceDamage(surfaceType: SurfaceType): number {
  return SURFACE_DEFINITIONS[surfaceType].damagePerSecond;
}
