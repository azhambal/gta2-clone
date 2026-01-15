import { query, hasComponent } from 'bitecs';
import type { GameWorld } from '../World.js';
import { Position, Velocity, Collider, Vehicle, Pedestrian } from '../components/index.js';
import { eventBus } from '../../core/EventBus.js';
import { CollisionLayer } from '../../physics/CollisionLayers.js';

/**
 * Grid cell size for spatial hashing
 * Entities within this distance can potentially collide
 */
const SPATIAL_HASH_CELL_SIZE = 128;

/**
 * Minimum penetration depth to trigger collision response
 * Prevents jittering from floating-point precision issues
 * Increased for more stable collision behavior
 */
const MIN_PENETRATION_THRESHOLD = 0.5;

/**
 * Position correction factor (0-1)
 * Higher values provide immediate correction to prevent stuck entities
 */
const POSITION_CORRECTION_FACTOR = 0.8;

/**
 * Small separation bias to prevent immediate re-collision
 * Increased to help prevent entities from getting stuck
 */
const SEPARATION_BIAS = 1.0;

/**
 * Spatial hash grid for O(1) nearby entity queries
 */
class SpatialHash {
  private grid: Map<string, Set<number>> = new Map();
  private entityPositions: Map<number, { x: number; y: number; z: number }> = new Map();

  /**
   * Get cell key for a position
   */
  private getCellKey(x: number, y: number, z: number): string {
    const cellX = Math.floor(x / SPATIAL_HASH_CELL_SIZE);
    const cellY = Math.floor(y / SPATIAL_HASH_CELL_SIZE);
    const cellZ = Math.floor(z);
    return `${cellX},${cellY},${cellZ}`;
  }

  /**
   * Insert an entity into the spatial hash
   */
  public insert(eid: number, x: number, y: number, z: number): void {
    // Remove old position if exists
    this.remove(eid);

    // Store new position
    this.entityPositions.set(eid, { x, y, z });

    // Add to cell
    const key = this.getCellKey(x, y, z);
    if (!this.grid.has(key)) {
      this.grid.set(key, new Set());
    }
    this.grid.get(key)!.add(eid);
  }

  /**
   * Remove an entity from the spatial hash
   */
  public remove(eid: number): void {
    const pos = this.entityPositions.get(eid);
    if (pos) {
      const key = this.getCellKey(pos.x, pos.y, pos.z);
      const cell = this.grid.get(key);
      if (cell) {
        cell.delete(eid);
        if (cell.size === 0) {
          this.grid.delete(key);
        }
      }
      this.entityPositions.delete(eid);
    }
  }

  /**
   * Get nearby entities within the specified radius
   */
  public getNearby(x: number, y: number, z: number, radius: number): Set<number> {
    const nearby = new Set<number>();

    // Calculate cell range to check
    const minCellX = Math.floor((x - radius) / SPATIAL_HASH_CELL_SIZE);
    const maxCellX = Math.floor((x + radius) / SPATIAL_HASH_CELL_SIZE);
    const minCellY = Math.floor((y - radius) / SPATIAL_HASH_CELL_SIZE);
    const maxCellY = Math.floor((y + radius) / SPATIAL_HASH_CELL_SIZE);
    const cellZ = Math.floor(z);

    // Check all cells in range
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = `${cx},${cy},${cellZ}`;
        const cell = this.grid.get(key);
        if (cell) {
          for (const eid of cell) {
            nearby.add(eid);
          }
        }
      }
    }

    return nearby;
  }

  /**
   * Clear all entries
   */
  public clear(): void {
    this.grid.clear();
    this.entityPositions.clear();
  }
}

/**
 * Collision data between two entities
 */
interface EntityCollision {
  entityA: number;
  entityB: number;
  normalX: number;
  normalY: number;
  penetration: number;
  relativeVelocity: number;
}

/**
 * Create the entity collision system
 */
