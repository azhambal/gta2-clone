# Шаг 10: Игрок-пешеход

## Цель
Создать управляемого игроком персонажа (пешехода). После этого шага игрок отображается на карте и управляется с клавиатуры.

## Зависимости
- Шаг 09: ECS Архитектура
- Шаг 08: Система ввода

## Задачи

### 10.1 Система ввода игрока

**src/ecs/systems/PlayerInputSystem.ts:**
```typescript
import { defineQuery, defineSystem, hasComponent } from 'bitecs';
import { Position, Velocity, Rotation, PlayerControlled, Driver } from '../components';
import { InputManager } from '@input/InputManager';
import { GameAction } from '@input/Actions';
import { IWorld } from 'bitecs';

const playerQuery = defineQuery([PlayerControlled, Position, Velocity, Rotation]);

/**
 * Скорость движения пешехода
 */
const WALK_SPEED = 150;  // пикселей/сек
const RUN_SPEED = 250;   // пикселей/сек

/**
 * Система ввода игрока
 */
export const createPlayerInputSystem = (inputManager: InputManager) => {
  return defineSystem((world: IWorld, dt: number) => {
    const entities = playerQuery(world);

    for (const eid of entities) {
      // Если игрок в машине — пропускаем (другая система)
      if (hasComponent(world, Driver, eid)) {
        continue;
      }

      // Получение вектора движения
      const movement = inputManager.getMovementVector();

      // Определение скорости (бег или ходьба)
      const isRunning = inputManager.isActionDown(GameAction.RUN);
      const speed = isRunning ? RUN_SPEED : WALK_SPEED;

      // Применение скорости
      Velocity.x[eid] = movement.x * speed;
      Velocity.y[eid] = movement.y * speed;

      // Поворот в направлении движения
      if (movement.x !== 0 || movement.y !== 0) {
        Rotation.angle[eid] = Math.atan2(movement.y, movement.x);
      }
    }

    return world;
  });
};
```

### 10.2 Рендерер сущностей

**src/rendering/EntityRenderer.ts:**
```typescript
import { Container, Sprite, Texture, Graphics } from 'pixi.js';
import { defineQuery, IWorld } from 'bitecs';
import { Position, Rotation, SpriteComponent, PlayerControlled } from '@ecs/components';
import { IsometricUtils } from './IsometricUtils';
import { TextureGenerator } from '@utils/TextureGenerator';
import { Application } from 'pixi.js';

const renderableQuery = defineQuery([Position, SpriteComponent]);

/**
 * Рендерер сущностей
 */
export class EntityRenderer {
  private container: Container;
  private sprites: Map<number, Sprite> = new Map();
  private textureGenerator: TextureGenerator;

  // Placeholder текстуры
  private playerTexture!: Texture;
  private pedestrianTexture!: Texture;
  private vehicleTexture!: Texture;

  constructor(parentContainer: Container, app: Application) {
    this.container = new Container();
    this.container.label = 'EntityLayer';
    this.container.sortableChildren = true;
    parentContainer.addChild(this.container);

    this.textureGenerator = new TextureGenerator(app);
    this.createPlaceholderTextures();
  }

  /**
   * Создание placeholder текстур
   */
  private createPlaceholderTextures(): void {
    this.playerTexture = this.textureGenerator.generateCharacterTexture(0x00ff00);
    this.pedestrianTexture = this.textureGenerator.generateCharacterTexture(0x0066cc);
    this.vehicleTexture = this.textureGenerator.generateVehicleTexture(0xffcc00);
  }

  /**
   * Обновление рендеринга
   */
  public update(world: IWorld): void {
    const entities = renderableQuery(world);
    const currentEntities = new Set(entities);

    // Удаление спрайтов для удалённых сущностей
    for (const [eid, sprite] of this.sprites) {
      if (!currentEntities.has(eid)) {
        this.container.removeChild(sprite);
        sprite.destroy();
        this.sprites.delete(eid);
      }
    }

    // Обновление или создание спрайтов
    for (const eid of entities) {
      let sprite = this.sprites.get(eid);

      // Создание спрайта если не существует
      if (!sprite) {
        sprite = this.createSprite(world, eid);
        this.sprites.set(eid, sprite);
        this.container.addChild(sprite);
      }

      // Обновление позиции
      const screenPos = IsometricUtils.worldToScreen(
        Position.x[eid],
        Position.y[eid],
        Position.z[eid]
      );
      sprite.x = screenPos.x;
      sprite.y = screenPos.y;

      // Поворот (если есть компонент)
      if (Rotation.angle[eid] !== undefined) {
        sprite.rotation = Rotation.angle[eid];
      }

      // Видимость
      sprite.visible = SpriteComponent.visible[eid] === 1;

      // Z-order (для сортировки)
      sprite.zIndex = IsometricUtils.calculateDepth(
        Position.y[eid],
        Position.z[eid],
        SpriteComponent.height[eid]
      );
    }
  }

  /**
   * Создание спрайта для сущности
   */
  private createSprite(world: IWorld, eid: number): Sprite {
    // Определение текстуры по типу сущности
    let texture: Texture;

    if (PlayerControlled.eid && PlayerControlled.eid[eid] !== undefined) {
      // Проверка через hasComponent не работает напрямую,
      // поэтому используем простую проверку
      texture = this.playerTexture;
    } else {
      texture = this.pedestrianTexture;
    }

    const sprite = new Sprite(texture);

    // Anchor из компонента
    sprite.anchor.set(
      SpriteComponent.anchorX[eid] || 0.5,
      SpriteComponent.anchorY[eid] || 0.5
    );

    return sprite;
  }

  /**
   * Принудительное пересоздание спрайта
   */
  public refreshSprite(eid: number, world: IWorld): void {
    const oldSprite = this.sprites.get(eid);
    if (oldSprite) {
      this.container.removeChild(oldSprite);
      oldSprite.destroy();
    }

    const newSprite = this.createSprite(world, eid);
    this.sprites.set(eid, newSprite);
    this.container.addChild(newSprite);
  }

  /**
   * Получение контейнера
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * Уничтожение
   */
  public destroy(): void {
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites.clear();
    this.container.destroy();
  }
}
```

