import { Graphics, RenderTexture, Application } from 'pixi.js';

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
  public generateBlockTexture(color: number): RenderTexture {
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
