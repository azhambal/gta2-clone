import { eventBus } from '../core/EventBus.js';
import { District, type DistrictConfig, createRectPolygon } from './District.js';

// Re-export types for convenience
export type { DistrictConfig, Point, Polygon, Bounds } from './District.js';
export { District, pointInPolygon, calculateBounds, createRectPolygon } from './District.js';

/**
 * Событие смены района
 */
export interface DistrictChangedEvent {
  from: District | null;
  to: District | null;
  x: number;
  y: number;
}

/**
 * Менеджер районов карты
 * Отвечает за хранение районов и отслеживание текущего района игрока
 */
export class DistrictManager {
  private districts: District[] = [];
  private currentDistrict: District | null = null;

  /**
   * Добавить район в систему
   */
  public addDistrict(config: DistrictConfig): District {
    const district = new District(config);
    this.districts.push(district);
    return district;
  }

  /**
   * Добавить несколько районов
   */
  public addDistricts(configs: DistrictConfig[]): District[] {
    return configs.map(config => this.addDistrict(config));
  }

  /**
   * Получить район по ID
   */
  public getDistrictById(id: string): District | undefined {
    return this.districts.find(d => d.id === id);
  }

  /**
   * Получить район по позиции в мире
   */
  public getDistrictAt(x: number, y: number): District | null {
    for (const district of this.districts) {
      if (district.containsPoint(x, y)) {
        return district;
      }
    }
    return null;
  }

  /**
   * Обновить текущий район на основе позиции игрока
   * Генерирует событие 'district:changed' при смене района
   */
  public updateCurrentDistrict(playerX: number, playerY: number): void {
    const newDistrict = this.getDistrictAt(playerX, playerY);

    if (newDistrict !== this.currentDistrict) {
      const oldDistrict = this.currentDistrict;
      this.currentDistrict = newDistrict;

      eventBus.emit('district:changed', {
        from: oldDistrict,
        to: newDistrict,
        x: playerX,
        y: playerY,
      } as DistrictChangedEvent);
    }
  }

  /**
   * Получить текущий район игрока
   */
  public getCurrentDistrict(): District | null {
    return this.currentDistrict;
  }

  /**
   * Получить все районы
   */
  public getAllDistricts(): ReadonlyArray<District> {
    return this.districts;
  }

  /**
   * Очистить все районы
   */
  public clear(): void {
    this.districts = [];
    this.currentDistrict = null;
  }

  /**
   * Получить количество районов
   */
  public getCount(): number {
    return this.districts.length;
  }
}

/**
 * Создать стандартную конфигурацию района с прямоугольными границами
 */
export function createRectDistrictConfig(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  overrides: Partial<DistrictConfig> = {},
): DistrictConfig {
  return {
    id,
    name,
    bounds: createRectPolygon(x, y, width, height),
    pedestrianDensity: 0.3,
    vehicleDensity: 0.2,
    vehicleTypes: [],
    pedestrianTypes: [0, 1, 2],
    ambientTrack: 'ambient_city',
    policePresence: 0.3,
    gangHostility: 0.0,
    ...overrides,
  };
}
