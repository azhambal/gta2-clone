import { Application, Container, Graphics } from 'pixi.js';
import type { GameConfig } from '../core/Types.js';

/**
 * Главный рендерер на основе PixiJS
 */
export class Renderer {
  private app: Application;
  private gameContainer: Container;  // Игровой мир
  private uiContainer: Container;    // UI поверх игры

  constructor() {
    this.app = new Application();
    this.gameContainer = new Container();
    this.uiContainer = new Container();
  }

  /**
   * Асинхронная инициализация PixiJS
   */
  public async init(config: GameConfig, parentElement: HTMLElement): Promise<void> {
    await this.app.init({
      width: config.width,
      height: config.height,
      backgroundColor: config.backgroundColor,
      antialias: false,      // Пиксельная графика
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      powerPreference: 'high-performance',
    });

    // Добавление canvas в DOM
    parentElement.appendChild(this.app.canvas);

    // Настройка слоёв
    this.app.stage.addChild(this.gameContainer);
    this.app.stage.addChild(this.uiContainer);

    // Тестовый спрайт для проверки
    this.createTestGraphics();
  }

  /**
   * Создание тестовой графики
   */
  private createTestGraphics(): void {
    // Простой прямоугольник для проверки работы рендерера
    const graphics = new Graphics();

    // Зелёный квадрат
    graphics.rect(100, 100, 64, 64);
    graphics.fill(0x00ff00);

    // Красный круг
    graphics.circle(300, 200, 32);
    graphics.fill(0xff0000);

    // Синяя линия
    graphics.moveTo(50, 50);
    graphics.lineTo(200, 150);
    graphics.stroke({ width: 3, color: 0x0000ff });

    this.gameContainer.addChild(graphics);
  }

  /**
   * Начать кадр рендеринга
   */
  public beginFrame(): void {
    // Подготовка к рендерингу
  }

  /**
   * Завершить кадр рендеринга
   */
  public endFrame(): void {
    // PixiJS рендерит автоматически
  }

  /**
   * Получить игровой контейнер
   */
  public getGameContainer(): Container {
    return this.gameContainer;
  }

  /**
   * Получить UI контейнер
   */
  public getUIContainer(): Container {
    return this.uiContainer;
  }

  /**
   * Получить PixiJS Application
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Получить размеры экрана
   */
  public getScreenSize(): { width: number; height: number } {
    return {
      width: this.app.screen.width,
      height: this.app.screen.height,
    };
  }

  /**
   * Изменение размера
   */
  public resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  /**
   * Уничтожение рендерера
   */
  public destroy(): void {
    this.app.destroy(true, { children: true, texture: true });
  }
}
