import { addComponent, removeEntity } from 'bitecs';
import type { GameWorld } from '../ecs/World.js';
import type { GameMap } from '../world/GameMap.js';
import type { PhysicsManager } from '../physics/PhysicsManager.js';
import { EntityFactory } from '../ecs/EntityFactory.js';
import { VehicleType } from '../data/VehicleDefinitions.js';
import { BlockType } from '../world/BlockTypes.js';
import { Position, VehicleOccupants, TrafficAI } from '../ecs/components/index.js';
import { type DistrictManager } from '../world/DistrictManager.js';

// Alias for Position for code clarity
const Pos = Position;
const VOcc = VehicleOccupants;
const TAI = TrafficAI;

/**
 * Конфигурация спавнера
 */
export interface SpawnConfig {
  pedestrianDensity: number;    // 0-1, вероятность спавна пешехода за тик
  vehicleDensity: number;       // 0-1, вероятность спавна машины за тик
  spawnRadius: number;          // Радиус спавна вокруг игрока (в пикселях)
  despawnRadius: number;        // Радиус деспавна (в пикселях)
  maxPedestrians: number;       // Максимум пешеходов
  maxVehicles: number;          // Максимум машин
}

/**
 * Интерфейс для вектора
 */
interface Vector2 {
  x: number;
  y: number;
}

/**
 * Менеджер спавна/деспавна сущностей
 * Отвечает за динамическое заполнение мира NPC вокруг игрока
 */
export class SpawnManager {
  private config: SpawnConfig;
  private gameMap: GameMap;
  private world: GameWorld;
  private physicsManager: PhysicsManager;
  private districtManager: DistrictManager | null = null;

  private spawnedPedestrians: Set<number> = new Set();
  private spawnedVehicles: Set<number> = new Set();

  private spawnTimer: number = 0;
  private spawnInterval: number = 500; // мс между попытками спавна

  constructor(world: GameWorld, gameMap: GameMap, physicsManager: PhysicsManager, config: SpawnConfig, districtManager?: DistrictManager) {
    this.world = world;
    this.gameMap = gameMap;
    this.physicsManager = physicsManager;
    this.config = config;
    this.districtManager = districtManager ?? null;
  }

  /**
   * Установить менеджер районов
   */
  public setDistrictManager(districtManager: DistrictManager): void {
    this.districtManager = districtManager;
  }

