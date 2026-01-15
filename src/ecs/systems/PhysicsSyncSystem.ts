import { query } from 'bitecs';
import type { GameWorld } from '../World.js';
import type { PhysicsManager } from '../../physics/PhysicsManager.js';
import { Position, Velocity, Rotation, RigidBody } from '../components/index.js';

/**
 * Система синхронизации ECS <-> Matter.js
 * Выполняется ПОСЛЕ физики
 */
export const createPhysicsSyncSystem = (physicsManager: PhysicsManager) => {
  return (world: GameWorld, _dt: number) => {
    const entities = query(world, [Position, RigidBody]);

    for (const eid of entities) {
      const bodyId = RigidBody.bodyId[eid];
      if (bodyId === 0) {continue;}

      // Получение позиции из физики
      const pos = physicsManager.getBodyPosition(eid);
      if (pos) {
        Position.x[eid] = pos.x;
        Position.y[eid] = pos.y;
      }

      // Получение угла из физики
      const angle = physicsManager.getBodyAngle(eid);
      if (angle !== null && Rotation.angle[eid] !== undefined) {
        Rotation.angle[eid] = angle;
      }

      // Получение скорости из физики
      const vel = physicsManager.getBodyVelocity(eid);
      if (vel && Velocity.x[eid] !== undefined) {
        Velocity.x[eid] = vel.x;
        Velocity.y[eid] = vel.y;
      }
    }

    return world;
  };
};
