# Шаг 02: Базовый движок и игровой цикл

## Цель
Создать ядро движка с игровым циклом, управлением временем и базовой структурой для подсистем. После этого шага отображается счётчик FPS.

## Зависимости
- Шаг 01: Инициализация проекта

## Задачи

### 2.1 Класс Engine

**src/core/Engine.ts:**
```typescript
/**
 * Ядро игрового движка
 * Управляет главным игровым циклом и временем
 */
export class Engine {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly fixedDeltaTime: number = 1000 / 60; // 60 FPS для физики

  // Callbacks
  private updateCallback: ((dt: number) => void) | null = null;
  private fixedUpdateCallback: ((dt: number) => void) | null = null;
  private renderCallback: ((interpolation: number) => void) | null = null;

  // Метрики
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;

  constructor() {}

  /**
   * Регистрация callback для обновления (каждый кадр)
   */
  public onUpdate(callback: (dt: number) => void): void {
    this.updateCallback = callback;
  }

  /**
   * Регистрация callback для фиксированного обновления (физика)
   */
  public onFixedUpdate(callback: (dt: number) => void): void {
    this.fixedUpdateCallback = callback;
  }

  /**
   * Регистрация callback для рендеринга
   */
  public onRender(callback: (interpolation: number) => void): void {
    this.renderCallback = callback;
  }

  /**
   * Запуск игрового цикла
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.fpsTime = this.lastTime;
    this.frameCount = 0;

    this.loop(this.lastTime);
  }

  /**
   * Остановка игрового цикла
   */
  public stop(): void {
    this.isRunning = false;
  }

  /**
   * Получить текущий FPS
   */
  public getFps(): number {
    return this.currentFps;
  }

  /**
   * Главный игровой цикл
   */
  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.loop);

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Ограничение deltaTime для предотвращения "spiral of death"
    const clampedDelta = Math.min(deltaTime, 250);

    // Подсчёт FPS
    this.frameCount++;
    if (currentTime - this.fpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = currentTime;
    }

    // Обновление каждый кадр (переменный timestep)
    if (this.updateCallback) {
      this.updateCallback(clampedDelta);
    }

    // Фиксированное обновление для физики
    this.accumulator += clampedDelta;
    while (this.accumulator >= this.fixedDeltaTime) {
      if (this.fixedUpdateCallback) {
        this.fixedUpdateCallback(this.fixedDeltaTime);
      }
      this.accumulator -= this.fixedDeltaTime;
    }

    // Рендеринг с интерполяцией
    const interpolation = this.accumulator / this.fixedDeltaTime;
    if (this.renderCallback) {
      this.renderCallback(interpolation);
    }
  };
}
```

### 2.2 Система событий

**src/core/EventBus.ts:**
```typescript
type EventCallback = (...args: any[]) => void;

/**
 * Простая шина событий для коммуникации между подсистемами
 */
export class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Подписка на событие
   */
  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Отписка от события
   */
  public off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Отправка события
   */
  public emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(callback => callback(...args));
  }

  /**
   * Одноразовая подписка
   */
  public once(event: string, callback: EventCallback): void {
    const wrapper = (...args: any[]) => {
      callback(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
}

// Глобальный экземпляр
export const eventBus = new EventBus();
```

### 2.3 Базовые типы

**src/core/Types.ts:**
```typescript
/**
 * 2D вектор
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * 3D вектор (для позиции с учётом высоты Z)
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Прямоугольная область
 */
export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Границы (AABB)
 */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Размеры
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Конфигурация игры
 */
export interface GameConfig {
  width: number;
  height: number;
  backgroundColor: number;
  targetFps: number;
}

/**
 * Игровые константы
 */
export const GAME_CONSTANTS = {
  BLOCK_SIZE: 64,           // Размер блока в пикселях
  CHUNK_SIZE: 16,           // Размер чанка в блоках
  MAP_DEPTH: 8,             // Количество уровней Z
  FIXED_TIMESTEP: 1000 / 60 // Фиксированный шаг времени (мс)
} as const;
```

### 2.4 Debug утилиты

