# Шаг 22: Районы (Districts)

## Цель
Реализовать систему районов с разными характеристиками. После этого шага разные части города имеют свою атмосферу и плотность трафика.

## Зависимости
- Шаг 21: Спавн/деспавн сущностей

## Задачи

### 22.1 Структура района

**src/world/District.ts:**
```typescript
export interface DistrictConfig {
  id: string;
  name: string;
  bounds: Polygon;           // Границы района

  // Параметры спавна
  pedestrianDensity: number; // 0-1
  vehicleDensity: number;    // 0-1
  vehicleTypes: VehicleType[];
  pedestrianTypes: number[];

  // Атмосфера
  ambientTrack: string;
  musicTrack?: string;
  policePresence: number;    // 0-1

  // Банды (опционально)
  gangId?: string;
  gangHostility: number;     // 0-1
}

export class District {
  public readonly id: string;
  public readonly name: string;
  private bounds: Polygon;
  private config: DistrictConfig;

  constructor(config: DistrictConfig) {
    this.id = config.id;
    this.name = config.name;
    this.bounds = config.bounds;
    this.config = config;
  }

  public containsPoint(x: number, y: number): boolean {
    return pointInPolygon(x, y, this.bounds);
  }

  public getConfig(): DistrictConfig {
    return this.config;
  }
}
```

### 22.2 DistrictManager

**src/world/DistrictManager.ts:**
```typescript
export class DistrictManager {
  private districts: District[] = [];
  private currentDistrict: District | null = null;

  public addDistrict(config: DistrictConfig): void {
    this.districts.push(new District(config));
  }

  public getDistrictAt(x: number, y: number): District | null {
    for (const district of this.districts) {
      if (district.containsPoint(x, y)) {
        return district;
      }
    }
    return null;
  }

  public updateCurrentDistrict(playerX: number, playerY: number): void {
    const newDistrict = this.getDistrictAt(playerX, playerY);

    if (newDistrict !== this.currentDistrict) {
      const oldDistrict = this.currentDistrict;
      this.currentDistrict = newDistrict;

      eventBus.emit('district:changed', {
        from: oldDistrict,
        to: newDistrict,
      });
    }
  }

  public getCurrentDistrict(): District | null {
    return this.currentDistrict;
  }
}
```

### 22.3 Пример конфигурации районов

```typescript
const DOWNTOWN_DISTRICT: DistrictConfig = {
  id: 'downtown',
  name: 'Downtown',
  bounds: [
    { x: 0, y: 0 },
    { x: 2048, y: 0 },
    { x: 2048, y: 2048 },
    { x: 0, y: 2048 },
  ],
  pedestrianDensity: 0.8,
  vehicleDensity: 0.7,
  vehicleTypes: [VehicleType.CAR_SEDAN, VehicleType.CAR_TAXI, VehicleType.BUS],
  pedestrianTypes: [0, 1, 2], // Бизнесмены, офисные работники
  ambientTrack: 'ambient_city',
  policePresence: 0.6,
};

const INDUSTRIAL_DISTRICT: DistrictConfig = {
  id: 'industrial',
  name: 'Industrial Zone',
  bounds: [...],
  pedestrianDensity: 0.2,
  vehicleDensity: 0.4,
  vehicleTypes: [VehicleType.TRUCK, VehicleType.CAR_SEDAN],
  pedestrianTypes: [3, 4], // Рабочие
  ambientTrack: 'ambient_industrial',
  policePresence: 0.2,
};
```

### 22.4 Интеграция со SpawnManager

```typescript
// SpawnManager использует параметры района
const district = this.districtManager.getDistrictAt(playerX, playerY);

if (district) {
  const config = district.getConfig();
  this.currentPedestrianDensity = config.pedestrianDensity;
  this.currentVehicleDensity = config.vehicleDensity;
  this.allowedVehicleTypes = config.vehicleTypes;
}
```

### 22.5 UI индикация района

При смене района показывать название:
```
┌─────────────────────────────┐
│                             │
│     ENTERING DOWNTOWN       │
│                             │
└─────────────────────────────┘
```

## Результат
- Карта разделена на районы
- Каждый район имеет свои параметры
- Плотность трафика/пешеходов зависит от района
- При смене района меняется атмосфера

## Следующий шаг
Шаг 23: Система оружия
