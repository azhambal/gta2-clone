import { Container, Graphics } from 'pixi.js';
import { query } from 'bitecs';
import { ecsWorld } from '../ecs/index.js';

/**
 * Цвета для разных типов сущностей (заглушки до появления спрайтов)
 */
const ENTITY_COLORS = {
  player: 0x3366ff, // Синий для игрока
  pedestrian: 0x66ff66, // Зелёный для пешеходов
  vehicle: 0xff6633, // Оранжевый для машин
};

/**
 * Рендерер для ECS сущностей
 */
export class EntityRenderer {
  private container: Container;
  private spriteMap: Map<number, Graphics> = new Map();

  constructor(parentContainer: Container) {
    this.container = new Container();
    this.container.zIndex = 100; // Поверх карты
    parentContainer.addChild(this.container);
  }

  /**
   * Обновление рендеринга всех сущностей
   */
  public update(): void {
    const world = ecsWorld.getWorld();
    const { Position, Rotation, SpriteComponent, PlayerControlled, Pedestrian: _Pedestrian, Vehicle } =
      world.components;

    // Находим все сущности с Position и SpriteComponent
    const entities = query(world, [Position, SpriteComponent]);

    // Удаляем sprites для удалённых сущностей
    this.cleanupRemovedEntities(entities as unknown as number[]);

    for (const eid of entities) {
      const x = Position.x[eid];
      const y = Position.y[eid];
      const z = Position.z[eid];
      const rotation = Rotation.angle[eid];
      const width = SpriteComponent.width[eid];
      const height = SpriteComponent.height[eid];
      const visible = SpriteComponent.visible[eid] === 1;

      if (!visible) continue;

      // Получаем или создаём sprite
      let sprite = this.spriteMap.get(eid);
      if (!sprite) {
        sprite = this.createEntitySprite();
        this.spriteMap.set(eid, sprite);
        this.container.addChild(sprite);
      }

      // Обновляем позицию и вращение
      sprite.x = x;
      sprite.y = y;
      sprite.rotation = rotation;
      sprite.zIndex = y + z; // Z-order по позиции

      // Определяем тип сущности для цвета
      const isPlayer = PlayerControlled[eid] === 1;
      const isVehicle = Vehicle.type[eid] !== undefined;

      const color = isPlayer
        ? ENTITY_COLORS.player
        : isVehicle
          ? ENTITY_COLORS.vehicle
          : ENTITY_COLORS.pedestrian;

      // Перерисовываем при необходимости
      this.drawEntitySprite(sprite, width, height, color);
    }

    // Сортировка по zIndex для корректного порядка отрисовки
    this.container.sortChildren();
  }

  /**
   * Создание sprite для сущности
   */
  private createEntitySprite(): Graphics {
    const graphics = new Graphics();
    graphics.pivot.set(0, 0); // Центр вращения
    return graphics;
  }

  /**
   * Отрисовка sprite сущности
   */
  private drawEntitySprite(sprite: Graphics, width: number, height: number, color: number): void {
    sprite.clear();

    // Рисуем прямоугольник с центром в (0, 0)
    sprite.rect(-width / 2, -height / 2, width, height);
    sprite.fill({ color });
    sprite.stroke({ width: 1, color: 0x000000 });

    // Добавляем индикатор направления
    sprite.moveTo(0, 0);
    sprite.lineTo(width / 2, 0);
    sprite.stroke({ width: 2, color: 0xffffff });
  }

  /**
   * Очистка sprites для удалённых сущностей
   */
  private cleanupRemovedEntities(activeEntities: number[]): void {
    const activeSet = new Set(activeEntities);

    for (const [eid, sprite] of this.spriteMap) {
      if (!activeSet.has(eid)) {
        this.container.removeChild(sprite);
        sprite.destroy();
        this.spriteMap.delete(eid);
      }
    }
  }

  /**
   * Удаление всех sprites
   */
  public clear(): void {
    for (const sprite of this.spriteMap.values()) {
      this.container.removeChild(sprite);
      sprite.destroy();
    }
    this.spriteMap.clear();
  }

  /**
   * Уничтожение рендерера
   */
  public destroy(): void {
    this.clear();
    this.container.destroy();
  }
}
