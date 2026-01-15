/**
 * Типы для системы отладочных режимов запуска
 */

/**
 * Предустановленные режимы запуска
 */
export enum DebugMode {
  // Базовые уровни
  BARE_MINIMAL = 'BARE_MINIMAL',
  WORLD_ONLY = 'WORLD_ONLY',
  STATIC_ENTITIES = 'STATIC_ENTITIES',
  PLAYER_BASIC = 'PLAYER_BASIC',
  PLAYER_COLLISION = 'PLAYER_COLLISION',
  VEHICLES_ONLY = 'VEHICLES_ONLY',
  COMBAT_ONLY = 'COMBAT_ONLY',
  AI_ONLY = 'AI_ONLY',
  COLLISION_STRESS = 'COLLISION_STRESS',
  GAMEPLAY_BASIC = 'GAMEPLAY_BASIC',
  AI_INTERACTION = 'AI_INTERACTION',
  COMBAT_AI = 'COMBAT_AI',
  FULL_GAME = 'FULL_GAME',

  // Изолированные режимы
  PHYSICS_ONLY = 'PHYSICS_ONLY',
  RENDERER_ONLY = 'RENDERER_ONLY',
  AI_DEBUG = 'AI_DEBUG',
  COLLISION_DEBUG = 'COLLISION_DEBUG',
  Z_LEVELS_TEST = 'Z_LEVELS_TEST',
  WEAPONS_TEST = 'WEAPONS_TEST',
  VEHICLE_TEST = 'VEHICLE_TEST',

  // Комбинированные режимы
  NO_VEHICLES = 'NO_VEHICLES',
  NO_AI = 'NO_AI',
  NO_COLLISION = 'NO_COLLISION',
  NO_BUILDINGS = 'NO_BUILDINGS',
  NO_ENVIRONMENT = 'NO_ENVIRONMENT',
  PEDESTRIANS_ONLY = 'PEDESTRIANS_ONLY',
  TRAFFIC_ONLY = 'TRAFFIC_ONLY',

  // Специальные режимы
  GOD_MODE = 'GOD_MODE',
  SANDBOX = 'SANDBOX',
  SLOW_MOTION = 'SLOW_MOTION',
  FRAME_BY_FRAME = 'FRAME_BY_FRAME',
  PERFORMANCE_TEST = 'PERFORMANCE_TEST',
  MEMORY_TEST = 'MEMORY_TEST',

  // Производительность
  LOW_END = 'LOW_END',
  HIGH_END = 'HIGH_END',
  BENCHMARK = 'BENCHMARK',
}

/**
 * Конфигурация систем
 */
export interface SystemsConfig {
  renderer: boolean;
  map: boolean;
  entities: boolean;
  input: boolean;
  physics: boolean;
  collision: boolean;
  vehicle: boolean;
  weapon: boolean;
  projectile: boolean;
  health: boolean;
  ai: boolean;
  audio: boolean;
  ui: boolean;
  districts: boolean;
  spawning: boolean;
  surfaceEffects: boolean;
  slopes: boolean;
}

/**
 * Конфигурация спавна
 */
export interface SpawnConfig {
  player: boolean;
  playerStartsInVehicle?: boolean;
  playerInvulnerable?: boolean;
  playerCollisionsDisabled?: boolean;
  vehicles: number | 'auto';
  vehicleType?: 'normal' | 'static' | 'all_ai';
  pedestrians: number | 'auto';
  targets?: number;
}

/**
 * Конфигурация игрока
 */
export interface PlayerConfig {
  godMode: boolean;
  invulnerable: boolean;
  infiniteAmmo: boolean;
  allWeapons: boolean;
  canFly: boolean;
  noclip: boolean;
  instantVehicleEnter: boolean;
  startingWeapons?: string[];
}

/**
 * Конфигурация мира
 */
export interface WorldConfig {
  mapType?: string;
  mapSize?: 'small' | 'medium' | 'large';
  generateBuildings?: boolean;
  generateRoads?: boolean;
  generateProps?: boolean;
  timeOfDay?: 'day' | 'night' | 'sunset' | 'sunrise';
}

/**
 * Конфигурация AI
 */
