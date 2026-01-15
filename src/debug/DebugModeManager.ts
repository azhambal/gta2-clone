/**
 * Менеджер режимов отладки
 * Управляет переключением между различными режимами запуска
 */

import { Debug } from '../utils/Debug.js';
import {
  DebugMode,
  type DebugLaunchConfig,
  type SystemsConfig,
  type SpawnConfig,
  type PlayerConfig,
  type AIConfig,
  type VehicleConfig,
  type DebugConfig,
  type TimeConfig,
  type PerformanceConfig,
  DEBUG_MODE_PRESETS,
  DEFAULT_PLAYER_CONFIG,
  DEFAULT_DEBUG_CONFIG,
  DEFAULT_TIME_CONFIG,
} from './DebugTypes.js';
import { toggleDebugMode, getDebugMode, DebugMode as DebugRenderMode } from '../ecs/systems/DebugRenderSystem.js';
import { eventBus } from '../core/EventBus.js';

/**
 * Состояние менеджера режимов
 */
interface DebugModeState {
  currentMode: DebugMode;
  currentConfig: DebugLaunchConfig;
  timeScale: number;
  paused: boolean;
  frameByFrame: boolean;
  godMode: boolean;
}

/**
 * Менеджер режимов отладки
 */
export class DebugModeManager {
  private state: DebugModeState;
  private customConfigs: Map<string, Partial<DebugLaunchConfig>> = new Map();

  constructor() {
    // Загружаем режим из URL или используем FULL_GAME по умолчанию
    const urlMode = this.parseUrlMode();
    const initialMode = urlMode || DebugMode.FULL_GAME;

    const preset = DEBUG_MODE_PRESETS[initialMode];
    const timeConfig = preset.time || {};
    const playerConfig = preset.player || DEFAULT_PLAYER_CONFIG;

    this.state = {
      currentMode: initialMode,
      currentConfig: this.cloneConfig(preset),
      timeScale: timeConfig.scale ?? DEFAULT_TIME_CONFIG.scale,
      paused: timeConfig.paused ?? DEFAULT_TIME_CONFIG.paused,
      frameByFrame: false,
      godMode: playerConfig.godMode ?? DEFAULT_PLAYER_CONFIG.godMode,
    };

    // Применяем URL параметры если есть
    if (window.location.search) {
      this.applyUrlParameters();
    }

    Debug.log('DebugMode', `Initialized with mode: ${initialMode}`);
    this.logCurrentConfig();
  }

  /**
   * Получить текущий режим
   */
  getCurrentMode(): DebugMode {
    return this.state.currentMode;
  }

  /**
   * Получить текущую конфигурацию
   */
  getCurrentConfig(): DebugLaunchConfig {
    return this.state.currentConfig;
  }

  /**
   * Получить конфигурацию систем
   */
  getSystemsConfig(): SystemsConfig {
    return this.state.currentConfig.systems;
  }

  /**
   * Получить конфигурацию спавна
   */
  getSpawnConfig(): SpawnConfig {
    return this.state.currentConfig.spawn;
  }

  /**
   * Получить конфигурацию игрока
   */
  getPlayerConfig(): PlayerConfig {
    return { ...DEFAULT_PLAYER_CONFIG, ...this.state.currentConfig.player };
  }

  /**
   * Получить конфигурацию AI
   */
  getAIConfig(): AIConfig | undefined {
    return this.state.currentConfig.ai;
  }

  /**
   * Получить конфигурацию транспорта
   */
  getVehicleConfig(): VehicleConfig | undefined {
    return this.state.currentConfig.vehicle;
  }

  /**
   * Получить конфигурацию отладки
   */
  getDebugConfig(): DebugConfig {
    return { ...DEFAULT_DEBUG_CONFIG, ...this.state.currentConfig.debug };
  }

  /**
   * Получить конфигурацию времени
   */
  getTimeConfig(): TimeConfig {
    const config = this.state.currentConfig.time || {};
    return {
      scale: this.state.timeScale,
      paused: this.state.paused,
      advanceOnInput: config.advanceOnInput || false,
    };
  }

  /**
   * Получить конфигурацию производительности
   */
  getPerformanceConfig(): PerformanceConfig | undefined {
    return this.state.currentConfig.performance;
  }

