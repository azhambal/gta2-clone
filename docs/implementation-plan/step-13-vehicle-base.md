# Шаг 13: Транспорт — базовая структура

## Цель
Создать базовую структуру для транспортных средств. После этого шага машины отображаются на карте и имеют физические тела.

## Зависимости
- Шаг 12: Интеграция физики Matter.js

## Задачи

### 13.1 Компоненты транспорта

**src/ecs/components/Vehicle.ts:**
```typescript
import { defineComponent, Types } from 'bitecs';

/**
 * Компонент транспортного средства
 */
export const VehicleComponent = defineComponent({
  type: Types.ui8,           // Тип машины (enum VehicleType)
  damage: Types.f32,         // Уровень повреждений (0-100)
  fuel: Types.f32,           // Топливо (0-100)
  engineRunning: Types.ui8,  // Двигатель работает
});

/**
 * Компонент физики транспорта
 */
export const VehiclePhysics = defineComponent({
  // Параметры
  mass: Types.f32,           // Масса (кг)
  maxSpeed: Types.f32,       // Макс. скорость (ед/сек)
  acceleration: Types.f32,   // Ускорение
  braking: Types.f32,        // Сила торможения
  handling: Types.f32,       // Управляемость (0-1)
  grip: Types.f32,           // Сцепление (0-1)

  // Текущее состояние
  throttle: Types.f32,       // Газ (-1 до 1)
  steering: Types.f32,       // Поворот (-1 до 1)
  speed: Types.f32,          // Текущая скорость
  angularVelocity: Types.f32, // Угловая скорость
  drifting: Types.ui8,       // В заносе
});

/**
 * Компонент пассажиров
 */
export const VehicleSeats = defineComponent({
  driver: Types.eid,         // ID водителя
  passenger1: Types.eid,
  passenger2: Types.eid,
  passenger3: Types.eid,
  maxSeats: Types.ui8,       // Максимум мест
});

/**
 * Типы транспорта
 */
export enum VehicleType {
  CAR_SPORT = 0,
  CAR_SEDAN = 1,
  CAR_TAXI = 2,
  CAR_POLICE = 3,
  TRUCK = 4,
  BUS = 5,
  MOTORCYCLE = 6,
  TANK = 7,
}
```

### 13.2 Определения транспорта

**src/data/VehicleDefinitions.ts:**
```typescript
import { VehicleType } from '@ecs/components/Vehicle';

export interface VehicleDefinition {
  type: VehicleType;
  name: string;

  // Визуал
  spriteWidth: number;
  spriteHeight: number;
  spriteAngles: number;      // Количество углов поворота

  // Коллайдер
  colliderWidth: number;
  colliderHeight: number;

  // Физика
  mass: number;
  maxSpeed: number;
  acceleration: number;
  braking: number;
  handling: number;
  grip: number;

  // Геймплей
  health: number;
  seats: number;
  canExplode: boolean;
}

export const VEHICLE_DEFINITIONS: Record<VehicleType, VehicleDefinition> = {
  [VehicleType.CAR_SPORT]: {
    type: VehicleType.CAR_SPORT,
    name: 'Sports Car',
    spriteWidth: 64,
    spriteHeight: 32,
    spriteAngles: 32,
    colliderWidth: 56,
    colliderHeight: 24,
    mass: 1000,
    maxSpeed: 400,
    acceleration: 200,
    braking: 150,
    handling: 0.9,
    grip: 0.85,
    health: 100,
    seats: 2,
    canExplode: true,
  },

  [VehicleType.CAR_SEDAN]: {
    type: VehicleType.CAR_SEDAN,
    name: 'Sedan',
    spriteWidth: 64,
    spriteHeight: 32,
    spriteAngles: 32,
    colliderWidth: 56,
    colliderHeight: 24,
    mass: 1200,
    maxSpeed: 300,
    acceleration: 150,
    braking: 120,
    handling: 0.7,
    grip: 0.8,
    health: 120,
    seats: 4,
    canExplode: true,
  },

  [VehicleType.CAR_TAXI]: {
    type: VehicleType.CAR_TAXI,
    name: 'Taxi',
    spriteWidth: 64,
    spriteHeight: 32,
    spriteAngles: 32,
    colliderWidth: 56,
    colliderHeight: 24,
    mass: 1300,
    maxSpeed: 280,
    acceleration: 140,
    braking: 130,
    handling: 0.75,
    grip: 0.8,
    health: 110,
    seats: 4,
    canExplode: true,
  },

  [VehicleType.CAR_POLICE]: {
    type: VehicleType.CAR_POLICE,
    name: 'Police Car',
    spriteWidth: 64,
    spriteHeight: 32,
    spriteAngles: 32,
    colliderWidth: 56,
    colliderHeight: 24,
    mass: 1400,
    maxSpeed: 350,
    acceleration: 180,
    braking: 160,
    handling: 0.85,
    grip: 0.9,
    health: 150,
    seats: 4,
    canExplode: true,
  },

  [VehicleType.TRUCK]: {
    type: VehicleType.TRUCK,
    name: 'Truck',
    spriteWidth: 80,
    spriteHeight: 40,
    spriteAngles: 32,
    colliderWidth: 72,
    colliderHeight: 32,
    mass: 3000,
    maxSpeed: 200,
    acceleration: 80,
    braking: 100,
    handling: 0.4,
    grip: 0.7,
    health: 200,
    seats: 2,
    canExplode: true,
  },

  [VehicleType.BUS]: {
    type: VehicleType.BUS,
    name: 'Bus',
    spriteWidth: 96,
    spriteHeight: 40,
    spriteAngles: 32,
    colliderWidth: 88,
    colliderHeight: 32,
    mass: 5000,
    maxSpeed: 150,
    acceleration: 50,
    braking: 80,
    handling: 0.3,
    grip: 0.6,
    health: 250,
    seats: 8,
    canExplode: true,
  },

  [VehicleType.MOTORCYCLE]: {
    type: VehicleType.MOTORCYCLE,
    name: 'Motorcycle',
    spriteWidth: 40,
    spriteHeight: 20,
    spriteAngles: 32,
    colliderWidth: 32,
    colliderHeight: 16,
    mass: 300,
    maxSpeed: 450,
    acceleration: 250,
    braking: 180,
    handling: 0.95,
    grip: 0.75,
    health: 50,
    seats: 2,
    canExplode: true,
  },

  [VehicleType.TANK]: {
    type: VehicleType.TANK,
    name: 'Tank',
    spriteWidth: 80,
    spriteHeight: 48,
    spriteAngles: 32,
    colliderWidth: 72,
    colliderHeight: 40,
    mass: 10000,
    maxSpeed: 100,
    acceleration: 40,
    braking: 200,
    handling: 0.2,
    grip: 0.95,
    health: 1000,
    seats: 2,
    canExplode: true,
  },
};

export function getVehicleDefinition(type: VehicleType): VehicleDefinition {
  return VEHICLE_DEFINITIONS[type];
}
```

