import { Chunk } from './Chunk.js';
import { BlockData } from './Block.js';
import { BlockType } from './BlockTypes.js';
import { GAME_CONSTANTS } from '../core/Types.js';

const { CHUNK_SIZE, MAP_DEPTH, BLOCK_SIZE } = GAME_CONSTANTS;

export interface MapConfig {
  widthInChunks: number;   // Ширина в чанках
  heightInChunks: number;  // Высота в чанках
  name?: string;
}

/**
 * Игровая карта (контейнер для чанков)
 */
export class GameMap {
  public readonly widthInChunks: number;
  public readonly heightInChunks: number;
  public readonly widthInBlocks: number;
  public readonly heightInBlocks: number;
  public readonly name: string;

  private chunks: Map<string, Chunk> = new Map();

  constructor(config: MapConfig) {
    this.widthInChunks = config.widthInChunks;
    this.heightInChunks = config.heightInChunks;
    this.widthInBlocks = this.widthInChunks * CHUNK_SIZE;
    this.heightInBlocks = this.heightInChunks * CHUNK_SIZE;
    this.name = config.name || 'Unnamed Map';

    this.initializeChunks();
  }

  /**
   * Создание всех чанков
   */
  private initializeChunks(): void {
    for (let cy = 0; cy < this.heightInChunks; cy++) {
      for (let cx = 0; cx < this.widthInChunks; cx++) {
        const chunk = new Chunk(cx, cy);
        this.chunks.set(this.getChunkKey(cx, cy), chunk);
      }
    }
  }

  /**
   * Ключ чанка для Map
   */
  private getChunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX},${chunkY}`;
  }

  /**
   * Получение чанка
   */
  public getChunk(chunkX: number, chunkY: number): Chunk | undefined {
    return this.chunks.get(this.getChunkKey(chunkX, chunkY));
  }

  /**
   * Получение блока по мировым координатам (в блоках)
   */
  public getBlock(x: number, y: number, z: number): BlockData {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const localX = x - chunkX * CHUNK_SIZE;
    const localY = y - chunkY * CHUNK_SIZE;

    const chunk = this.getChunk(chunkX, chunkY);
    if (!chunk) return new BlockData(BlockType.AIR);

    return chunk.getBlock(localX, localY, z);
  }

  /**
   * Установка блока по мировым координатам
   */
  public setBlock(x: number, y: number, z: number, block: BlockData): void {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const localX = x - chunkX * CHUNK_SIZE;
    const localY = y - chunkY * CHUNK_SIZE;

    const chunk = this.getChunk(chunkX, chunkY);
    if (!chunk) return;

    chunk.setBlock(localX, localY, z, block);
  }

  /**
   * Установка типа блока
   */
  public setBlockType(x: number, y: number, z: number, type: BlockType): void {
    this.setBlock(x, y, z, new BlockData(type));
  }

  /**
   * Получение уровня земли в точке
   */
  public getGroundLevel(x: number, y: number): number {
    for (let z = MAP_DEPTH - 1; z >= 0; z--) {
      const block = this.getBlock(x, y, z);
      if (!block.isAir()) {
        return z;
      }
    }
    return 0;
  }

  /**
   * Проверка коллизии с блоком
   */
  public isSolidAt(x: number, y: number, z: number): boolean {
    return this.getBlock(x, y, z).isSolid();
  }

  /**
   * Итератор по всем чанкам
   */
  public *iterateChunks(): Generator<Chunk> {
    for (const chunk of this.chunks.values()) {
      yield chunk;
    }
  }

  /**
   * Получение всех чанков в области (для рендеринга)
   */
  public getChunksInArea(minCX: number, minCY: number, maxCX: number, maxCY: number): Chunk[] {
    const result: Chunk[] = [];

    for (let cy = Math.max(0, minCY); cy <= Math.min(this.heightInChunks - 1, maxCY); cy++) {
      for (let cx = Math.max(0, minCX); cx <= Math.min(this.widthInChunks - 1, maxCX); cx++) {
        const chunk = this.getChunk(cx, cy);
        if (chunk) result.push(chunk);
      }
    }

    return result;
  }

  /**
   * Конвертация мировых координат (пиксели) в координаты блоков
   */
  public worldToBlock(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / BLOCK_SIZE),
      y: Math.floor(worldY / BLOCK_SIZE),
    };
  }

  /**
   * Конвертация координат блоков в мировые координаты (пиксели)
   */
  public blockToWorld(blockX: number, blockY: number): { x: number; y: number } {
    return {
      x: blockX * BLOCK_SIZE,
      y: blockY * BLOCK_SIZE,
    };
  }
}
