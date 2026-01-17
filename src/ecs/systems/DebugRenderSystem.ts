import { query } from 'bitecs';
import type { GameWorld } from '../World.js';
import { Graphics, Container } from 'pixi.js';
import {
  Position,
  Rotation,
  Velocity,
  Collider,
  PedestrianAI,
  TrafficAI,
  VehiclePhysics,
  PedestrianState,
} from '../components/index.js';
import { Debug } from '../../utils/Debug.js';

/**
 * Debug visualization modes
 */
export enum DebugMode {
  NONE = 0,
  COLLISION = 1 << 0,
  AI = 1 << 1,
  PHYSICS = 1 << 2,
  Z_LEVEL = 1 << 3,
  ALL = COLLISION | AI | PHYSICS | Z_LEVEL,
}

/**
 * Current debug mode (can be toggled at runtime)
 */
let currentDebugMode = DebugMode.NONE;
let debugGraphics: Graphics | null = null;
let debugContainer: Container | null = null;

/**
 * Set the debug mode
 */
export function setDebugMode(mode: DebugMode): void {
  currentDebugMode = mode;
  if (debugGraphics) {
    debugGraphics.clear();
  }
}

/**
 * Toggle a specific debug mode
 */
export function toggleDebugMode(mode: DebugMode): void {
  currentDebugMode ^= mode;
  if (debugGraphics) {
    debugGraphics.clear();
  }
  Debug.log('Debug', `Debug mode: ${currentDebugMode === DebugMode.NONE ? 'OFF' : 'ON'}`);
}

/**
 * Get current debug mode
 */
export function getDebugMode(): DebugMode {
  return currentDebugMode;
}

/**
 * Система отладочной визуализации
 * Рисует коллизии, AI пути, физику и Z-уровни
 */
export const createDebugRenderSystem = (container: Container) => {
  debugContainer = container;

  // Create debug graphics layer
  debugGraphics = new Graphics();
  debugGraphics.zIndex = 99999; // Always on top
  container.addChild(debugGraphics);

  Debug.log('Debug', 'DebugRenderSystem initialized');

  return (world: GameWorld) => {
    if (!debugGraphics || currentDebugMode === DebugMode.NONE) {
      debugGraphics?.clear();
      return world;
    }

    debugGraphics.clear();

    // Render different debug visualizations based on mode
    if (currentDebugMode & DebugMode.COLLISION) {
      renderCollisions(world, debugGraphics);
    }

    if (currentDebugMode & DebugMode.AI) {
      renderAI(world, debugGraphics);
    }

    if (currentDebugMode & DebugMode.PHYSICS) {
      renderPhysics(world, debugGraphics);
    }

    if (currentDebugMode & DebugMode.Z_LEVEL) {
      renderZLevels(world, debugGraphics);
    }

    return world;
  };
};

/**
 * Render collision boxes
 */
function renderCollisions(world: GameWorld, graphics: Graphics): void {
  const entities = query(world, [Position, Collider]);

  for (const eid of entities) {
    const x = Position.x[eid];
    const y = Position.y[eid];
    const colliderType = Collider.type[eid];

    graphics.lineStyle(1, 0x00ff00, 0.7);

    if (colliderType === 1) {
      // Box collider
      const width = Collider.width[eid];
      const height = Collider.height[eid];
      graphics.drawRect(x - width / 2, y - height / 2, width, height);
    } else if (colliderType === 2) {
      // Circle collider
      const radius = Collider.radius[eid];
      graphics.drawCircle(x, y, radius);
    }
  }
}

/**
 * Render AI states and targets
 */
