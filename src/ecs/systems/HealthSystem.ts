import { query, hasComponent, removeEntity } from 'bitecs';
import type { GameWorld } from '../World.js';
import { Health, Position, SpriteComponent } from '../components/index.js';
import { eventBus } from '../../core/EventBus.js';

/**
 * Health component extension for invulnerability tracking
 * Note: We use the Health component and track invulnerability via a separate map
 * since we can't modify the Health component definition without affecting Transform.ts
 */
const invulnerabilityTimers = new Map<number, number>();

/**
 * Система здоровья
 * Обрабатывает урон, смерть и неуязвимость
 */
export const createHealthSystem = () => {
  // Listen to damage events
  eventBus.on('damage:entity', ({ target, amount, source, type }) => {
    handleDamage(target, amount, source, type);
  });

  return (world: GameWorld, dt: number) => {
    const deltaSeconds = dt / 1000;

    // Update invulnerability timers
    for (const [eid, timer] of invulnerabilityTimers.entries()) {
      const newTimer = timer - deltaSeconds;
      if (newTimer <= 0) {
        invulnerabilityTimers.delete(eid);
      } else {
        invulnerabilityTimers.set(eid, newTimer);
      }
    }

    // Check for entities with zero or negative health
    const entitiesWithHealth = query(world, [Health]);

    for (const eid of entitiesWithHealth) {
      // Check if entity should die
      if (Health.current[eid] <= 0) {
        handleDeath(world, eid);
      }
    }

    // Clean up invulnerability timers for entities that no longer exist
    // (simple garbage collection - if we can't find the entity, remove its timer)
    for (const eid of invulnerabilityTimers.keys()) {
      if (!hasComponent(world, eid, Health)) {
        invulnerabilityTimers.delete(eid);
      }
    }

    return world;
  };
};

/**
 * Handle damage to an entity
 */
function handleDamage(targetEid: number, amount: number, sourceEid: number, damageType: string): void {
  // Check if target is invulnerable
  if (invulnerabilityTimers.has(targetEid)) {
    return; // Entity is invulnerable, ignore damage
  }

  // Apply damage
  Health.current[targetEid] -= amount;

  // Clamp health to 0
  if (Health.current[targetEid] < 0) {
    Health.current[targetEid] = 0;
  }

  // Apply brief invulnerability (unless it's damage-over-time or similar)
  if (damageType !== 'dot' && damageType !== 'environment') {
    invulnerabilityTimers.set(targetEid, 0.5); // 0.5 seconds of invulnerability
  }

  // Emit damage taken event (for visual/audio feedback)
  eventBus.emit('health:damageTaken', {
    target: targetEid,
    amount,
    source: sourceEid,
    type: damageType,
    remainingHealth: Health.current[targetEid],
  });
}

/**
 * Handle entity death
 */
function handleDeath(world: GameWorld, eid: number): void {
  // Emit death event (before removing so listeners can access components)
  eventBus.emit('entity:death', {
    entity: eid,
    position: {
      x: Position.x[eid],
      y: Position.y[eid],
      z: Position.z[eid],
    },
  });

  // Play death animation (if animation component exists)
  // This would be handled by AnimationSystem

  // Drop items (if any inventory component exists)
  // This would be handled by a separate LootSystem

  // For now, just hide the sprite and mark for removal
  if (hasComponent(world, eid, SpriteComponent)) {
    SpriteComponent.visible[eid] = 0;
  }

  // Remove entity after a delay (to allow death animation to play)
  // For now, we'll remove immediately but in a real game you'd want a delay
  setTimeout(() => {
    try {
      removeEntity(world, eid);
      invulnerabilityTimers.delete(eid);
    } catch (_e) {
      // Entity might have already been removed
    }
  }, 2000); // 2 seconds before despawn
}

/**
 * Check if an entity is currently invulnerable
 */
export function isInvulnerable(eid: number): boolean {
  return invulnerabilityTimers.has(eid);
}

/**
 * Get remaining invulnerability time for an entity
 */
export function getInvulnerabilityTime(eid: number): number {
  return invulnerabilityTimers.get(eid) ?? 0;
}

/**
 * Set invulnerability for an entity (useful for powerups, etc.)
 */
export function setInvulnerability(eid: number, duration: number): void {
  invulnerabilityTimers.set(eid, duration);
}

/**
 * Clear invulnerability for an entity
 */
export function clearInvulnerability(eid: number): void {
  invulnerabilityTimers.delete(eid);
}
