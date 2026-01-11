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

    return map;
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
    floors: number
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
