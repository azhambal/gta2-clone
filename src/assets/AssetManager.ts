import { Assets, Texture, Spritesheet } from 'pixi.js';
import { eventBus } from '../core/EventBus.js';

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
   * Установка текстуры (для генерированных текстур)
   */
  public setTexture(key: string, texture: Texture): void {
    this.loadedTextures.set(key, texture);
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
