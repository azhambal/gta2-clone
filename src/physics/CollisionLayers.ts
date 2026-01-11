/**
 * Слои коллизий (битовые маски)
 */
export const CollisionLayer = {
  NONE: 0x0000,
  STATIC: 0x0001, // Стены, здания
  VEHICLE: 0x0002, // Машины
  PEDESTRIAN: 0x0004, // Пешеходы
  PROJECTILE: 0x0008, // Пули, снаряды
  PICKUP: 0x0010, // Подбираемые предметы
  TRIGGER: 0x0020, // Триггеры миссий
  SENSOR: 0x0040, // Сенсоры (без физики)
} as const;

/**
 * Категории коллизий для Matter.js
 */
export const CollisionCategory = {
  STATIC: 0x0001,
  VEHICLE: 0x0002,
  PEDESTRIAN: 0x0004,
  PROJECTILE: 0x0008,
  PICKUP: 0x0010,
  TRIGGER: 0x0020,
};

/**
 * Маски коллизий (с чем сталкивается)
 */
export const CollisionMask = {
  // Статичные объекты сталкиваются с машинами и пешеходами
  STATIC: CollisionCategory.VEHICLE | CollisionCategory.PEDESTRIAN,

  // Машины сталкиваются со всем кроме триггеров и пикапов
  VEHICLE:
    CollisionCategory.STATIC |
    CollisionCategory.VEHICLE |
    CollisionCategory.PEDESTRIAN |
    CollisionCategory.PROJECTILE,

  // Пешеходы
  PEDESTRIAN:
    CollisionCategory.STATIC |
    CollisionCategory.VEHICLE |
    CollisionCategory.PEDESTRIAN |
    CollisionCategory.PROJECTILE |
    CollisionCategory.PICKUP,

  // Пули сталкиваются с машинами, пешеходами и стенами
  PROJECTILE:
    CollisionCategory.STATIC |
    CollisionCategory.VEHICLE |
    CollisionCategory.PEDESTRIAN,

  // Пикапы только с пешеходами и машинами
  PICKUP: CollisionCategory.PEDESTRIAN | CollisionCategory.VEHICLE,
};
