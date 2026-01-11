# Шаг 09: ECS Архитектура (bitECS)

## Цель
Интегрировать Entity Component System (bitECS) для управления игровыми сущностями. После этого шага базовая ECS работает с компонентами и системами.

## Зависимости
- Шаг 08: Система ввода

## Задачи

### 9.1 Инициализация bitECS World

**src/ecs/World.ts:**
```typescript
import { createWorld, IWorld, resetWorld } from 'bitecs';

/**
 * Создание и управление ECS миром
 */
export class ECSWorld {
  private world: IWorld;

  constructor() {
    this.world = createWorld();
  }

  /**
   * Получение bitECS world
   */
  public getWorld(): IWorld {
    return this.world;
  }

  /**
   * Сброс мира (удаление всех сущностей)
   */
  public reset(): void {
    resetWorld(this.world);
  }
}

// Синглтон
export const ecsWorld = new ECSWorld();
```

### 9.2 Базовые компоненты

**src/ecs/components/Transform.ts:**
```typescript
import { defineComponent, Types } from 'bitecs';

/**
 * Компонент позиции
 */
export const Position = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,  // Уровень высоты
});

/**
 * Компонент скорости
 */
export const Velocity = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
});

/**
 * Компонент поворота
 */
export const Rotation = defineComponent({
  angle: Types.f32,  // В радианах
});

/**
 * Компонент масштаба
 */
export const Scale = defineComponent({
  x: Types.f32,
  y: Types.f32,
});
```

**src/ecs/components/Sprite.ts:**
```typescript
import { defineComponent, Types } from 'bitecs';

/**
 * Компонент спрайта
 */
export const SpriteComponent = defineComponent({
  textureId: Types.ui16,     // ID текстуры в реестре
  frame: Types.ui16,         // Текущий кадр анимации
  width: Types.f32,          // Ширина спрайта
  height: Types.f32,         // Высота спрайта
  anchorX: Types.f32,        // Anchor X (0-1)
  anchorY: Types.f32,        // Anchor Y (0-1)
  visible: Types.ui8,        // Видимость (0/1)
  tint: Types.ui32,          // Цвет (для tint)
});

/**
 * Компонент анимации
 */
export const AnimationComponent = defineComponent({
  startFrame: Types.ui16,    // Начальный кадр
  endFrame: Types.ui16,      // Конечный кадр
  speed: Types.f32,          // Скорость (кадров/сек)
  timer: Types.f32,          // Таймер
  loop: Types.ui8,           // Зациклена (0/1)
  playing: Types.ui8,        // Играет (0/1)
});
```

**src/ecs/components/Physics.ts:**
```typescript
import { defineComponent, Types } from 'bitecs';

/**
 * Компонент коллайдера
 */
export const Collider = defineComponent({
  type: Types.ui8,           // 0=none, 1=box, 2=circle
  width: Types.f32,          // Для box
  height: Types.f32,         // Для box
  radius: Types.f32,         // Для circle
  offsetX: Types.f32,        // Смещение от центра
  offsetY: Types.f32,
  layer: Types.ui8,          // Слой коллизий
  mask: Types.ui8,           // Маска коллизий
});

/**
 * Компонент физического тела (для Matter.js)
 */
export const RigidBody = defineComponent({
  bodyId: Types.ui32,        // ID тела в Matter.js
  mass: Types.f32,
  friction: Types.f32,
  restitution: Types.f32,    // Упругость
  isStatic: Types.ui8,       // Статичное тело
  isSensor: Types.ui8,       // Сенсор (без физики)
});
```

**src/ecs/components/Health.ts:**
```typescript
import { defineComponent, Types } from 'bitecs';

/**
 * Компонент здоровья
 */
export const Health = defineComponent({
  current: Types.f32,
  max: Types.f32,
  invulnerable: Types.ui8,   // Неуязвим (0/1)
  invulnerableTimer: Types.f32,
});

/**
 * Компонент урона (для пуль и т.д.)
 */
export const Damage = defineComponent({
  amount: Types.f32,
  type: Types.ui8,           // Тип урона
  sourceEntity: Types.eid,   // Кто нанёс урон
});
```

**src/ecs/components/Tags.ts:**
```typescript
import { defineComponent, Types } from 'bitecs';

/**
 * Тег: контролируется игроком
 */
export const PlayerControlled = defineComponent();

/**
 * Тег: это транспорт
 */
export const Vehicle = defineComponent({
  type: Types.ui8,           // Тип транспорта
  damage: Types.f32,         // Повреждения (0-100)
  fuel: Types.f32,           // Топливо
});

/**
 * Тег: это пешеход
 */
export const Pedestrian = defineComponent({
  type: Types.ui8,           // Тип пешехода
  mood: Types.ui8,           // Настроение
});

/**
 * Компонент водителя
 */
export const Driver = defineComponent({
  vehicleEntity: Types.eid,  // Сущность машины
});

/**
 * Компонент машины с водителем
 */
export const VehicleOccupants = defineComponent({
  driver: Types.eid,         // Сущность водителя
  passenger1: Types.eid,
  passenger2: Types.eid,
  passenger3: Types.eid,
});
```

