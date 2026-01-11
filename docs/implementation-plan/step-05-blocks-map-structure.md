# Шаг 05: Блоки и структура карты

## Цель
Создать систему блоков и структуру данных для игровой карты (GameMap, Chunk, Block). После этого шага карта может быть создана программно и хранится в памяти.

## Зависимости
- Шаг 04: Система загрузки ресурсов

## Задачи

### 5.1 Определение типов блоков

**src/world/BlockTypes.ts:**
```typescript
/**
 * Типы блоков
 */
export enum BlockType {
  AIR = 0,
  SOLID = 1,

  // Дороги
  ROAD = 10,
  ROAD_LINE_H = 11,
  ROAD_LINE_V = 12,
  CROSSWALK = 13,
  SIDEWALK = 14,

  // Terrain
  GRASS = 20,
  DIRT = 21,
  SAND = 22,

  // Здания
  BUILDING_FLOOR = 30,
  BUILDING_WALL = 31,
  BUILDING_ROOF = 32,

  // Вода
  WATER = 40,
  DEEP_WATER = 41,

  // Наклоны
  SLOPE_N = 50,
  SLOPE_S = 51,
  SLOPE_E = 52,
  SLOPE_W = 53,

  // Особые
  OIL = 60,
  ICE = 61,
  MUD = 62,
}

/**
 * Типы поверхностей (влияют на физику)
 */
export enum SurfaceType {
  NONE = 0,
  ROAD = 1,
  GRASS = 2,
  DIRT = 3,
  ICE = 4,
  OIL = 5,
  WATER = 6,
  SAND = 7,
  MUD = 8,
}

/**
 * Типы коллизий
 */
export enum CollisionType {
  NONE = 0,      // Проходимый (воздух)
  SOLID = 1,     // Непроходимый
  SLOPE = 2,     // Наклон
  PLATFORM = 3,  // Можно пройти снизу
  WATER = 4,     // Вода (урон)
}

/**
 * Флаги блока
 */
export enum BlockFlags {
  NONE = 0,
  TRANSPARENT = 1 << 0,    // Прозрачный
  DESTRUCTIBLE = 1 << 1,   // Разрушаемый
  INTERACTIVE = 1 << 2,    // Интерактивный
  ANIMATED = 1 << 3,       // Анимированный
}
```

### 5.2 Определение блока

**src/world/Block.ts:**
```typescript
import { BlockType, SurfaceType, CollisionType, BlockFlags } from './BlockTypes';

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
 * Данные блока в мире (8 бит = 256 типов, остальное - метаданные)
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
```

### 5.3 Реестр блоков

**src/world/BlockRegistry.ts:**
```typescript
import { BlockType, SurfaceType, CollisionType, BlockFlags } from './BlockTypes';
import { BlockDefinition } from './Block';

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
      collision: CollisionType.SOLID,
      surface: SurfaceType.ROAD,
      flags: BlockFlags.NONE,
    });

    // Тротуар
    this.register({
      id: BlockType.SIDEWALK,
      name: 'Sidewalk',
      textures: { top: 3, bottom: 3, north: 4, south: 4, east: 4, west: 4 },
      collision: CollisionType.SOLID,
      surface: SurfaceType.ROAD,
      flags: BlockFlags.NONE,
    });

    // Трава
    this.register({
      id: BlockType.GRASS,
      name: 'Grass',
      textures: { top: 5, bottom: 6, north: 6, south: 6, east: 6, west: 6 },
      collision: CollisionType.SOLID,
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

    // Наклоны
    this.register({
      id: BlockType.SLOPE_N,
      name: 'Slope North',
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
```

### 5.4 Чанк (16×16×8 блоков)

**src/world/Chunk.ts:**
```typescript
import { BlockData } from './Block';
import { BlockType } from './BlockTypes';
import { GAME_CONSTANTS } from '@core/Types';

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
    if (!this.isValidLocal(localX, localY, z)) return;

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
    return this.blocks.buffer.slice(0);
  }

  /**
   * Десериализация из бинарных данных
   */
  public deserialize(buffer: ArrayBuffer): void {
    this.blocks = new Uint32Array(buffer);
    this.isDirty = true;
  }
}
```

### 5.5 Игровая карта

**src/world/GameMap.ts:**
```typescript
import { Chunk } from './Chunk';
import { BlockData } from './Block';
import { BlockType } from './BlockTypes';
import { GAME_CONSTANTS } from '@core/Types';

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
```

### 5.6 Генератор тестовой карты