### 13.3 Фабрика транспорта

**src/ecs/EntityFactory.ts (добавление метода):**
```typescript
import { VehicleComponent, VehiclePhysics, VehicleSeats, VehicleType } from './components/Vehicle';
import { getVehicleDefinition } from '@data/VehicleDefinitions';

/**
 * Создание транспортного средства
 */
public static createVehicle(
  world: IWorld,
  x: number,
  y: number,
  type: VehicleType = VehicleType.CAR_SEDAN,
  physicsManager?: any
): number {
  const def = getVehicleDefinition(type);
  const eid = addEntity(world);

  // Позиция
  addComponent(world, Position, eid);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Position.z[eid] = 0;

  // Поворот
  addComponent(world, Rotation, eid);
  Rotation.angle[eid] = 0;

  // Скорость
  addComponent(world, Velocity, eid);
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;

  // Спрайт
  addComponent(world, SpriteComponent, eid);
  SpriteComponent.textureId[eid] = 100 + type; // Vehicle textures start at 100
  SpriteComponent.width[eid] = def.spriteWidth;
  SpriteComponent.height[eid] = def.spriteHeight;
  SpriteComponent.anchorX[eid] = 0.5;
  SpriteComponent.anchorY[eid] = 0.5;
  SpriteComponent.visible[eid] = 1;

  // Здоровье
  addComponent(world, Health, eid);
  Health.current[eid] = def.health;
  Health.max[eid] = def.health;

  // Коллайдер
  addComponent(world, Collider, eid);
  Collider.type[eid] = 1; // Box
  Collider.width[eid] = def.colliderWidth;
  Collider.height[eid] = def.colliderHeight;

  // Компонент транспорта
  addComponent(world, VehicleComponent, eid);
  VehicleComponent.type[eid] = type;
  VehicleComponent.damage[eid] = 0;
  VehicleComponent.fuel[eid] = 100;
  VehicleComponent.engineRunning[eid] = 0;

  // Физика транспорта
  addComponent(world, VehiclePhysics, eid);
  VehiclePhysics.mass[eid] = def.mass;
  VehiclePhysics.maxSpeed[eid] = def.maxSpeed;
  VehiclePhysics.acceleration[eid] = def.acceleration;
  VehiclePhysics.braking[eid] = def.braking;
  VehiclePhysics.handling[eid] = def.handling;
  VehiclePhysics.grip[eid] = def.grip;
  VehiclePhysics.throttle[eid] = 0;
  VehiclePhysics.steering[eid] = 0;
  VehiclePhysics.speed[eid] = 0;

  // Места
  addComponent(world, VehicleSeats, eid);
  VehicleSeats.driver[eid] = 0;
  VehicleSeats.maxSeats[eid] = def.seats;

  // Физическое тело (если передан менеджер)
  if (physicsManager) {
    addComponent(world, RigidBody, eid);
    const body = physicsManager.createRectBody(
      eid,
      x,
      y,
      def.colliderWidth,
      def.colliderHeight,
      {
        friction: 0.1,
        frictionAir: 0.02,
        restitution: 0.3,
        mass: def.mass / 1000, // Matter.js использует меньшие значения
      }
    );
    RigidBody.bodyId[eid] = body.id;
  }

  return eid;
}
```

