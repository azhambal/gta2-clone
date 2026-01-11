import type { GameMap } from '../world/GameMap.js';
import { BlockType } from '../world/BlockTypes.js';

/**
 * Узел навигационной сетки
 */
interface PathNode {
  x: number;
  y: number;
  z: number;
  g: number; // Стоимость от старта
  h: number; // Эвристика до цели
  f: number; // g + h
  parent: PathNode | null;
}

/**
 * 2D вектор
 */
export interface Vector2 {
  x: number;
  y: number;
}

/**
 * Приоритетная очередь для A*
 */
class PriorityQueue {
  private items: PathNode[] = [];

  public enqueue(node: PathNode): void {
    this.items.push(node);
    this.items.sort((a, b) => a.f - b.f);
  }

  public dequeue(): PathNode | null {
    return this.items.shift() ?? null;
  }

  public isEmpty(): boolean {
    return this.items.length === 0;
  }

  public contains(node: PathNode): boolean {
    return this.items.some(n => n.x === node.x && n.y === node.y && n.z === node.z);
  }
}

/**
 * Класс для поиска пути A* на блочной сетке
 */
export class Pathfinder {
  private gameMap: GameMap;
  private gridScale: number = 32; // Размер ячейки навигационной сетки в пикселях
  private cache: Map<string, Vector2[]> = new Map();
  private maxCacheSize: number = 100;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  constructor(gameMap: GameMap, gridScale: number = 32) {
    this.gameMap = gameMap;
    this.gridScale = gridScale;
  }

