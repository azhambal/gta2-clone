import { VehicleType } from '../data/VehicleDefinitions.js';

/**
 * Точка для определения полигона
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Полигон (список точек)
 */
export type Polygon = Point[];

/**
 * Конфигурация района
 */
export interface DistrictConfig {
  id: string;
  name: string;
  bounds: Polygon; // Границы района

  // Параметры спавна
  pedestrianDensity: number; // 0-1
  vehicleDensity: number; // 0-1
  vehicleTypes: VehicleType[];
  pedestrianTypes: number[]; // Типы пешеходов для спавна

  // Атмосфера
  ambientTrack: string; // ID фонового звука
  musicTrack?: string; // ID музыкального трека (опционально)
  policePresence: number; // 0-1, плотность полиции

  // Банды (опционально)
  gangId?: string;
  gangHostility: number; // 0-1, насколько враждебна банда
}

/**
 * Проверка точки внутри полигона (Ray casting algorithm)
 */
export function pointInPolygon(x: number, y: number, polygon: Polygon): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Прямоугольные границы района (для оптимизации)
 */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Вычисление прямоугольных границ по полигона
 */
export function calculateBounds(polygon: Polygon): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of polygon) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Создание прямоугольного полигона из границ
 */
export function createRectPolygon(x: number, y: number, width: number, height: number): Polygon {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

/**
 * Район карты с уникальными характеристиками
 */
export class District {
  public readonly id: string;
  public readonly name: string;
  private bounds: Polygon;
  private boundsRect: Bounds;
  private config: DistrictConfig;

  constructor(config: DistrictConfig) {
    this.id = config.id;
    this.name = config.name;
    this.bounds = config.bounds;
    this.boundsRect = calculateBounds(config.bounds);
    this.config = config;
  }

  /**
   * Проверка, находится ли точка внутри района
   */
  public containsPoint(x: number, y: number): boolean {
    // Быстрая проверка по прямоугольным границам
    if (x < this.boundsRect.minX || x > this.boundsRect.maxX ||
      y < this.boundsRect.minY || y > this.boundsRect.maxY) {
      return false;
    }

    // Точная проверка по полигону
    return pointInPolygon(x, y, this.bounds);
  }

  /**
   * Получить конфигурацию района
   */
  public getConfig(): Readonly<DistrictConfig> {
    return this.config;
  }

  /**
   * Получить границы района
   */
  public getBounds(): Readonly<Polygon> {
    return this.bounds;
  }

  /**
   * Получить прямоугольные границы (для оптимизации)
   */
  public getBoundsRect(): Readonly<Bounds> {
    return this.boundsRect;
  }

  /**
   * Получить центр района (приблизительно)
   */
  public getCenter(): Point {
    return {
      x: (this.boundsRect.minX + this.boundsRect.maxX) / 2,
      y: (this.boundsRect.minY + this.boundsRect.maxY) / 2,
    };
  }

  /**
   * Получить площадь района (приблизительно)
   */
  public getArea(): number {
    return (this.boundsRect.maxX - this.boundsRect.minX) *
      (this.boundsRect.maxY - this.boundsRect.minY);
  }
}