### 13.4 Обновление EntityRenderer для машин

**src/rendering/EntityRenderer.ts (добавления):**
```typescript
import { VehicleComponent, VehicleType } from '@ecs/components/Vehicle';
import { hasComponent } from 'bitecs';

// Добавить текстуры машин:
private vehicleTextures: Map<VehicleType, Texture> = new Map();

// В createPlaceholderTextures():
private createPlaceholderTextures(): void {
  // ... существующий код ...

  // Машины разных цветов
  this.vehicleTextures.set(
    VehicleType.CAR_SPORT,
    this.textureGenerator.generateVehicleTexture(0xff0000) // Красная
  );
  this.vehicleTextures.set(
    VehicleType.CAR_SEDAN,
    this.textureGenerator.generateVehicleTexture(0x0066cc) // Синяя
  );
  this.vehicleTextures.set(
    VehicleType.CAR_TAXI,
    this.textureGenerator.generateVehicleTexture(0xffcc00) // Жёлтая
  );
  this.vehicleTextures.set(
    VehicleType.CAR_POLICE,
    this.textureGenerator.generateVehicleTexture(0x000066) // Тёмно-синяя
  );
  this.vehicleTextures.set(
    VehicleType.TRUCK,
    this.textureGenerator.generateVehicleTexture(0x666666) // Серая
  );
}

// Обновить createSprite():
private createSprite(world: IWorld, eid: number): Sprite {
  let texture: Texture;

  // Проверяем тип сущности
  if (hasComponent(world, VehicleComponent, eid)) {
    const vehicleType = VehicleComponent.type[eid] as VehicleType;
    texture = this.vehicleTextures.get(vehicleType) || this.vehicleTexture;
  } else if (hasComponent(world, PlayerControlled, eid)) {
    texture = this.playerTexture;
  } else {
    texture = this.pedestrianTexture;
  }

  const sprite = new Sprite(texture);
  sprite.anchor.set(
    SpriteComponent.anchorX[eid] || 0.5,
    SpriteComponent.anchorY[eid] || 0.5
  );

  return sprite;
}
```

### 13.5 Тестовый спавн машин

**src/Game.ts (в методе init):**
```typescript
// Спавн тестовых машин
const { VehicleType } = require('./ecs/components/Vehicle');
const road = this.currentMap.widthInBlocks / 2;

// Машина на дороге
EntityFactory.createVehicle(
  world,
  road * GAME_CONSTANTS.BLOCK_SIZE + 100,
  centerY,
  VehicleType.CAR_TAXI,
  this.physicsManager
);

EntityFactory.createVehicle(
  world,
  road * GAME_CONSTANTS.BLOCK_SIZE - 100,
  centerY + 100,
  VehicleType.CAR_POLICE,
  this.physicsManager
);
```

### 13.6 Экспорт модулей

**src/ecs/components/index.ts:**
```typescript
// ... существующие экспорты ...
export { VehicleComponent, VehiclePhysics, VehicleSeats, VehicleType } from './Vehicle';
```

**src/data/index.ts:**
```typescript
export { VEHICLE_DEFINITIONS, getVehicleDefinition, VehicleDefinition } from './VehicleDefinitions';
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `ecs/components/Vehicle.ts` | `VehicleComponent` | Базовые данные машины |
| `ecs/components/Vehicle.ts` | `VehiclePhysics` | Физические параметры |
| `ecs/components/Vehicle.ts` | `VehicleSeats` | Места для пассажиров |
| `data/VehicleDefinitions.ts` | `VehicleDefinition` | Определение типа машины |

## Типы транспорта

| Тип | Описание | Особенности |
|-----|----------|-------------|
| CAR_SPORT | Спорткар | Быстрый, лёгкий дрифт |
| CAR_SEDAN | Седан | Сбалансирован |
| CAR_TAXI | Такси | Как седан |
| CAR_POLICE | Полицейская | Быстрая, устойчивая |
| TRUCK | Грузовик | Медленный, тяжёлый |
| BUS | Автобус | Очень медленный |
| MOTORCYCLE | Мотоцикл | Очень быстрый, хрупкий |
| TANK | Танк | Неуязвим |

## Результат
- Машины отображаются на карте
- Разные типы машин имеют разные цвета
- У машин есть физические тела
- Структура данных готова для физики

## Проверка
```bash
npm run dev
# На дороге должны быть видны машины
# Машины отображаются как цветные прямоугольники
```

## Следующий шаг
Шаг 14: Физика транспорта
