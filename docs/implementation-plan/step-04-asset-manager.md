# Шаг 04: Система загрузки ресурсов

## Цель
Создать систему загрузки и управления ресурсами (текстуры, данные). После этого шага можно загружать и отображать текстурные атласы.

## Зависимости
- Шаг 03: Интеграция PixiJS

## Задачи

### 4.1 AssetManager

**src/assets/AssetManager.ts:**
```typescript
import { Assets, Texture, Spritesheet } from 'pixi.js';
import { eventBus } from '@core/EventBus';

export interface AssetManifest {
  textures: { [key: string]: string };
  spritesheets: { [key: string]: string };
  data: { [key: string]: string };
  audio: { [key: string]: string };
}

/**
 * Менеджер загрузки и хранения ресурсов
 */
export class AssetManager {
  private loadedTextures: Map<string, Texture> = new Map();
  private loadedSpritesheets: Map<string, Spritesheet> = new Map();
  private loadedData: Map<string, any> = new Map();

  private totalAssets: number = 0;
  private loadedCount: number = 0;

  constructor() {}

  /**
   * Загрузка ресурсов по манифесту
   */
  public async loadManifest(manifest: AssetManifest): Promise<void> {
    // Подсчёт общего количества ресурсов
    this.totalAssets =
      Object.keys(manifest.textures || {}).length +
      Object.keys(manifest.spritesheets || {}).length +
      Object.keys(manifest.data || {}).length;

    this.loadedCount = 0;

    eventBus.emit('assets:loadStart', { total: this.totalAssets });

    // Загрузка текстур
    for (const [key, url] of Object.entries(manifest.textures || {})) {
      await this.loadTexture(key, url);
    }

    // Загрузка спрайтшитов
    for (const [key, url] of Object.entries(manifest.spritesheets || {})) {
      await this.loadSpritesheet(key, url);
    }

    // Загрузка JSON данных
    for (const [key, url] of Object.entries(manifest.data || {})) {
      await this.loadData(key, url);
    }

    eventBus.emit('assets:loadComplete');
  }

  /**
   * Загрузка отдельной текстуры
   */
  public async loadTexture(key: string, url: string): Promise<Texture> {
    const texture = await Assets.load<Texture>(url);
    this.loadedTextures.set(key, texture);
    this.updateProgress();
    return texture;
  }

  /**
   * Загрузка спрайтшита
   */
  public async loadSpritesheet(key: string, url: string): Promise<Spritesheet> {
    const spritesheet = await Assets.load<Spritesheet>(url);
    this.loadedSpritesheets.set(key, spritesheet);
    this.updateProgress();
    return spritesheet;
  }

  /**
   * Загрузка JSON данных
   */
  public async loadData(key: string, url: string): Promise<any> {
    const response = await fetch(url);
    const data = await response.json();
    this.loadedData.set(key, data);
    this.updateProgress();
    return data;
  }

  /**
   * Получение текстуры
   */
  public getTexture(key: string): Texture | undefined {
    return this.loadedTextures.get(key);
  }

  /**
   * Получение спрайтшита
   */
  public getSpritesheet(key: string): Spritesheet | undefined {
    return this.loadedSpritesheets.get(key);
  }

  /**
   * Получение текстуры из спрайтшита
   */
  public getFrameTexture(sheetKey: string, frameName: string): Texture | undefined {
    const sheet = this.loadedSpritesheets.get(sheetKey);
    return sheet?.textures[frameName];
  }

  /**
   * Получение данных
   */
  public getData<T = any>(key: string): T | undefined {
    return this.loadedData.get(key) as T;
  }

  /**
   * Проверка загруженности ресурса
   */
  public hasAsset(key: string): boolean {
    return (
      this.loadedTextures.has(key) ||
      this.loadedSpritesheets.has(key) ||
      this.loadedData.has(key)
    );
  }

  /**
   * Обновление прогресса загрузки
   */
  private updateProgress(): void {
    this.loadedCount++;
    const progress = this.loadedCount / this.totalAssets;
    eventBus.emit('assets:progress', { loaded: this.loadedCount, total: this.totalAssets, progress });
  }

  /**
   * Очистка ресурсов
   */
  public clear(): void {
    this.loadedTextures.forEach(texture => texture.destroy(true));
    this.loadedTextures.clear();
    this.loadedSpritesheets.clear();
    this.loadedData.clear();
  }
}

// Синглтон
export const assetManager = new AssetManager();
```

