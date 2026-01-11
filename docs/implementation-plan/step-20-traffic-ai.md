# Шаг 20: AI трафика

## Цель
Реализовать AI для машин-трафика. После этого шага по дорогам ездят NPC-машины.

## Зависимости
- Шаг 19: AI пешеходов

## Задачи

### 20.1 Компонент AI трафика

**src/ecs/components/TrafficAI.ts:**
```typescript
export enum TrafficState {
  DRIVING = 0,
  STOPPED = 1,       // Светофор
  WAITING = 2,       // Препятствие впереди
  TURNING = 3,
  CRASHED = 4,
  FLEEING = 5,
}

export const TrafficAI = defineComponent({
  state: Types.ui8,

  // Маршрут
  currentWaypointIndex: Types.ui16,
  routeId: Types.ui16,

  // Параметры
  desiredSpeed: Types.f32,
  aggressiveness: Types.f32,  // 0-1
  patience: Types.f32,        // Таймер ожидания

  // Восприятие
  distanceToNext: Types.f32,
  hasObstacle: Types.ui8,
});
```

### 20.2 Система waypoints

**src/ai/TrafficWaypoints.ts:**
```typescript
export interface Waypoint {
  id: number;
  x: number;
  y: number;
  connections: number[];  // ID следующих waypoints
  speedLimit: number;
  isIntersection: boolean;
}

export interface TrafficRoute {
  waypoints: Waypoint[];
}

export class TrafficNetwork {
  private waypoints: Map<number, Waypoint> = new Map();

  public addWaypoint(waypoint: Waypoint): void {
    this.waypoints.set(waypoint.id, waypoint);
  }

  public getNextWaypoint(currentId: number): Waypoint | null {
    const current = this.waypoints.get(currentId);
    if (!current || current.connections.length === 0) return null;

    // Случайный выбор направления на перекрёстке
    const nextId = current.connections[Math.floor(Math.random() * current.connections.length)];
    return this.waypoints.get(nextId) || null;
  }

  public getNearestWaypoint(x: number, y: number): Waypoint | null {
    let nearest: Waypoint | null = null;
    let minDist = Infinity;

    for (const wp of this.waypoints.values()) {
      const dist = Math.hypot(wp.x - x, wp.y - y);
      if (dist < minDist) {
        minDist = dist;
        nearest = wp;
      }
    }

    return nearest;
  }
}
```

### 20.3 TrafficAISystem

**src/ecs/systems/TrafficAISystem.ts:**
```typescript
export const createTrafficAISystem = (trafficNetwork: TrafficNetwork) => {
  return defineSystem((world: IWorld, dt: number) => {
    const entities = trafficQuery(world);

    for (const eid of entities) {
      const state = TrafficAI.state[eid] as TrafficState;

      switch (state) {
        case TrafficState.DRIVING:
          handleDrivingState(world, eid, trafficNetwork, dt);
          break;
        case TrafficState.STOPPED:
          handleStoppedState(world, eid);
          break;
        case TrafficState.WAITING:
          handleWaitingState(world, eid);
          break;
      }

      // Проверка препятствий
      checkForObstacles(world, eid);
    }

    return world;
  });
};

function handleDrivingState(
  world: IWorld,
  eid: number,
  network: TrafficNetwork,
  dt: number
): void {
  const waypointIndex = TrafficAI.currentWaypointIndex[eid];
  const waypoint = network.getWaypointByIndex(waypointIndex);

  if (!waypoint) return;

  // Вычисление направления к waypoint
  const dx = waypoint.x - Position.x[eid];
  const dy = waypoint.y - Position.y[eid];
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 50) {
    // Достигли waypoint, переход к следующему
    const next = network.getNextWaypoint(waypoint.id);
    if (next) {
      TrafficAI.currentWaypointIndex[eid] = next.id;
    }
    return;
  }

  // Управление машиной
  const targetAngle = Math.atan2(dy, dx);
  const currentAngle = Rotation.angle[eid];
  const angleDiff = normalizeAngle(targetAngle - currentAngle);

  // Рулевое управление
  VehiclePhysics.steering[eid] = Math.sign(angleDiff) * Math.min(1, Math.abs(angleDiff) * 2);

  // Газ с учётом препятствий
  if (TrafficAI.hasObstacle[eid]) {
    VehiclePhysics.throttle[eid] = 0;
  } else {
    const speedFactor = Math.max(0.3, 1 - Math.abs(angleDiff));
    VehiclePhysics.throttle[eid] = speedFactor;
  }
}

function checkForObstacles(world: IWorld, eid: number): void {
  // Raycast вперёд для обнаружения препятствий
  const angle = Rotation.angle[eid];
  const speed = VehiclePhysics.speed[eid];
  const lookAhead = Math.max(100, speed * 0.5);

  const checkX = Position.x[eid] + Math.cos(angle) * lookAhead;
  const checkY = Position.y[eid] + Math.sin(angle) * lookAhead;

  // Проверка других машин
  const nearbyVehicles = findVehiclesNear(world, checkX, checkY, 80);
  const hasObstacle = nearbyVehicles.some(v => v !== eid);

  TrafficAI.hasObstacle[eid] = hasObstacle ? 1 : 0;

  if (hasObstacle) {
    TrafficAI.state[eid] = TrafficState.WAITING;
    TrafficAI.patience[eid] = 3 + Math.random() * 2;
  }
}
```

### 20.4 Генерация waypoints из карты

```typescript
export function generateTrafficNetwork(gameMap: GameMap): TrafficNetwork {
  const network = new TrafficNetwork();
  let waypointId = 0;

  // Поиск дорожных блоков и создание waypoints
  for (let y = 0; y < gameMap.heightInBlocks; y++) {
    for (let x = 0; x < gameMap.widthInBlocks; x++) {
      const block = gameMap.getBlock(x, y, 0);
      if (block.getType() === BlockType.ROAD) {
        // Создание waypoint в центре блока
        network.addWaypoint({
          id: waypointId++,
          x: x * BLOCK_SIZE + BLOCK_SIZE / 2,
          y: y * BLOCK_SIZE + BLOCK_SIZE / 2,
          connections: [], // Заполняются позже
          speedLimit: 150,
          isIntersection: false,
        });
      }
    }
  }

  // Связывание соседних waypoints
  // ...

  return network;
}
```

## Результат
- NPC-машины ездят по дорогам
- Следуют системе waypoints
- Тормозят при препятствиях
- Поворачивают на перекрёстках

## Следующий шаг
Шаг 21: Спавн/деспавн сущностей
