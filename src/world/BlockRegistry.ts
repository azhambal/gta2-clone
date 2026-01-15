import { BlockType, SurfaceType, CollisionType, BlockFlags } from './BlockTypes.js';
import type { BlockDefinition } from './Block.js';

/**
 * Реестр всех определений блоков
 */
export class BlockRegistry {
  private definitions: Map<BlockType, BlockDefinition> = new Map();

  constructor() {
    this.registerDefaultBlocks();
  }

  /**
   * Регистрация стандартных блоков
   */
  private registerDefaultBlocks(): void {
    // Воздух
    this.register({
      id: BlockType.AIR,
      name: 'Air',
      textures: { top: 0, bottom: 0, north: 0, south: 0, east: 0, west: 0 },
      collision: CollisionType.NONE,
      surface: SurfaceType.NONE,
      flags: BlockFlags.TRANSPARENT,
    });

    // Дорога
    this.register({
      id: BlockType.ROAD,
      name: 'Road',
      textures: { top: 1, bottom: 1, north: 2, south: 2, east: 2, west: 2 },
      collision: CollisionType.NONE,
      surface: SurfaceType.ROAD,
      flags: BlockFlags.NONE,
    });

    // Тротуар
    this.register({
      id: BlockType.SIDEWALK,
      name: 'Sidewalk',
      textures: { top: 3, bottom: 3, north: 4, south: 4, east: 4, west: 4 },
      collision: CollisionType.NONE,
      surface: SurfaceType.ROAD,
      flags: BlockFlags.NONE,
    });

    // Трава
    this.register({
      id: BlockType.GRASS,
      name: 'Grass',
      textures: { top: 5, bottom: 6, north: 6, south: 6, east: 6, west: 6 },
      collision: CollisionType.NONE,
      surface: SurfaceType.GRASS,
      flags: BlockFlags.NONE,
    });

    // Стена здания
    this.register({
      id: BlockType.BUILDING_WALL,
      name: 'Building Wall',
      textures: { top: 7, bottom: 7, north: 8, south: 8, east: 8, west: 8 },
      collision: CollisionType.SOLID,
      surface: SurfaceType.NONE,
      flags: BlockFlags.NONE,
    });

    // Пол здания
    this.register({
      id: BlockType.BUILDING_FLOOR,
      name: 'Building Floor',
      textures: { top: 7, bottom: 7, north: 8, south: 8, east: 8, west: 8 },
      collision: CollisionType.SOLID,
      surface: SurfaceType.NONE,
      flags: BlockFlags.NONE,
    });

    // Крыша здания
    this.register({
      id: BlockType.BUILDING_ROOF,
      name: 'Building Roof',
      textures: { top: 7, bottom: 7, north: 8, south: 8, east: 8, west: 8 },
      collision: CollisionType.SOLID,
      surface: SurfaceType.NONE,
      flags: BlockFlags.NONE,
    });

    // Вода
    this.register({
      id: BlockType.WATER,
      name: 'Water',
      textures: { top: 9, bottom: 9, north: 9, south: 9, east: 9, west: 9 },
      collision: CollisionType.WATER,
      surface: SurfaceType.WATER,
      flags: BlockFlags.ANIMATED,
      animationFrames: 4,
      animationSpeed: 0.2,
    });

    // Наклоны (Slopes)
    // SLOPE_N - подъём на север (въезд с юга), Z увеличивается при движении на север (-Y)
    this.register({
      id: BlockType.SLOPE_N,
      name: 'Slope North',
      textures: { top: 10, bottom: 1, north: 2, south: 2, east: 2, west: 2 },
      collision: CollisionType.SLOPE,
      surface: SurfaceType.ROAD,
      flags: BlockFlags.NONE,
    });

    // SLOPE_S - подъём на юг (въезд с севера), Z увеличивается при движении на юг (+Y)
    this.register({
      id: BlockType.SLOPE_S,
      name: 'Slope South',
      textures: { top: 10, bottom: 1, north: 2, south: 2, east: 2, west: 2 },
      collision: CollisionType.SLOPE,
      surface: SurfaceType.ROAD,
      flags: BlockFlags.NONE,
    });

    // SLOPE_E - подъём на восток (въезд с запада), Z увеличивается при движении на восток (+X)
    this.register({
      id: BlockType.SLOPE_E,
      name: 'Slope East',
      textures: { top: 10, bottom: 1, north: 2, south: 2, east: 2, west: 2 },
      collision: CollisionType.SLOPE,
      surface: SurfaceType.ROAD,
      flags: BlockFlags.NONE,
    });

    // SLOPE_W - подъём на запад (въезд с востока), Z увеличивается при движении на запад (-X)
    this.register({
      id: BlockType.SLOPE_W,
      name: 'Slope West',
      textures: { top: 10, bottom: 1, north: 2, south: 2, east: 2, west: 2 },
      collision: CollisionType.SLOPE,
      surface: SurfaceType.ROAD,
      flags: BlockFlags.NONE,
    });
  }

  /**
   * Регистрация блока
   */
  public register(definition: BlockDefinition): void {
    this.definitions.set(definition.id, definition);
  }

  /**
   * Получение определения блока
   */
  public get(type: BlockType): BlockDefinition | undefined {
    return this.definitions.get(type);
  }

  /**
   * Проверка существования
   */
  public has(type: BlockType): boolean {
    return this.definitions.has(type);
  }
}

// Синглтон
export const blockRegistry = new BlockRegistry();
