# Шаг 07: Камера

## Цель
Создать систему камеры для навигации по карте. После этого шага можно перемещаться по карте с помощью клавиш WASD.

## Зависимости
- Шаг 06: Рендеринг карты

## Задачи

### 7.1 Класс Camera

**src/rendering/Camera.ts:**
```typescript
import { Container } from 'pixi.js';
import { Vector2, Rectangle, GAME_CONSTANTS } from '@core/Types';
import { eventBus } from '@core/EventBus';

export interface CameraConfig {
  screenWidth: number;
  screenHeight: number;
  worldBounds?: Rectangle;
  smoothing?: number;
}

/**
 * 2D камера для игрового мира
 */
export class Camera {
  // Позиция камеры (центр экрана в мировых координатах)
  private position: Vector2 = { x: 0, y: 0 };
  private targetPosition: Vector2 = { x: 0, y: 0 };

  // Размеры
  private screenWidth: number;
  private screenHeight: number;

  // Границы мира
  private worldBounds: Rectangle | null = null;

  // Масштаб
  private zoom: number = 1.0;
  private targetZoom: number = 1.0;
  private minZoom: number = 0.5;
  private maxZoom: number = 2.0;

  // Плавность движения (0 = мгновенно, 1 = очень плавно)
  private smoothing: number = 0.1;
  private zoomSmoothing: number = 0.1;

  // Тряска камеры
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private shakeOffset: Vector2 = { x: 0, y: 0 };

  // Контейнер для трансформации
  private container: Container | null = null;

  constructor(config: CameraConfig) {
    this.screenWidth = config.screenWidth;
    this.screenHeight = config.screenHeight;
    this.worldBounds = config.worldBounds || null;
    this.smoothing = config.smoothing ?? 0.1;
  }

  /**
   * Привязка к контейнеру для трансформации
   */
  public attachTo(container: Container): void {
    this.container = container;
  }

  /**
   * Установка позиции камеры (мгновенно)
   */
  public setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
    this.targetPosition.x = x;
    this.targetPosition.y = y;
    this.clampToWorldBounds();
    this.updateContainer();
  }

  /**
   * Получение позиции камеры
   */
  public getPosition(): Vector2 {
    return { ...this.position };
  }

  /**
   * Перемещение камеры к цели (плавно)
   */
  public moveTo(x: number, y: number): void {
    this.targetPosition.x = x;
    this.targetPosition.y = y;
  }

  /**
   * Смещение камеры
   */
  public move(dx: number, dy: number): void {
    this.targetPosition.x += dx;
    this.targetPosition.y += dy;
  }

  /**
   * Установка масштаба
   */
  public setZoom(zoom: number): void {
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    this.targetZoom = this.zoom;
    this.updateContainer();
  }

  /**
   * Плавное изменение масштаба
   */
  public zoomTo(zoom: number): void {
    this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
  }

  /**
   * Получение масштаба
   */
  public getZoom(): number {
    return this.zoom;
  }

  /**
   * Следование за точкой
   */
  public follow(target: Vector2, immediate: boolean = false): void {
    if (immediate) {
      this.setPosition(target.x, target.y);
    } else {
      this.moveTo(target.x, target.y);
    }
  }

  /**
   * Тряска камеры
   */
  public shake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  /**
   * Обновление камеры
   */
  public update(dt: number): void {
    // Плавное перемещение
    const lerpFactor = 1 - Math.pow(this.smoothing, dt / 16.67);
    this.position.x += (this.targetPosition.x - this.position.x) * lerpFactor;
    this.position.y += (this.targetPosition.y - this.position.y) * lerpFactor;

    // Плавный зум
    this.zoom += (this.targetZoom - this.zoom) * lerpFactor;

    // Ограничение по границам мира
    this.clampToWorldBounds();

    // Обновление тряски
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      this.shakeOffset.x = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeOffset.y = (Math.random() - 0.5) * 2 * this.shakeIntensity;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }

    // Применение трансформации
    this.updateContainer();
  }

  /**
   * Ограничение камеры границами мира
   */
  private clampToWorldBounds(): void {
    if (!this.worldBounds) return;

    const halfWidth = (this.screenWidth / 2) / this.zoom;
    const halfHeight = (this.screenHeight / 2) / this.zoom;

    // Минимальные/максимальные позиции камеры
    const minX = this.worldBounds.x + halfWidth;
    const maxX = this.worldBounds.x + this.worldBounds.width - halfWidth;
    const minY = this.worldBounds.y + halfHeight;
    const maxY = this.worldBounds.y + this.worldBounds.height - halfHeight;

    // Если мир меньше экрана — центрировать
    if (minX > maxX) {
      this.position.x = this.worldBounds.x + this.worldBounds.width / 2;
    } else {
      this.position.x = Math.max(minX, Math.min(maxX, this.position.x));
    }

    if (minY > maxY) {
      this.position.y = this.worldBounds.y + this.worldBounds.height / 2;
    } else {
      this.position.y = Math.max(minY, Math.min(maxY, this.position.y));
    }
  }

  /**
   * Применение трансформации к контейнеру
   */
  private updateContainer(): void {
    if (!this.container) return;

    // Позиция контейнера = центр экрана - позиция камеры
    this.container.x = this.screenWidth / 2 - this.position.x * this.zoom + this.shakeOffset.x;
    this.container.y = this.screenHeight / 2 - this.position.y * this.zoom + this.shakeOffset.y;

    // Масштаб
    this.container.scale.set(this.zoom);
  }

  /**
   * Конвертация экранных координат в мировые
   */
  public screenToWorld(screenX: number, screenY: number): Vector2 {
    return {
      x: (screenX - this.screenWidth / 2) / this.zoom + this.position.x,
      y: (screenY - this.screenHeight / 2) / this.zoom + this.position.y,
    };
  }

  /**
   * Конвертация мировых координат в экранные
   */
  public worldToScreen(worldX: number, worldY: number): Vector2 {
    return {
      x: (worldX - this.position.x) * this.zoom + this.screenWidth / 2,
      y: (worldY - this.position.y) * this.zoom + this.screenHeight / 2,
    };
  }

  /**
   * Получение видимой области в мировых координатах
   */
  public getViewport(): Rectangle {
    const halfWidth = (this.screenWidth / 2) / this.zoom;
    const halfHeight = (this.screenHeight / 2) / this.zoom;

    return {
      x: this.position.x - halfWidth,
      y: this.position.y - halfHeight,
      width: this.screenWidth / this.zoom,
      height: this.screenHeight / this.zoom,
    };
  }

  /**
   * Проверка видимости прямоугольника
   */
  public isVisible(bounds: Rectangle): boolean {
    const viewport = this.getViewport();

    return !(
      bounds.x + bounds.width < viewport.x ||
      bounds.x > viewport.x + viewport.width ||
      bounds.y + bounds.height < viewport.y ||
      bounds.y > viewport.y + viewport.height
    );
  }

  /**
   * Установка размера экрана
   */
  public setScreenSize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.updateContainer();
  }

  /**
   * Установка границ мира
   */
  public setWorldBounds(bounds: Rectangle): void {
    this.worldBounds = bounds;
    this.clampToWorldBounds();
  }
}
```

