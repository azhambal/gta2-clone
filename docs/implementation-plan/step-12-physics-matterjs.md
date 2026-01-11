# Шаг 12: Интеграция физики Matter.js

## Цель
Интегрировать физический движок Matter.js для симуляции физики транспорта. После этого шага физические тела работают корректно.

## Зависимости
- Шаг 11: Коллизии с картой

## Задачи

### 12.1 PhysicsManager

**src/physics/PhysicsManager.ts:**
```typescript
import Matter from 'matter-js';
import { eventBus } from '@core/EventBus';

const { Engine, World, Bodies, Body, Events, Composite } = Matter;

export interface PhysicsConfig {
  gravity?: { x: number; y: number };
  enableSleeping?: boolean;
}

/**
 * Менеджер физики (обёртка над Matter.js)
 */
export class PhysicsManager {
  private engine: Matter.Engine;
  private world: Matter.World;

  // Маппинг ECS entity -> Matter body
  private entityBodyMap: Map<number, Matter.Body> = new Map();
  private bodyEntityMap: Map<number, number> = new Map();

  constructor(config: PhysicsConfig = {}) {
    this.engine = Engine.create({
      gravity: config.gravity || { x: 0, y: 0 }, // Вид сверху — нет гравитации
      enableSleeping: config.enableSleeping ?? true,
    });

    this.world = this.engine.world;

    this.setupCollisionEvents();
  }

  /**
   * Настройка событий коллизий
   */
  private setupCollisionEvents(): void {
    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const entityA = this.bodyEntityMap.get(pair.bodyA.id);
        const entityB = this.bodyEntityMap.get(pair.bodyB.id);

        if (entityA !== undefined && entityB !== undefined) {
          eventBus.emit('physics:collisionStart', {
            entityA,
            entityB,
            pair,
          });
        }
      }
    });

    Events.on(this.engine, 'collisionEnd', (event) => {
      for (const pair of event.pairs) {
        const entityA = this.bodyEntityMap.get(pair.bodyA.id);
        const entityB = this.bodyEntityMap.get(pair.bodyB.id);

        if (entityA !== undefined && entityB !== undefined) {
          eventBus.emit('physics:collisionEnd', {
            entityA,
            entityB,
            pair,
          });
        }
      }
    });
  }

  /**
   * Обновление физики
   */
  public update(dt: number): void {
    Engine.update(this.engine, dt);
  }

  /**
   * Создание прямоугольного тела
   */
  public createRectBody(
    entityId: number,
    x: number,
    y: number,
    width: number,
    height: number,
    options: Matter.IBodyDefinition = {}
  ): Matter.Body {
    const body = Bodies.rectangle(x, y, width, height, {
      ...options,
      label: `entity_${entityId}`,
    });

    World.add(this.world, body);
    this.entityBodyMap.set(entityId, body);
    this.bodyEntityMap.set(body.id, entityId);

    return body;
  }

  /**
   * Создание круглого тела
   */
  public createCircleBody(
    entityId: number,
    x: number,
    y: number,
    radius: number,
    options: Matter.IBodyDefinition = {}
  ): Matter.Body {
    const body = Bodies.circle(x, y, radius, {
      ...options,
      label: `entity_${entityId}`,
    });

    World.add(this.world, body);
    this.entityBodyMap.set(entityId, body);
    this.bodyEntityMap.set(body.id, entityId);

    return body;
  }

  /**
   * Создание статического прямоугольника (стена)
   */
  public createStaticRect(
    x: number,
    y: number,
    width: number,
    height: number,
    options: Matter.IBodyDefinition = {}
  ): Matter.Body {
    const body = Bodies.rectangle(x, y, width, height, {
      ...options,
      isStatic: true,
    });

    World.add(this.world, body);
    return body;
  }

  /**
   * Удаление тела
   */
  public removeBody(entityId: number): void {
    const body = this.entityBodyMap.get(entityId);
    if (body) {
      World.remove(this.world, body);
      this.bodyEntityMap.delete(body.id);
      this.entityBodyMap.delete(entityId);
    }
  }

  /**
   * Получение тела по entity ID
   */
  public getBody(entityId: number): Matter.Body | undefined {
    return this.entityBodyMap.get(entityId);
  }

  /**
   * Получение entity ID по body ID
   */
  public getEntityId(bodyId: number): number | undefined {
    return this.bodyEntityMap.get(bodyId);
  }

  /**
   * Установка позиции тела
   */
  public setBodyPosition(entityId: number, x: number, y: number): void {
    const body = this.entityBodyMap.get(entityId);
    if (body) {
      Body.setPosition(body, { x, y });
    }
  }

  /**
   * Установка угла тела
   */
  public setBodyAngle(entityId: number, angle: number): void {
    const body = this.entityBodyMap.get(entityId);
    if (body) {
      Body.setAngle(body, angle);
    }
  }

  /**
   * Применение силы к телу
   */
  public applyForce(entityId: number, force: { x: number; y: number }): void {
    const body = this.entityBodyMap.get(entityId);
    if (body) {
      Body.applyForce(body, body.position, force);
    }
  }

  /**
   * Установка скорости тела
   */
  public setVelocity(entityId: number, velocity: { x: number; y: number }): void {
    const body = this.entityBodyMap.get(entityId);
    if (body) {
      Body.setVelocity(body, velocity);
    }
  }

  /**
   * Получение позиции тела
   */
  public getBodyPosition(entityId: number): { x: number; y: number } | null {
    const body = this.entityBodyMap.get(entityId);
    return body ? { x: body.position.x, y: body.position.y } : null;
  }

  /**
   * Получение угла тела
   */
  public getBodyAngle(entityId: number): number | null {
    const body = this.entityBodyMap.get(entityId);
    return body ? body.angle : null;
  }

  /**
   * Получение скорости тела
   */
  public getBodyVelocity(entityId: number): { x: number; y: number } | null {
    const body = this.entityBodyMap.get(entityId);
    return body ? { x: body.velocity.x, y: body.velocity.y } : null;
  }

  /**
   * Создание стен карты из блоков
   */
  public createMapColliders(map: any, z: number = 0): void {
    // Будет реализовано позже при оптимизации
  }

  /**
   * Получение Matter.js World
   */
  public getWorld(): Matter.World {
    return this.world;
  }

  /**
   * Получение Matter.js Engine
   */
  public getEngine(): Matter.Engine {
    return this.engine;
  }

  /**
   * Очистка всех тел
   */
  public clear(): void {
    World.clear(this.world, false);
    this.entityBodyMap.clear();
    this.bodyEntityMap.clear();
  }
}
```

