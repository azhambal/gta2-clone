# Шаг 11: Коллизии с картой

## Цель
Реализовать коллизии персонажа с блоками карты. После этого шага игрок не может проходить сквозь стены и здания.

## Зависимости
- Шаг 10: Игрок-пешеход
- Шаг 05: Блоки и структура карты

## Задачи

### 11.1 Система коллизий с картой

**src/ecs/systems/MapCollisionSystem.ts:**
```typescript
import { defineQuery, defineSystem } from 'bitecs';
import { Position, Velocity, Collider } from '../components';
import { GameMap } from '@world/GameMap';
import { BlockType, CollisionType } from '@world/BlockTypes';
import { blockRegistry } from '@world/BlockRegistry';
import { GAME_CONSTANTS } from '@core/Types';
import { IWorld } from 'bitecs';

const { BLOCK_SIZE } = GAME_CONSTANTS;

const collisionQuery = defineQuery([Position, Velocity, Collider]);

/**
 * Результат проверки коллизии
 */
interface CollisionResult {
  collided: boolean;
  normalX: number;
  normalY: number;
  penetration: number;
  blockX: number;
  blockY: number;
  blockZ: number;
}

/**
 * Система коллизий с картой
 */
export const createMapCollisionSystem = (gameMap: GameMap) => {
  return defineSystem((world: IWorld, dt: number) => {
    const entities = collisionQuery(world);

    for (const eid of entities) {
      const x = Position.x[eid];
      const y = Position.y[eid];
      const z = Math.floor(Position.z[eid]);

      const vx = Velocity.x[eid];
      const vy = Velocity.y[eid];

      // Новая позиция после применения скорости
      const newX = x + vx * (dt / 1000);
      const newY = y + vy * (dt / 1000);

      // Радиус коллайдера
      const radius = Collider.radius[eid] || Collider.width[eid] / 2;

      // Проверка коллизий по X
      const collisionX = checkAxisCollision(gameMap, x, y, z, newX, y, radius);
      if (collisionX.collided) {
        // Остановка по X и корректировка позиции
        Velocity.x[eid] = 0;
        Position.x[eid] = x + collisionX.normalX * collisionX.penetration;
      }

      // Проверка коллизий по Y
      const collisionY = checkAxisCollision(gameMap, x, y, z, x, newY, radius);
      if (collisionY.collided) {
        // Остановка по Y и корректировка позиции
        Velocity.y[eid] = 0;
        Position.y[eid] = y + collisionY.normalY * collisionY.penetration;
      }
    }

    return world;
  });
};

/**
 * Проверка коллизии по оси
 */
function checkAxisCollision(
  map: GameMap,
  oldX: number,
  oldY: number,
  z: number,
  newX: number,
  newY: number,
  radius: number
): CollisionResult {
  const result: CollisionResult = {
    collided: false,
    normalX: 0,
    normalY: 0,
    penetration: 0,
    blockX: 0,
    blockY: 0,
    blockZ: z,
  };

  // Определение блоков для проверки
  const minBlockX = Math.floor((newX - radius) / BLOCK_SIZE);
  const maxBlockX = Math.floor((newX + radius) / BLOCK_SIZE);
  const minBlockY = Math.floor((newY - radius) / BLOCK_SIZE);
  const maxBlockY = Math.floor((newY + radius) / BLOCK_SIZE);

  for (let bx = minBlockX; bx <= maxBlockX; bx++) {
    for (let by = minBlockY; by <= maxBlockY; by++) {
      const block = map.getBlock(bx, by, z);
      const blockDef = blockRegistry.get(block.getType());

      // Проверка только твёрдых блоков
      if (!blockDef || blockDef.collision !== CollisionType.SOLID) {
        continue;
      }

      // Границы блока
      const blockLeft = bx * BLOCK_SIZE;
      const blockRight = (bx + 1) * BLOCK_SIZE;
      const blockTop = by * BLOCK_SIZE;
      const blockBottom = (by + 1) * BLOCK_SIZE;

      // AABB vs Circle collision
      const closestX = Math.max(blockLeft, Math.min(newX, blockRight));
      const closestY = Math.max(blockTop, Math.min(newY, blockBottom));

      const distX = newX - closestX;
      const distY = newY - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq < radius * radius) {
        result.collided = true;
        result.blockX = bx;
        result.blockY = by;

        const dist = Math.sqrt(distSq);
        if (dist > 0) {
          result.normalX = distX / dist;
          result.normalY = distY / dist;
          result.penetration = radius - dist;
        } else {
          // Внутри блока — выталкиваем к старой позиции
          const dx = newX - oldX;
          const dy = newY - oldY;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            result.normalX = -dx / len;
            result.normalY = -dy / len;
          }
          result.penetration = radius;
        }

        return result;
      }
    }
  }

  return result;
}

/**
 * Вспомогательная функция: проверка, можно ли двигаться в точку
 */
export function canMoveTo(
  map: GameMap,
  x: number,
  y: number,
  z: number,
  radius: number
): boolean {
  const minBlockX = Math.floor((x - radius) / BLOCK_SIZE);
  const maxBlockX = Math.floor((x + radius) / BLOCK_SIZE);
  const minBlockY = Math.floor((y - radius) / BLOCK_SIZE);
  const maxBlockY = Math.floor((y + radius) / BLOCK_SIZE);

  for (let bx = minBlockX; bx <= maxBlockX; bx++) {
    for (let by = minBlockY; by <= maxBlockY; by++) {
      const block = map.getBlock(bx, by, z);
      if (block.isSolid()) {
        // Проверяем пересечение с блоком
        const blockLeft = bx * BLOCK_SIZE;
        const blockRight = (bx + 1) * BLOCK_SIZE;
        const blockTop = by * BLOCK_SIZE;
        const blockBottom = (by + 1) * BLOCK_SIZE;

        const closestX = Math.max(blockLeft, Math.min(x, blockRight));
        const closestY = Math.max(blockTop, Math.min(y, blockBottom));

        const distSq = (x - closestX) ** 2 + (y - closestY) ** 2;
        if (distSq < radius * radius) {
          return false;
        }
      }
    }
  }

  return true;
}
```

