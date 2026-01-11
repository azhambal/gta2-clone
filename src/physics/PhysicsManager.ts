import Matter from 'matter-js';
import { eventBus } from '../core/EventBus.js';

const { Engine, World, Bodies, Body, Events } = Matter;

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
      chamfer: options.chamfer ?? undefined,
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
      chamfer: options.chamfer ?? undefined,
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
      chamfer: options.chamfer ?? undefined,
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
  public createMapColliders(_map: unknown, _z: number = 0): void {
    // Будет реализовано позже при оптимизации
    // Сейчас используется MapCollisionSystem
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
