# Шаг 21: Спавн/деспавн сущностей

## Цель
Реализовать динамический спавн и деспавн NPC вокруг игрока. После этого шага мир заполняется сущностями автоматически.

## Зависимости
- Шаг 20: AI трафика

## Задачи

### 21.1 SpawnManager

**src/gameplay/SpawnManager.ts:**
```typescript
export interface SpawnConfig {
  pedestrianDensity: number;    // 0-1
  vehicleDensity: number;       // 0-1
  spawnRadius: number;          // Радиус спавна вокруг игрока
  despawnRadius: number;        // Радиус деспавна
  maxPedestrians: number;
  maxVehicles: number;
}

export class SpawnManager {
  private config: SpawnConfig;
  private gameMap: GameMap;
  private world: IWorld;
  private physicsManager: PhysicsManager;

  private spawnedPedestrians: Set<number> = new Set();
  private spawnedVehicles: Set<number> = new Set();

  private spawnTimer: number = 0;
  private spawnInterval: number = 500; // мс

  constructor(world: IWorld, gameMap: GameMap, physicsManager: PhysicsManager, config: SpawnConfig) {
    this.world = world;
    this.gameMap = gameMap;
    this.physicsManager = physicsManager;
    this.config = config;
  }

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

  private despawnFarEntities(playerX: number, playerY: number): void {
    const despawnDistSq = this.config.despawnRadius ** 2;

    // Деспавн пешеходов
    for (const eid of this.spawnedPedestrians) {
      const dx = Position.x[eid] - playerX;
      const dy = Position.y[eid] - playerY;
      if (dx * dx + dy * dy > despawnDistSq) {
        removeEntity(this.world, eid);
        this.spawnedPedestrians.delete(eid);
      }
    }

    // Деспавн машин (не занятых игроком)
    for (const eid of this.spawnedVehicles) {
      if (VehicleSeats.driver[eid] !== 0) continue; // Не деспавнить если есть водитель

      const dx = Position.x[eid] - playerX;
      const dy = Position.y[eid] - playerY;
      if (dx * dx + dy * dy > despawnDistSq) {
        this.physicsManager.removeBody(eid);
        removeEntity(this.world, eid);
        this.spawnedVehicles.delete(eid);
      }
    }
  }

  private trySpawnEntities(playerX: number, playerY: number): void {
    // Спавн пешеходов
    if (this.spawnedPedestrians.size < this.config.maxPedestrians) {
      if (Math.random() < this.config.pedestrianDensity) {
        const pos = this.findSpawnPosition(playerX, playerY, BlockType.SIDEWALK);
        if (pos) {
          const eid = EntityFactory.createNPCPedestrian(this.world, pos.x, pos.y);
          this.spawnedPedestrians.add(eid);
        }
      }
    }

    // Спавн машин
    if (this.spawnedVehicles.size < this.config.maxVehicles) {
      if (Math.random() < this.config.vehicleDensity) {
        const pos = this.findSpawnPosition(playerX, playerY, BlockType.ROAD);
        if (pos) {
          const vehicleType = this.getRandomVehicleType();
          const eid = EntityFactory.createVehicle(
            this.world, pos.x, pos.y, vehicleType, this.physicsManager
          );
          this.spawnedVehicles.add(eid);

          // Добавляем AI трафика
          addComponent(this.world, TrafficAI, eid);
          TrafficAI.state[eid] = TrafficState.DRIVING;
          TrafficAI.desiredSpeed[eid] = 100 + Math.random() * 100;
        }
      }
    }
  }

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
      const block = this.gameMap.getBlock(
        Math.floor(x / BLOCK_SIZE),
        Math.floor(y / BLOCK_SIZE),
        0
      );

      if (block.getType() === requiredBlockType) {
        // Проверка, что нет других сущностей
        if (!this.hasEntityAt(x, y, 50)) {
          return { x, y };
        }
      }
    }

    return null;
  }

  private hasEntityAt(x: number, y: number, radius: number): boolean {
    // Проверка пешеходов
    for (const eid of this.spawnedPedestrians) {
      const dx = Position.x[eid] - x;
      const dy = Position.y[eid] - y;
      if (dx * dx + dy * dy < radius * radius) return true;
    }

    // Проверка машин
    for (const eid of this.spawnedVehicles) {
      const dx = Position.x[eid] - x;
      const dy = Position.y[eid] - y;
      if (dx * dx + dy * dy < radius * radius) return true;
    }

    return false;
  }

  private getRandomVehicleType(): VehicleType {
    const types = [
      VehicleType.CAR_SEDAN,
      VehicleType.CAR_TAXI,
      VehicleType.CAR_SPORT,
      VehicleType.TRUCK,
    ];
    return types[Math.floor(Math.random() * types.length)];
  }
}
```

### 21.2 Интеграция в Game.ts

```typescript
private spawnManager!: SpawnManager;

// В init():
this.spawnManager = new SpawnManager(world, this.currentMap, this.physicsManager, {
  pedestrianDensity: 0.3,
  vehicleDensity: 0.2,
  spawnRadius: 800,
  despawnRadius: 1200,
  maxPedestrians: 30,
  maxVehicles: 15,
});

// В update():
if (this.playerId >= 0) {
  this.spawnManager.update(Position.x[this.playerId], Position.y[this.playerId], dt);
}
```

## Результат
- Мир заполняется пешеходами и машинами
- Сущности спавнятся за пределами видимости
- Далёкие сущности удаляются
- Плотность настраивается

## Следующий шаг
Шаг 22: Районы (Districts)