### 12.2 Слои коллизий

**src/physics/CollisionLayers.ts:**
```typescript
/**
 * Слои коллизий (битовые маски)
 */
export const CollisionLayer = {
  NONE: 0x0000,
  STATIC: 0x0001,      // Стены, здания
  VEHICLE: 0x0002,     // Машины
  PEDESTRIAN: 0x0004,  // Пешеходы
  PROJECTILE: 0x0008,  // Пули, снаряды
  PICKUP: 0x0010,      // Подбираемые предметы
  TRIGGER: 0x0020,     // Триггеры миссий
  SENSOR: 0x0040,      // Сенсоры (без физики)
} as const;

/**
 * Категории коллизий для Matter.js
 */
export const CollisionCategory = {
  STATIC: 0x0001,
  VEHICLE: 0x0002,
  PEDESTRIAN: 0x0004,
  PROJECTILE: 0x0008,
  PICKUP: 0x0010,
  TRIGGER: 0x0020,
};

/**
 * Маски коллизий (с чем сталкивается)
 */
export const CollisionMask = {
  // Статичные объекты сталкиваются с машинами и пешеходами
  STATIC: CollisionCategory.VEHICLE | CollisionCategory.PEDESTRIAN,

  // Машины сталкиваются со всем кроме триггеров и пикапов
  VEHICLE:
    CollisionCategory.STATIC |
    CollisionCategory.VEHICLE |
    CollisionCategory.PEDESTRIAN |
    CollisionCategory.PROJECTILE,

  // Пешеходы
  PEDESTRIAN:
    CollisionCategory.STATIC |
    CollisionCategory.VEHICLE |
    CollisionCategory.PEDESTRIAN |
    CollisionCategory.PROJECTILE |
    CollisionCategory.PICKUP,

  // Пули сталкиваются с машинами, пешеходами и стенами
  PROJECTILE:
    CollisionCategory.STATIC |
    CollisionCategory.VEHICLE |
    CollisionCategory.PEDESTRIAN,

  // Пикапы только с пешеходами и машинами
  PICKUP: CollisionCategory.PEDESTRIAN | CollisionCategory.VEHICLE,
};
```

### 12.3 Система синхронизации физики