### 11.2 Обновление BlockRegistry

**src/world/BlockRegistry.ts (добавить недостающие блоки):**
```typescript
// В методе registerDefaultBlocks():

// Твёрдый блок
this.register({
  id: BlockType.SOLID,
  name: 'Solid',
  textures: { top: 0, bottom: 0, north: 0, south: 0, east: 0, west: 0 },
  collision: CollisionType.SOLID,
  surface: SurfaceType.NONE,
  flags: BlockFlags.NONE,
});

// Пол здания (проходимый)
this.register({
  id: BlockType.BUILDING_FLOOR,
  name: 'Building Floor',
  textures: { top: 11, bottom: 11, north: 12, south: 12, east: 12, west: 12 },
  collision: CollisionType.SOLID, // Пол - это платформа на которой стоят
  surface: SurfaceType.ROAD,
  flags: BlockFlags.NONE,
});

// Крыша здания
this.register({
  id: BlockType.BUILDING_ROOF,
  name: 'Building Roof',
  textures: { top: 13, bottom: 13, north: 14, south: 14, east: 14, west: 14 },
  collision: CollisionType.SOLID,
  surface: SurfaceType.NONE,
  flags: BlockFlags.NONE,
});
```

### 11.3 Интеграция в Game.ts

**src/Game.ts (добавления):**
```typescript
import { createMapCollisionSystem } from './ecs/systems/MapCollisionSystem';

// В методе init(), после создания карты:

// Регистрация системы коллизий (после movement, но до рендеринга)
const mapCollisionSystem = createMapCollisionSystem(this.currentMap);
this.systemManager.register('mapCollision', mapCollisionSystem, 15);
```