### 10.3 Обновление Renderer

**src/rendering/Renderer.ts (добавления):**
```typescript
import { EntityRenderer } from './EntityRenderer';
import { IWorld } from 'bitecs';

// Добавить поле:
private entityRenderer: EntityRenderer | null = null;

// В методе init():
this.entityRenderer = new EntityRenderer(this.gameContainer, this.app);

// Добавить метод:
public updateEntities(world: IWorld): void {
  this.entityRenderer?.update(world);
}

// Добавить геттер:
public getEntityRenderer(): EntityRenderer | null {
  return this.entityRenderer;
}
```

### 10.4 Интеграция в Game.ts

**src/Game.ts (обновление):**
```typescript
import { ecsWorld, EntityFactory, SystemManager } from './ecs';
import { createPlayerInputSystem } from './ecs/systems/PlayerInputSystem';
import { movementSystem } from './ecs/systems/MovementSystem';
import { GAME_CONSTANTS } from './core/Types';

// Добавить поля:
private systemManager!: SystemManager;
private playerId: number = -1;

// В методе init():
public async init(): Promise<void> {
  // ... существующий код ...

  // Инициализация ECS
  this.systemManager = new SystemManager();

  // Регистрация систем
  const playerInputSystem = createPlayerInputSystem(this.inputManager);
  this.systemManager.register('playerInput', playerInputSystem, 0);
  this.systemManager.register('movement', movementSystem, 10);

  // Создание игрока
  const world = ecsWorld.getWorld();
  const centerX = (this.currentMap.widthInBlocks * GAME_CONSTANTS.BLOCK_SIZE) / 2;
  const centerY = (this.currentMap.heightInBlocks * GAME_CONSTANTS.BLOCK_SIZE) / 2;

  this.playerId = EntityFactory.createPlayer(world, centerX, centerY);
  Debug.log('Game', `Player created: entity ${this.playerId} at (${centerX}, ${centerY})`);

  // Установка камеры на игрока
  this.camera.setPosition(centerX, centerY);

  // ... остальной код ...
}

// В методе fixedUpdate():
private fixedUpdate(dt: number): void {
  const world = ecsWorld.getWorld();

  // Обновление ECS систем
  this.systemManager.update(world, dt);
}

// В методе update():
private update(dt: number): void {
  Debug.updateFps(this.engine.getFps());

  const world = ecsWorld.getWorld();

  // Камера следует за игроком
  if (this.playerId >= 0) {
    const { Position } = require('./ecs/components');
    const playerX = Position.x[this.playerId];
    const playerY = Position.y[this.playerId];
    this.camera.follow({ x: playerX, y: playerY });
  }

  this.camera.update(dt);

  // Обновление viewport
  const viewport = this.camera.getViewport();
  this.renderer.getMapRenderer()?.setViewport(viewport);

  // Обновление рендеринга сущностей
  this.renderer.updateEntities(world);

  this.renderer.update();
  this.inputManager.update();
}
```

### 10.5 Экспорт систем

**src/ecs/systems/index.ts:**
```typescript
export { createMovementSystem, movementSystem } from './MovementSystem';
export { createAnimationSystem, animationSystem } from './AnimationSystem';
export { createPlayerInputSystem } from './PlayerInputSystem';
```

**src/rendering/index.ts:**
```typescript
export { Renderer } from './Renderer';
export { MapRenderer } from './MapRenderer';
export { EntityRenderer } from './EntityRenderer';
export { Camera, CameraConfig } from './Camera';
export { IsometricUtils, ISO_ANGLE, ISO_RATIO } from './IsometricUtils';
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `ecs/systems/PlayerInputSystem.ts` | `createPlayerInputSystem` | Система ввода игрока |
| `rendering/EntityRenderer.ts` | `EntityRenderer` | Рендерер сущностей |

## Ключевые методы

### PlayerInputSystem
- Читает ввод из InputManager
- Применяет скорость к Velocity компоненту
- Поворачивает персонажа в направлении движения
- Переключает между ходьбой и бегом

### EntityRenderer
| Метод | Описание |
|-------|----------|
| `update(world)` | Обновление спрайтов всех сущностей |
| `refreshSprite(eid, world)` | Пересоздание спрайта |
| `getContainer()` | Получение контейнера |

## Управление

| Клавиша | Действие |
|---------|----------|
| W/A/S/D | Движение персонажа |
| Shift | Бег |

## Результат
- Игрок отображается на карте (зелёный овал)
- Можно управлять с WASD
- Shift для бега
- Камера следует за игроком
- Персонаж поворачивается в направлении движения

## Визуальное представление

```
┌─────────────────────────────────────────┐
│                                          │
│   ░░░░░░░░░░░░░░░░░░░░░                  │
│   ░░░░░░░░░░░░░░░░░░░░░                  │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  Road           │
│   ▓▓▓▓▓▓▓▓ ● ▓▓▓▓▓▓▓▓▓▓  ● = Player     │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                  │
│   ░░░░░░░░░░░░░░░░░░░░░                  │
│                                          │
└─────────────────────────────────────────┘
```

## Проверка
```bash
npm run dev
# Игрок отображается в центре карты
# WASD — движение
# Shift — бег
# Камера следует за игроком
```

## Следующий шаг
Шаг 11: Коллизии с картой