function renderAI(world: GameWorld, graphics: Graphics): void {
  // Render pedestrian AI
  const pedestrians = query(world, [Position, PedestrianAI]);

  for (const eid of pedestrians) {
    const x = Position.x[eid];
    const y = Position.y[eid];
    const state = PedestrianAI.state[eid];
    const targetX = PedestrianAI.targetX[eid];
    const targetY = PedestrianAI.targetY[eid];
    const hasTarget = PedestrianAI.hasTarget[eid];

    // Draw state label
    const stateName = PedestrianState[state] || 'UNKNOWN';
    graphics.lineStyle(1, getStateColor(stateName), 0.8);

    // Draw circle around pedestrian
    graphics.drawCircle(x, y, 20);

    // Draw line to target if has one
    if (hasTarget && (targetX !== 0 || targetY !== 0)) {
      graphics.moveTo(x, y);
      graphics.lineTo(targetX, targetY);
      graphics.drawCircle(targetX, targetY, 5);
    }
  }

  // Render traffic AI
  const vehicles = query(world, [Position, Rotation, TrafficAI]);

  for (const eid of vehicles) {
    const x = Position.x[eid];
    const y = Position.y[eid];

    // Draw circle around vehicle
    graphics.lineStyle(2, 0xff00ff, 0.8);
    graphics.drawCircle(x, y, 25);

    // Draw direction indicator
    const angle = Rotation.angle[eid];
    const dirX = x + Math.cos(angle) * 40;
    const dirY = y + Math.sin(angle) * 40;
    graphics.moveTo(x, y);
    graphics.lineTo(dirX, dirY);
  }
}

/**
 * Render physics info (velocity, forces)
 */
function renderPhysics(world: GameWorld, graphics: Graphics): void {
  const entities = query(world, [Position, Velocity]);

  for (const eid of entities) {
    const x = Position.x[eid];
    const y = Position.y[eid];
    const vx = Velocity.x[eid];
    const vy = Velocity.y[eid];

    // Draw velocity vector
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > 1) {
      const scale = 0.5;
      graphics.lineStyle(2, 0xffff00, 0.8);
      graphics.moveTo(x, y);
      graphics.lineTo(x + vx * scale, y + vy * scale);

      // Draw speed text
      graphics.lineStyle(0);
      graphics.beginFill(0xffff00, 1);
      // Note: pixi.js doesn't have text drawing in graphics, would need Text object
    }
  }

  // Render vehicle physics info
  const vehicles = query(world, [Position, VehiclePhysics]);

  for (const eid of vehicles) {
    const x = Position.x[eid];
    const y = Position.y[eid];
    const throttle = VehiclePhysics.throttle[eid];
    const steering = VehiclePhysics.steering[eid];

    // Draw throttle bar (green/red)
    const throttleBarWidth = 30;
    const throttleHeight = 4;
    graphics.lineStyle(1, 0xffffff, 0.5);
    graphics.beginFill(throttle > 0 ? 0x00ff00 : 0xff0000, 0.5);
    graphics.drawRect(
      x - throttleBarWidth / 2,
      y - 25,
      Math.abs(throttle) * throttleBarWidth,
      throttleHeight,
    );
    graphics.endFill();

    // Draw steering indicator
    const steeringWidth = 20;
    graphics.lineStyle(2, 0x00ffff, 0.7);
    graphics.moveTo(x, y - 20);
    graphics.lineTo(x + steering * steeringWidth, y - 20);
  }
}

/**
 * Render Z-level visualization
 */
function renderZLevels(world: GameWorld, graphics: Graphics): void {
  const entities = query(world, [Position]);

  const zColors: Record<number, number> = {
    0: 0x808080, // Gray - ground level
    1: 0x00ff00, // Green - first level
    2: 0x0000ff, // Blue - second level
    3: 0xffff00, // Yellow - third level
    4: 0xff00ff, // Magenta - fourth level
    5: 0x00ffff, // Cyan - fifth level
    6: 0xff8800, // Orange - sixth level
    7: 0xff0000, // Red - seventh level
  };

  for (const eid of entities) {
    const x = Position.x[eid];
    const y = Position.y[eid];
    const z = Math.floor(Position.z[eid]);
    const color = zColors[z] || 0xffffff;

    // Draw colored border around entity
    graphics.lineStyle(2, color, 0.8);
    graphics.drawCircle(x, y, 15);
  }
}

/**
 * Get color for AI state
 */
function getStateColor(state: string): number {
  switch (state) {
    case 'IDLE':
      return 0x888888;
    case 'WALKING':
      return 0x00ff00;
    case 'RUNNING':
      return 0x0088ff;
    case 'FLEEING':
      return 0xff0000;
    case 'DEAD':
      return 0x000000;
    default:
      return 0xffffff;
  }
}

/**
 * Cleanup debug graphics
 */
export function destroyDebugRenderSystem(): void {
  if (debugGraphics && debugContainer) {
    debugContainer.removeChild(debugGraphics);
    debugGraphics.destroy();
    debugGraphics = null;
  }
}
