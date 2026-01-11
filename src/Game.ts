import { Engine } from './core/Engine.js';
import { eventBus } from './core/EventBus.js';
import { Debug } from './utils/Debug.js';
import type { GameConfig } from './core/Types.js';
import { Renderer } from './rendering/Renderer.js';
import { MapGenerator } from './world/MapGenerator.js';
import { GameMap } from './world/GameMap.js';

/**
 * Главный класс игры
 */
export class Game {
  private engine: Engine;
  private renderer: Renderer;
  private config: GameConfig;
  private currentMap: GameMap | null = null;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      width: config.width ?? 1280,
      height: config.height ?? 720,
      backgroundColor: config.backgroundColor ?? 0x1a1a2e,
      targetFps: config.targetFps ?? 60,
    };

    this.engine = new Engine();
    this.renderer = new Renderer();

    // Регистрация callbacks
    this.engine.onUpdate(this.update.bind(this));
    this.engine.onFixedUpdate(this.fixedUpdate.bind(this));
    this.engine.onRender(this.render.bind(this));

    Debug.log('Game', 'Instance created');
  }

  /**
   * Инициализация игры
   */
  public async init(): Promise<void> {
    Debug.init();
    Debug.log('Game', 'Initializing...');

    // Получение контейнера
    const container = document.getElementById('game-container');
    if (!container) {
      throw new Error('Game container not found');
    }

    // Инициализация рендерера
    await this.renderer.init(this.config, container);
    Debug.log('Game', 'Renderer initialized');

    // Создание тестовой карты
    this.currentMap = MapGenerator.createTestMap(4, 4);
    Debug.log('Game', `Map created: ${this.currentMap.widthInBlocks}x${this.currentMap.heightInBlocks} blocks`);

    // Передача карты рендереру
    this.renderer.setMap(this.currentMap);

    // Обработка ресайза
    window.addEventListener('resize', this.handleResize.bind(this));

    Debug.log('Game', 'Initialization complete');
  }

  /**
   * Запуск игры
   */
  public start(): void {
    Debug.log('Game', 'Starting...');
    this.engine.start();
    eventBus.emit('game:started');
  }

  /**
   * Остановка игры
   */
  public stop(): void {
    Debug.log('Game', 'Stopping...');
    this.engine.stop();
    eventBus.emit('game:stopped');
  }

  /**
   * Обновление каждый кадр
   */
  private update(_dt: number): void {
    Debug.updateFps(this.engine.getFps());
    this.renderer.update();
  }

  /**
   * Фиксированное обновление (физика)
   */
  private fixedUpdate(_dt: number): void {
    // Физика и ECS системы
  }

  /**
   * Рендеринг
   */
  private render(_interpolation: number): void {
    this.renderer.beginFrame();
    // Рендеринг объектов будет здесь
    this.renderer.endFrame();
  }

  /**
   * Обработка изменения размера окна
   */
  private handleResize(): void {
    // В будущем можно адаптировать размер
  }

  /**
   * Получить рендерер
   */
  public getRenderer(): Renderer {
    return this.renderer;
  }

  /**
   * Получить карту
   */
  public getMap(): GameMap | null {
    return this.currentMap;
  }

  /**
   * Получить конфигурацию
   */
  public getConfig(): GameConfig {
    return this.config;
  }
}