  /**
   * Проверить включён ли режим бога
   */
  isGodMode(): boolean {
    return this.state.godMode;
  }

  /**
   * Переключить режим бога
   */
  toggleGodMode(): void {
    this.state.godMode = !this.state.godMode;
    if (!this.state.currentConfig.player) {
      this.state.currentConfig.player = { ...DEFAULT_PLAYER_CONFIG };
    }
    this.state.currentConfig.player.godMode = this.state.godMode;
    this.state.currentConfig.player.invulnerable = this.state.godMode;

    eventBus.emit('debug:godMode', { enabled: this.state.godMode });
    Debug.log('DebugMode', `God mode: ${this.state.godMode ? 'ON' : 'OFF'}`);
  }

  /**
   * Переключить паузу
   */
  togglePause(): void {
    this.state.paused = !this.state.paused;
    eventBus.emit('debug:pause', { paused: this.state.paused });
    Debug.log('DebugMode', `Paused: ${this.state.paused}`);
  }

  /**
   * Переключить замедление
   */
  toggleSlowMotion(): void {
    if (this.state.timeScale === 0.1) {
      this.state.timeScale = 1.0;
      Debug.log('DebugMode', 'Slow motion: OFF');
    } else {
      this.state.timeScale = 0.1;
      Debug.log('DebugMode', 'Slow motion: ON (0.1x)');
    }
    eventBus.emit('debug:timeScale', { scale: this.state.timeScale });
  }

  /**
   * Установить масштаб времени
   */
  setTimeScale(scale: number): void {
    this.state.timeScale = Math.max(0, Math.min(10, scale));
    eventBus.emit('debug:timeScale', { scale: this.state.timeScale });
    Debug.log('DebugMode', `Time scale: ${this.state.timeScale}x`);
  }

  /**
   * Переключить покадровый режим
   */
  toggleFrameByFrame(): void {
    this.state.frameByFrame = !this.state.frameByFrame;
    this.state.paused = this.state.frameByFrame;
    eventBus.emit('debug:frameByFrame', { enabled: this.state.frameByFrame });
    Debug.log('DebugMode', `Frame by frame: ${this.state.frameByFrame ? 'ON' : 'OFF'}`);
  }

  /**
   * Продвинуть на один кадр (для покадрового режима)
   */
  advanceFrame(): void {
    if (this.state.frameByFrame) {
      eventBus.emit('debug:advanceFrame');
    }
  }

  /**
   * Переключить режим отладки рендера
   */
  toggleRenderDebugMode(mode: DebugRenderMode): void {
    toggleDebugMode(mode);
    const isEnabled = (getDebugMode() & mode) !== 0;
    Debug.log('DebugMode', `Render debug ${DebugRenderMode[mode]}: ${isEnabled ? 'ON' : 'OFF'}`);
  }

  /**
   * Переключиться на другой режим
   */
  switchMode(mode: DebugMode | string): boolean {
    const targetMode = typeof mode === 'string' ? this.parseModeString(mode) : mode;
    if (!targetMode || !DEBUG_MODE_PRESETS[targetMode]) {
      Debug.log('DebugMode', `Unknown mode: ${mode}`);
      return false;
    }

    const newConfig = DEBUG_MODE_PRESETS[targetMode];

    // Сохраняем текущие кастомные настройки
    const customMods = this.getCurrentCustomMods();

    // Применяем новый режим
    this.state.currentMode = targetMode;
    this.state.currentConfig = this.cloneConfig(newConfig);

    // Восстанавливаем кастомные настройки
    this.applyCustomMods(customMods);

    // Обновляем состояние
    const timeConfig = newConfig.time || {};
    const playerConfig = newConfig.player || DEFAULT_PLAYER_CONFIG;
    this.state.timeScale = timeConfig.scale ?? DEFAULT_TIME_CONFIG.scale;
    this.state.paused = timeConfig.paused ?? DEFAULT_TIME_CONFIG.paused;
    this.state.godMode = playerConfig.godMode ?? DEFAULT_PLAYER_CONFIG.godMode;
    this.state.frameByFrame = timeConfig.advanceOnInput || false;

    // Уведомляем системы
    eventBus.emit('debug:modeChanged', {
      from: this.state.currentMode,
      to: targetMode,
      config: this.state.currentConfig,
    });

    Debug.log('DebugMode', `Switched to mode: ${targetMode}`);
    this.logCurrentConfig();

    return true;
  }

