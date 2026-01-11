import { Engine } from './core/Engine.js';
import { eventBus } from './core/EventBus.js';
import { Debug } from './utils/Debug.js';
import { TextureGenerator } from './utils/TextureGenerator.js';
import type { GameConfig } from './core/Types.js';
import { Renderer } from './rendering/Renderer.js';
import { Sprite, Texture } from 'pixi.js';

/**
 * Главный класс игры
 */
export class Game {
  private engine: Engine;
  private renderer: Renderer;
  private config: GameConfig;
  private textureGenerator!: TextureGenerator;

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

    // Генератор текстур для разработки
    this.textureGenerator = new TextureGenerator(this.renderer.getApp());

    // Генерация тестовых текстур
    const testBlocks = this.textureGenerator.generateBlockSet();
    Debug.log('Game', `Generated ${testBlocks.size} test block textures`);

    // Демонстрация текстур
    this.showTestTextures(testBlocks);

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
   * Отображение тестовых текстур
   */
  private showTestTextures(blocks: Map<string, Texture>): void {
    const container = this.renderer.getGameContainer();

    let x = 50;
    blocks.forEach((texture) => {
      const sprite = new Sprite(texture);
      sprite.x = x;
      sprite.y = 50;
      container.addChild(sprite);
      x += 80;
    });

    // Добавим персонажа
    const characterTexture = this.textureGenerator.generateCharacterTexture();
    const character = new Sprite(characterTexture);
    character.x = 50;
    character.y = 150;
    container.addChild(character);

    // Добавим машину
    const vehicleTexture = this.textureGenerator.generateVehicleTexture();
    const vehicle = new Sprite(vehicleTexture);
    vehicle.x = 150;
    vehicle.y = 140;
    container.addChild(vehicle);
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
   * Получить конфигурацию
   */
  public getConfig(): GameConfig {
    return this.config;
  }
}