### 4.2 Создание тестовых ресурсов

**assets/textures/test-blocks.json (Spritesheet):**
```json
{
  "frames": {
    "grass": {
      "frame": { "x": 0, "y": 0, "w": 64, "h": 64 }
    },
    "road": {
      "frame": { "x": 64, "y": 0, "w": 64, "h": 64 }
    },
    "sidewalk": {
      "frame": { "x": 128, "y": 0, "w": 64, "h": 64 }
    },
    "building": {
      "frame": { "x": 192, "y": 0, "w": 64, "h": 64 }
    }
  },
  "meta": {
    "image": "test-blocks.png",
    "format": "RGBA8888",
    "size": { "w": 256, "h": 64 },
    "scale": 1
  }
}
```

Примечание: `test-blocks.png` нужно создать вручную (256x64 пикселей с 4 тайлами по 64x64).

### 4.3 Генератор тестовых текстур (для разработки)

**src/utils/TextureGenerator.ts:**
```typescript
import { Graphics, RenderTexture, Application, Texture } from 'pixi.js';

/**
 * Генератор placeholder текстур для разработки
 */
export class TextureGenerator {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Генерация цветного блока с сеткой
   */
  public generateBlockTexture(color: number, label?: string): RenderTexture {
    const graphics = new Graphics();
    const size = 64;

    // Фон
    graphics.rect(0, 0, size, size);
    graphics.fill(color);

    // Сетка
    graphics.rect(0, 0, size, size);
    graphics.stroke({ width: 1, color: 0x000000, alpha: 0.3 });

    // Рендер в текстуру
    const renderTexture = RenderTexture.create({ width: size, height: size });
    this.app.renderer.render({ container: graphics, target: renderTexture });

    graphics.destroy();
    return renderTexture;
  }

  /**
   * Генерация набора тестовых блоков
   */
  public generateBlockSet(): Map<string, RenderTexture> {
    const blocks = new Map<string, RenderTexture>();

    blocks.set('grass', this.generateBlockTexture(0x4a7c23));
    blocks.set('road', this.generateBlockTexture(0x3a3a3a));
    blocks.set('sidewalk', this.generateBlockTexture(0x8a8a8a));
    blocks.set('building', this.generateBlockTexture(0x6b4423));
    blocks.set('water', this.generateBlockTexture(0x2255aa));
    blocks.set('air', this.generateBlockTexture(0x000000));

    return blocks;
  }

  /**
   * Генерация спрайта персонажа (placeholder)
   */
  public generateCharacterTexture(color: number = 0xff0000): RenderTexture {
    const graphics = new Graphics();

    // Тело (овал)
    graphics.ellipse(16, 20, 10, 14);
    graphics.fill(color);

    // Голова (круг)
    graphics.circle(16, 6, 6);
    graphics.fill(0xffcc99);

    const renderTexture = RenderTexture.create({ width: 32, height: 32 });
    this.app.renderer.render({ container: graphics, target: renderTexture });

    graphics.destroy();
    return renderTexture;
  }

  /**
   * Генерация спрайта машины (placeholder)
   */
  public generateVehicleTexture(color: number = 0x0066cc): RenderTexture {
    const graphics = new Graphics();

    // Корпус
    graphics.roundRect(4, 8, 56, 28, 4);
    graphics.fill(color);

    // Окна
    graphics.rect(12, 12, 16, 12);
    graphics.fill(0x88ccff);
    graphics.rect(36, 12, 16, 12);
    graphics.fill(0x88ccff);

    // Колёса
    graphics.circle(16, 36, 6);
    graphics.fill(0x222222);
    graphics.circle(48, 36, 6);
    graphics.fill(0x222222);

    const renderTexture = RenderTexture.create({ width: 64, height: 44 });
    this.app.renderer.render({ container: graphics, target: renderTexture });

    graphics.destroy();
    return renderTexture;
  }
}
```

