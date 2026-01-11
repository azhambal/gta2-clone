import { Container, Graphics } from 'pixi.js';
import { GameMap } from '../world/GameMap.js';
import { Chunk } from '../world/Chunk.js';
import { BlockType } from '../world/BlockTypes.js';
import { SlopeDirection, getSlopeDirection } from '../world/SlopeUtils.js';
import { IsometricUtils } from './IsometricUtils.js';
import { GAME_CONSTANTS, type Rectangle } from '../core/Types.js';

const { BLOCK_SIZE, CHUNK_SIZE, MAP_DEPTH } = GAME_CONSTANTS;

/**
 * Цвета блоков для отладки (до загрузки текстур)
 */
const BLOCK_COLORS: { [key: number]: number } = {
  [BlockType.AIR]: 0x000000,
  [BlockType.ROAD]: 0x3a3a3a,
  [BlockType.SIDEWALK]: 0x8a8a8a,
  [BlockType.GRASS]: 0x4a7c23,
  [BlockType.BUILDING_WALL]: 0x6b4423,
  [BlockType.BUILDING_FLOOR]: 0x8b6b4b,
  [BlockType.BUILDING_ROOF]: 0x5a4433,
  [BlockType.WATER]: 0x2255aa,
};

/**
 * Рендерер карты
 */
export class MapRenderer {
  private container: Container;
  private map: GameMap | null = null;

  // Кэш геометрии чанков
  private chunkGraphics: Map<string, Graphics> = new Map();

  constructor(parentContainer: Container) {
    this.container = new Container();
    this.container.label = 'MapLayer';
    parentContainer.addChild(this.container);
  }

  /**
   * Установка карты для рендеринга
   */
  public setMap(map: GameMap): void {
    this.map = map;
    this.rebuildAllChunks();
  }

  /**
   * Перестроение всех чанков
   */
  public rebuildAllChunks(): void {
    if (!this.map) return;

    // Очистка старой графики
    this.chunkGraphics.forEach(g => g.destroy());
    this.chunkGraphics.clear();

    // Перестроение каждого чанка
    for (const chunk of this.map.iterateChunks()) {
      this.rebuildChunk(chunk);
    }
  }

  /**
   * Перестроение одного чанка
   */
  private rebuildChunk(chunk: Chunk): void {
    const key = `${chunk.chunkX},${chunk.chunkY}`;

    // Удаление старой графики
    const oldGraphics = this.chunkGraphics.get(key);
    if (oldGraphics) {
      oldGraphics.destroy();
    }

    // Создание новой графики
    const graphics = new Graphics();
    graphics.label = `Chunk_${key}`;

    // Позиция чанка в мировых координатах
    const chunkWorldX = chunk.chunkX * CHUNK_SIZE * BLOCK_SIZE;
    const chunkWorldY = chunk.chunkY * CHUNK_SIZE * BLOCK_SIZE;

    graphics.x = chunkWorldX;
    graphics.y = chunkWorldY;

    // Рендеринг блоков чанка
    this.renderChunkBlocks(graphics, chunk);

    this.container.addChild(graphics);
    this.chunkGraphics.set(key, graphics);

    chunk.clearDirty();
  }