export const createEntityCollisionSystem = () => {
  const spatialHash = new SpatialHash();
  const processedPairs = new Set<string>();

  return (world: GameWorld) => {
    // Clear spatial hash at start of frame
    spatialHash.clear();
    processedPairs.clear();

    // Get all entities that can collide
    const entities = query(world, [Position, Collider]);

    // Rebuild spatial hash
    for (const eid of entities) {
      spatialHash.insert(eid, Position.x[eid], Position.y[eid], Position.z[eid]);
    }

    // Check collisions for each entity
    for (const eid of entities) {
      const x = Position.x[eid];
      const y = Position.y[eid];
      const z = Position.z[eid];
      const layer = Collider.layer[eid] || 0;
      const mask = Collider.mask[eid] || 0;

      // Get collider type and radius
      const colliderType = Collider.type[eid];
      const radius =
        colliderType === 2
          ? Collider.radius[eid]
          : Math.max(Collider.width[eid], Collider.height[eid]) / 2;

      // Find nearby entities
      const nearby = spatialHash.getNearby(x, y, z, radius * 2);

      for (const otherEid of nearby) {
        // Skip self
        if (otherEid === eid) {continue;}

        // Skip if already processed this pair (avoid double-checking)
        const pairKey = eid < otherEid ? `${eid}-${otherEid}` : `${otherEid}-${eid}`;
        if (processedPairs.has(pairKey)) {continue;}
        processedPairs.add(pairKey);

        // Check if layers should collide
        const otherLayer = Collider.layer[otherEid] || 0;
        const otherMask = Collider.mask[otherEid] || 0;

        // Two entities collide if one's layer intersects with the other's mask
        const shouldCollide = (layer & otherMask) !== 0 || (otherLayer & mask) !== 0;

        if (!shouldCollide) {continue;}

        // Skip if both are static (static objects don't collide with each other)
        if ((layer & CollisionLayer.STATIC) && (otherLayer & CollisionLayer.STATIC)) {
          continue;
        }

        // Check Z-level (entities on different Z-levels don't collide)
        const zA = Math.floor(Position.z[eid]);
        const zB = Math.floor(Position.z[otherEid]);
        if (zA !== zB) {continue;}

        // Perform collision detection
        const collision = checkEntityEntityCollision(eid, otherEid, world);

        if (collision) {
          // Handle collision response
          resolveEntityCollision(collision, world);

          // Emit collision event
          eventBus.emit('collision:entity', {
            entityA: collision.entityA,
            entityB: collision.entityB,
            normalX: collision.normalX,
            normalY: collision.normalY,
            penetration: collision.penetration,
            impactForce: Math.abs(collision.relativeVelocity),
          });
        }
      }
    }

    return world;
  };
};

/**
 * Check collision between two entities
 */