### 9.3 Экспорт компонентов

**src/ecs/components/index.ts:**
```typescript
export { Position, Velocity, Rotation, Scale } from './Transform';
export { SpriteComponent, AnimationComponent } from './Sprite';
export { Collider, RigidBody } from './Physics';
export { Health, Damage } from './Health';
export { PlayerControlled, Vehicle, Pedestrian, Driver, VehicleOccupants } from './Tags';
```

### 9.4 Базовые системы

**src/ecs/systems/MovementSystem.ts:**
```typescript
import { defineQuery, defineSystem, enterQuery, exitQuery } from 'bitecs';
import { Position, Velocity } from '../components';
import { IWorld } from 'bitecs';

/**
 * Запрос сущностей с Position и Velocity
 */
const movementQuery = defineQuery([Position, Velocity]);

/**
 * Система движения — применяет скорость к позиции
 */
export const createMovementSystem = () => {
  return defineSystem((world: IWorld, dt: number) => {
    const entities = movementQuery(world);

    for (const eid of entities) {
      // Применяем скорость (dt в секундах)
      Position.x[eid] += Velocity.x[eid] * (dt / 1000);
      Position.y[eid] += Velocity.y[eid] * (dt / 1000);
      Position.z[eid] += Velocity.z[eid] * (dt / 1000);
    }

    return world;
  });
};

// Синглтон системы
export const movementSystem = createMovementSystem();
```

**src/ecs/systems/AnimationSystem.ts:**
```typescript
import { defineQuery, defineSystem } from 'bitecs';
import { SpriteComponent, AnimationComponent } from '../components';
import { IWorld } from 'bitecs';

const animationQuery = defineQuery([SpriteComponent, AnimationComponent]);

/**
 * Система анимации — обновляет кадры спрайтов
 */
export const createAnimationSystem = () => {
  return defineSystem((world: IWorld, dt: number) => {
    const entities = animationQuery(world);

    for (const eid of entities) {
      if (!AnimationComponent.playing[eid]) continue;

      // Обновление таймера
      AnimationComponent.timer[eid] += dt / 1000;

      const frameTime = 1 / AnimationComponent.speed[eid];
      if (AnimationComponent.timer[eid] >= frameTime) {
        AnimationComponent.timer[eid] -= frameTime;

        // Следующий кадр
        let nextFrame = SpriteComponent.frame[eid] + 1;

        if (nextFrame > AnimationComponent.endFrame[eid]) {
          if (AnimationComponent.loop[eid]) {
            nextFrame = AnimationComponent.startFrame[eid];
          } else {
            nextFrame = AnimationComponent.endFrame[eid];
            AnimationComponent.playing[eid] = 0;
          }
        }

        SpriteComponent.frame[eid] = nextFrame;
      }
    }

    return world;
  });
};

export const animationSystem = createAnimationSystem();
```

### 9.5 Менеджер систем

**src/ecs/SystemManager.ts:**
```typescript
import { IWorld } from 'bitecs';

type SystemFunction = (world: IWorld, dt: number) => IWorld;

/**
 * Менеджер систем — управляет порядком выполнения
 */
export class SystemManager {
  private systems: Map<string, SystemFunction> = new Map();
  private executionOrder: string[] = [];

  /**
   * Регистрация системы
   */
  public register(name: string, system: SystemFunction, priority?: number): void {
    this.systems.set(name, system);

    // Добавляем в порядок выполнения
    if (priority !== undefined) {
      this.executionOrder.splice(priority, 0, name);
    } else {
      this.executionOrder.push(name);
    }
  }

  /**
   * Удаление системы
   */
  public unregister(name: string): void {
    this.systems.delete(name);
    this.executionOrder = this.executionOrder.filter(n => n !== name);
  }

  /**
   * Выполнение всех систем
   */
  public update(world: IWorld, dt: number): void {
    for (const name of this.executionOrder) {
      const system = this.systems.get(name);
      if (system) {
        system(world, dt);
      }
    }
  }

  /**
   * Получение списка систем
   */
  public getSystems(): string[] {
    return [...this.executionOrder];
  }
}
```

### 9.6 Фабрика сущностей