  /**
   * Рендеринг блоков одного чанка
   */
  private renderChunkBlocks(graphics: Graphics, chunk: Chunk): void {
    // Рендерим от нижних слоёв к верхним
    // И от дальних (меньший Y) к ближним (больший Y)
    for (let z = 0; z < MAP_DEPTH; z++) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const block = chunk.getBlock(x, y, z);

          if (block.isAir()) continue;

          this.renderBlock(graphics, x, y, z, block.getType());
        }
      }
    }
  }

  /**
   * Рендеринг одного блока
   */
  private renderBlock(
    graphics: Graphics,
    localX: number,
    localY: number,
    z: number,
    blockType: BlockType
  ): void {
    const color = BLOCK_COLORS[blockType] || 0xff00ff; // Magenta для неизвестных

    // Позиция блока на экране (относительно чанка)
    const screenPos = IsometricUtils.blockToScreen(localX, localY, z);

    // Проверка, является ли блок наклонным
    const slopeDir = getSlopeDirection(blockType);

    if (slopeDir !== null) {
      // Рендеринг наклонного блока
      this.drawSlope(graphics, screenPos.x, screenPos.y, slopeDir, color);
    } else {
      // Обычный блок
      // Отрисовка верхней грани (всегда видна)
      this.drawBlockTop(graphics, screenPos.x, screenPos.y, color);

      // Отрисовка боковых граней (только если нет соседнего блока)
      // Южная грань (передняя)
      this.drawBlockSouth(graphics, screenPos.x, screenPos.y, this.darkenColor(color, 0.7));

      // Восточная грань (правая)
      this.drawBlockEast(graphics, screenPos.x, screenPos.y, this.darkenColor(color, 0.85));
    }
  }

  /**
   * Отрисовка верхней грани блока
   */
  private drawBlockTop(graphics: Graphics, x: number, y: number, color: number): void {
    graphics.rect(x, y, BLOCK_SIZE, BLOCK_SIZE);
    graphics.fill(color);
    graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
  }

  /**
   * Отрисовка южной (передней) грани
   */
  private drawBlockSouth(graphics: Graphics, x: number, y: number, color: number): void {
    const sideHeight = BLOCK_SIZE * 0.5;

    graphics.rect(x, y + BLOCK_SIZE, BLOCK_SIZE, sideHeight);
    graphics.fill(color);
    graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
  }

  /**
   * Отрисовка восточной (правой) грани
   */
  private drawBlockEast(graphics: Graphics, x: number, y: number, color: number): void {
    const sideHeight = BLOCK_SIZE * 0.5;

    graphics.rect(x + BLOCK_SIZE, y, sideHeight * 0.5, BLOCK_SIZE + sideHeight);
    graphics.fill(color);
    graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
  }

  /**
   * Отрисовка наклонного блока (slope)
   *
   * Slope - это блок, у которого верхняя грань наклонена от одного края к другому.
   * Высота изменяется от 0 до BLOCK_SIZE * 0.5 (полный блок).
   */
  private drawSlope(
    graphics: Graphics,
    x: number,
    y: number,
    direction: SlopeDirection,
    color: number
  ): void {
    const halfHeight = BLOCK_SIZE * 0.25; // Половина высоты боковой грани

    switch (direction) {
      case SlopeDirection.NORTH:
        // Подъём на север (вверх, -Y). Низкий юг, высокий север.
        // Верхняя грань - трапеция, наклонённая к северу
        graphics.moveTo(x, y + BLOCK_SIZE); // Юго-западный угол (низ)
        graphics.lineTo(x + BLOCK_SIZE, y + BLOCK_SIZE); // Юго-восточный угол (низ)
        graphics.lineTo(x + BLOCK_SIZE, y + halfHeight); // Северо-восточный угол (верх)
        graphics.lineTo(x, y + halfHeight); // Северо-западный угол (верх)
        graphics.closePath();
        graphics.fill(color);
        graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });

        // Северная боковая грань (вертикальная на верхнем краю)
        graphics.rect(x, y + halfHeight, BLOCK_SIZE, halfHeight);
        graphics.fill(this.darkenColor(color, 0.7));
        graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
        break;

      case SlopeDirection.SOUTH:
        // Подъём на юг (вниз, +Y). Низкий север, высокий юг.
        graphics.moveTo(x, y); // Северо-западный угол (низ)
        graphics.lineTo(x + BLOCK_SIZE, y); // Северо-восточный угол (низ)
        graphics.lineTo(x + BLOCK_SIZE, y + BLOCK_SIZE - halfHeight); // Юго-восточный угол (верх)
        graphics.lineTo(x, y + BLOCK_SIZE - halfHeight); // Юго-западный угол (верх)
        graphics.closePath();
        graphics.fill(color);
        graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });

        // Южная боковая грань
        graphics.rect(x, y + BLOCK_SIZE - halfHeight, BLOCK_SIZE, halfHeight);
        graphics.fill(this.darkenColor(color, 0.7));
        graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
        break;

      case SlopeDirection.EAST:
        // Подъём на восток (вправо, +X). Низкий запад, высокий восток.
        graphics.moveTo(x, y); // Северо-западный угол (низ)
        graphics.lineTo(x, y + BLOCK_SIZE); // Юго-западный угол (низ)
        graphics.lineTo(x + BLOCK_SIZE - halfHeight, y + BLOCK_SIZE); // Юго-восточный угол (верх)
        graphics.lineTo(x + BLOCK_SIZE - halfHeight, y); // Северо-восточный угол (верх)
        graphics.closePath();
        graphics.fill(color);
        graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });

        // Восточная боковая грань
        graphics.rect(x + BLOCK_SIZE - halfHeight, y, halfHeight, BLOCK_SIZE);
        graphics.fill(this.darkenColor(color, 0.85));
        graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
        break;

      case SlopeDirection.WEST:
        // Подъём на запад (влево, -X). Низкий восток, высокий запад.
        graphics.moveTo(x + halfHeight, y); // Северо-восточный угол (низ)
        graphics.lineTo(x + halfHeight, y + BLOCK_SIZE); // Юго-восточный угол (низ)
        graphics.lineTo(x + BLOCK_SIZE, y + BLOCK_SIZE); // Юго-западный угол (верх)
        graphics.lineTo(x + BLOCK_SIZE, y); // Северо-западный угол (верх)
        graphics.closePath();
        graphics.fill(color);
        graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });

        // Западная боковая грань (левая вертикальная)
        graphics.rect(x, y, halfHeight, BLOCK_SIZE);
        graphics.fill(this.darkenColor(color, 0.85));
        graphics.stroke({ width: 1, color: 0x000000, alpha: 0.2 });
        break;
    }
  }

  /**
   * Затемнение цвета
   */
  private darkenColor(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * factor);
    const g = Math.floor(((color >> 8) & 0xff) * factor);
    const b = Math.floor((color & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Обновление (проверка dirty чанков)
   */
  public update(): void {
    if (!this.map) return;

    for (const chunk of this.map.iterateChunks()) {
      if (chunk.needsRebuild()) {
        this.rebuildChunk(chunk);
      }
    }
  }

  /**
   * Получение контейнера
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * Установка видимой области (для culling)
   */
  public setViewport(viewport: Rectangle): void {
    // Определение видимых чанков
    const minChunkX = Math.floor(viewport.x / (CHUNK_SIZE * BLOCK_SIZE));
    const minChunkY = Math.floor(viewport.y / (CHUNK_SIZE * BLOCK_SIZE));
    const maxChunkX = Math.ceil((viewport.x + viewport.width) / (CHUNK_SIZE * BLOCK_SIZE));
    const maxChunkY = Math.ceil((viewport.y + viewport.height) / (CHUNK_SIZE * BLOCK_SIZE));

    // Показать/скрыть чанки
    this.chunkGraphics.forEach((graphics, key) => {
      const [cx, cy] = key.split(',').map(Number);
      graphics.visible = cx >= minChunkX && cx <= maxChunkX && cy >= minChunkY && cy <= maxChunkY;
    });
  }

  /**
   * Уничтожение
   */
  public destroy(): void {
    this.chunkGraphics.forEach(g => g.destroy());
    this.chunkGraphics.clear();
    this.container.destroy();
  }
}