**src/world/MapGenerator.ts:**
```typescript
import { GameMap, MapConfig } from './GameMap';
import { BlockType } from './BlockTypes';
import { GAME_CONSTANTS } from '@core/Types';

const { CHUNK_SIZE } = GAME_CONSTANTS;

/**
 * Генератор тестовых карт
 */
export class MapGenerator {
  /**
   * Создание простой тестовой карты
   */
  public static createTestMap(widthChunks: number = 4, heightChunks: number = 4): GameMap {
    const config: MapConfig = {
      widthInChunks: widthChunks,
      heightInChunks: heightChunks,
      name: 'Test Map',
    };

    const map = new GameMap(config);

    // Заполнение базовым слоем (трава)
    for (let y = 0; y < map.heightInBlocks; y++) {
      for (let x = 0; x < map.widthInBlocks; x++) {
        map.setBlockType(x, y, 0, BlockType.GRASS);
      }
    }

    // Создание дорог
    const roadY = Math.floor(map.heightInBlocks / 2);
    const roadX = Math.floor(map.widthInBlocks / 2);

    // Горизонтальная дорога
    for (let x = 0; x < map.widthInBlocks; x++) {
      map.setBlockType(x, roadY - 1, 0, BlockType.ROAD);
      map.setBlockType(x, roadY, 0, BlockType.ROAD);
      map.setBlockType(x, roadY + 1, 0, BlockType.ROAD);
    }

    // Вертикальная дорога
    for (let y = 0; y < map.heightInBlocks; y++) {
      map.setBlockType(roadX - 1, y, 0, BlockType.ROAD);
      map.setBlockType(roadX, y, 0, BlockType.ROAD);
      map.setBlockType(roadX + 1, y, 0, BlockType.ROAD);
    }

    // Тротуары вдоль дорог
    for (let x = 0; x < map.widthInBlocks; x++) {
      if (map.getBlock(x, roadY - 2, 0).getType() !== BlockType.ROAD) {
        map.setBlockType(x, roadY - 2, 0, BlockType.SIDEWALK);
      }
      if (map.getBlock(x, roadY + 2, 0).getType() !== BlockType.ROAD) {
        map.setBlockType(x, roadY + 2, 0, BlockType.SIDEWALK);
      }
    }

    // Несколько зданий
    MapGenerator.createBuilding(map, 5, 5, 4, 4, 2);
    MapGenerator.createBuilding(map, 5, roadY + 5, 3, 3, 1);
    MapGenerator.createBuilding(map, roadX + 5, 5, 5, 3, 3);

    return map;
  }

  /**
   * Создание здания
   */
  private static createBuilding(
    map: GameMap,
    x: number,
    y: number,
    width: number,
    height: number,
    floors: number
  ): void {
    for (let z = 0; z < floors; z++) {
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          // Стены по периметру
          const isWall = dx === 0 || dx === width - 1 || dy === 0 || dy === height - 1;
          const blockType = isWall ? BlockType.BUILDING_WALL : BlockType.BUILDING_FLOOR;
          map.setBlockType(x + dx, y + dy, z, blockType);
        }
      }
    }

    // Крыша
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        map.setBlockType(x + dx, y + dy, floors, BlockType.BUILDING_ROOF);
      }
    }
  }
}
```

### 5.7 Экспорт модулей

**src/world/index.ts:**
```typescript
export { BlockType, SurfaceType, CollisionType, BlockFlags } from './BlockTypes';
export { BlockData, BlockDefinition } from './Block';
export { BlockRegistry, blockRegistry } from './BlockRegistry';
export { Chunk } from './Chunk';
export { GameMap, MapConfig } from './GameMap';
export { MapGenerator } from './MapGenerator';
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `world/BlockTypes.ts` | `BlockType` | Enum типов блоков |
| `world/BlockTypes.ts` | `SurfaceType` | Enum типов поверхностей |
| `world/BlockTypes.ts` | `CollisionType` | Enum типов коллизий |
| `world/Block.ts` | `BlockData` | Данные блока (упакованные) |
| `world/Block.ts` | `BlockDefinition` | Определение типа блока |
| `world/BlockRegistry.ts` | `BlockRegistry` | Реестр определений блоков |
| `world/Chunk.ts` | `Chunk` | Чанк 16×16×8 блоков |
| `world/GameMap.ts` | `GameMap` | Контейнер карты |
| `world/MapGenerator.ts` | `MapGenerator` | Генератор тестовых карт |

## Ключевые методы GameMap

| Метод | Описание |
|-------|----------|
| `getBlock(x, y, z)` | Получить блок по координатам |
| `setBlock(x, y, z, block)` | Установить блок |
| `getChunk(cx, cy)` | Получить чанк |
| `getGroundLevel(x, y)` | Найти уровень земли |
| `isSolidAt(x, y, z)` | Проверка твёрдости блока |
| `worldToBlock(wx, wy)` | Мировые → блочные координаты |
| `blockToWorld(bx, by)` | Блочные → мировые координаты |

## Результат
- Создана структура данных для карты
- Карта может быть создана программно
- MapGenerator создаёт тестовую карту с дорогами и зданиями
- Система блоков готова для рендеринга

## Проверка
```typescript
// В Game.ts
import { MapGenerator } from './world/MapGenerator';

const testMap = MapGenerator.createTestMap(4, 4);
console.log(`Map: ${testMap.widthInBlocks}x${testMap.heightInBlocks} blocks`);
console.log(`Ground at (10, 10):`, testMap.getGroundLevel(10, 10));
```

## Следующий шаг
Шаг 06: Рендеринг карты (MapRenderer)
