import { Engine } from './core/Engine';
import { eventBus } from './core/EventBus';
import { Debug } from './utils/Debug';
import { GameConfig } from './core/Types';

/**
 * Главный класс игры
 * Координирует все подсистемы
 */
export class Game {
  private engine: Engine;
  private config: GameConfig;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      width: config.width ?? 1280,
      height: config.height ?? 720,
      backgroundColor: config.backgroundColor ?? 0x1a1a2e,
      targetFps: config.targetFps ?? 60,
    };

    this.engine = new Engine();

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

    // Инициализация подсистем будет добавлена в следующих шагах

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
    // Input, камера и прочее
    Debug.updateFps(this.engine.getFps());
  }

  /**
   * Фиксированное обновление (физика)
   */
  private fixedUpdate(_dt: number): void {
    // Физика, ECS системы
  }

  /**
   * Рендеринг
   */
  private render(_interpolation: number): void {
    // Отрисовка будет добавлена позже
  }

  /**
   * Получить конфигурацию
   */
  public getConfig(): GameConfig {
    return this.config;
  }
}
