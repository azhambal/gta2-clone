import { defineComponent, Types } from 'bitecs';

// Transform components
export const Position = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
});

export const Velocity = defineComponent({
  x: Types.f32,
  y: Types.f32,
  z: Types.f32,
});

export const Rotation = defineComponent({
  angle: Types.f32,
});

export const Scale = defineComponent({
  x: Types.f32,
  y: Types.f32,
});

// Sprite components
export const SpriteComponent = defineComponent({
  textureId: Types.ui32,
  frame: Types.ui32,
  width: Types.f32,
  height: Types.f32,
  anchorX: Types.f32,
  anchorY: Types.f32,
  visible: Types.ui8,
  tint: Types.ui32,
});

export const AnimationComponent = defineComponent({
  startFrame: Types.ui32,
  endFrame: Types.ui32,
  speed: Types.f32,
  timer: Types.f32,
  loop: Types.ui8,
  playing: Types.ui8,
});

// Physics components
export const Collider = defineComponent({
  type: Types.ui8,
  width: Types.f32,
  height: Types.f32,
  radius: Types.f32,
  offsetX: Types.f32,
  offsetY: Types.f32,
  layer: Types.ui32,
  mask: Types.ui32,
});

export const RigidBody = defineComponent({
  bodyId: Types.ui32,
  mass: Types.f32,
  friction: Types.f32,
  restitution: Types.f32,
  isStatic: Types.ui8,
  isSensor: Types.ui8,
});

// Health components
export const Health = defineComponent({
  current: Types.f32,
  max: Types.f32,
  invulnerable: Types.ui8,
  invulnerableTimer: Types.f32,
});

export const Damage = defineComponent({
  amount: Types.f32,
  type: Types.ui8,
  sourceEntity: Types.eid,
});

// Tag components (Presence means component exists)
export const PlayerControlled = defineComponent();
export const Vehicle = defineComponent({
  type: Types.ui8,
  damage: Types.f32,
  fuel: Types.f32,
});
export const Pedestrian = defineComponent({
  type: Types.ui8,
  mood: Types.ui8,
});
export const Driver = defineComponent({
  vehicleEntity: Types.eid,
});
export const VehicleOccupants = defineComponent({
  driver: Types.eid,
  passenger1: Types.eid,
  passenger2: Types.eid,
  passenger3: Types.eid,
  maxSeats: Types.ui8,
});

// Vehicle physics component
export const VehiclePhysics = defineComponent({
  mass: Types.f32,
  maxSpeed: Types.f32,
  acceleration: Types.f32,
  braking: Types.f32,
  handling: Types.f32,
  grip: Types.f32,
  throttle: Types.f32,
  steering: Types.f32,
  speed: Types.f32,
  angularVelocity: Types.f32,
  drifting: Types.ui8,
});

// AI components
export const PedestrianAI = defineComponent({
  state: Types.ui8,
  previousState: Types.ui8,
  targetX: Types.f32,
  targetY: Types.f32,
  hasTarget: Types.ui8,
  walkSpeed: Types.f32,
  runSpeed: Types.f32,
  fearLevel: Types.f32,
  sightRange: Types.f32,
  stateTimer: Types.f32,
  thinkTimer: Types.f32,
  pathCooldown: Types.f32,
});

/**
 * Состояния AI пешехода (FSM)
 */
export enum PedestrianState {
  IDLE = 0,
  WALKING = 1,
  RUNNING = 2,
  FLEEING = 3,
  ENTERING_VEHICLE = 4,
  DEAD = 5,
}

// Traffic AI component
export const TrafficAI = defineComponent({
  state: Types.ui8,
  previousState: Types.ui8,
  // Route navigation
  currentWaypointId: Types.ui32,
  routeId: Types.ui32,
  // Parameters
  desiredSpeed: Types.f32,
  aggressiveness: Types.f32,
  patience: Types.f32,
  // Perception
  distanceToNext: Types.f32,
  hasObstacle: Types.ui8,
  // State timers
  stateTimer: Types.f32,
  waitTimer: Types.f32,
});

/**
 * Состояния AI трафика (FSM)
 */
export enum TrafficState {
  DRIVING = 0,
  STOPPED = 1,
  WAITING = 2,
  TURNING = 3,
  CRASHED = 4,
  FLEEING = 5,
}


// Export all components for createWorld
export const allComponents = {
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
};