export interface AIConfig {
  traffic: boolean;
  pedestrians: boolean;
  hostile?: boolean;
  canShoot?: boolean;
  debug?: boolean;
}

/**
 * Конфигурация транспорта
 */
export interface VehicleConfig {
  enableAI: boolean;
  enablePhysics: boolean;
  indestructible?: boolean;
  allTypesUnlocked?: boolean;
  instantEnter?: boolean;
}

/**
 * Конфигурация отладки
 */
export interface DebugConfig {
  collision: boolean;
  ai: boolean;
  physics: boolean;
  zLevels: boolean;
  fps: boolean;
  memory: boolean;
  showColliders?: boolean;
  showNormals?: boolean;
  showStates?: boolean;
  showTargets?: boolean;
  showPaths?: boolean;
  showWaypoints?: boolean;
  showVelocity?: boolean;
  logCollisions?: boolean;
  logStateChanges?: boolean;
  slowMotion?: number;
}

/**
 * Конфигурация времени
 */
export interface TimeConfig {
  scale: number;
  paused: boolean;
  advanceOnInput?: boolean;
}

/**
 * Конфигурация производительности
 */
export interface PerformanceConfig {
  targetFPS: number;
  drawDistance: number;
  particleQuality: 'low' | 'medium' | 'high';
  showStats: boolean;
  logStats: boolean;
}

/**
 * Полная конфигурация режима отладки
 */
export interface DebugLaunchConfig {
  mode: DebugMode;
  description: string;

  systems: SystemsConfig;
  spawn: SpawnConfig;
  player?: PlayerConfig;
  world?: WorldConfig;
  ai?: AIConfig;
  vehicle?: VehicleConfig;
  debug?: Partial<DebugConfig>;
  time?: Partial<TimeConfig>;
  performance?: PerformanceConfig;

  // Песочница
  sandbox?: {
    spawnMenu: boolean;
    canSpawnAnyEntity: boolean;
    canModifyMap: boolean;
  };

  // Бенчмарк
  benchmark?: {
    scenarios: string[];
    duration: number;
    autoReport: boolean;
  };
}

/**
 * Значения по умолчанию для конфигурации
 */
export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  godMode: false,
  invulnerable: false,
  infiniteAmmo: false,
  allWeapons: false,
  canFly: false,
  noclip: false,
  instantVehicleEnter: false,
};

export const DEFAULT_DEBUG_CONFIG: DebugConfig = {
  collision: false,
  ai: false,
  physics: false,
  zLevels: false,
  fps: true,
  memory: false,
};

export const DEFAULT_TIME_CONFIG: TimeConfig = {
  scale: 1.0,
  paused: false,
};

/**
 * Предустановленные конфигурации режимов
 */
