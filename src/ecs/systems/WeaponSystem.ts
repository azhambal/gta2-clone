import { query, hasComponent, addEntity, addComponent } from 'bitecs';
import type { GameWorld } from '../World.js';
import type { InputManager } from '../../input/InputManager.js';
import { GameAction } from '../../input/index.js';
import {
  Position,
  Rotation,
  Velocity,
  Weapon,
  Projectile,
  SpriteComponent,
  Collider,
  Inventory,
  PlayerControlled,
} from '../components/index.js';
import { getWeaponDefinition, WeaponType, type WeaponDefinition } from '../../data/WeaponDefinitions.js';
import { CollisionLayer, CollisionMask } from '../../physics/CollisionLayers.js';
import { eventBus } from '../../core/EventBus.js';

/**
 * Система оружия
 * Обрабатывает стрельбу, перезарядку, переключение оружия
 */
export const createWeaponSystem = (inputManager: InputManager) => {
  return (world: GameWorld, dt: number) => {
    const deltaSeconds = dt / 1000;

    // Получаем всех entities с Weapon компонентом
    const weaponEntities = query(world, [Weapon, Position, Rotation]);

    for (const weaponEid of weaponEntities) {
      // Update reload timer
      if (Weapon.reloading[weaponEid] === 1) {
        Weapon.reloadTimer[weaponEid] -= deltaSeconds;
        if (Weapon.reloadTimer[weaponEid] <= 0) {
          Weapon.reloading[weaponEid] = 0;
          Weapon.ammo[weaponEid] = Weapon.maxAmmo[weaponEid];
          eventBus.emit('weapon:reloaded', { weapon: weaponEid });
        }
        continue; // Can't fire while reloading
      }

      // Update cooldown
      if (Weapon.lastFired[weaponEid] > 0) {
        Weapon.lastFired[weaponEid] -= deltaSeconds;
      }

      // Check if this weapon is owned by a player-controlled entity
      // Find the owner (entity with Inventory that has this weapon)
      let ownerEid = 0;
      const entitiesWithInventory = query(world, [Inventory]);
      for (const eid of entitiesWithInventory) {
        if (Inventory.weapons[eid] === weaponEid) {
          ownerEid = eid;
          break;
        }
      }

      if (ownerEid === 0 || !hasComponent(world, ownerEid, PlayerControlled)) {
        continue; // Only process player-controlled weapons
      }

      const weaponDef = getWeaponDefinition(Weapon.type[weaponEid] as WeaponType);
      const isFiring = inputManager.isActionDown(GameAction.FIRE);
      const isReloading = inputManager.isActionDown(GameAction.RELOAD);
      const nextWeapon = inputManager.isActionJustPressed(GameAction.NEXT_WEAPON);
      const prevWeapon = inputManager.isActionJustPressed(GameAction.PREV_WEAPON);

      // Weapon switching
      if (nextWeapon) {
        // TODO: Implement multi-weapon inventory
        eventBus.emit('weapon:switch', { from: weaponEid, to: weaponEid });
      }
      if (prevWeapon) {
        // TODO: Implement multi-weapon inventory
        eventBus.emit('weapon:switch', { from: weaponEid, to: weaponEid });
      }

      // Reloading
      if (isReloading && Weapon.ammo[weaponEid] < Weapon.maxAmmo[weaponEid] && Weapon.maxAmmo[weaponEid] !== Infinity) {
        Weapon.reloading[weaponEid] = 1;
        Weapon.reloadTimer[weaponEid] = weaponDef.reloadTime;
        eventBus.emit('weapon:reloadStart', { weapon: weaponEid });
        continue;
      }

      // Firing
      if (isFiring) {
        const canFire = Weapon.lastFired[weaponEid] <= 0;
        const hasAmmo = Weapon.ammo[weaponEid] > 0;

        // For automatic weapons, require continuous press
        // For semi-automatic, require re-press (handled by input system with action events)
        if (!weaponDef.automatic && !inputManager.isActionJustPressed(GameAction.FIRE)) {
          continue;
        }

        if (canFire && hasAmmo) {
          fireWeapon(world, ownerEid, weaponEid, weaponDef);
        } else if (!hasAmmo && Weapon.maxAmmo[weaponEid] !== Infinity) {
          // Out of ammo - play click sound
          eventBus.emit('weapon:empty', { weapon: weaponEid });
        }
      }
    }

    return world;
  };
};

