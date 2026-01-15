import { BlockData } from './Block.js';
import { BlockType } from './BlockTypes.js';
import { GAME_CONSTANTS } from '../core/Types.js';

const { CHUNK_SIZE, MAP_DEPTH } = GAME_CONSTANTS;

/**
 * Чанк карты (16×16×8 блоков)
 */
export class Chunk {
  public readonly chunkX: number;
  public readonly chunkY: number;

  private blocks: Uint32Array;
  private isDirty: boolean = true;

  constructor(chunkX: number, chunkY: number) {
    this.chunkX = chunkX;
    this.chunkY = chunkY;

    // 16 × 16 × 8 = 2048 блоков
    this.blocks = new Uint32Array(CHUNK_SIZE * CHUNK_SIZE * MAP_DEPTH);
  }

  /**
   * Получение индекса блока в массиве
   */
  private getIndex(localX: number, localY: number, z: number): number {
    return z * CHUNK_SIZE * CHUNK_SIZE + localY * CHUNK_SIZE + localX;
  }

  /**
   * Получение блока по локальным координатам
   */
  public getBlock(localX: number, localY: number, z: number): BlockData {
    if (!this.isValidLocal(localX, localY, z)) {
      return new BlockData(BlockType.AIR);
    }
    const index = this.getIndex(localX, localY, z);
    return BlockData.fromValue(this.blocks[index]);
  }

  /**
   * Установка блока по локальным координатам
   */
  public setBlock(localX: number, localY: number, z: number, block: BlockData): void {
    if (!this.isValidLocal(localX, localY, z)) {return;}

    const index = this.getIndex(localX, localY, z);
    this.blocks[index] = block.getValue();
    this.isDirty = true;
  }

  /**
   * Установка типа блока
   */
  public setBlockType(localX: number, localY: number, z: number, type: BlockType): void {
    const block = new BlockData(type);
    this.setBlock(localX, localY, z, block);
  }

  /**
   * Проверка валидности локальных координат
   */
  private isValidLocal(x: number, y: number, z: number): boolean {
    return x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_SIZE && z >= 0 && z < MAP_DEPTH;
  }

  /**
   * Заполнение чанка блоками
   */
  public fill(type: BlockType, minZ: number = 0, maxZ: number = 0): void {
    for (let z = minZ; z <= maxZ; z++) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          this.setBlockType(x, y, z, type);
        }
      }
    }
  }

  /**
   * Флаг изменения (для перестроения геометрии)
   */
  public markDirty(): void {
    this.isDirty = true;
  }

  public clearDirty(): void {
    this.isDirty = false;
  }

  public needsRebuild(): boolean {
    return this.isDirty;
  }

  /**
   * Сериализация в бинарные данные
   */
  public serialize(): ArrayBuffer {
    return this.blocks.buffer.slice(0) as ArrayBuffer;
  }

  /**
   * Десериализация из бинарных данных
   */
  public deserialize(buffer: ArrayBuffer): void {
    this.blocks = new Uint32Array(buffer);
    this.isDirty = true;
  }
}
