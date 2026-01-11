# Шаг 06: Рендеринг карты

## Цель
Создать MapRenderer для отрисовки блочной карты в изометрическом стиле GTA2. После этого шага карта отображается на экране.

## Зависимости
- Шаг 05: Блоки и структура карты
- Шаг 04: Система ресурсов

## Задачи

### 6.1 Изометрическая проекция

**src/rendering/IsometricUtils.ts:**
```typescript
import { Vector2, Vector3, GAME_CONSTANTS } from '@core/Types';

const { BLOCK_SIZE } = GAME_CONSTANTS;

/**
 * Угол изометрической проекции (в GTA2 примерно 30°)
 */
export const ISO_ANGLE = 26.565; // arctan(0.5)
export const ISO_RATIO = 0.5;    // Соотношение высоты к ширине

/**
 * Утилиты для изометрической проекции
 */
export class IsometricUtils {
  /**
   * Конвертация мировых 3D координат в 2D экранные
   */
  public static worldToScreen(worldX: number, worldY: number, worldZ: number = 0): Vector2 {
    // В GTA2-стиле: плоский вид сверху с лёгким наклоном
    // X экрана = X мира
    // Y экрана = Y мира - Z * высота_блока (для поднятия объектов)
    return {
      x: worldX,
      y: worldY - worldZ * BLOCK_SIZE * ISO_RATIO,
    };
  }

  /**
   * Конвертация блочных координат в экранные
   */
  public static blockToScreen(blockX: number, blockY: number, blockZ: number = 0): Vector2 {
    const worldX = blockX * BLOCK_SIZE;
    const worldY = blockY * BLOCK_SIZE;
    return this.worldToScreen(worldX, worldY, blockZ);
  }

  /**
   * Конвертация экранных координат в мировые (для Z=0)
   */
  public static screenToWorld(screenX: number, screenY: number): Vector2 {
    // Обратное преобразование (для Z=0)
    return {
      x: screenX,
      y: screenY,
    };
  }

  /**
   * Вычисление глубины для сортировки (depth sorting)
   * Больше = ближе к камере = рисуется позже
   */
  public static calculateDepth(worldY: number, worldZ: number, spriteHeight: number = 0): number {
    // Объекты с большим Y (южнее) рисуются поверх
    // Объекты на большей высоте Z рисуются поверх
    return worldY + worldZ * 1000 + spriteHeight;
  }

  /**
   * Получение размеров блока на экране
   */
  public static getBlockScreenSize(): { width: number; topHeight: number; sideHeight: number } {
    return {
      width: BLOCK_SIZE,
      topHeight: BLOCK_SIZE,
      sideHeight: BLOCK_SIZE * ISO_RATIO,
    };
  }
}
```

### 6.2 MapRenderer

**src/rendering/MapRenderer.ts:**
```typescript
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { GameMap } from '@world/GameMap';
import { Chunk } from '@world/Chunk';
import { BlockType } from '@world/BlockTypes';
import { IsometricUtils } from './IsometricUtils';
import { GAME_CONSTANTS, Rectangle } from '@core/Types';

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

  // Текстуры блоков (будут загружены позже)
  private blockTextures: Map<BlockType, Texture> = new Map();

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

    // Отрисовка верхней грани (всегда видна)
    this.drawBlockTop(graphics, screenPos.x, screenPos.y, color);

    // Отрисовка боковых граней (только если нет соседнего блока)
    // Южная грань (передняя)
    this.drawBlockSouth(graphics, screenPos.x, screenPos.y, this.darkenColor(color, 0.7));

    // Восточная грань (правая)
    this.drawBlockEast(graphics, screenPos.x, screenPos.y, this.darkenColor(color, 0.85));
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
   * Затемнение цвета
   */
  private darkenColor(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xFF) * factor);
    const g = Math.floor(((color >> 8) & 0xFF) * factor);
    const b = Math.floor((color & 0xFF) * factor);
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
```

### 6.3 Обновление Renderer

