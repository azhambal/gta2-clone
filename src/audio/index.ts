/**
 * Audio System - Модуль для управления звуками и музыкой
 *
 * Основан на Howler.js для кроссбраузерного воспроизведения звука.
 *
 * Основные функции:
 * - AudioManager: Загрузка, воспроизведение и управление звуками
 * - SoundAssets: Определения путей к звуковым файлам
 * - Позиционный звук с затуханием и панорамой
 * - Управление громкостью (master, SFX, music)
 *
 * Использование:
 * ```ts
 * import { audioManager } from './audio';
 * import { preloadSounds } from './audio';
 *
 * // Предзагрузка звуков
 * preloadSounds(audioManager);
 *
 * // Воспроизведение звука
 * audioManager.playSound('car_horn');
 *
 * // Позиционный звук
 * audioManager.playSoundAt('explosion', x, y, cameraX, cameraY);
 *
 * // Управление громкостью
 * audioManager.setMasterVolume(0.8);
 * audioManager.setSFXVolume(0.5);
 * ```
 */

export { AudioManager, audioManager } from './AudioManager.js';
export type { PlayOptions, SoundLoadOptions } from './AudioManager.js';

export {
  SOUND_ASSETS,
  SURFACE_SOUNDS,
  VEHICLE_SOUNDS,
  preloadSounds,
  getFootstepSound,
  getVehicleSounds,
} from './SoundAssets.js';