  /**
   * Применить кастомную конфигурацию
   */
  applyCustomConfig(name: string, config: Partial<DebugLaunchConfig>): void {
    this.customConfigs.set(name, config);
    this.applyConfigToCurrent(config);
    Debug.log('DebugMode', `Applied custom config: ${name}`);
  }

  /**
   * Получить время для физики (с учёта scale)
   */
  getScaledDt(dt: number): number {
    if (this.state.paused) {
      return 0;
    }
    return dt * this.state.timeScale;
  }

  /**
   * Должна ли игра быть на паузе
   */
  isPaused(): boolean {
    return this.state.paused;
  }

  /**
   * В покадровом ли режиме
   */
  isFrameByFrame(): boolean {
    return this.state.frameByFrame;
  }

  /**
   * Получить текущий масштаб времени
   */
  getTimeScale(): number {
    return this.state.timeScale;
  }

  // === Приватные методы ===

  /**
   * Получить текущие кастомные модификации
   */
  private getCurrentCustomMods(): Partial<DebugLaunchConfig> {
    return {
      debug: this.state.currentConfig.debug ? { ...this.state.currentConfig.debug } : {},
      time: this.state.currentConfig.time ? { ...this.state.currentConfig.time } : {},
    };
  }

  /**
   * Применить кастомные модификации к текущей конфигурации
   */
  private applyCustomMods(mods: Partial<DebugLaunchConfig>): void {
    if (mods.debug) {
      if (!this.state.currentConfig.debug) {
        this.state.currentConfig.debug = {};
      }
      Object.assign(this.state.currentConfig.debug, mods.debug);
    }
    if (mods.time) {
      if (!this.state.currentConfig.time) {
        this.state.currentConfig.time = {};
      }
      Object.assign(this.state.currentConfig.time, mods.time);
    }
  }

  /**
   * Применить конфигурацию к текущему режиму
   */
  private applyConfigToCurrent(config: Partial<DebugLaunchConfig>): void {
    if (config.systems) {
      Object.assign(this.state.currentConfig.systems, config.systems);
    }
    if (config.spawn) {
      Object.assign(this.state.currentConfig.spawn, config.spawn);
    }
    if (config.player) {
      if (!this.state.currentConfig.player) {
        this.state.currentConfig.player = { ...DEFAULT_PLAYER_CONFIG };
      }
      Object.assign(this.state.currentConfig.player, config.player);
    }
    if (config.debug) {
      if (!this.state.currentConfig.debug) {
        this.state.currentConfig.debug = {};
      }
      Object.assign(this.state.currentConfig.debug, config.debug);
    }
    if (config.time) {
      if (!this.state.currentConfig.time) {
        this.state.currentConfig.time = {};
      }
      Object.assign(this.state.currentConfig.time, config.time);
      this.state.timeScale = config.time.scale ?? this.state.timeScale;
      this.state.paused = config.time.paused ?? this.state.paused;
    }
    if (config.ai) {
      this.state.currentConfig.ai = { ...this.state.currentConfig.ai, ...config.ai };
    }
    if (config.vehicle) {
      this.state.currentConfig.vehicle = { ...this.state.currentConfig.vehicle, ...config.vehicle };
    }
    if (config.performance) {
      this.state.currentConfig.performance = { ...this.state.currentConfig.performance, ...config.performance };
    }
  }

  /**
   * Клонировать конфигурацию
   */
  private cloneConfig(config: DebugLaunchConfig): DebugLaunchConfig {
    return JSON.parse(JSON.stringify(config));
  }

  /**
   * Распарсить режим из строки
   */
  private parseModeString(str: string): DebugMode | null {
    const upper = str.toUpperCase();
    if (Object.values(DebugMode).includes(upper as DebugMode)) {
      return upper as DebugMode;
    }
    return null;
  }

  /**
   * Парсить режим из URL
   */
  private parseUrlMode(): DebugMode | null {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    if (modeParam) {
      return this.parseModeString(modeParam);
    }
    return null;
  }

