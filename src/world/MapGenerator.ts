import { GameMap, type MapConfig } from './GameMap.js';
import { BlockType } from './BlockTypes.js';

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

    // Создание моста для демонстрации многоуровневости
    // Мост над горизонтальной дорогой
    MapGenerator.createBridge(
      map,
      roadX - 5, roadY,     // Начало (слева от дороги)
      roadX + 5, roadY,     // Конец (справа от дороги)
      1,                    // Высота моста (Z = 1)
      true,                  // Горизонтальный мост
    );

    return map;
  }

  /**
   * Создание моста с наклонами для въезда/съезда
   *
   * @param map - Карта
   * @param startX - Начальная координата X
   * @param startY - Начальная координата Y
   * @param endX - Конечная координата X
   * @param endY - Конечная координата Y
   * @param heightZ - Высота моста (Z уровень)
   * @param horizontal - Ориентация моста (true = горизонтальный, false = вертикальный)
   */
  public static createBridge(
    map: GameMap,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    heightZ: number,
    horizontal: boolean,
  ): void {
    // Нормализация координат (начало всегда меньше конца)
    const x1 = Math.min(startX, endX);
    const x2 = Math.max(startX, endX);
    const y1 = Math.min(startY, endY);
    const y2 = Math.max(startY, endY);

    if (horizontal) {
      // Горизонтальный мост (движение по X)

      // Наклон в начале (въезд с запада на восток)
      // SLOPE_W - подъём на запад (въезд с востока) — не подходит
      // SLOPE_E - подъём на восток (въезд с запада) — подходит для въезда на мост
      map.setBlockType(x1, y1, 0, BlockType.SLOPE_E);
      // Ширина моста 3 блока
      map.setBlockType(x1, y1 + 1, 0, BlockType.SLOPE_E);
      map.setBlockType(x1, y1 - 1, 0, BlockType.SLOPE_E);

      // Платформа моста (на высоте heightZ)
      for (let x = x1 + 1; x < x2; x++) {
        map.setBlockType(x, y1, heightZ, BlockType.ROAD);
        map.setBlockType(x, y1 + 1, heightZ, BlockType.ROAD);
        map.setBlockType(x, y1 - 1, heightZ, BlockType.ROAD);

        // Барьеры по краям моста
        map.setBlockType(x, y1 - 1, heightZ, BlockType.SIDEWALK);
        map.setBlockType(x, y1 + 1, heightZ, BlockType.SIDEWALK);
      }

      // Наклон в конце (съезд с моста на восток)
      // SLOPE_W - подъём на запад (въезд с востока) — для съезда нужен обратный наклон
      // Для съезда на восток нужен SLOPE_E на уровне ниже
      map.setBlockType(x2, y1, heightZ - 1, BlockType.SLOPE_E);
      map.setBlockType(x2, y1 + 1, heightZ - 1, BlockType.SLOPE_E);
      map.setBlockType(x2, y1 - 1, heightZ - 1, BlockType.SLOPE_E);

    } else {
      // Вертикальный мост (движение по Y)

      // Наклон в начале (въезд с юга на север)
      map.setBlockType(x1, y1, 0, BlockType.SLOPE_N);
      map.setBlockType(x1 + 1, y1, 0, BlockType.SLOPE_N);
      map.setBlockType(x1 - 1, y1, 0, BlockType.SLOPE_N);

      // Платформа моста
      for (let y = y1 + 1; y < y2; y++) {
        map.setBlockType(x1, y, heightZ, BlockType.ROAD);
        map.setBlockType(x1 + 1, y, heightZ, BlockType.ROAD);
        map.setBlockType(x1 - 1, y, heightZ, BlockType.ROAD);

        // Барьеры
        map.setBlockType(x1 - 1, y, heightZ, BlockType.SIDEWALK);
        map.setBlockType(x1 + 1, y, heightZ, BlockType.SIDEWALK);
      }

      // Наклон в конце (съезд на север)
      map.setBlockType(x1, y2, heightZ - 1, BlockType.SLOPE_N);
      map.setBlockType(x1 + 1, y2, heightZ - 1, BlockType.SLOPE_N);
      map.setBlockType(x1 - 1, y2, heightZ - 1, BlockType.SLOPE_N);
    }
  }

  /**
   * Создание эстакады (raised highway)
   *
   * @param map - Карта
   * @param startX - Начальная координата X
   * @param startY - Начальная координата Y
   * @param length - Длина эстакады
   * @param heightZ - Высота эстакады
   * @param horizontal - Ориентация
   */
  public static createOverpass(
    map: GameMap,
    startX: number,
    startY: number,
    length: number,
    heightZ: number,
    horizontal: boolean,
  ): void {
    const endX = horizontal ? startX + length : startX;
    const endY = horizontal ? startY : startY + length;

    MapGenerator.createBridge(map, startX, startY, endX, endY, heightZ, horizontal);
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
    floors: number,
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
