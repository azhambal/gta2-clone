import { Engine } from './core/Engine.js';
import { eventBus } from './core/EventBus.js';
import { Debug } from './utils/Debug.js';
import { GAME_CONSTANTS } from './core/Types.js';
import type { GameConfig } from './core/Types.js';
import { Renderer } from './rendering/Renderer.js';
import { Camera } from './rendering/Camera.js';
import { MapGenerator } from './world/MapGenerator.js';
import { GameMap } from './world/GameMap.js';
import { InputManager, GameAction } from './input/index.js';

/**
 * Главный класс игры
 */
export class Game {
  private engine: Engine;
  private renderer: Renderer;
  private config: GameConfig;
  private currentMap: GameMap | null = null;
  private camera!: Camera;
  private inputManager!: InputManager;

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

    // Инициализация камеры
    const worldWidth = this.currentMap.widthInBlocks * GAME_CONSTANTS.BLOCK_SIZE;
    const worldHeight = this.currentMap.heightInBlocks * GAME_CONSTANTS.BLOCK_SIZE;

    this.camera = new Camera({
      screenWidth: this.config.width,
      screenHeight: this.config.height,
      worldBounds: {
        x: 0,
        y: 0,
        width: worldWidth,
        height: worldHeight,
      },
      smoothing: 0.1,
    });

    // Привязка камеры к контейнеру
    this.camera.attachTo(this.renderer.getGameContainer());

    // Начальная позиция камеры (центр карты)
    this.camera.setPosition(worldWidth / 2, worldHeight / 2);

    // Инициализация ввода
    this.inputManager = new InputManager();

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

    // Управление камерой через Actions
    const cameraSpeed = 5;
    const movement = this.inputManager.getMovementVector();

    if (movement.x !== 0 || movement.y !== 0) {
      this.camera.move(movement.x * cameraSpeed, movement.y * cameraSpeed);
    }

    // Зум через Actions
    if (this.inputManager.isActionDown(GameAction.ZOOM_IN)) {
      this.camera.zoomTo(this.camera.getZoom() + 0.02);
    }
    if (this.inputManager.isActionDown(GameAction.ZOOM_OUT)) {
      this.camera.zoomTo(this.camera.getZoom() - 0.02);
    }

    // Зум колёсиком мыши
    const wheel = this.inputManager.getMouseWheel();
    if (wheel !== 0) {
      this.camera.zoomTo(this.camera.getZoom() - wheel * 0.1);
    }

    // Пауза
    if (this.inputManager.isActionJustPressed(GameAction.PAUSE)) {
      Debug.log('Game', 'Pause toggled');
      // Пауза будет реализована позже
    }

    // Обновление камеры
    this.camera.update(16.67); // dt для камеры

    // Обновление viewport для culling
    const viewport = this.camera.getViewport();
    this.renderer.getMapRenderer()?.setViewport(viewport);

    // Обновление рендерера
    this.renderer.update();

    // Очистка состояния ввода
    this.inputManager.update();
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
   * Получить камеру
   */
  public getCamera(): Camera {
    return this.camera;
  }

  /**
   * Получить конфигурацию
   */
  public getConfig(): GameConfig {
    return this.config;
  }
}