  /**
   * Обновление спавнера (вызывать каждый кадр)
   * @param playerX Позиция игрока X
   * @param playerY Позиция игрока Y
   * @param dt Delta time в миллисекундах
   */
  public update(playerX: number, playerY: number, dt: number): void {
    this.spawnTimer += dt;

    // Деспавн далёких сущностей
    this.despawnFarEntities(playerX, playerY);

    // Спавн новых сущностей
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.trySpawnEntities(playerX, playerY);
    }
  }

  /**
   * Деспавн сущностей, которые вышли за радиус
   */
  private despawnFarEntities(playerX: number, playerY: number): void {
    const despawnDistSq = this.config.despawnRadius ** 2;

    // Деспавн пешеходов
    const pedsToRemove: number[] = [];
    for (const eid of this.spawnedPedestrians) {
      if (Pos.x[eid] === undefined) {
        // Сущность была удалена другим способом
        pedsToRemove.push(eid);
        continue;
      }

      const dx = Pos.x[eid] - playerX;
      const dy = Pos.y[eid] - playerY;
      if (dx * dx + dy * dy > despawnDistSq) {
        removeEntity(this.world, eid);
        pedsToRemove.push(eid);
      }
    }
    for (const eid of pedsToRemove) {
      this.spawnedPedestrians.delete(eid);
    }

    // Деспавн машин (не занятых игроком)
    const vehiclesToRemove: number[] = [];
    for (const eid of this.spawnedVehicles) {
      if (Pos.x[eid] === undefined) {
        // Сущность была удалена другим способом
        vehiclesToRemove.push(eid);
        continue;
      }

      // Не деспавнить если есть водитель
      if (VOcc.driver[eid] !== 0) continue;

      const dx = Pos.x[eid] - playerX;
      const dy = Pos.y[eid] - playerY;
      if (dx * dx + dy * dy > despawnDistSq) {
        // Удаляем физическое тело
        this.physicsManager.removeBody(eid);
        removeEntity(this.world, eid);
        vehiclesToRemove.push(eid);
      }
    }
    for (const eid of vehiclesToRemove) {
      this.spawnedVehicles.delete(eid);
    }
  }

  /**
   * Попытка спавна новых сущностей
   */
  private trySpawnEntities(playerX: number, playerY: number): void {
    // Получаем параметры района
    const district = this.districtManager?.getDistrictAt(playerX, playerY);
    const pedDensity = district?.getConfig().pedestrianDensity ?? this.config.pedestrianDensity;
    const vehDensity = district?.getConfig().vehicleDensity ?? this.config.vehicleDensity;
    const vehicleTypes = district?.getConfig().vehicleTypes ?? null;
    const pedestrianTypes = district?.getConfig().pedestrianTypes ?? null;

    // Спавн пешеходов
    if (this.spawnedPedestrians.size < this.config.maxPedestrians) {
      if (Math.random() < pedDensity) {
        const pos = this.findSpawnPosition(playerX, playerY, BlockType.SIDEWALK);
        if (pos) {
          // Выбираем тип пешехода из списка района или случайно
          const pedType = pedestrianTypes && pedestrianTypes.length > 0
            ? pedestrianTypes[Math.floor(Math.random() * pedestrianTypes.length)]
            : Math.floor(Math.random() * 3);
          const eid = EntityFactory.createPedestrian(this.world, pos.x, pos.y, pedType);
          this.spawnedPedestrians.add(eid);
        }
      }
    }

    // Спавн машин
    if (this.spawnedVehicles.size < this.config.maxVehicles) {
      if (Math.random() < vehDensity) {
        const pos = this.findSpawnPosition(playerX, playerY, BlockType.ROAD);
        if (pos) {
          const vehicleType = vehicleTypes && vehicleTypes.length > 0
            ? vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)]
            : this.getRandomVehicleType();
          const eid = EntityFactory.createVehicle(
            this.world,
            pos.x,
            pos.y,
            vehicleType,
            this.physicsManager
          );
          this.spawnedVehicles.add(eid);

          // Добавляем AI трафика
          addComponent(this.world, eid, TrafficAI);
          TAI.state[eid] = 0; // DRIVING
          TAI.previousState[eid] = 0;
          TAI.desiredSpeed[eid] = 100 + Math.random() * 100;
          TAI.aggressiveness[eid] = Math.random();
          TAI.patience[eid] = 0.5 + Math.random() * 0.5;
          TAI.distanceToNext[eid] = 999;
          TAI.hasObstacle[eid] = 0;
          TAI.stateTimer[eid] = 0;
          TAI.waitTimer[eid] = 0;
          TAI.currentWaypointId[eid] = 0;
          TAI.routeId[eid] = 0;
        }
      }
    }
  }

  /**
   * Поиск подходящей позиции для спавна
   * @param playerX Позиция игрока X
   * @param playerY Позиция игрока Y
   * @param requiredBlockType Требуемый тип блока
   * @returns Позиция для спавна или null
   */
  private findSpawnPosition(
    playerX: number,
    playerY: number,
    requiredBlockType: BlockType
  ): Vector2 | null {
    const minDist = this.config.spawnRadius * 0.6;
    const maxDist = this.config.spawnRadius;

    // Попытки найти позицию
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (maxDist - minDist);

      const x = playerX + Math.cos(angle) * dist;
      const y = playerY + Math.sin(angle) * dist;

      // Проверка блока
      const blockPos = this.gameMap.worldToBlock(x, y);
      const block = this.gameMap.getBlock(
        blockPos.x,
        blockPos.y,
        0
      );

      if (block.getType() === requiredBlockType) {
        // Проверка, что нет других сущностей рядом
        if (!this.hasEntityAt(x, y, 50)) {
          return { x, y };
        }
      }
    }

    return null;
  }

  /**
   * Проверка наличия сущности в радиусе от точки
   */
  private hasEntityAt(x: number, y: number, radius: number): boolean {
    const radiusSq = radius * radius;

    // Проверка пешеходов
    for (const eid of this.spawnedPedestrians) {
      if (Pos.x[eid] === undefined) continue;
      const dx = Pos.x[eid] - x;
      const dy = Pos.y[eid] - y;
      if (dx * dx + dy * dy < radiusSq) return true;
    }

    // Проверка машин
    for (const eid of this.spawnedVehicles) {
      if (Pos.x[eid] === undefined) continue;
      const dx = Pos.x[eid] - x;
      const dy = Pos.y[eid] - y;
      if (dx * dx + dy * dy < radiusSq) return true;
    }

    return false;
  }

  /**
   * Получить случайный тип машины (для трафика)
   */
  private getRandomVehicleType(): VehicleType {
    const types: VehicleType[] = [
      VehicleType.CAR_SEDAN,
      VehicleType.CAR_TAXI,
      VehicleType.CAR_SPORT,
      VehicleType.TRUCK,
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Получить текущую статистику
   */
  public getStats(): { pedestrians: number; vehicles: number } {
    return {
      pedestrians: this.spawnedPedestrians.size,
      vehicles: this.spawnedVehicles.size,
    };
  }

  /**
   * Очистить всех заспавненных сущностей
   */
  public clearAll(): void {
    // Удалить всех пешеходов
    for (const eid of this.spawnedPedestrians) {
      if (Pos.x[eid] !== undefined) {
        removeEntity(this.world, eid);
      }
    }
    this.spawnedPedestrians.clear();

    // Удалить все машины
    for (const eid of this.spawnedVehicles) {
      if (Pos.x[eid] !== undefined) {
        this.physicsManager.removeBody(eid);
        removeEntity(this.world, eid);
      }
    }
    this.spawnedVehicles.clear();
  }

  /**
   * Обновить конфигурацию
   */
  public updateConfig(config: Partial<SpawnConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Получить текущую конфигурацию
   */
  public getConfig(): SpawnConfig {
    return { ...this.config };
  }
}
