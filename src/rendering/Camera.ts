import { Container } from 'pixi.js';
import type { Vector2, Rectangle } from '../core/Types.js';

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
    if (!this.worldBounds) {return;}

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
    if (!this.container) {return;}

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