function checkEntityEntityCollision(
  eidA: number,
  eidB: number,
  _world: GameWorld,
): EntityCollision | null {
  const xA = Position.x[eidA];
  const yA = Position.y[eidA];
  const xB = Position.x[eidB];
  const yB = Position.y[eidB];

  const typeA = Collider.type[eidA];
  const typeB = Collider.type[eidB];

  // Get collision shapes
  const radiusA = typeA === 2 ? Collider.radius[eidA] : Math.max(Collider.width[eidA], Collider.height[eidA]) / 2;
  const radiusB = typeB === 2 ? Collider.radius[eidB] : Math.max(Collider.width[eidB], Collider.height[eidB]) / 2;

  // Circle-circle collision (most common for top-down)
  if (typeA === 2 && typeB === 2) {
    const dx = xB - xA;
    const dy = yB - yA;
    const distSq = dx * dx + dy * dy;
    const minDist = radiusA + radiusB;

    if (distSq < minDist * minDist && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const penetration = minDist - dist;
      const normalX = dx / dist;
      const normalY = dy / dist;

      // Calculate relative velocity
      const vxA = Velocity.x[eidA] || 0;
      const vyA = Velocity.y[eidA] || 0;
      const vxB = Velocity.x[eidB] || 0;
      const vyB = Velocity.y[eidB] || 0;
      const relativeVelocity = Math.abs((vxB - vxA) * normalX + (vyB - vyA) * normalY);

      return {
        entityA: eidA,
        entityB: eidB,
        normalX, // Normal points from A to B
        normalY,
        penetration,
        relativeVelocity,
      };
    }
  }

  // Box-box collision
  if (typeA !== 2 && typeB !== 2) {
    const halfWidthA = Collider.width[eidA] / 2;
    const halfHeightA = Collider.height[eidA] / 2;
    const halfWidthB = Collider.width[eidB] / 2;
    const halfHeightB = Collider.height[eidB] / 2;

    const overlapX = (halfWidthA + halfWidthB) - Math.abs(xB - xA);
    const overlapY = (halfHeightA + halfHeightB) - Math.abs(yB - yA);

    if (overlapX > 0 && overlapY > 0) {
      let normalX = 0;
      let normalY = 0;
      let penetration = 0;

      // Resolve along axis of least penetration
      // Normal points from A to B
      if (overlapX < overlapY) {
        penetration = overlapX;
        normalX = xA < xB ? 1 : -1;
      } else {
        penetration = overlapY;
        normalY = yA < yB ? 1 : -1;
      }

      // Calculate relative velocity
      const vxA = Velocity.x[eidA] || 0;
      const vyA = Velocity.y[eidA] || 0;
      const vxB = Velocity.x[eidB] || 0;
      const vyB = Velocity.y[eidB] || 0;
      const relativeVelocity = Math.abs((vxB - vxA) * normalX + (vyB - vyA) * normalY);

      return {
        entityA: eidA,
        entityB: eidB,
        normalX,
        normalY,
        penetration,
        relativeVelocity,
      };
    }
  }

  // Circle-box collision
  if ((typeA === 2 && typeB !== 2) || (typeA !== 2 && typeB === 2)) {
    const circleEid = typeA === 2 ? eidA : eidB;
    const boxEid = typeA === 2 ? eidB : eidA;

    const circleX = Position.x[circleEid];
    const circleY = Position.y[circleEid];
    const circleRadius = Collider.radius[circleEid];

    const boxX = Position.x[boxEid];
    const boxY = Position.y[boxEid];
    const boxHalfWidth = Collider.width[boxEid] / 2;
    const boxHalfHeight = Collider.height[boxEid] / 2;

    // Find closest point on box to circle center
    const closestX = Math.max(boxX - boxHalfWidth, Math.min(circleX, boxX + boxHalfWidth));
    const closestY = Math.max(boxY - boxHalfHeight, Math.min(circleY, boxY + boxHalfHeight));

    const dx = circleX - closestX;
    const dy = circleY - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq < circleRadius * circleRadius && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const penetration = circleRadius - dist;
      // Normal points from box center towards circle center (from box to circle)
      // We need normal to point from A to B
      let normalX = dx / dist;
      let normalY = dy / dist;

      // If A is the box (typeA !== 2), normal already points from A(box) to circle
      // If A is the circle (typeA === 2), we need to flip so it points from A(circle) to B(box)
      if (typeA === 2) {
        normalX = -normalX;
        normalY = -normalY;
      }

      // Calculate relative velocity
      const vxA = Velocity.x[eidA] || 0;
      const vyA = Velocity.y[eidA] || 0;
      const vxB = Velocity.x[eidB] || 0;
      const vyB = Velocity.y[eidB] || 0;
      const relativeVelocity = Math.abs((vxB - vxA) * normalX + (vyB - vyA) * normalY);

      return {
        entityA: eidA,
        entityB: eidB,
        normalX,
        normalY,
        penetration,
        relativeVelocity,
      };
    }
  }

  return null;
}

/**
 * Resolve collision between two entities
 */