**src/utils/Debug.ts:**
```typescript
/**
 * Утилиты для отладки
 */
export class Debug {
  private static fpsElement: HTMLElement | null = null;
  private static debugPanel: HTMLElement | null = null;
  private static isEnabled: boolean = true;

  /**
   * Инициализация отладочного интерфейса
   */
  public static init(): void {
    if (!this.isEnabled) return;

    // Создание панели отладки
    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'debug-panel';
    this.debugPanel.style.cssText = `
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
    `;
    document.body.appendChild(this.debugPanel);

    // Элемент FPS
    this.fpsElement = document.createElement('div');
    this.fpsElement.id = 'fps-counter';
    this.debugPanel.appendChild(this.fpsElement);
  }

  /**
   * Обновление FPS
   */
  public static updateFps(fps: number): void {
    if (this.fpsElement) {
      this.fpsElement.textContent = `FPS: ${fps}`;
    }
  }

  /**
   * Логирование
   */
  public static log(category: string, message: string): void {
    if (this.isEnabled) {
      console.log(`[${category}] ${message}`);
    }
  }

  /**
   * Включение/выключение отладки
   */
  public static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (this.debugPanel) {
      this.debugPanel.style.display = enabled ? 'block' : 'none';
    }
  }
}
```

### 2.5 Обновление Game.ts

**src/Game.ts:**
```typescript
import { Engine } from './core/Engine';
import { eventBus } from './core/EventBus';
import { Debug } from './utils/Debug';
import { GameConfig, GAME_CONSTANTS } from './core/Types';

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
  private update(dt: number): void {
    // Input, камера и прочее
    Debug.updateFps(this.engine.getFps());
  }

  /**
   * Фиксированное обновление (физика)
   */
  private fixedUpdate(dt: number): void {
    // Физика, ECS системы
  }

  /**
   * Рендеринг
   */
  private render(interpolation: number): void {
    // Отрисовка будет добавлена позже
  }

  /**
   * Получить конфигурацию
   */
  public getConfig(): GameConfig {
    return this.config;
  }
}
```

### 2.6 Обновление main.ts

**src/main.ts:**
```typescript
import './style.css';
import { Game } from './Game';

async function main() {
  // Очистка контейнера
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = '<div id="game-container"></div>';

  // Создание и запуск игры
  const game = new Game({
    width: 1280,
    height: 720,
  });

  await game.init();
  game.start();

  // Для отладки в консоли
  (window as any).game = game;
}

main().catch(console.error);
```

### 2.7 Экспорт модулей

**src/core/index.ts:**
```typescript
export { Engine } from './Engine';
export { EventBus, eventBus } from './EventBus';
export * from './Types';
```

**src/utils/index.ts:**
```typescript
export { Debug } from './Debug';
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `core/Engine.ts` | `Engine` | Управление игровым циклом, timing |
| `core/EventBus.ts` | `EventBus` | Шина событий для коммуникации |
| `core/Types.ts` | `Vector2`, `Vector3`, `Rectangle`, `Bounds` | Базовые типы данных |
| `core/Types.ts` | `GameConfig`, `GAME_CONSTANTS` | Конфигурация и константы |
| `utils/Debug.ts` | `Debug` | Отладочные утилиты и FPS |
| `Game.ts` | `Game` | Главный класс игры |

## Ключевые методы

### Engine
| Метод | Описание |
|-------|----------|
| `start()` | Запуск игрового цикла |
| `stop()` | Остановка цикла |
| `onUpdate(callback)` | Регистрация обновления (каждый кадр) |
| `onFixedUpdate(callback)` | Регистрация фиксированного обновления |
| `onRender(callback)` | Регистрация рендеринга |
| `getFps()` | Получить текущий FPS |

### EventBus
| Метод | Описание |
|-------|----------|
| `on(event, callback)` | Подписка на событие |
| `off(event, callback)` | Отписка от события |
| `emit(event, ...args)` | Отправка события |
| `once(event, callback)` | Одноразовая подписка |

## Результат
- Игровой цикл работает с фиксированным timestep для физики
- В левом верхнем углу отображается счётчик FPS
- События игры (`game:started`, `game:stopped`) рассылаются через EventBus
- Delta time правильно вычисляется
- Консоль показывает сообщения инициализации

## Проверка
```bash
npm run dev
# FPS счётчик должен показывать ~60
# Консоль должна показывать сообщения [Game]
```

## Следующий шаг
Шаг 03: Интеграция PixiJS и первый рендер