export const DEBUG_MODE_PRESETS: Record<DebugMode, DebugLaunchConfig> = {
  // === Базовые уровни ===

  [DebugMode.BARE_MINIMAL]: {
    mode: DebugMode.BARE_MINIMAL,
    description: 'Минимальный запуск - проверка инициализации PixiJS',
    systems: {
      renderer: true, map: false, entities: false, input: false,
      physics: false, collision: false, vehicle: false, weapon: false,
      projectile: false, health: false, ai: false, audio: false,
      ui: false, districts: false, spawning: false, surfaceEffects: false, slopes: false,
    },
    spawn: { player: false, vehicles: 0, pedestrians: 0 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.WORLD_ONLY]: {
    mode: DebugMode.WORLD_ONLY,
    description: 'Только карта - проверка генерации и рендеринга блоков',
    systems: {
      renderer: true, map: true, entities: false, input: false,
      physics: false, collision: false, vehicle: false, weapon: false,
      projectile: false, health: false, ai: false, audio: false,
      ui: false, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: false, vehicles: 0, pedestrians: 0 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: false, ai: false, physics: false, zLevels: true, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.STATIC_ENTITIES]: {
    mode: DebugMode.STATIC_ENTITIES,
    description: 'Карта + статические сущности',
    systems: {
      renderer: true, map: true, entities: true, input: false,
      physics: false, collision: false, vehicle: false, weapon: false,
      projectile: false, health: false, ai: false, audio: false,
      ui: false, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: false, vehicles: 10, pedestrians: 0, vehicleType: 'static' },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.PLAYER_BASIC]: {
    mode: DebugMode.PLAYER_BASIC,
    description: 'Игрок с базовым движением без коллизий',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: false, collision: false, vehicle: true, weapon: false,
      projectile: false, health: false, ai: false, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, vehicles: 0, pedestrians: 0 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.PLAYER_COLLISION]: {
    mode: DebugMode.PLAYER_COLLISION,
    description: 'Игрок с коллизией со стенами',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: false, collision: true, vehicle: false, weapon: false,
      projectile: false, health: false, ai: false, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, vehicles: 0, pedestrians: 0 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: true, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.VEHICLES_ONLY]: {
    mode: DebugMode.VEHICLES_ONLY,
    description: 'Игрок + машины без других сущностей',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: false,
      projectile: false, health: false, ai: false, audio: true,
      ui: true, districts: false, spawning: false, surfaceEffects: true, slopes: true,
    },
    spawn: { player: true, playerStartsInVehicle: true, vehicles: 5, pedestrians: 0 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    vehicle: { enableAI: false, enablePhysics: true },
    debug: { collision: false, ai: false, physics: true, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.COMBAT_ONLY]: {
    mode: DebugMode.COMBAT_ONLY,
    description: 'Игрок + оружие + статические мишени',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: false, collision: true, vehicle: false, weapon: true,
      projectile: true, health: true, ai: false, audio: true,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, playerInvulnerable: true, vehicles: 0, pedestrians: 10, targets: 20 },
    player: { godMode: false, invulnerable: true, infiniteAmmo: true, allWeapons: false, startingWeapons: ['pistol', 'uzi', 'shotgun'], canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false, showColliders: true },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.AI_ONLY]: {
    mode: DebugMode.AI_ONLY,
    description: 'Только AI системы, игрок наблюдатель',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: false,
      projectile: false, health: false, ai: true, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, playerInvulnerable: true, playerCollisionsDisabled: true, vehicles: 20, pedestrians: 50 },
    ai: { traffic: true, pedestrians: true, debug: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: true, physics: false, zLevels: false, fps: true, memory: false, showStates: true, showTargets: true, showPaths: true },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.COLLISION_STRESS]: {
    mode: DebugMode.COLLISION_STRESS,
    description: 'Стресс-тест коллизий',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: false, weapon: false,
      projectile: false, health: false, ai: false, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, vehicles: 50, pedestrians: 200 },
    debug: { collision: true, ai: false, physics: false, zLevels: false, fps: true, memory: true, showColliders: true, logCollisions: true },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.GAMEPLAY_BASIC]: {
    mode: DebugMode.GAMEPLAY_BASIC,
    description: 'Полный базовый геймплей',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: false, audio: true,
      ui: true, districts: false, spawning: false, surfaceEffects: true, slopes: true,
    },
    spawn: { player: true, vehicles: 10, pedestrians: 0 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.AI_INTERACTION]: {
    mode: DebugMode.AI_INTERACTION,
    description: 'Игрок + AI системы',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: false,
      projectile: false, health: true, ai: true, audio: true,
      ui: true, districts: true, spawning: false, surfaceEffects: true, slopes: true,
    },
    spawn: { player: true, vehicles: 15, pedestrians: 30 },
    ai: { traffic: true, pedestrians: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.COMBAT_AI]: {
    mode: DebugMode.COMBAT_AI,
    description: 'Боевая система + AI противники',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: true, audio: true,
      ui: true, districts: true, spawning: false, surfaceEffects: true, slopes: true,
    },
    spawn: { player: true, playerStartsInVehicle: true, vehicles: 10, pedestrians: 20 },
    ai: { traffic: true, pedestrians: true, hostile: true, canShoot: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: true, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.FULL_GAME]: {
    mode: DebugMode.FULL_GAME,
    description: 'Полная игра со всеми системами',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: true, audio: true,
      ui: true, districts: true, spawning: true, surfaceEffects: true, slopes: true,
    },
    spawn: { player: true, vehicles: 'auto', pedestrians: 'auto' },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    ai: { traffic: true, pedestrians: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
    performance: { targetFPS: 60, drawDistance: 1.0, particleQuality: 'medium', showStats: false, logStats: false },
  },

  // === Изолированные режимы ===

  [DebugMode.PHYSICS_ONLY]: {
    mode: DebugMode.PHYSICS_ONLY,
    description: 'Только физика Matter.js',
    systems: {
      renderer: true, map: true, entities: true, input: false,
      physics: true, collision: true, vehicle: false, weapon: false,
      projectile: false, health: false, ai: false, audio: false,
      ui: false, districts: false, spawning: false, surfaceEffects: false, slopes: false,
    },
    spawn: { player: false, vehicles: 20, pedestrians: 0 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: true, ai: false, physics: true, zLevels: false, fps: true, memory: false, showColliders: true, showVelocity: true },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.RENDERER_ONLY]: {
    mode: DebugMode.RENDERER_ONLY,
    description: 'Тест рендеринга без логики',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: false, collision: false, vehicle: false, weapon: false,
      projectile: false, health: false, ai: false, audio: false,
      ui: false, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, vehicles: 100, pedestrians: 200, vehicleType: 'static' },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: true },
    time: { scale: 1.0, paused: false },
    performance: { targetFPS: 60, drawDistance: 2.0, particleQuality: 'high', showStats: true, logStats: true },
  },

  [DebugMode.AI_DEBUG]: {
    mode: DebugMode.AI_DEBUG,
    description: 'AI с максимальной отладочной информацией',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: false,
      projectile: false, health: false, ai: true, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, playerInvulnerable: true, vehicles: 10, pedestrians: 20 },
    ai: { traffic: true, pedestrians: true, debug: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: true, physics: false, zLevels: false, fps: true, memory: false, showStates: true, showTargets: true, showPaths: true, showWaypoints: true, logStateChanges: true },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.COLLISION_DEBUG]: {
    mode: DebugMode.COLLISION_DEBUG,
    description: 'Максимальная отладка коллизий',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: false, collision: true, vehicle: false, weapon: false,
      projectile: false, health: false, ai: false, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, vehicles: 5, pedestrians: 10 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: true, ai: false, physics: false, zLevels: false, fps: true, memory: false, showColliders: true, showNormals: true, logCollisions: true, slowMotion: 0.1 },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.Z_LEVELS_TEST]: {
    mode: DebugMode.Z_LEVELS_TEST,
    description: 'Специальная карта для теста Z-уровней',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: false,
      projectile: false, health: false, ai: false, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    world: { mapType: 'z_levels_test' },
    spawn: { player: true, vehicles: 5, pedestrians: 10 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: false, ai: false, physics: false, zLevels: true, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.WEAPONS_TEST]: {
    mode: DebugMode.WEAPONS_TEST,
    description: 'Полигон для теста всех типов оружия',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: false, collision: true, vehicle: false, weapon: true,
      projectile: true, health: true, ai: false, audio: true,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    world: { mapType: 'weapons_test_range' },
    spawn: { player: true, playerInvulnerable: true, vehicles: 0, pedestrians: 10, targets: 30 },
    player: { godMode: false, invulnerable: true, infiniteAmmo: true, allWeapons: true, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.VEHICLE_TEST]: {
    mode: DebugMode.VEHICLE_TEST,
    description: 'Полигон для теста всех типов транспорта',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: false,
      projectile: false, health: false, ai: false, audio: true,
      ui: true, districts: false, spawning: false, surfaceEffects: true, slopes: true,
    },
    world: { mapType: 'vehicle_test_track' },
    spawn: { player: true, playerStartsInVehicle: true, vehicles: 8, pedestrians: 0 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: true },
    vehicle: { enableAI: false, enablePhysics: true, instantEnter: true, indestructible: true, allTypesUnlocked: true },
    debug: { collision: false, ai: false, physics: true, zLevels: false, fps: true, memory: false, showVelocity: true },
    time: { scale: 1.0, paused: false },
  },

  // === Комбинированные режимы ===

  [DebugMode.NO_VEHICLES]: {
    mode: DebugMode.NO_VEHICLES,
    description: 'Только пешеходный режим',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: true, audio: true,
      ui: true, districts: true, spawning: true, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, vehicles: 0, pedestrians: 50 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    ai: { pedestrians: true, traffic: false },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.NO_AI]: {
    mode: DebugMode.NO_AI,
    description: 'Пустой мир для свободного исследования',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: false, audio: true,
      ui: true, districts: false, spawning: false, surfaceEffects: true, slopes: true,
    },
    spawn: { player: true, vehicles: 20, pedestrians: 0 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.NO_COLLISION]: {
    mode: DebugMode.NO_COLLISION,
    description: 'Режим полёта - без коллизий',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: false, vehicle: true, weapon: false,
      projectile: false, health: false, ai: true, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, vehicles: 10, pedestrians: 20 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: true, noclip: true, instantVehicleEnter: false },
    ai: { traffic: true, pedestrians: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.NO_BUILDINGS]: {
    mode: DebugMode.NO_BUILDINGS,
    description: 'Только дороги - без зданий',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: false,
      projectile: false, health: false, ai: true, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    world: { generateBuildings: false },
    spawn: { player: true, vehicles: 20, pedestrians: 30 },
    ai: { traffic: true, pedestrians: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.NO_ENVIRONMENT]: {
    mode: DebugMode.NO_ENVIRONMENT,
    description: 'Пустая плоскость',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: false, vehicle: true, weapon: false,
      projectile: false, health: false, ai: false, audio: false,
      ui: false, districts: false, spawning: false, surfaceEffects: false, slopes: false,
    },
    world: { generateRoads: false, generateBuildings: false, generateProps: false },
    spawn: { player: true, vehicles: 5, pedestrians: 10 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.PEDESTRIANS_ONLY]: {
    mode: DebugMode.PEDESTRIANS_ONLY,
    description: 'Толпа - без транспорта',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: false, weapon: false,
      projectile: false, health: false, ai: true, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, vehicles: 0, pedestrians: 200 },
    ai: { pedestrians: true, traffic: false },
    debug: { collision: false, ai: true, physics: false, zLevels: false, fps: true, memory: true, showStates: true },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.TRAFFIC_ONLY]: {
    mode: DebugMode.TRAFFIC_ONLY,
    description: 'Только машины - без пешеходов',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: false,
      projectile: false, health: false, ai: true, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: true, slopes: true,
    },
    spawn: { player: true, playerStartsInVehicle: true, vehicles: 50, pedestrians: 0 },
    ai: { traffic: true, pedestrians: false },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: true, physics: false, zLevels: false, fps: true, memory: true },
    time: { scale: 1.0, paused: false },
  },

  // === Специальные режимы ===

  [DebugMode.GOD_MODE]: {
    mode: DebugMode.GOD_MODE,
    description: 'Игрок бессмертен, всё разблокировано',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: true, audio: true,
      ui: true, districts: true, spawning: true, surfaceEffects: true, slopes: true,
    },
    spawn: { player: true, vehicles: 'auto', pedestrians: 'auto' },
    player: { godMode: true, invulnerable: true, infiniteAmmo: true, allWeapons: true, canFly: true, noclip: true, instantVehicleEnter: true },
    ai: { traffic: true, pedestrians: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
  },

  [DebugMode.SANDBOX]: {
    mode: DebugMode.SANDBOX,
    description: 'Творческий режим - спавн чего угодно',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: false, audio: true,
      ui: true, districts: false, spawning: false, surfaceEffects: true, slopes: true,
    },
    spawn: { player: true, vehicles: 0, pedestrians: 0 },
    player: { godMode: true, invulnerable: true, infiniteAmmo: true, allWeapons: true, canFly: true, noclip: true, instantVehicleEnter: true },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
    sandbox: { spawnMenu: true, canSpawnAnyEntity: true, canModifyMap: true },
  },

  [DebugMode.SLOW_MOTION]: {
    mode: DebugMode.SLOW_MOTION,
    description: 'Замедленная съёмка',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: true, audio: true,
      ui: true, districts: true, spawning: true, surfaceEffects: true, slopes: true,
    },
    spawn: { player: true, vehicles: 10, pedestrians: 20 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    ai: { traffic: true, pedestrians: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: false, physics: true, zLevels: false, fps: true, memory: false },
    time: { scale: 0.1, paused: false },
  },

  [DebugMode.FRAME_BY_FRAME]: {
    mode: DebugMode.FRAME_BY_FRAME,
    description: 'Один кадр по нажатию клавиши',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: true, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, vehicles: 5, pedestrians: 10 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    ai: { traffic: true, pedestrians: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 0, paused: true, advanceOnInput: true },
  },

  [DebugMode.PERFORMANCE_TEST]: {
    mode: DebugMode.PERFORMANCE_TEST,
    description: 'Максимальная нагрузка',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: true, audio: true,
      ui: true, districts: true, spawning: true, surfaceEffects: true, slopes: true,
    },
    world: { mapSize: 'large' },
    spawn: { player: true, vehicles: 200, pedestrians: 500 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    ai: { traffic: true, pedestrians: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: true },
    time: { scale: 1.0, paused: false },
    performance: { targetFPS: 60, drawDistance: 2.0, particleQuality: 'high', showStats: true, logStats: true },
  },

  [DebugMode.MEMORY_TEST]: {
    mode: DebugMode.MEMORY_TEST,
    description: 'Тест утечек памяти',
    systems: {
      renderer: true, map: true, entities: true, input: false,
      physics: true, collision: true, vehicle: true, weapon: false,
      projectile: false, health: false, ai: true, audio: false,
      ui: true, districts: false, spawning: true, surfaceEffects: false, slopes: true,
    },
    spawn: { player: false, vehicles: 'auto', pedestrians: 'auto' },
    ai: { traffic: true, pedestrians: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: true },
    time: { scale: 1.0, paused: false },
  },

  // === Производительность ===

  [DebugMode.LOW_END]: {
    mode: DebugMode.LOW_END,
    description: 'Настройки для слабых ПК',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: true, audio: true,
      ui: true, districts: true, spawning: true, surfaceEffects: false, slopes: true,
    },
    spawn: { player: true, vehicles: 5, pedestrians: 10 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    ai: { traffic: true, pedestrians: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
    performance: { targetFPS: 30, drawDistance: 0.5, particleQuality: 'low', showStats: true, logStats: false },
  },

  [DebugMode.HIGH_END]: {
    mode: DebugMode.HIGH_END,
    description: 'Настройки для мощных ПК',
    systems: {
      renderer: true, map: true, entities: true, input: true,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: true, audio: true,
      ui: true, districts: true, spawning: true, surfaceEffects: true, slopes: true,
    },
    spawn: { player: true, vehicles: 50, pedestrians: 100 },
    player: { godMode: false, invulnerable: false, infiniteAmmo: false, allWeapons: false, canFly: false, noclip: false, instantVehicleEnter: false },
    ai: { traffic: true, pedestrians: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: false },
    time: { scale: 1.0, paused: false },
    performance: { targetFPS: 144, drawDistance: 2.0, particleQuality: 'high', showStats: true, logStats: true },
  },

  [DebugMode.BENCHMARK]: {
    mode: DebugMode.BENCHMARK,
    description: 'Автоматический бенчмарк',
    systems: {
      renderer: true, map: true, entities: true, input: false,
      physics: true, collision: true, vehicle: true, weapon: true,
      projectile: true, health: true, ai: true, audio: false,
      ui: true, districts: false, spawning: false, surfaceEffects: true, slopes: true,
    },
    spawn: { player: false, vehicles: 100, pedestrians: 200 },
    ai: { traffic: true, pedestrians: true },
    vehicle: { enableAI: true, enablePhysics: true },
    debug: { collision: false, ai: false, physics: false, zLevels: false, fps: true, memory: true },
    time: { scale: 1.0, paused: false },
    performance: { targetFPS: 60, drawDistance: 1.0, particleQuality: 'medium', showStats: true, logStats: true },
    benchmark: { scenarios: ['idle', 'walking', 'driving', 'combat', 'crowded'], duration: 30000, autoReport: true },
  },
};