### 4.4 Обновление Game.ts

**src/Game.ts (изменения):**
```typescript
import { AssetManager, assetManager } from './assets/AssetManager';
import { TextureGenerator } from './utils/TextureGenerator';

// В классе Game добавить:
private textureGenerator!: TextureGenerator;

// В методе init():
public async init(): Promise<void> {
  Debug.init();
  Debug.log('Game', 'Initializing...');

  const container = document.getElementById('game-container');
  if (!container) throw new Error('Game container not found');

  await this.renderer.init(this.config, container);
  Debug.log('Game', 'Renderer initialized');

  // Генератор текстур для разработки
  this.textureGenerator = new TextureGenerator(this.renderer.getApp());

  // Генерация тестовых текстур
  const testBlocks = this.textureGenerator.generateBlockSet();
  Debug.log('Game', `Generated ${testBlocks.size} test block textures`);

  // Демонстрация текстур
  this.showTestTextures(testBlocks);

  window.addEventListener('resize', this.handleResize.bind(this));
  Debug.log('Game', 'Initialization complete');
}

private showTestTextures(blocks: Map<string, any>): void {
  const { Sprite } = require('pixi.js');
  const container = this.renderer.getGameContainer();

  let x = 50;
  blocks.forEach((texture, name) => {
    const sprite = new Sprite(texture);
    sprite.x = x;
    sprite.y = 50;
    container.addChild(sprite);
    x += 80;
  });
}
```

### 4.5 Экспорт модулей

**src/assets/index.ts:**
```typescript
export { AssetManager, assetManager } from './AssetManager';
export type { AssetManifest } from './AssetManager';
```

**src/utils/index.ts:**
```typescript
export { Debug } from './Debug';
export { TextureGenerator } from './TextureGenerator';
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `assets/AssetManager.ts` | `AssetManager` | Загрузка и хранение ресурсов |
| `assets/AssetManager.ts` | `AssetManifest` | Структура манифеста ресурсов |
| `utils/TextureGenerator.ts` | `TextureGenerator` | Генератор placeholder текстур |

## Ключевые методы AssetManager

| Метод | Описание |
|-------|----------|
| `loadManifest(manifest)` | Загрузка по манифесту |
| `loadTexture(key, url)` | Загрузка текстуры |
| `loadSpritesheet(key, url)` | Загрузка спрайтшита |
| `loadData(key, url)` | Загрузка JSON |
| `getTexture(key)` | Получение текстуры |
| `getSpritesheet(key)` | Получение спрайтшита |
| `getFrameTexture(sheet, frame)` | Получение кадра из спрайтшита |
| `getData(key)` | Получение данных |
| `hasAsset(key)` | Проверка наличия ресурса |
| `clear()` | Очистка ресурсов |

## События AssetManager

| Событие | Данные | Описание |
|---------|--------|----------|
| `assets:loadStart` | `{ total }` | Начало загрузки |
| `assets:progress` | `{ loaded, total, progress }` | Прогресс загрузки |
| `assets:loadComplete` | — | Загрузка завершена |

## Результат
- Система загрузки ресурсов готова
- TextureGenerator создаёт placeholder текстуры
- На экране отображаются тестовые блоки разных цветов
- События прогресса загрузки отправляются

## Проверка
```bash
npm run dev
# Должны отображаться цветные квадраты-блоки
# Консоль показывает "Generated X test block textures"
```

## Следующий шаг
Шаг 05: Блоки и структура карты
