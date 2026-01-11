import { BlockType, SurfaceType, CollisionType, BlockFlags } from './BlockTypes.js';

/**
 * Определение типа блока (статические данные)
 */
export interface BlockDefinition {
  id: BlockType;
  name: string;

  // Текстуры для граней (индексы в атласе)
  textures: {
    top: number;
    bottom: number;
    north: number;
    south: number;
    east: number;
    west: number;
  };

  collision: CollisionType;
  surface: SurfaceType;
  flags: BlockFlags;

  // Для анимированных блоков
  animationFrames?: number;
  animationSpeed?: number;
}

/**
 * Данные блока в мире (32 бита)
 * Формат: [type: 8 бит][slope: 4 бита][rotation: 4 бита][flags: 8 бит][reserved: 8 бит]
 */
export class BlockData {
  private value: number;

  constructor(type: BlockType = BlockType.AIR) {
    this.value = type;
  }

  public static fromValue(value: number): BlockData {
    const block = new BlockData();
    block.value = value;
    return block;
  }

  public getValue(): number {
    return this.value;
  }

  public getType(): BlockType {
    return this.value & 0xFF;
  }

  public setType(type: BlockType): void {
    this.value = (this.value & ~0xFF) | type;
  }

  public getSlopeType(): number {
    return (this.value >> 8) & 0x0F;
  }

  public setSlopeType(slope: number): void {
    this.value = (this.value & ~0x0F00) | ((slope & 0x0F) << 8);
  }

  public getRotation(): number {
    return (this.value >> 12) & 0x0F;
  }

  public setRotation(rotation: number): void {
    this.value = (this.value & ~0xF000) | ((rotation & 0x0F) << 12);
  }

  public isAir(): boolean {
    return this.getType() === BlockType.AIR;
  }

  public isSolid(): boolean {
    const type = this.getType();
    return type !== BlockType.AIR && type !== BlockType.WATER && type !== BlockType.DEEP_WATER;
  }

  public isSlope(): boolean {
    const type = this.getType();
    return type >= BlockType.SLOPE_N && type <= BlockType.SLOPE_W;
  }
}