### 7.2 Простой InputManager (временный)

**src/input/InputManager.ts:**
```typescript
/**
 * Простой менеджер ввода (будет расширен позже)
 */
export class InputManager {
  private keysDown: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private keysJustReleased: Set<string> = new Set();

  constructor() {
    this.setupListeners();
  }

  /**
   * Настройка слушателей событий
   */
  private setupListeners(): void {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('blur', this.onBlur.bind(this));
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (!this.keysDown.has(key)) {
      this.keysJustPressed.add(key);
    }
    this.keysDown.add(key);
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keysDown.delete(key);
    this.keysJustReleased.add(key);
  }

  private onBlur(): void {
    // Сброс всех клавиш при потере фокуса
    this.keysDown.clear();
  }

  /**
   * Проверка удержания клавиши
   */
  public isKeyDown(key: string): boolean {
    return this.keysDown.has(key.toLowerCase());
  }

  /**
   * Проверка нажатия клавиши (один кадр)
   */
  public isKeyJustPressed(key: string): boolean {
    return this.keysJustPressed.has(key.toLowerCase());
  }

  /**
   * Проверка отпускания клавиши (один кадр)
   */
  public isKeyJustReleased(key: string): boolean {
    return this.keysJustReleased.has(key.toLowerCase());
  }

  /**
   * Получение направления движения (WASD/стрелки)
   */
  public getMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.isKeyDown('w') || this.isKeyDown('arrowup')) y -= 1;
    if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) y += 1;
    if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) x -= 1;
    if (this.isKeyDown('d') || this.isKeyDown('arrowright')) x += 1;

    return { x, y };
  }

  /**
   * Очистка состояния "just pressed/released"
   * Вызывать в конце каждого кадра
   */
  public update(): void {
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
  }

  /**
   * Уничтожение
   */
  public destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
    window.removeEventListener('blur', this.onBlur.bind(this));
  }
}
```