  /**
   * Найти путь от точки до точки
   * @param startX Начальная позиция X (в пикселях)
   * @param startY Начальная позиция Y (в пикселях)
   * @param endX Конечная позиция X (в пикселях)
   * @param endY Конечная позиция Y (в пикселях)
   * @param z Z-уровень для навигации (по умолчанию 0)
   * @returns Массив точек пути или null если путь не найден
   */
  public findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    z: number = 0
  ): Vector2[] | null {
    // Проверяем кеш
    const cacheKey = this.getCacheKey(startX, startY, endX, endY, z);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.cacheHits++;
      return cached;
    }
    this.cacheMisses++;

    // Конвертируем мировые координаты в координаты сетки
    const startGrid = this.worldToGrid(startX, startY);
    const endGrid = this.worldToGrid(endX, endY);

    // A* алгоритм
    const path = this.findPathAStar(startGrid.x, startGrid.y, endGrid.x, endGrid.y, z);

    if (path) {
      // Конвертируем путь обратно в мировые координаты
      const worldPath = path.map(p => this.gridToWorld(p.x, p.y));

      // Кэшируем результат
      this.cacheResult(cacheKey, worldPath);

      return worldPath;
    }

    return null;
  }

  /**
   * Найти случайную доступную позицию поблизости
   * @param x Центр поиска X (в пикселях)
   * @param y Центр поиска Y (в пикселях)
   * @param radius Радиус поиска (в пикселях)
   * @param z Z-уровень
   * @returns Случайная позиция или null
   */
  public findRandomWalkablePosition(
    x: number,
    y: number,
    radius: number,
    z: number = 0
  ): Vector2 | null {
    const attempts = 20;

    for (let i = 0; i < attempts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;

      const targetX = x + Math.cos(angle) * dist;
      const targetY = y + Math.sin(angle) * dist;

      const gridPos = this.worldToGrid(targetX, targetY);

      if (this.isWalkable(gridPos.x, gridPos.y, z)) {
        return { x: targetX, y: targetY };
      }
    }

    return null;
  }

  /**
   * Найти ближайшую проходимую позицию (тротуар, дорога)
   * @param x X позиция (в пикселях)
   * @param y Y позиция (в пикселях)
   * @param searchRadius Радиус поиска (в пикселях)
   * @param z Z-уровень
   * @returns Позиция или null
   */
  public findNearestWalkablePosition(
    x: number,
    y: number,
    searchRadius: number,
    z: number = 0
  ): Vector2 | null {
    const centerGrid = this.worldToGrid(x, y);
    const maxRadius = Math.ceil(searchRadius / this.gridScale);

    // Спиральный поиск от центра
    for (let r = 0; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) === r || Math.abs(dy) === r) {
            const checkX = centerGrid.x + dx;
            const checkY = centerGrid.y + dy;

            if (this.isWalkable(checkX, checkY, z)) {
              const worldPos = this.gridToWorld(checkX, checkY);
              return worldPos;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Проверить, является ли позиция проходимой
   */
  public isWalkable(gridX: number, gridY: number, z: number): boolean {
    const block = this.gameMap.getBlock(gridX, gridY, z);
    const type = block.getType();

    // Проходимые блоки: воздух, дороги, тротуары
    return (
      type === BlockType.AIR ||
      type === BlockType.ROAD ||
      type === BlockType.ROAD_LINE_H ||
      type === BlockType.ROAD_LINE_V ||
      type === BlockType.CROSSWALK ||
      type === BlockType.SIDEWALK ||
      type === BlockType.GRASS ||
      type === BlockType.DIRT ||
      type === BlockType.SAND
    );
  }

  /**
   * A* алгоритм на сетке
   */
  private findPathAStar(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    z: number
  ): Vector2[] | null {
    const openSet = new PriorityQueue();
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      x: startX,
      y: startY,
      z,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;

    openSet.enqueue(startNode);

    const maxIterations = 2000;
    let iterations = 0;

    while (!openSet.isEmpty() && iterations < maxIterations) {
      iterations++;

      const current = openSet.dequeue();
      if (!current) break;

      const currentKey = `${current.x},${current.y},${current.z}`;

      // Достигли цели?
      if (current.x === endX && current.y === endY) {
        return this.reconstructPath(current);
      }

      closedSet.add(currentKey);

      // Соседние клетки (8 направлений)
      const neighbors = this.getNeighbors(current, z);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y},${neighbor.z}`;

        if (closedSet.has(neighborKey)) {
          continue;
        }

        const tentativeG = current.g + this.getDistance(current, neighbor);

        let existingNode: PathNode | null = null;
        if (openSet.contains(neighbor)) {
          // Находим существующий узел
          existingNode = this.findNodeInQueue(openSet, neighbor);
        }

        if (!existingNode) {
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor.x, neighbor.y, endX, endY);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;
          openSet.enqueue(neighbor);
        } else if (tentativeG < existingNode.g) {
          existingNode.g = tentativeG;
          existingNode.f = existingNode.g + existingNode.h;
          existingNode.parent = current;
          // Пересортировка очереди
          openSet.enqueue(existingNode);
        }
      }
    }

    return null; // Путь не найден
  }

  /**
   * Получить соседние клетки
   */
  private getNeighbors(node: PathNode, z: number): PathNode[] {
    const neighbors: PathNode[] = [];
    const directions = [
      [-1, 0], [1, 0], [0, -1], [0, 1], // Кардинальные
      [-1, -1], [-1, 1], [1, -1], [1, 1], // Диагональные
    ];

    for (const [dx, dy] of directions) {
      const nx = node.x + dx;
      const ny = node.y + dy;

      if (this.isWalkable(nx, ny, z)) {
        neighbors.push({
          x: nx,
          y: ny,
          z,
          g: 0,
          h: 0,
          f: 0,
          parent: null,
        });
      }
    }

    return neighbors;
  }

  /**
   * Манхэттенская эвристика
   */
  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  /**
   * Расстояние между соседними клетками
   */
  private getDistance(a: PathNode, b: PathNode): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return dx + dy === 2 ? 1.414 : 1; // Диагональ = sqrt(2), кардинальная = 1
  }

  /**
   * Восстановить путь из конечного узла
   */
  private reconstructPath(endNode: PathNode): Vector2[] {
    const path: Vector2[] = [];
    let current: PathNode | null = endNode;

    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }

    return path;
  }

  /**
   * Найти узел в очереди
   */
  private findNodeInQueue(queue: PriorityQueue, node: PathNode): PathNode | null {
    return (queue as any).items.find(
      (n: PathNode) => n.x === node.x && n.y === node.y && n.z === node.z
    ) ?? null;
  }

  /**
   * Конвертация мировых координат в координаты сетки
   */
  private worldToGrid(worldX: number, worldY: number): Vector2 {
    return {
      x: Math.floor(worldX / this.gridScale),
      y: Math.floor(worldY / this.gridScale),
    };
  }

  /**
   * Конвертация координат сетки в мировые
   */
  private gridToWorld(gridX: number, gridY: number): Vector2 {
    return {
      x: gridX * this.gridScale + this.gridScale / 2,
      y: gridY * this.gridScale + this.gridScale / 2,
    };
  }

  /**
   * Получить ключ для кеша
   */
  private getCacheKey(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    z: number
  ): string {
    const startGrid = this.worldToGrid(startX, startY);
    const endGrid = this.worldToGrid(endX, endY);
    return `${startGrid.x},${startGrid.y},${endGrid.x},${endGrid.y},${z}`;
  }

  /**
   * Кэшировать результат
   */
  private cacheResult(key: string, path: Vector2[]): void {
    // Лимит размера кеша
    if (this.cache.size >= this.maxCacheSize) {
      // Удаляем самые старые записи (первые)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, path);
  }

  /**
   * Очистить кеш
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Получить статистику кеша
   */
  public getCacheStats(): { hits: number; misses: number; size: number } {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: this.cache.size,
    };
  }
}

/**
 * Найти опасности рядом с позицией (для побега пешеходов)
 * @param _world ECS мир (резервирован для будущего использования)
 * @param _x X позиция (резервирован для будущего использования)
 * @param _y Y позиция (резервирован для будущего использования)
 * @param _radius Радиус поиска (резервирован для будущего использования)
 * @returns Массив опасностей {x, y, type}
 */
export function findDangersNear(
  _world: any,
  _x: number,
  _y: number,
  _radius: number
): Array<{ x: number; y: number; type: string }> | [] {
  // TODO: Реализовать поиск опасностей (взрывы, стрельба, машины)
  // Это будет интегрировано с системой событий
  return [];
}
