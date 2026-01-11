export { PhysicsManager } from './PhysicsManager.js';
export type { PhysicsConfig } from './PhysicsManager.js';
export { CollisionLayer, CollisionCategory, CollisionMask } from './CollisionLayers.js';
export {
  SurfaceType,
  getSurfaceProperties,
  calculateSurfaceGrip,
  calculateSurfaceFriction,
  calculateSurfaceMaxSpeed,
  isSurfaceDamaging,
  getSurfaceDamage,
  type SurfaceProperties,
} from './SurfaceTypes.js';
