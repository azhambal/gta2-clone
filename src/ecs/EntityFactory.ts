import { addEntity, addComponent } from 'bitecs';
import type { GameWorld } from './World.js';
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
} from './components/index.js';

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
    const { Velocity: _Vel, SpriteComponent: Sprite, Collider: Col, Health: HP, Pedestrian: Ped } =
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

    return eid;
  }

  /**
   * Создание машины
   */
  public static createVehicle(
    world: GameWorld,
    x: number,
    y: number,
    type: number = 0
  ): number {
    const eid = this.createBasicEntity(world, x, y, 0);
    const { Velocity: _Vel, SpriteComponent: Sprite, Collider: Col, Health: HP, Vehicle: Veh } =
      world.components;

    addComponent(world, eid, Velocity);

    addComponent(world, eid, SpriteComponent);
    Sprite.width[eid] = 64;
    Sprite.height[eid] = 44;
    Sprite.anchorX[eid] = 0.5;
    Sprite.anchorY[eid] = 0.5;
    Sprite.visible[eid] = 1;

    addComponent(world, eid, Collider);
    Col.type[eid] = 1; // Box
    Col.width[eid] = 56;
    Col.height[eid] = 28;

    addComponent(world, eid, Health);
    HP.current[eid] = 100;
    HP.max[eid] = 100;

    addComponent(world, eid, Vehicle);
    Veh.type[eid] = type;
    Veh.damage[eid] = 0;
    Veh.fuel[eid] = 100;

    return eid;
  }
}
