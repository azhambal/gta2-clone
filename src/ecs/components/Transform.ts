/**
 * World components definitions for bitECS 0.4.0
 * Components are plain objects with arrays for Structure of Arrays (SoA) pattern.
 */

// Transform components
export const Position: { x: number[]; y: number[]; z: number[] } = { x: [], y: [], z: [] };
export const Velocity: { x: number[]; y: number[]; z: number[] } = { x: [], y: [], z: [] };
export const Rotation: { angle: number[] } = { angle: [] };
export const Scale: { x: number[]; y: number[] } = { x: [], y: [] };

// Sprite components
export const SpriteComponent: {
  textureId: number[];
  frame: number[];
  width: number[];
  height: number[];
  anchorX: number[];
  anchorY: number[];
  visible: number[];
  tint: number[];
} = {
  textureId: [],
  frame: [],
  width: [],
  height: [],
  anchorX: [],
  anchorY: [],
  visible: [],
  tint: [],
};

export const AnimationComponent: {
  startFrame: number[];
  endFrame: number[];
  speed: number[];
  timer: number[];
  loop: number[];
  playing: number[];
} = {
  startFrame: [],
  endFrame: [],
  speed: [],
  timer: [],
  loop: [],
  playing: [],
};

// Physics components
export const Collider: {
  type: number[];
  width: number[];
  height: number[];
  radius: number[];
  offsetX: number[];
  offsetY: number[];
  layer: number[];
  mask: number[];
} = {
  type: [],
  width: [],
  height: [],
  radius: [],
  offsetX: [],
  offsetY: [],
  layer: [],
  mask: [],
};

export const RigidBody: {
  bodyId: number[];
  mass: number[];
  friction: number[];
  restitution: number[];
  isStatic: number[];
  isSensor: number[];
} = {
  bodyId: [],
  mass: [],
  friction: [],
  restitution: [],
  isStatic: [],
  isSensor: [],
};

// Health components
export const Health: {
  current: number[];
  max: number[];
  invulnerable: number[];
  invulnerableTimer: number[];
} = {
  current: [],
  max: [],
  invulnerable: [],
  invulnerableTimer: [],
};

export const Damage: {
  amount: number[];
  type: number[];
  sourceEntity: number[];
} = {
  amount: [],
  type: [],
  sourceEntity: [],
};

// Tag components (boolean arrays - presence means component exists)
export const PlayerControlled: number[] = [];
export const Vehicle: {
  type: number[];
  damage: number[];
  fuel: number[];
} = {
  type: [],
  damage: [],
  fuel: [],
};
export const Pedestrian: {
  type: number[];
  mood: number[];
} = {
  type: [],
  mood: [],
};
export const Driver: {
  vehicleEntity: number[];
} = {
  vehicleEntity: [],
};
export const VehicleOccupants: {
  driver: number[];
  passenger1: number[];
  passenger2: number[];
  passenger3: number[];
  maxSeats: number[];
} = {
  driver: [],
  passenger1: [],
  passenger2: [],
  passenger3: [],
  maxSeats: [],
};

// Vehicle physics component
export const VehiclePhysics: {
  mass: number[];
  maxSpeed: number[];
  acceleration: number[];
  braking: number[];
  handling: number[];
  grip: number[];
  throttle: number[];
  steering: number[];
  speed: number[];
  angularVelocity: number[];
  drifting: number[];
} = {
  mass: [],
  maxSpeed: [],
  acceleration: [],
  braking: [],
  handling: [],
  grip: [],
  throttle: [],
  steering: [],
  speed: [],
  angularVelocity: [],
  drifting: [],
};

// AI components
export const PedestrianAI: {
  state: number[];
  previousState: number[];
  targetX: number[];
  targetY: number[];
  hasTarget: number[];
  walkSpeed: number[];
  runSpeed: number[];
  fearLevel: number[];
  sightRange: number[];
  stateTimer: number[];
  thinkTimer: number[];
  pathCooldown: number[];
} = {
  state: [],
  previousState: [],
  targetX: [],
  targetY: [],
  hasTarget: [],
  walkSpeed: [],
  runSpeed: [],
  fearLevel: [],
  sightRange: [],
  stateTimer: [],
  thinkTimer: [],
  pathCooldown: [],
};

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
export const TrafficAI: {
  state: number[];
  previousState: number[];
  // Route navigation
  currentWaypointId: number[];
  routeId: number[];
  // Parameters
  desiredSpeed: number[];
  aggressiveness: number[];
  patience: number[];
  // Perception
  distanceToNext: number[];
  hasObstacle: number[];
  // State timers
  stateTimer: number[];
  waitTimer: number[];
} = {
  state: [],
  previousState: [],
  currentWaypointId: [],
  routeId: [],
  desiredSpeed: [],
  aggressiveness: [],
  patience: [],
  distanceToNext: [],
  hasObstacle: [],
  stateTimer: [],
  waitTimer: [],
};

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

// Weapon components
export const Weapon: {
  type: number[];
  damage: number[];
  fireRate: number[];
  range: number[];
  ammo: number[];
  maxAmmo: number[];
  reloadTime: number[];
  accuracy: number[];
  automatic: number[];
  projectileSpeed: number[];
  projectileCount: number[];
  spread: number[];
  lastFired: number[];
  reloading: number[];
  reloadTimer: number[];
} = {
  type: [],
  damage: [],
  fireRate: [],
  range: [],
  ammo: [],
  maxAmmo: [],
  reloadTime: [],
  accuracy: [],
  automatic: [],
  projectileSpeed: [],
  projectileCount: [],
  spread: [],
  lastFired: [],
  reloading: [],
  reloadTimer: [],
};

export const Projectile: {
  damage: number[];
  speed: number[];
  range: number[];
  remainingRange: number[];
  owner: number[];
  penetration: number[];
  lifetime: number[];
  maxLifetime: number[];
} = {
  damage: [],
  speed: [],
  range: [],
  remainingRange: [],
  owner: [],
  penetration: [],
  lifetime: [],
  maxLifetime: [],
};

export const Explosion: {
  radius: number[];
  damage: number[];
  force: number[];
  timer: number[];
  source: number[];
} = {
  radius: [],
  damage: [],
  force: [],
  timer: [],
  source: [],
};

export const Inventory: {
  weapons: number[]; // Entity ID of current weapon entity
  currentWeaponIndex: number[];
  maxWeapons: number[];
} = {
  weapons: [],
  currentWeaponIndex: [],
  maxWeapons: [],
};

export const WeaponPickup: {
  weaponType: number[];
  ammo: number[];
} = {
  weaponType: [],
  ammo: [],
};

/**
 * Типы оружия
 */
export enum WeaponType {
  FIST = 0,
  PISTOL = 1,
  UZI = 2,
  SHOTGUN = 3,
  MACHINE_GUN = 4,
  FLAMETHROWER = 5,
  ROCKET_LAUNCHER = 6,
  SNIPER_RIFLE = 7,
}

// Export all components for reference
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
  Weapon,
  Projectile,
  Explosion,
  Inventory,
  WeaponPickup,
};
