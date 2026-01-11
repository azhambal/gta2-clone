# Шаг 16: Типы поверхностей

## Цель
Реализовать влияние типа поверхности на физику движения. После этого шага трава замедляет, лёд скользит, масло вызывает потерю контроля.

## Зависимости
- Шаг 15: Вход/выход из машины

## Задачи

### 16.1 Определения поверхностей

**src/physics/SurfaceTypes.ts:**
```typescript
export interface SurfaceProperties {
  id: SurfaceType;
  name: string;
  gripMultiplier: number;      // Множитель сцепления
  speedMultiplier: number;     // Множитель скорости
  frictionMultiplier: number;  // Множитель трения
  dustParticles: boolean;      // Пылевые частицы
  waterSplash: boolean;        // Брызги воды
  soundType: string;           // Тип звука
}

export const SURFACE_PROPERTIES: Record<SurfaceType, SurfaceProperties> = {
  [SurfaceType.ROAD]: {
    id: SurfaceType.ROAD,
    name: 'Road',
    gripMultiplier: 1.0,
    speedMultiplier: 1.0,
    frictionMultiplier: 1.0,
    dustParticles: false,
    waterSplash: false,
    soundType: 'road',
  },
  [SurfaceType.GRASS]: {
    id: SurfaceType.GRASS,
    name: 'Grass',
    gripMultiplier: 0.7,
    speedMultiplier: 0.6,
    frictionMultiplier: 1.5,
    dustParticles: true,
    waterSplash: false,
    soundType: 'grass',
  },
  [SurfaceType.ICE]: {
    id: SurfaceType.ICE,
    name: 'Ice',
    gripMultiplier: 0.15,
    speedMultiplier: 1.0,
    frictionMultiplier: 0.1,
    dustParticles: false,
    waterSplash: false,
    soundType: 'ice',
  },
  [SurfaceType.OIL]: {
    id: SurfaceType.OIL,
    name: 'Oil',
    gripMultiplier: 0.05,
    speedMultiplier: 1.0,
    frictionMultiplier: 0.05,
    dustParticles: false,
    waterSplash: false,
    soundType: 'oil',
  },
  [SurfaceType.WATER]: {
    id: SurfaceType.WATER,
    name: 'Water',
    gripMultiplier: 0.5,
    speedMultiplier: 0.3,
    frictionMultiplier: 3.0,
    dustParticles: false,
    waterSplash: true,
    soundType: 'water',
  },
  // ... другие поверхности
};
```

### 16.2 Определение поверхности под сущностью

**src/world/GameMap.ts (добавить метод):**
```typescript
public getSurfaceAt(worldX: number, worldY: number, z: number = 0): SurfaceType {
  const blockX = Math.floor(worldX / BLOCK_SIZE);
  const blockY = Math.floor(worldY / BLOCK_SIZE);

  const block = this.getBlock(blockX, blockY, z);
  const blockDef = blockRegistry.get(block.getType());

  return blockDef?.surface ?? SurfaceType.NONE;
}
```

### 16.3 Применение в VehiclePhysicsSystem

```typescript
// Получаем поверхность под машиной
const surface = gameMap.getSurfaceAt(Position.x[eid], Position.y[eid], Position.z[eid]);
const surfaceProps = SURFACE_PROPERTIES[surface];

// Модифицируем физику
const effectiveGrip = physics.grip[eid] * surfaceProps.gripMultiplier;
const effectiveMaxSpeed = physics.maxSpeed[eid] * surfaceProps.speedMultiplier;
const effectiveFriction = baseFriction * surfaceProps.frictionMultiplier;

// Применяем к расчётам
newSpeed *= (1 - effectiveFriction);
// При низком grip увеличиваем занос
if (effectiveGrip < 0.5) {
  physics.drifting[eid] = 1;
}
```

### 16.4 Частицы поверхности

При движении по определённым поверхностям спавнить частицы:
- Трава/грязь: пылевые частицы
- Вода: брызги
- Асфальт при дрифте: дым от шин

## Результат
- На траве машина замедляется и хуже управляется
- На льду машину заносит
- На масле полная потеря контроля
- Вода сильно замедляет

## Следующий шаг
Шаг 17: Многоуровневость (Slopes)