/**
 * Fire a weapon
 */
function fireWeapon(
  world: GameWorld,
  ownerEid: number,
  weaponEid: number,
  weaponDef: WeaponDefinition,
): void {
  const ownerX = Position.x[ownerEid];
  const ownerY = Position.y[ownerEid];
  const ownerAngle = Rotation.angle[ownerEid];

  // Consume ammo
  if (Weapon.maxAmmo[weaponEid] !== Infinity) {
    Weapon.ammo[weaponEid]--;
  }

  // Set cooldown
  Weapon.lastFired[weaponEid] = 1 / weaponDef.fireRate;

  // Apply recoil to owner
  if (weaponDef.recoil > 0) {
    // Push owner back slightly
    const recoilForce = weaponDef.recoil * 20;
    Velocity.x[ownerEid] -= Math.cos(ownerAngle) * recoilForce;
    Velocity.y[ownerEid] -= Math.sin(ownerAngle) * recoilForce;
  }

  // Fire projectiles
  for (let i = 0; i < weaponDef.projectileCount; i++) {
    // Calculate spread
    let angle = ownerAngle;
    if (weaponDef.spread > 0) {
      angle += (Math.random() - 0.5) * weaponDef.spread * 2;
    }

    // Apply accuracy
    if (weaponDef.accuracy < 1) {
      angle += (Math.random() - 0.5) * (1 - weaponDef.accuracy) * 0.5;
    }

    createProjectile(world, ownerX, ownerY, angle, weaponDef, ownerEid);
  }

  // Emit event
  eventBus.emit('weapon:fired', {
    weapon: weaponEid,
    owner: ownerEid,
    type: weaponDef.type,
  });
}

/**
 * Create a projectile entity
 */
function createProjectile(
  world: GameWorld,
  x: number,
  y: number,
  angle: number,
  weaponDef: WeaponDefinition,
  owner: number,
): number {
  const eid = addEntity(world);

  // Position
  addComponent(world, eid, Position);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Position.z[eid] = 0; // TODO: Get from owner

  // Velocity
  addComponent(world, eid, Velocity);
  const speed = weaponDef.projectileSpeed;
  Velocity.x[eid] = Math.cos(angle) * speed;
  Velocity.y[eid] = Math.sin(angle) * speed;
  Velocity.z[eid] = 0;

  // Rotation
  addComponent(world, eid, Rotation);
  Rotation.angle[eid] = angle;

  // Sprite
  addComponent(world, eid, SpriteComponent);
  SpriteComponent.width[eid] = 8;
  SpriteComponent.height[eid] = 8;
  SpriteComponent.visible[eid] = 1;

  // Collider (small hitbox)
  addComponent(world, eid, Collider);
  Collider.type[eid] = 2; // Circle
  Collider.radius[eid] = 4;
  Collider.layer[eid] = CollisionLayer.PROJECTILE;
  Collider.mask[eid] = CollisionMask.PROJECTILE;

  // Projectile component
  addComponent(world, eid, Projectile);
  Projectile.damage[eid] = weaponDef.damage;
  Projectile.speed[eid] = weaponDef.projectileSpeed;
  Projectile.range[eid] = weaponDef.range;
  Projectile.remainingRange[eid] = weaponDef.range;
  Projectile.owner[eid] = owner;
  Projectile.penetration[eid] = 1; // Can penetrate 1 target
  Projectile.lifetime[eid] = 0;
  Projectile.maxLifetime[eid] = 5000; // 5 seconds max lifetime

  // Special handling for rockets (create explosion on impact)
  if (weaponDef.type === WeaponType.ROCKET_LAUNCHER) {
    // Tag for explosion system
    // Could add a flag component or use damage type
  }

  return eid;
}
