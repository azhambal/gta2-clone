# Шаг 17: Многоуровневость (Slopes)

## Цель
Реализовать наклонные блоки (slopes) для переходов между уровнями высоты. После этого шага машины могут заезжать на мосты и эстакады.

## Зависимости
- Шаг 16: Типы поверхностей

## Задачи

### 17.1 Типы наклонов

```typescript
enum SlopeDirection {
  NORTH = 0,  // Подъём на север (въезд с юга)
  SOUTH = 1,  // Подъём на юг
  EAST = 2,   // Подъём на восток
  WEST = 3,   // Подъём на запад
}

interface SlopeData {
  direction: SlopeDirection;
  heightGradient: number;  // Изменение высоты на блок (0.0 - 1.0)
}
```

### 17.2 Вычисление Z-координаты на наклоне

**src/world/SlopeUtils.ts:**
```typescript
export function calculateZOnSlope(
  localX: number,       // Позиция внутри блока (0-64)
  localY: number,
  slopeDirection: SlopeDirection,
  baseZ: number
): number {
  let progress = 0;

  switch (slopeDirection) {
    case SlopeDirection.NORTH:
      progress = 1 - (localY / BLOCK_SIZE);  // С юга на север
      break;
    case SlopeDirection.SOUTH:
      progress = localY / BLOCK_SIZE;
      break;
    case SlopeDirection.EAST:
      progress = localX / BLOCK_SIZE;
      break;
    case SlopeDirection.WEST:
      progress = 1 - (localX / BLOCK_SIZE);
      break;
  }

  return baseZ + progress;
}
```

### 17.3 SlopeSystem

**src/ecs/systems/SlopeSystem.ts:**
```typescript
/**
 * Система обработки наклонов — обновляет Z сущностей на slopes
 */
export const createSlopeSystem = (gameMap: GameMap) => {
  return defineSystem((world: IWorld, dt: number) => {
    const entities = movingQuery(world);

    for (const eid of entities) {
      const worldX = Position.x[eid];
      const worldY = Position.y[eid];
      const currentZ = Position.z[eid];

      // Координаты блока
      const blockX = Math.floor(worldX / BLOCK_SIZE);
      const blockY = Math.floor(worldY / BLOCK_SIZE);
      const blockZ = Math.floor(currentZ);

      const block = gameMap.getBlock(blockX, blockY, blockZ);

      if (block.isSlope()) {
        // Локальные координаты внутри блока
        const localX = worldX - blockX * BLOCK_SIZE;
        const localY = worldY - blockY * BLOCK_SIZE;

        // Вычисляем новую Z
        const slopeDir = getSlopeDirection(block.getType());
        const newZ = calculateZOnSlope(localX, localY, slopeDir, blockZ);

        Position.z[eid] = newZ;
      } else {
        // Проверяем, нужно ли упасть на землю
        const groundLevel = gameMap.getGroundLevel(blockX, blockY);
        if (currentZ > groundLevel) {
          // Падение
          Position.z[eid] = Math.max(groundLevel, currentZ - 0.1);
        }
      }
    }

    return world;
  });
};
```

### 17.4 Рендеринг наклонов

Наклоны рендерятся как:
- Верхняя грань под углом (трансформация спрайта)
- Или специальные спрайты для каждого направления

### 17.5 Обновление MapGenerator

```typescript
// Создание эстакады
public static createBridge(
  map: GameMap,
  startX: number, startY: number,
  endX: number, endY: number,
  height: number
): void {
  // Наклон в начале
  map.setBlockType(startX, startY, 0, BlockType.SLOPE_N);

  // Платформа моста
  for (let x = startX + 1; x < endX; x++) {
    map.setBlockType(x, startY, height, BlockType.ROAD);
  }

  // Наклон в конце
  map.setBlockType(endX, startY, height - 1, BlockType.SLOPE_S);
}
```

## Визуализация

```
Вид сбоку:
                 ___________
                /           \
               /   мост      \
       _______/               \_______
      дорога  slope        slope  дорога
         Z=0    Z=0-1     Z=1-0    Z=0
```

## Результат
- Машины плавно заезжают на мосты по slopes
- Z-координата сущностей изменяется на наклонах
- Рендеринг учитывает Z для правильной глубины
- Можно проехать под мостом

## Следующий шаг
Шаг 18: Аудио система
