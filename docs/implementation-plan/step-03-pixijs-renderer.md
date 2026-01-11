# Шаг 03: Интеграция PixiJS и первый рендер

## Цель
Интегрировать PixiJS для WebGL рендеринга. После этого шага на экране отображается canvas с тестовым спрайтом.

## Зависимости
- Шаг 02: Базовый движок и игровой цикл

## Задачи

### 3.1 Класс Renderer

**src/rendering/Renderer.ts:**
```typescript
import { Application, Container, Graphics } from 'pixi.js';
import { GameConfig } from '@core/Types';

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
```

### 3.2 Обновление Game.ts

**src/Game.ts:**
```typescript
import { Engine } from './core/Engine';
import { eventBus } from './core/EventBus';
import { Debug } from './utils/Debug';
import { GameConfig } from './core/Types';
import { Renderer } from './rendering/Renderer';

/**
 * Главный класс игры
 */
export class Game {
  private engine: Engine;
  private renderer: Renderer;
  private config: GameConfig;

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
  private update(dt: number): void {
    Debug.updateFps(this.engine.getFps());
  }

  /**
   * Фиксированное обновление (физика)
   */
  private fixedUpdate(dt: number): void {
    // Физика и ECS системы
  }

  /**
   * Рендеринг
   */
  private render(interpolation: number): void {
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
   * Получить конфигурацию
   */
  public getConfig(): GameConfig {
    return this.config;
  }
}
```

### 3.3 Обновление стилей

**src/style.css:**
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #000;
}

#app {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

#game-container {
  position: relative;
}

#game-container canvas {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

#debug-panel {
  position: fixed;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: #0f0;
  font-family: monospace;
  font-size: 14px;
  padding: 10px;
  border-radius: 4px;
  z-index: 9999;
  pointer-events: none;
}
```

### 3.4 Экспорт модуля рендеринга

**src/rendering/index.ts:**
```typescript
export { Renderer } from './Renderer';
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `rendering/Renderer.ts` | `Renderer` | Обёртка над PixiJS, управление рендерингом |

## Ключевые методы Renderer

| Метод | Описание |
|-------|----------|
| `init(config, parentElement)` | Асинхронная инициализация PixiJS |
| `beginFrame()` | Начало кадра рендеринга |
| `endFrame()` | Завершение кадра |
| `getGameContainer()` | Контейнер для игровых объектов |
| `getUIContainer()` | Контейнер для UI |
| `getScreenSize()` | Размеры экрана |
| `resize(width, height)` | Изменение размера canvas |
| `destroy()` | Уничтожение рендерера |

## Структура слоёв рендеринга

```
Stage (PixiJS)
├── gameContainer     // Игровой мир (карта, сущности, эффекты)
│   ├── Map Layer
│   ├── Entity Layer
│   └── Effects Layer
└── uiContainer       // UI поверх игры
    ├── HUD
    └── Minimap
```

## Результат
- Canvas отображается в центре экрана
- На canvas видны тестовые фигуры (зелёный квадрат, красный круг, синяя линия)
- FPS счётчик работает
- Пиксельная графика отображается без сглаживания

## Проверка
```bash
npm run dev
# Canvas должен отображаться
# Тестовые фигуры должны быть видны
# FPS ~60
```

## Следующий шаг
Шаг 04: Система загрузки ресурсов (AssetManager)