function resolveEntityCollision(collision: EntityCollision, world: GameWorld): void {
  const { entityA, entityB, normalX, normalY, penetration } = collision;

  // Skip tiny penetrations to prevent jitter
  if (penetration < MIN_PENETRATION_THRESHOLD) {
    return;
  }

  // Check which entities are dynamic (can be pushed)
  const layerA = Collider.layer[entityA] || 0;
  const layerB = Collider.layer[entityB] || 0;

  const isStaticA = (layerA & CollisionLayer.STATIC) !== 0;
  const isStaticB = (layerB & CollisionLayer.STATIC) !== 0;

  // Get masses for physics response (default to equal if not specified)
  // Vehicles are heavier than pedestrians
  let massA = 1;
  let massB = 1;

  if (hasComponent(world, entityA, Vehicle)) {
    massA = 5; // Vehicles are heavier
  } else if (hasComponent(world, entityA, Pedestrian)) {
    massA = 1;
  }

  if (hasComponent(world, entityB, Vehicle)) {
    massB = 5;
  } else if (hasComponent(world, entityB, Pedestrian)) {
    massB = 1;
  }

  const totalMass = massA + massB;

  // ALWAYS apply position correction to separate overlapping entities
  // Add small separation bias to prevent immediate re-collision
  const correctionAmount = (penetration + SEPARATION_BIAS) * POSITION_CORRECTION_FACTOR;

  // Position correction (prevent sinking)
  // Normal points from A to B, so:
  // - A moves in -normal direction (away from B)
  // - B moves in +normal direction (away from A)
  if (!isStaticA && !isStaticB) {
    // Both dynamic - split correction based on mass
    const ratioA = massB / totalMass;
    const ratioB = massA / totalMass;

    Position.x[entityA] -= normalX * correctionAmount * ratioA;
    Position.y[entityA] -= normalY * correctionAmount * ratioA;
    Position.x[entityB] += normalX * correctionAmount * ratioB;
    Position.y[entityB] += normalY * correctionAmount * ratioB;
  } else if (!isStaticA && isStaticB) {
    // Only A moves
    Position.x[entityA] -= normalX * correctionAmount;
    Position.y[entityA] -= normalY * correctionAmount;
  } else if (isStaticA && !isStaticB) {
    // Only B moves
    Position.x[entityB] += normalX * correctionAmount;
    Position.y[entityB] += normalY * correctionAmount;
  }

  // Get velocity to check if entities are already separating
  const vxA = Velocity.x[entityA] || 0;
  const vyA = Velocity.y[entityA] || 0;
  const vxB = Velocity.x[entityB] || 0;
  const vyB = Velocity.y[entityB] || 0;

  // Relative velocity along normal
  // With normal pointing A→B: negative = approaching, positive = separating
  const velAlongNormal = (vxB - vxA) * normalX + (vyB - vyA) * normalY;

  // If entities are already separating, skip velocity impulse (but position was already corrected)
  if (velAlongNormal > 0) {
    return;
  }

  // Velocity response with impulse
  // Restitution (bounciness) - very low for vehicles/pedestrians to prevent bouncing
  const restitution = 0.1;

  // Impulse scalar
  let j = -(1 + restitution) * velAlongNormal;
  j /= 1 / massA + 1 / massB;

  // Apply impulse
  const impulseX = j * normalX;
  const impulseY = j * normalY;

  if (!isStaticA) {
    Velocity.x[entityA] = vxA - impulseX / massA;
    Velocity.y[entityA] = vyA - impulseY / massA;

    // Apply sliding friction for tangential velocity
    const tangentX = -normalY;
    const tangentY = normalX;
    const velAlongTangent = (vxB - vxA) * tangentX + (vyB - vyA) * tangentY;

    // Friction coefficient - reduced to allow smoother sliding
    const friction = 0.3;
    const frictionImpulse = -velAlongTangent * friction / (1 / massA + 1 / massB);

    Velocity.x[entityA] += tangentX * frictionImpulse / massA;
    Velocity.y[entityA] += tangentY * frictionImpulse / massA;
  }

  if (!isStaticB) {
    Velocity.x[entityB] = vxB + impulseX / massB;
    Velocity.y[entityB] = vyB + impulseY / massB;

    // Apply sliding friction
    const tangentX = -normalY;
    const tangentY = normalX;
    const velAlongTangent = (vxB - vxA) * tangentX + (vyB - vyA) * tangentY;

    const friction = 0.3;
    const frictionImpulse = -velAlongTangent * friction / (1 / massA + 1 / massB);

    Velocity.x[entityB] -= tangentX * frictionImpulse / massB;
    Velocity.y[entityB] -= tangentY * frictionImpulse / massB;
  }
}

// Singleton instance
export const entityCollisionSystem = createEntityCollisionSystem();
