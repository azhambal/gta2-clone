import type { AudioManager } from './AudioManager.js';

/**
 * Определения звуковых активов
 * Пути к файлам относительно public/assets/audio/
 */
export const SOUND_ASSETS = {
  // Транспорт
  engine_idle: 'assets/audio/sfx/engine_idle.mp3',
  engine_running: 'assets/audio/sfx/engine_running.mp3',
  car_horn: 'assets/audio/sfx/car_horn.mp3',
  car_crash: 'assets/audio/sfx/car_crash.mp3',
  tire_screech: 'assets/audio/sfx/tire_screech.mp3',

  // Пешеходы
  footstep_road: 'assets/audio/sfx/footstep_road.mp3',
  footstep_grass: 'assets/audio/sfx/footstep_grass.mp3',
  footstep_metal: 'assets/audio/sfx/footstep_metal.mp3',
  footstep_water: 'assets/audio/sfx/footstep_water.mp3',

  // Оружие
  pistol_fire: 'assets/audio/sfx/pistol_fire.mp3',
  rifle_fire: 'assets/audio/sfx/rifle_fire.mp3',
  shotgun_fire: 'assets/audio/sfx/shotgun_fire.mp3',
  explosion: 'assets/audio/sfx/explosion.mp3',
  reload: 'assets/audio/sfx/reload.mp3',

  // UI
  ui_click: 'assets/audio/sfx/ui_click.mp3',
  ui_hover: 'assets/audio/sfx/ui_hover.mp3',
  ui_error: 'assets/audio/sfx/ui_error.mp3',

  // Воздействия
  hit: 'assets/audio/sfx/hit.mp3',
  pickup: 'assets/audio/sfx/pickup.mp3',
  death: 'assets/audio/sfx/death.mp3',
} as const;

/**
 * Звуки для разных типов поверхностей
 */
export const SURFACE_SOUNDS = {
  road: 'footstep_road',
  grass: 'footstep_grass',
  metal: 'footstep_metal',
  water: 'footstep_water',
} as const;

/**
 * Звуки для разных типов машин
 */
export const VEHICLE_SOUNDS = {
  car: {
    engine: 'engine_idle',
    running: 'engine_running',
    horn: 'car_horn',
    crash: 'car_crash',
  },
  truck: {
    engine: 'engine_idle',
    running: 'engine_running',
    horn: 'car_horn',
    crash: 'car_crash',
  },
  bus: {
    engine: 'engine_idle',
    running: 'engine_running',
    horn: 'car_horn',
    crash: 'car_crash',
  },
  motorcycle: {
    engine: 'engine_idle',
    running: 'engine_running',
    horn: 'car_horn',
    crash: 'car_crash',
  },
} as const;

/**
 * Предзагрузка всех звуков в AudioManager
 */
export function preloadSounds(audioManager: AudioManager): void {
  for (const [id, src] of Object.entries(SOUND_ASSETS)) {
    audioManager.loadSound(id, src);
  }
}

/**
 * Получить ID звука шагов для поверхности
 */
export function getFootstepSound(surfaceType: string): string {
  const sound = SURFACE_SOUNDS[surfaceType as keyof typeof SURFACE_SOUNDS];
  return sound || SURFACE_SOUNDS.road;
}

/**
 * Получить звуки для типа машины
 */
export function getVehicleSounds(vehicleType: string): typeof VEHICLE_SOUNDS.car {
  const sounds = VEHICLE_SOUNDS[vehicleType as keyof typeof VEHICLE_SOUNDS];
  return sounds || VEHICLE_SOUNDS.car;
}
