import { Application, Container } from 'pixi.js';
import type { GameConfig } from '../core/Types.js';
import { MapRenderer } from './MapRenderer.js';
import { EntityRenderer } from './EntityRenderer.js';
import { GameMap } from '../world/GameMap.js';
import type { GameWorld } from '../ecs/World.js';

/**
 * Главный рендерер на основе PixiJS
 */
export class Renderer {
  private app: Application;
  private gameContainer: Container;  // Игровой мир
  private uiContainer: Container;    // UI поверх игры
  private debugContainer: Container; // Отладочная визуализация

  // Рендереры
  private mapRenderer: MapRenderer | null = null;
  private entityRenderer: EntityRenderer | null = null;
  private debugRenderSystem: ((world: GameWorld) => GameWorld) | null = null;

  constructor() {
    this.app = new Application();
    this.gameContainer = new Container();
    this.uiContainer = new Container();
    this.debugContainer = new Container();
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
    this.app.stage.addChild(this.debugContainer);
    this.app.stage.addChild(this.uiContainer);

    // Инициализация MapRenderer
    this.mapRenderer = new MapRenderer(this.gameContainer);

    // Инициализация EntityRenderer
    this.entityRenderer = new EntityRenderer(this.gameContainer);
  }

  /**
   * Установка карты для рендеринга
   */
  public setMap(map: GameMap): void {
    this.mapRenderer?.setMap(map);
  }

  /**
   * Обновление рендереров
   */
  public update(world?: GameWorld): void {
    this.mapRenderer?.update();
    this.entityRenderer?.update();
    // Update debug render system if world is provided
    if (world && this.debugRenderSystem) {
      this.debugRenderSystem(world);
    }
  }

  /**
   * Set the debug render system
   */
  public setDebugRenderSystem(system: ((world: GameWorld) => GameWorld) | null): void {
    this.debugRenderSystem = system;
  }

  /**
   * Get the debug container
   */
  public getDebugContainer(): Container {
    return this.debugContainer;
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
   * Получить MapRenderer
   */
  public getMapRenderer(): MapRenderer | null {
    return this.mapRenderer;
  }

  /**
   * Получить EntityRenderer
   */
  public getEntityRenderer(): EntityRenderer | null {
    return this.entityRenderer;
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
    this.mapRenderer?.destroy();
    this.entityRenderer?.destroy();
    this.app.destroy(true, { children: true, texture: true });
  }
}