**src/rendering/Renderer.ts (обновление):**
```typescript
import { Application, Container, Graphics } from 'pixi.js';
import { GameConfig, Rectangle } from '@core/Types';
import { MapRenderer } from './MapRenderer';
import { GameMap } from '@world/GameMap';

export class Renderer {
  private app: Application;
  private gameContainer: Container;
  private uiContainer: Container;

  // Рендереры
  private mapRenderer: MapRenderer | null = null;

  constructor() {
    this.app = new Application();
    this.gameContainer = new Container();
    this.uiContainer = new Container();
  }

  public async init(config: GameConfig, parentElement: HTMLElement): Promise<void> {
    await this.app.init({
      width: config.width,
      height: config.height,
      backgroundColor: config.backgroundColor,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      powerPreference: 'high-performance',
    });

    parentElement.appendChild(this.app.canvas);

    this.app.stage.addChild(this.gameContainer);
    this.app.stage.addChild(this.uiContainer);

    // Инициализация MapRenderer
    this.mapRenderer = new MapRenderer(this.gameContainer);
  }

  /**
   * Установка карты для рендеринга
   */
  public setMap(map: GameMap): void {
    this.mapRenderer?.setMap(map);
  }

  /**
   * Обновление рендереров
   */
  public update(): void {
    this.mapRenderer?.update();
  }

  public beginFrame(): void {}

  public endFrame(): void {}

  public getGameContainer(): Container {
    return this.gameContainer;
  }

  public getUIContainer(): Container {
    return this.uiContainer;
  }

  public getApp(): Application {
    return this.app;
  }

  public getMapRenderer(): MapRenderer | null {
    return this.mapRenderer;
  }

  public getScreenSize(): { width: number; height: number } {
    return {
      width: this.app.screen.width,
      height: this.app.screen.height,
    };
  }

  public resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  public destroy(): void {
    this.mapRenderer?.destroy();
    this.app.destroy(true, { children: true, texture: true });
  }
}
```

### 6.4 Обновление Game.ts

**src/Game.ts (ключевые изменения):**
```typescript
import { MapGenerator } from './world/MapGenerator';
import { GameMap } from './world/GameMap';

// Добавить поле:
private currentMap: GameMap | null = null;

// В методе init():
public async init(): Promise<void> {
  Debug.init();
  Debug.log('Game', 'Initializing...');

  const container = document.getElementById('game-container');
  if (!container) throw new Error('Game container not found');

  await this.renderer.init(this.config, container);
  Debug.log('Game', 'Renderer initialized');

  // Создание тестовой карты
  this.currentMap = MapGenerator.createTestMap(4, 4);
  Debug.log('Game', `Map created: ${this.currentMap.widthInBlocks}x${this.currentMap.heightInBlocks} blocks`);

  // Передача карты рендереру
  this.renderer.setMap(this.currentMap);

  window.addEventListener('resize', this.handleResize.bind(this));
  Debug.log('Game', 'Initialization complete');
}

// В методе update():
private update(dt: number): void {
  Debug.updateFps(this.engine.getFps());
  this.renderer.update();
}
```

### 6.5 Экспорт модулей

**src/rendering/index.ts:**
```typescript
export { Renderer } from './Renderer';
export { MapRenderer } from './MapRenderer';
export { IsometricUtils, ISO_ANGLE, ISO_RATIO } from './IsometricUtils';
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `rendering/IsometricUtils.ts` | `IsometricUtils` | Конвертация координат |
| `rendering/MapRenderer.ts` | `MapRenderer` | Рендеринг блочной карты |

## Ключевые методы MapRenderer

| Метод | Описание |
|-------|----------|
| `setMap(map)` | Установка карты для рендеринга |
| `rebuildAllChunks()` | Полное перестроение графики |
| `update()` | Проверка и перестроение dirty чанков |
| `setViewport(rect)` | Установка видимой области (culling) |
| `destroy()` | Уничтожение рендерера |

## Результат
- На экране отображается карта из цветных блоков
- Дороги серого цвета, трава зелёная, здания коричневые
- Видны боковые грани блоков (эффект объёма)
- Карта статичная (камера пока не двигается)

## Визуальное представление

```
┌─────────────────────────────────────────┐
│  ┌───┐┌───┐┌───┐                        │
│  │ B ││ B ││ B │  B = Building          │
│  └───┘└───┘└───┘                        │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓  Road                   │
│  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒  Sidewalk               │
│  ░░░░░░░░░░░░░░  Grass                  │
│                                          │
└─────────────────────────────────────────┘
```

## Проверка
```bash
npm run dev
# Карта должна отображаться
# Видны дороги, здания, трава
# Блоки имеют объём (видны боковые грани)
```

## Следующий шаг
Шаг 07: Камера (Camera)
