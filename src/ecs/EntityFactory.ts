import { addEntity, addComponent } from 'bitecs';
import type { GameWorld } from './World.js';
import type { PhysicsManager } from '../physics/PhysicsManager.js';
import {
  Position,
  Velocity,
  Rotation,
  SpriteComponent,
  Collider,
  Health,
  PlayerControlled,
  Pedestrian,
  Vehicle,
  VehiclePhysics,
  VehicleOccupants,
  RigidBody,
  PedestrianAI,
  PedestrianState,
} from './components/index.js';
import { getVehicleDefinition, VehicleType } from '../data/VehicleDefinitions.js';

/**
 * Фабрика для создания сущностей
 */
export class EntityFactory {
  /**
   * Создание базовой сущности с позицией
   */
  public static createBasicEntity(
    world: GameWorld,
    x: number,
    y: number,
    z: number = 0
  ): number {
    const eid = addEntity(world);
    const { Position: Pos, Rotation: Rot } = world.components;

    addComponent(world, eid, Position);
    Pos.x[eid] = x;
    Pos.y[eid] = y;
    Pos.z[eid] = z;

    addComponent(world, eid, Rotation);
    Rot.angle[eid] = 0;

    return eid;
  }

  /**
   * Создание игрока
   */
  public static createPlayer(
    world: GameWorld,
    x: number,
    y: number
  ): number {
    const eid = this.createBasicEntity(world, x, y, 0);
    const {
      Velocity: Vel,
      SpriteComponent: Sprite,
      Collider: Col,
      Health: HP,
      Pedestrian: _Ped,
    } = world.components;

    // Скорость
    addComponent(world, eid, Velocity);
    Vel.x[eid] = 0;
    Vel.y[eid] = 0;

    // Спрайт
    addComponent(world, eid, SpriteComponent);
    Sprite.textureId[eid] = 0; // Будет настроено позже
    Sprite.width[eid] = 32;
    Sprite.height[eid] = 32;
    Sprite.anchorX[eid] = 0.5;
    Sprite.anchorY[eid] = 0.5;
    Sprite.visible[eid] = 1;

    // Коллайдер
    addComponent(world, eid, Collider);
    Col.type[eid] = 2; // Circle
    Col.radius[eid] = 12;
    Col.layer[eid] = 2; // Pedestrian layer

    // Здоровье
    addComponent(world, eid, Health);
    HP.current[eid] = 100;
    HP.max[eid] = 100;

    // Теги
    addComponent(world, eid, PlayerControlled);
    addComponent(world, eid, Pedestrian);

    return eid;
  }

  /**
   * Создание NPC пешехода
   */
  public static createPedestrian(
    world: GameWorld,
    x: number,
    y: number,
    type: number = 0
  ): number {
    const eid = this.createBasicEntity(world, x, y, 0);
    const { Velocity: _Vel, SpriteComponent: Sprite, Collider: Col, Health: HP, Pedestrian: Ped, PedestrianAI: PedAI } =
      world.components;

    addComponent(world, eid, Velocity);
    addComponent(world, eid, SpriteComponent);
    Sprite.width[eid] = 32;
    Sprite.height[eid] = 32;
    Sprite.anchorX[eid] = 0.5;
    Sprite.anchorY[eid] = 0.5;
    Sprite.visible[eid] = 1;

    addComponent(world, eid, Collider);
    Col.type[eid] = 2;
    Col.radius[eid] = 12;

    addComponent(world, eid, Health);
    HP.current[eid] = 50;
    HP.max[eid] = 50;

    addComponent(world, eid, Pedestrian);
    Ped.type[eid] = type;

    // Добавляем AI для NPC пешеходов
    addComponent(world, eid, PedestrianAI);
    PedAI.state[eid] = PedestrianState.IDLE;
    PedAI.previousState[eid] = PedestrianState.IDLE;
    PedAI.targetX[eid] = 0;
    PedAI.targetY[eid] = 0;
    PedAI.hasTarget[eid] = 0;
    PedAI.walkSpeed[eid] = 80 + Math.random() * 40; // Случайная скорость ходьбы
    PedAI.runSpeed[eid] = 180 + Math.random() * 60; // Случайная скорость бега
    PedAI.fearLevel[eid] = 0;
    PedAI.sightRange[eid] = 300;
    PedAI.stateTimer[eid] = Math.random() * 3;
    PedAI.thinkTimer[eid] = 0;
    PedAI.pathCooldown[eid] = 0;

    return eid;
  }

  /**
   * Создание машины
   */
  public static createVehicle(
    world: GameWorld,
    x: number,
    y: number,
    type: VehicleType = VehicleType.CAR_SEDAN,
    physicsManager?: PhysicsManager
  ): number {
    const def = getVehicleDefinition(type);
    const eid = addEntity(world);
    const {
      Position: Pos,
      Rotation: Rot,
      Velocity: Vel,
      SpriteComponent: Sprite,
      Collider: Col,
      Health: HP,
      Vehicle: Veh,
      VehiclePhysics: VPhys,
      VehicleOccupants: VOcc,
    } = world.components;

    // Позиция
    addComponent(world, eid, Position);
    Pos.x[eid] = x;
    Pos.y[eid] = y;
    Pos.z[eid] = 0;

    // Поворот
    addComponent(world, eid, Rotation);
    Rot.angle[eid] = 0;

    // Скорость
    addComponent(world, eid, Velocity);
    Vel.x[eid] = 0;
    Vel.y[eid] = 0;

    // Спрайт
    addComponent(world, eid, SpriteComponent);
    Sprite.textureId[eid] = 100 + type; // Vehicle textures start at 100
    Sprite.width[eid] = def.spriteWidth;
    Sprite.height[eid] = def.spriteHeight;
    Sprite.anchorX[eid] = 0.5;
    Sprite.anchorY[eid] = 0.5;
    Sprite.visible[eid] = 1;

    // Коллайдер
    addComponent(world, eid, Collider);
    Col.type[eid] = 1; // Box
    Col.width[eid] = def.colliderWidth;
    Col.height[eid] = def.colliderHeight;

    // Здоровье
    addComponent(world, eid, Health);
    HP.current[eid] = def.health;
    HP.max[eid] = def.health;

    // Компонент транспорта
    addComponent(world, eid, Vehicle);
    Veh.type[eid] = type;
    Veh.damage[eid] = 0;
    Veh.fuel[eid] = 100;

    // Физика транспорта
    addComponent(world, eid, VehiclePhysics);
    VPhys.mass[eid] = def.mass;
    VPhys.maxSpeed[eid] = def.maxSpeed;
    VPhys.acceleration[eid] = def.acceleration;
    VPhys.braking[eid] = def.braking;
    VPhys.handling[eid] = def.handling;
    VPhys.grip[eid] = def.grip;
    VPhys.throttle[eid] = 0;
    VPhys.steering[eid] = 0;
    VPhys.speed[eid] = 0;
    VPhys.angularVelocity[eid] = 0;
    VPhys.drifting[eid] = 0;

    // Места
    addComponent(world, eid, VehicleOccupants);
    VOcc.driver[eid] = 0;
    VOcc.passenger1[eid] = 0;
    VOcc.passenger2[eid] = 0;
    VOcc.passenger3[eid] = 0;
    VOcc.maxSeats[eid] = def.seats;

    // Физическое тело (если передан менеджер)
    if (physicsManager) {
      addComponent(world, eid, RigidBody);
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
}