  /**
   * Применить URL параметры к конфигурации
   */
  private applyUrlParameters(): void {
    const params = new URLSearchParams(window.location.search);

    // Системы
    const systems = this.state.currentConfig.systems as any;
    for (const key of Object.keys(systems)) {
      const param = params.get(`systems.${key}`);
      if (param !== null) {
        systems[key] = param === 'true';
      }
    }

    // Спавн
    const spawn = this.state.currentConfig.spawn as any;
    const vehiclesParam = params.get('spawn.vehicles');
    if (vehiclesParam) {
      spawn.vehicles = vehiclesParam === 'auto' ? 'auto' : parseInt(vehiclesParam, 10);
    }
    const pedestriansParam = params.get('spawn.pedestrians');
    if (pedestriansParam) {
      spawn.pedestrians = pedestriansParam === 'auto' ? 'auto' : parseInt(pedestriansParam, 10);
    }
    const playerParam = params.get('spawn.player');
    if (playerParam !== null) {
      spawn.player = playerParam === 'true';
    }

    // Игрок
    if (!this.state.currentConfig.player) {
      this.state.currentConfig.player = { ...DEFAULT_PLAYER_CONFIG };
    }
    const player = this.state.currentConfig.player as any;
    for (const key of ['godMode', 'invulnerable', 'infiniteAmmo', 'allWeapons', 'canFly', 'noclip']) {
      const param = params.get(`player.${key}`);
      if (param !== null) {
        player[key] = param === 'true';
        if (key === 'godMode') {
          this.state.godMode = param === 'true';
        }
      }
    }

    // Время
    if (!this.state.currentConfig.time) {
      this.state.currentConfig.time = {};
    }
    const timeScaleParam = params.get('time.scale');
    if (timeScaleParam) {
      this.state.timeScale = parseFloat(timeScaleParam);
      this.state.currentConfig.time.scale = this.state.timeScale;
    }
    const pausedParam = params.get('time.paused');
    if (pausedParam !== null) {
      this.state.paused = pausedParam === 'true';
      this.state.currentConfig.time.paused = this.state.paused;
    }

    // Отладка
    if (!this.state.currentConfig.debug) {
      this.state.currentConfig.debug = {};
    }
    const debug = this.state.currentConfig.debug as any;
    for (const key of Object.keys(DEFAULT_DEBUG_CONFIG)) {
      const param = params.get(`debug.${key}`);
      if (param !== null) {
        debug[key] = param === 'true';
      }
    }
    const allDebugParam = params.get('debug.all');
    if (allDebugParam === 'true') {
      for (const key of Object.keys(DEFAULT_DEBUG_CONFIG)) {
        debug[key] = true;
      }
    }
  }

  /**
   * Логировать текущую конфигурацию
   */
  private logCurrentConfig(): void {
    const config = this.state.currentConfig;
    Debug.log('DebugMode', `=== ${config.mode} ===`);
    Debug.log('DebugMode', config.description);

    const activeSystems = Object.entries(config.systems)
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .join(', ');
    Debug.log('DebugMode', `Systems: ${activeSystems || 'none'}`);

    Debug.log('DebugMode', `Spawn: player=${config.spawn.player}, vehicles=${config.spawn.vehicles}, pedestrians=${config.spawn.pedestrians}`);

    const playerConfig = config.player || DEFAULT_PLAYER_CONFIG;
    Debug.log('DebugMode', `Player: godMode=${playerConfig.godMode}, invulnerable=${playerConfig.invulnerable}`);
    Debug.log('DebugMode', `Time: scale=${this.state.timeScale}, paused=${this.state.paused}`);
  }
}

// === Глобальный экземпляр ===

let debugModeManagerInstance: DebugModeManager | null = null;

/**
 * Получить глобальный экземпляр менеджера режимов
 */
export function getDebugModeManager(): DebugModeManager {
  if (!debugModeManagerInstance) {
    debugModeManagerInstance = new DebugModeManager();
  }
  return debugModeManagerInstance;
}

/**
 * Сбросить менеджер режимов (для тестов)
 */
export function resetDebugModeManager(): void {
  debugModeManagerInstance = null;
}