### 11.4 Обновление порядка систем

```typescript
// Правильный порядок выполнения:
// 0.  PlayerInputSystem   - ввод игрока
// 10. MovementSystem      - применение скорости
// 15. MapCollisionSystem  - коллизии с картой
// 20. AnimationSystem     - анимация
```

### 11.5 Debug отрисовка коллизий (опционально)

**src/utils/CollisionDebug.ts:**
```typescript
import { Graphics, Container } from 'pixi.js';
import { GameMap } from '@world/GameMap';
import { GAME_CONSTANTS } from '@core/Types';
import { blockRegistry } from '@world/BlockRegistry';
import { CollisionType } from '@world/BlockTypes';

const { BLOCK_SIZE, CHUNK_SIZE } = GAME_CONSTANTS;

/**
 * Отладочная отрисовка коллизий
 */
export class CollisionDebug {
  private graphics: Graphics;
  private enabled: boolean = false;

  constructor(parentContainer: Container) {
    this.graphics = new Graphics();
    this.graphics.label = 'CollisionDebug';
    this.graphics.alpha = 0.3;
    parentContainer.addChild(this.graphics);
  }

  /**
   * Включение/выключение отладки
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.graphics.visible = enabled;
  }

  /**
   * Отрисовка коллизий в видимой области
   */
  public draw(map: GameMap, viewX: number, viewY: number, viewWidth: number, viewHeight: number): void {
    if (!this.enabled) return;

    this.graphics.clear();

    const minBlockX = Math.floor(viewX / BLOCK_SIZE);
    const maxBlockX = Math.ceil((viewX + viewWidth) / BLOCK_SIZE);
    const minBlockY = Math.floor(viewY / BLOCK_SIZE);
    const maxBlockY = Math.ceil((viewY + viewHeight) / BLOCK_SIZE);

    for (let by = minBlockY; by <= maxBlockY; by++) {
      for (let bx = minBlockX; bx <= maxBlockX; bx++) {
        const block = map.getBlock(bx, by, 0);
        const blockDef = blockRegistry.get(block.getType());

        if (blockDef && blockDef.collision === CollisionType.SOLID) {
          this.graphics.rect(
            bx * BLOCK_SIZE,
            by * BLOCK_SIZE,
            BLOCK_SIZE,
            BLOCK_SIZE
          );
          this.graphics.fill({ color: 0xff0000, alpha: 0.3 });
          this.graphics.stroke({ width: 1, color: 0xff0000 });
        }
      }
    }
  }
}
```

## Экспорт

**src/ecs/systems/index.ts:**
```typescript
export { createMovementSystem, movementSystem } from './MovementSystem';
export { createAnimationSystem, animationSystem } from './AnimationSystem';
export { createPlayerInputSystem } from './PlayerInputSystem';
export { createMapCollisionSystem, canMoveTo } from './MapCollisionSystem';
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `ecs/systems/MapCollisionSystem.ts` | `createMapCollisionSystem` | Система коллизий с картой |
| `ecs/systems/MapCollisionSystem.ts` | `canMoveTo` | Проверка возможности движения |
| `utils/CollisionDebug.ts` | `CollisionDebug` | Отладочная визуализация |

## Алгоритм коллизий

1. Для каждой сущности с Position, Velocity и Collider:
2. Вычисляем новую позицию после применения скорости
3. Определяем блоки, с которыми может пересечься коллайдер
4. Для каждого твёрдого блока проверяем AABB vs Circle
5. При коллизии: обнуляем скорость и корректируем позицию

## Результат
- Игрок не проходит сквозь здания
- Игрок не проходит сквозь стены
- Скольжение вдоль стен работает (раздельная проверка X и Y)

## Проверка
```bash
npm run dev
# Подойти к зданию — персонаж останавливается
# Двигаться вдоль стены — скольжение работает
```

## Следующий шаг
Шаг 12: Интеграция физики Matter.js
