export { BlockType, SurfaceType, CollisionType, BlockFlags } from './BlockTypes.js';
export { BlockData, type BlockDefinition } from './Block.js';
export { BlockRegistry, blockRegistry } from './BlockRegistry.js';
export { Chunk } from './Chunk.js';
export { GameMap, type MapConfig } from './GameMap.js';
export { MapGenerator } from './MapGenerator.js';
export {
  SlopeDirection,
  getSlopeDirection,
  calculateZOnSlope,
  calculateHeightOnSlope,
  isPointInBlock,
  getLocalCoordinates,
  getSlopeNormal,
  getSlopeAngle,
} from './SlopeUtils.js';