### 7.3 Обновление Game.ts

**src/Game.ts (ключевые изменения):**
```typescript
import { Camera } from './rendering/Camera';
import { InputManager } from './input/InputManager';
import { GAME_CONSTANTS } from './core/Types';

// Добавить поля:
private camera!: Camera;
private inputManager!: InputManager;

// В методе init():
public async init(): Promise<void> {
  Debug.init();
  Debug.log('Game', 'Initializing...');

  const container = document.getElementById('game-container');
  if (!container) throw new Error('Game container not found');

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

  window.addEventListener('resize', this.handleResize.bind(this));
  Debug.log('Game', 'Initialization complete');
}

// В методе update():
private update(dt: number): void {
  Debug.updateFps(this.engine.getFps());

  // Управление камерой
  const cameraSpeed = 5;
  const movement = this.inputManager.getMovementVector();

  if (movement.x !== 0 || movement.y !== 0) {
    this.camera.move(movement.x * cameraSpeed, movement.y * cameraSpeed);
  }

  // Зум (Q/E или +/-)
  if (this.inputManager.isKeyDown('q') || this.inputManager.isKeyDown('-')) {
    this.camera.zoomTo(this.camera.getZoom() - 0.02);
  }
  if (this.inputManager.isKeyDown('e') || this.inputManager.isKeyDown('=')) {
    this.camera.zoomTo(this.camera.getZoom() + 0.02);
  }

  // Обновление камеры
  this.camera.update(dt);

  // Обновление viewport для culling
  const viewport = this.camera.getViewport();
  this.renderer.getMapRenderer()?.setViewport(viewport);

  // Обновление рендерера
  this.renderer.update();

  // Очистка состояния ввода
  this.inputManager.update();
}
```

### 7.4 Экспорт модулей

**src/rendering/index.ts:**
```typescript
export { Renderer } from './Renderer';
export { MapRenderer } from './MapRenderer';
export { Camera, CameraConfig } from './Camera';
export { IsometricUtils, ISO_ANGLE, ISO_RATIO } from './IsometricUtils';
```

**src/input/index.ts:**
```typescript
export { InputManager } from './InputManager';
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `rendering/Camera.ts` | `Camera` | 2D камера с плавным следованием |
| `rendering/Camera.ts` | `CameraConfig` | Конфигурация камеры |
| `input/InputManager.ts` | `InputManager` | Базовый менеджер ввода |

## Ключевые методы Camera

| Метод | Описание |
|-------|----------|
| `setPosition(x, y)` | Мгновенная установка позиции |
| `moveTo(x, y)` | Плавное перемещение к точке |
| `move(dx, dy)` | Смещение камеры |
| `follow(target, immediate)` | Следование за целью |
| `setZoom(zoom)` | Мгновенная установка масштаба |
| `zoomTo(zoom)` | Плавное изменение масштаба |
| `shake(intensity, duration)` | Тряска камеры |
| `update(dt)` | Обновление камеры |
| `screenToWorld(x, y)` | Экранные → мировые координаты |
| `worldToScreen(x, y)` | Мировые → экранные координаты |
| `getViewport()` | Получение видимой области |
| `isVisible(bounds)` | Проверка видимости |

## Управление

| Клавиша | Действие |
|---------|----------|
| W / ↑ | Камера вверх |
| S / ↓ | Камера вниз |
| A / ← | Камера влево |
| D / → | Камера вправо |
| Q / - | Уменьшить масштаб |
| E / + | Увеличить масштаб |

## Результат
- Можно перемещаться по карте с помощью WASD или стрелок
- Камера плавно следует за целью
- Можно изменять масштаб (Q/E)
- Камера не выходит за границы карты
- Culling работает (невидимые чанки не рисуются)

## Проверка
```bash
npm run dev
# WASD для перемещения
# Q/E для зума
# Камера не выходит за границы карты
```

## Следующий шаг
Шаг 08: Расширенная система ввода