**src/ecs/EntityFactory.ts:**
```typescript
import { addEntity, addComponent, IWorld } from 'bitecs';
import {
  Position, Velocity, Rotation, Scale,
  SpriteComponent, AnimationComponent,
  Collider, Health,
  PlayerControlled, Pedestrian, Vehicle
} from './components';

/**
 * Фабрика для создания сущностей
 */
export class EntityFactory {
  /**
   * Создание базовой сущности с позицией
   */
  public static createBasicEntity(
    world: IWorld,
    x: number,
    y: number,
    z: number = 0
  ): number {
    const eid = addEntity(world);

    addComponent(world, Position, eid);
    Position.x[eid] = x;
    Position.y[eid] = y;
    Position.z[eid] = z;

    addComponent(world, Rotation, eid);
    Rotation.angle[eid] = 0;

    return eid;
  }

  /**
   * Создание игрока
   */
  public static createPlayer(
    world: IWorld,
    x: number,
    y: number
  ): number {
    const eid = this.createBasicEntity(world, x, y, 0);

    // Скорость
    addComponent(world, Velocity, eid);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;

    // Спрайт
    addComponent(world, SpriteComponent, eid);
    SpriteComponent.textureId[eid] = 0; // Будет настроено позже
    SpriteComponent.width[eid] = 32;
    SpriteComponent.height[eid] = 32;
    SpriteComponent.anchorX[eid] = 0.5;
    SpriteComponent.anchorY[eid] = 0.5;
    SpriteComponent.visible[eid] = 1;

    // Коллайдер
    addComponent(world, Collider, eid);
    Collider.type[eid] = 2; // Circle
    Collider.radius[eid] = 12;
    Collider.layer[eid] = 2; // Pedestrian layer

    // Здоровье
    addComponent(world, Health, eid);
    Health.current[eid] = 100;
    Health.max[eid] = 100;

    // Теги
    addComponent(world, PlayerControlled, eid);
    addComponent(world, Pedestrian, eid);

    return eid;
  }

  /**
   * Создание NPC пешехода
   */
  public static createPedestrian(
    world: IWorld,
    x: number,
    y: number,
    type: number = 0
  ): number {
    const eid = this.createBasicEntity(world, x, y, 0);

    addComponent(world, Velocity, eid);
    addComponent(world, SpriteComponent, eid);
    SpriteComponent.width[eid] = 32;
    SpriteComponent.height[eid] = 32;
    SpriteComponent.anchorX[eid] = 0.5;
    SpriteComponent.anchorY[eid] = 0.5;
    SpriteComponent.visible[eid] = 1;

    addComponent(world, Collider, eid);
    Collider.type[eid] = 2;
    Collider.radius[eid] = 12;

    addComponent(world, Health, eid);
    Health.current[eid] = 50;
    Health.max[eid] = 50;

    addComponent(world, Pedestrian, eid);
    Pedestrian.type[eid] = type;

    return eid;
  }

  /**
   * Создание машины
   */
  public static createVehicle(
    world: IWorld,
    x: number,
    y: number,
    type: number = 0
  ): number {
    const eid = this.createBasicEntity(world, x, y, 0);

    addComponent(world, Velocity, eid);

    addComponent(world, SpriteComponent, eid);
    SpriteComponent.width[eid] = 64;
    SpriteComponent.height[eid] = 44;
    SpriteComponent.anchorX[eid] = 0.5;
    SpriteComponent.anchorY[eid] = 0.5;
    SpriteComponent.visible[eid] = 1;

    addComponent(world, Collider, eid);
    Collider.type[eid] = 1; // Box
    Collider.width[eid] = 56;
    Collider.height[eid] = 28;

    addComponent(world, Health, eid);
    Health.current[eid] = 100;
    Health.max[eid] = 100;

    addComponent(world, Vehicle, eid);
    Vehicle.type[eid] = type;
    Vehicle.damage[eid] = 0;
    Vehicle.fuel[eid] = 100;

    return eid;
  }
}
```

### 9.7 Экспорт модулей

**src/ecs/index.ts:**
```typescript
export { ECSWorld, ecsWorld } from './World';
export { SystemManager } from './SystemManager';
export { EntityFactory } from './EntityFactory';

// Компоненты
export * from './components';

// Системы
export { movementSystem } from './systems/MovementSystem';
export { animationSystem } from './systems/AnimationSystem';
```

**src/ecs/systems/index.ts:**
```typescript
export { createMovementSystem, movementSystem } from './MovementSystem';
export { createAnimationSystem, animationSystem } from './AnimationSystem';
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `ecs/World.ts` | `ECSWorld` | Обёртка над bitECS world |
| `ecs/SystemManager.ts` | `SystemManager` | Управление порядком систем |
| `ecs/EntityFactory.ts` | `EntityFactory` | Создание сущностей |
| `ecs/components/*.ts` | Компоненты | Данные сущностей |
| `ecs/systems/*.ts` | Системы | Логика обработки |

## Компоненты

| Компонент | Поля | Описание |
|-----------|------|----------|
| Position | x, y, z | Позиция в мире |
| Velocity | x, y, z | Скорость |
| Rotation | angle | Угол поворота |
| SpriteComponent | textureId, frame, width, height | Визуал |
| Collider | type, width, height, radius | Коллизии |
| Health | current, max | Здоровье |
| PlayerControlled | — | Тег игрока |
| Vehicle | type, damage, fuel | Данные машины |
| Pedestrian | type, mood | Данные пешехода |

## Результат
- bitECS интегрирован
- Базовые компоненты определены
- MovementSystem и AnimationSystem работают
- EntityFactory создаёт сущности

## Проверка
```typescript
// В Game.ts
import { ecsWorld, EntityFactory, movementSystem } from './ecs';

// Создание сущности
const world = ecsWorld.getWorld();
const playerId = EntityFactory.createPlayer(world, 100, 100);
console.log('Created player:', playerId);

// Обновление в fixedUpdate
movementSystem(world, dt);
```

## Следующий шаг
Шаг 10: Игрок-пешеход
