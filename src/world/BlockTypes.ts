/**
 * Типы блоков
 */
export enum BlockType {
  AIR = 0,
  SOLID = 1,

  // Дороги
  ROAD = 10,
  ROAD_LINE_H = 11,
  ROAD_LINE_V = 12,
  CROSSWALK = 13,
  SIDEWALK = 14,

  // Terrain
  GRASS = 20,
  DIRT = 21,
  SAND = 22,

  // Здания
  BUILDING_FLOOR = 30,
  BUILDING_WALL = 31,
  BUILDING_ROOF = 32,

  // Вода
  WATER = 40,
  DEEP_WATER = 41,

  // Наклоны
  SLOPE_N = 50,
  SLOPE_S = 51,
  SLOPE_E = 52,
  SLOPE_W = 53,

  // Особые
  OIL = 60,
  ICE = 61,
  MUD = 62,
}

/**
 * Типы поверхностей (влияют на физику)
 */
export enum SurfaceType {
  NONE = 0,
  ROAD = 1,
  GRASS = 2,
  DIRT = 3,
  ICE = 4,
  OIL = 5,
  WATER = 6,
  SAND = 7,
  MUD = 8,
}

/**
 * Типы коллизий
 */
export enum CollisionType {
  NONE = 0,      // Проходимый (воздух)
  SOLID = 1,     // Непроходимый
  SLOPE = 2,     // Наклон
  PLATFORM = 3,  // Можно пройти снизу
  WATER = 4,     // Вода (урон)
}

/**
 * Флаги блока
 */
export enum BlockFlags {
  NONE = 0,
  TRANSPARENT = 1 << 0,    // Прозрачный
  DESTRUCTIBLE = 1 << 1,   // Разрушаемый
  INTERACTIVE = 1 << 2,    // Интерактивный
  ANIMATED = 1 << 3,       // Анимированный
}