**src/ecs/systems/PhysicsSyncSystem.ts:**
```typescript
import { defineQuery, defineSystem, hasComponent } from 'bitecs';
import { Position, Velocity, Rotation, RigidBody } from '../components';
import { PhysicsManager } from '@physics/PhysicsManager';
import { IWorld } from 'bitecs';

const physicsQuery = defineQuery([Position, RigidBody]);

/**
 * Система синхронизации ECS <-> Matter.js
 * Выполняется ПОСЛЕ физики
 */
export const createPhysicsSyncSystem = (physicsManager: PhysicsManager) => {
  return defineSystem((world: IWorld, dt: number) => {
    const entities = physicsQuery(world);

    for (const eid of entities) {
      const bodyId = RigidBody.bodyId[eid];
      if (bodyId === 0) continue;

      // Получение позиции из физики
      const pos = physicsManager.getBodyPosition(eid);
      if (pos) {
        Position.x[eid] = pos.x;
        Position.y[eid] = pos.y;
      }

      // Получение угла из физики
      const angle = physicsManager.getBodyAngle(eid);
      if (angle !== null && hasComponent(world, Rotation, eid)) {
        Rotation.angle[eid] = angle;
      }

      // Получение скорости из физики
      const vel = physicsManager.getBodyVelocity(eid);
      if (vel && hasComponent(world, Velocity, eid)) {
        Velocity.x[eid] = vel.x;
        Velocity.y[eid] = vel.y;
      }
    }

    return world;
  });
};
```

### 12.4 Интеграция в Game.ts

**src/Game.ts (добавления):**
```typescript
import { PhysicsManager } from './physics/PhysicsManager';
import { createPhysicsSyncSystem } from './ecs/systems/PhysicsSyncSystem';

// Добавить поле:
private physicsManager!: PhysicsManager;

// В методе init():
this.physicsManager = new PhysicsManager({
  gravity: { x: 0, y: 0 }, // Вид сверху
});
Debug.log('Game', 'Physics initialized');

// Регистрация системы синхронизации (после всех физических систем)
const physicsSyncSystem = createPhysicsSyncSystem(this.physicsManager);
this.systemManager.register('physicsSync', physicsSyncSystem, 50);

// В методе fixedUpdate():
private fixedUpdate(dt: number): void {
  const world = ecsWorld.getWorld();

  // Обновление ECS систем
  this.systemManager.update(world, dt);

  // Обновление физики
  this.physicsManager.update(dt);
}
```

### 12.5 Экспорт модулей

**src/physics/index.ts:**
```typescript
export { PhysicsManager, PhysicsConfig } from './PhysicsManager';
export { CollisionLayer, CollisionCategory, CollisionMask } from './CollisionLayers';
```

**src/ecs/systems/index.ts:**
```typescript
// ... существующие экспорты ...
export { createPhysicsSyncSystem } from './PhysicsSyncSystem';
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `physics/PhysicsManager.ts` | `PhysicsManager` | Обёртка над Matter.js |
| `physics/CollisionLayers.ts` | `CollisionLayer`, `CollisionCategory` | Слои коллизий |
| `ecs/systems/PhysicsSyncSystem.ts` | `createPhysicsSyncSystem` | Синхронизация ECS ↔ физика |

## Ключевые методы PhysicsManager

| Метод | Описание |
|-------|----------|
| `update(dt)` | Шаг симуляции |
| `createRectBody(eid, x, y, w, h, options)` | Создание прямоугольного тела |
| `createCircleBody(eid, x, y, r, options)` | Создание круглого тела |
| `createStaticRect(x, y, w, h)` | Создание статической стены |
| `removeBody(eid)` | Удаление тела |
| `getBody(eid)` | Получение тела |
| `setBodyPosition(eid, x, y)` | Установка позиции |
| `applyForce(eid, force)` | Применение силы |
| `setVelocity(eid, velocity)` | Установка скорости |

## События физики

| Событие | Данные | Описание |
|---------|--------|----------|
| `physics:collisionStart` | `{ entityA, entityB, pair }` | Начало коллизии |
| `physics:collisionEnd` | `{ entityA, entityB, pair }` | Конец коллизии |

## Результат
- Matter.js интегрирован в игру
- Физические тела могут создаваться и удаляться
- Синхронизация позиций между ECS и физикой работает
- События коллизий генерируются

## Проверка
```typescript
// Тест: создание физического тела
const body = this.physicsManager.createRectBody(999, 500, 500, 50, 50, {
  friction: 0.1,
  restitution: 0.5,
});
console.log('Created physics body:', body.id);
```

## Следующий шаг
Шаг 13: Транспорт - базовая структура
