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
  Inventory,
  Weapon,
} from './components/index.js';
import { getVehicleDefinition, VehicleType } from '../data/VehicleDefinitions.js';
import { getWeaponDefinition, WeaponType } from '../data/WeaponDefinitions.js';
import { CollisionLayer, CollisionMask } from '../physics/CollisionLayers.js';

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
    z: number = 0,
  ): number {
    const eid = addEntity(world);

    addComponent(world, eid, Position);
    Position.x[eid] = x;
    Position.y[eid] = y;
    Position.z[eid] = z;

    addComponent(world, eid, Rotation);
    Rotation.angle[eid] = 0;

    return eid;
  }

  /**
   * Создание игрока
   */
  public static createPlayer(
    world: GameWorld,
    x: number,
    y: number,
  ): number {
    const eid = this.createBasicEntity(world, x, y, 0);

    // Скорость
    addComponent(world, eid, Velocity);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Velocity.z[eid] = 0;

    // Спрайт
    addComponent(world, eid, SpriteComponent);
    SpriteComponent.textureId[eid] = 0; // Будет настроено позже
    SpriteComponent.width[eid] = 32;
    SpriteComponent.height[eid] = 32;
    SpriteComponent.anchorX[eid] = 0.5;
    SpriteComponent.anchorY[eid] = 0.5;
    SpriteComponent.visible[eid] = 1;

    // Коллайдер
    addComponent(world, eid, Collider);
    Collider.type[eid] = 2; // Circle
    Collider.radius[eid] = 12;
    Collider.layer[eid] = CollisionLayer.PEDESTRIAN;
    Collider.mask[eid] = CollisionMask.PEDESTRIAN;

    // Здоровье
    addComponent(world, eid, Health);
    Health.current[eid] = 100;
    Health.max[eid] = 100;

    // Теги
    addComponent(world, eid, PlayerControlled);
    addComponent(world, eid, Pedestrian);

    // Инвентарь для оружия
    addComponent(world, eid, Inventory);
    Inventory.currentWeaponIndex[eid] = 0;
    Inventory.maxWeapons[eid] = 8;

    // Создаём стартовое оружие (пистолет)
    const weaponEid = this.createWeapon(world, WeaponType.PISTOL);
    Inventory.weapons[eid] = weaponEid;

    return eid;
  }

  /**
   * Создание оружия
   */
  public static createWeapon(world: GameWorld, weaponType: WeaponType): number {
    const eid = addEntity(world);
    const def = getWeaponDefinition(weaponType);

    addComponent(world, eid, Weapon);
    Weapon.type[eid] = def.type;
    Weapon.damage[eid] = def.damage;
    Weapon.fireRate[eid] = def.fireRate;
    Weapon.range[eid] = def.range;
    Weapon.ammo[eid] = def.maxAmmo;
    Weapon.maxAmmo[eid] = def.maxAmmo;
    Weapon.reloadTime[eid] = def.reloadTime;
    Weapon.accuracy[eid] = def.accuracy;
    Weapon.automatic[eid] = def.automatic ? 1 : 0;
    Weapon.projectileSpeed[eid] = def.projectileSpeed;
    Weapon.projectileCount[eid] = def.projectileCount;
    Weapon.spread[eid] = def.spread;
    Weapon.lastFired[eid] = 0;
    Weapon.reloading[eid] = 0;
    Weapon.reloadTimer[eid] = 0;

    return eid;
  }

  /**
   * Создание NPC пешехода
   */
  public static createPedestrian(
    world: GameWorld,
    x: number,
    y: number,
    type: number = 0,
  ): number {
    const eid = this.createBasicEntity(world, x, y, 0);

    addComponent(world, eid, Velocity);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Velocity.z[eid] = 0;

    addComponent(world, eid, SpriteComponent);
    SpriteComponent.width[eid] = 32;
    SpriteComponent.height[eid] = 32;
    SpriteComponent.anchorX[eid] = 0.5;
    SpriteComponent.anchorY[eid] = 0.5;
    SpriteComponent.visible[eid] = 1;

    addComponent(world, eid, Collider);
    Collider.type[eid] = 2;
    Collider.radius[eid] = 12;
    Collider.layer[eid] = CollisionLayer.PEDESTRIAN;
    Collider.mask[eid] = CollisionMask.PEDESTRIAN;

    addComponent(world, eid, Health);
    Health.current[eid] = 50;
    Health.max[eid] = 50;

    addComponent(world, eid, Pedestrian);
    Pedestrian.type[eid] = type;

    // Добавляем AI для NPC пешеходов
    addComponent(world, eid, PedestrianAI);
    PedestrianAI.state[eid] = PedestrianState.IDLE;
    PedestrianAI.previousState[eid] = PedestrianState.IDLE;
    PedestrianAI.targetX[eid] = 0;
    PedestrianAI.targetY[eid] = 0;
    PedestrianAI.hasTarget[eid] = 0;
    PedestrianAI.walkSpeed[eid] = 80 + Math.random() * 40; // Случайная скорость ходьбы
    PedestrianAI.runSpeed[eid] = 180 + Math.random() * 60; // Случайная скорость бега
    PedestrianAI.fearLevel[eid] = 0;
    PedestrianAI.sightRange[eid] = 300;
    PedestrianAI.stateTimer[eid] = 0.5 + Math.random() * 1; // Быстрее начинаем искать цель
    PedestrianAI.thinkTimer[eid] = 0;
    PedestrianAI.pathCooldown[eid] = 0;

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
    physicsManager?: PhysicsManager,
  ): number {
    const def = getVehicleDefinition(type);
    const eid = addEntity(world);

    // Позиция
    addComponent(world, eid, Position);
    Position.x[eid] = x;
    Position.y[eid] = y;
    Position.z[eid] = 0;

    // Поворот
    addComponent(world, eid, Rotation);
    Rotation.angle[eid] = 0;

    // Скорость
    addComponent(world, eid, Velocity);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    Velocity.z[eid] = 0;

    // Спрайт
    addComponent(world, eid, SpriteComponent);
    SpriteComponent.textureId[eid] = 100 + type; // Vehicle textures start at 100
    SpriteComponent.width[eid] = def.spriteWidth;
    SpriteComponent.height[eid] = def.spriteHeight;
    SpriteComponent.anchorX[eid] = 0.5;
    SpriteComponent.anchorY[eid] = 0.5;
    SpriteComponent.visible[eid] = 1;

    // Коллайдер
    addComponent(world, eid, Collider);
    Collider.type[eid] = 1; // Box
    Collider.width[eid] = def.colliderWidth;
    Collider.height[eid] = def.colliderHeight;
    Collider.layer[eid] = CollisionLayer.VEHICLE;
    Collider.mask[eid] = CollisionMask.VEHICLE;

    // Здоровье
    addComponent(world, eid, Health);
    Health.current[eid] = def.health;
    Health.max[eid] = def.health;

    // Компонент транспорта
    addComponent(world, eid, Vehicle);
    Vehicle.type[eid] = type;
    Vehicle.damage[eid] = 0;
    Vehicle.fuel[eid] = 100;

    // Физика транспорта
    addComponent(world, eid, VehiclePhysics);
    VehiclePhysics.mass[eid] = def.mass;
    VehiclePhysics.maxSpeed[eid] = def.maxSpeed;
    VehiclePhysics.acceleration[eid] = def.acceleration;
    VehiclePhysics.braking[eid] = def.braking;
    VehiclePhysics.handling[eid] = def.handling;
    VehiclePhysics.grip[eid] = def.grip;
    VehiclePhysics.throttle[eid] = 0;
    VehiclePhysics.steering[eid] = 0;
    VehiclePhysics.speed[eid] = 0;
    VehiclePhysics.angularVelocity[eid] = 0;
    VehiclePhysics.drifting[eid] = 0;

    // Места
    addComponent(world, eid, VehicleOccupants);
    VehicleOccupants.driver[eid] = 0;
    VehicleOccupants.passenger1[eid] = 0;
    VehicleOccupants.passenger2[eid] = 0;
    VehicleOccupants.passenger3[eid] = 0;
    VehicleOccupants.maxSeats[eid] = def.seats;

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
        },
      );
      RigidBody.bodyId[eid] = body.id;
    }

    return eid;
  }
}
