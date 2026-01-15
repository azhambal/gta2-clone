import { query, hasComponent, removeEntity } from 'bitecs';
import type { GameWorld } from '../World.js';
import type { GameMap } from '../../world/GameMap.js';
import {
  Position,
  Velocity,
  Projectile,
  Health,
  Collider,
} from '../components/index.js';
import { eventBus } from '../../core/EventBus.js';
import { GAME_CONSTANTS } from '../../core/Types.js';

const { BLOCK_SIZE } = GAME_CONSTANTS;

/**
 * Система снарядов
 * Обрабатывает движение, коллизии и время жизни снарядов
 */
export const createProjectileSystem = (gameMap: GameMap) => {
  return (world: GameWorld, dt: number) => {
    const deltaSeconds = dt / 1000;

    // Get all projectiles
    const projectiles = query(world, [Projectile, Position, Velocity]);

    for (const eid of projectiles) {
      // Update lifetime
      Projectile.lifetime[eid] += dt;
      if (Projectile.lifetime[eid] > Projectile.maxLifetime[eid]) {
        removeEntity(world, eid);
        eventBus.emit('projectile:expired', { entity: eid });
        continue;
      }

      // Update remaining range
      const speed = Projectile.speed[eid];
      const distanceMoved = speed * deltaSeconds;
      Projectile.remainingRange[eid] -= distanceMoved;

      if (Projectile.remainingRange[eid] <= 0) {
        removeEntity(world, eid);
        eventBus.emit('projectile:expired', { entity: eid, reason: 'range' });
        continue;
      }

      // Check for map collision
      const x = Position.x[eid];
      const y = Position.y[eid];
      const z = Math.floor(Position.z[eid]);

      const blockX = Math.floor(x / BLOCK_SIZE);
      const blockY = Math.floor(y / BLOCK_SIZE);

      const block = gameMap.getBlock(blockX, blockY, z);
      if (block.isSolid()) {
        // Hit a solid block
        removeEntity(world, eid);
        eventBus.emit('projectile:hit', {
          entity: eid,
          type: 'map',
          blockX,
          blockY,
          z,
        });
        continue;
      }

      // Check for entity collision
      // Find entities near the projectile
      const hitEntities = findEntitiesNear(world, x, y, z, 20);
      const owner = Projectile.owner[eid];

      for (const targetEid of hitEntities) {
        // Don't hit self or owner
        if (targetEid === eid || targetEid === owner) {continue;}

        // Check if target has Health component
        if (hasComponent(world, targetEid, Health)) {
          // Check if target has Collider (for hitbox)
          if (hasComponent(world, targetEid, Collider)) {
            const targetX = Position.x[targetEid];
            const targetY = Position.y[targetEid];

            // Simple distance check
            const dx = targetX - x;
            const dy = targetY - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Get target collider radius
            const colliderType = Collider.type[targetEid];
            const radius =
              colliderType === 2
                ? Collider.radius[targetEid]
                : Math.max(Collider.width[targetEid], Collider.height[targetEid]) / 2;

            if (dist < radius) {
              // Hit!
              const damage = Projectile.damage[eid];

              // Apply damage
              Health.current[targetEid] -= damage;
              if (Health.current[targetEid] < 0) {
                Health.current[targetEid] = 0;
              }

              // Emit damage event
              eventBus.emit('damage:entity', {
                target: targetEid,
                amount: damage,
                source: owner,
                type: 'projectile',
              });

              // Emit projectile hit event
              eventBus.emit('projectile:hit', {
                entity: eid,
                type: 'entity',
                target: targetEid,
                damage,
              });

              // Check for death
              if (Health.current[targetEid] <= 0) {
                eventBus.emit('entity:death', {
                  entity: targetEid,
                  killer: owner,
                });
              }

              // Reduce penetration count
              Projectile.penetration[eid]--;
              if (Projectile.penetration[eid] <= 0) {
                removeEntity(world, eid);
                break; // Stop checking for this projectile
              }
            }
          }
        }
      }
    }

    return world;
  };
};

/**
 * Find entities near a position
 */
function findEntitiesNear(
  world: GameWorld,
  x: number,
  y: number,
  z: number,
  radius: number,
): number[] {
  const entities = query(world, [Position, Collider]);
  const nearby: number[] = [];
  const radiusSq = radius * radius;

  for (const eid of entities) {
    const entityZ = Math.floor(Position.z[eid]);
    if (entityZ !== z) {continue;} // Different Z-level

    const dx = Position.x[eid] - x;
    const dy = Position.y[eid] - y;
    const distSq = dx * dx + dy * dy;

    if (distSq < radiusSq) {
      nearby.push(eid);
    }
  }

  return nearby;
}
