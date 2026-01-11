import { createWorld, resetWorld, type World as BaseWorld } from 'bitecs';

// Import all components
import {
  Position,
  Velocity,
  Rotation,
  Scale,
  SpriteComponent,
  AnimationComponent,
  Collider,
  RigidBody,
  Health,
  Damage,
  PlayerControlled,
  Vehicle,
  Pedestrian,
  Driver,
  VehicleOccupants,
  VehiclePhysics,
  PedestrianAI,
  TrafficAI,
} from './components/Transform.js';

// Define the components object type for createWorld
interface GameWorldComponents {
  Position: typeof Position;
  Velocity: typeof Velocity;
  Rotation: typeof Rotation;
  Scale: typeof Scale;
  SpriteComponent: typeof SpriteComponent;
  AnimationComponent: typeof AnimationComponent;
  Collider: typeof Collider;
  RigidBody: typeof RigidBody;
  Health: typeof Health;
  Damage: typeof Damage;
  PlayerControlled: typeof PlayerControlled;
  Vehicle: typeof Vehicle;
  Pedestrian: typeof Pedestrian;
  Driver: typeof Driver;
  VehicleOccupants: typeof VehicleOccupants;
  VehiclePhysics: typeof VehiclePhysics;
  PedestrianAI: typeof PedestrianAI;
  TrafficAI: typeof TrafficAI;
}

// Define our World type with components
export type GameWorld = BaseWorld<{ components: GameWorldComponents }>;

/**
 * Создание и управление ECS миром
 */
export class ECSWorld {
  private world: GameWorld;

  constructor() {
    this.world = createWorld({
      components: {
        Position,
        Velocity,
        Rotation,
        Scale,
        SpriteComponent,
        AnimationComponent,
        Collider,
        RigidBody,
        Health,
        Damage,
        PlayerControlled,
        Vehicle,
        Pedestrian,
        Driver,
        VehicleOccupants,
        VehiclePhysics,
        PedestrianAI,
        TrafficAI,
      },
    }) as GameWorld;
  }

  /**
   * Получение bitECS world
   */
  public getWorld(): GameWorld {
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
