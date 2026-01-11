# Шаг 19: AI пешеходов

## Цель
Реализовать базовый AI для NPC-пешеходов с использованием конечного автомата (FSM). После этого шага пешеходы ходят по улицам и реагируют на опасность.

## Зависимости
- Шаг 18: Аудио система

## Задачи

### 19.1 Компонент AI пешехода

**src/ecs/components/PedestrianAI.ts:**
```typescript
export enum PedestrianState {
  IDLE = 0,
  WALKING = 1,
  RUNNING = 2,
  FLEEING = 3,
  ENTERING_VEHICLE = 4,
  DEAD = 5,
}

export const PedestrianAI = defineComponent({
  state: Types.ui8,
  previousState: Types.ui8,

  // Цель
  targetX: Types.f32,
  targetY: Types.f32,
  hasTarget: Types.ui8,

  // Параметры
  walkSpeed: Types.f32,
  runSpeed: Types.f32,
  fearLevel: Types.f32,      // 0-100
  sightRange: Types.f32,

  // Таймеры
  stateTimer: Types.f32,
  thinkTimer: Types.f32,
});
```

### 19.2 PedestrianAISystem

**src/ecs/systems/PedestrianAISystem.ts:**
```typescript
export const createPedestrianAISystem = (gameMap: GameMap) => {
  return defineSystem((world: IWorld, dt: number) => {
    const entities = pedestrianQuery(world);
    const deltaSeconds = dt / 1000;

    for (const eid of entities) {
      // Пропускаем игрока
      if (hasComponent(world, PlayerControlled, eid)) continue;

      // Обновление таймеров
      PedestrianAI.stateTimer[eid] -= deltaSeconds;
      PedestrianAI.thinkTimer[eid] -= deltaSeconds;

      // Обработка состояния
      const state = PedestrianAI.state[eid] as PedestrianState;

      switch (state) {
        case PedestrianState.IDLE:
          handleIdleState(world, eid, gameMap);
          break;
        case PedestrianState.WALKING:
          handleWalkingState(world, eid, deltaSeconds);
          break;
        case PedestrianState.FLEEING:
          handleFleeingState(world, eid, deltaSeconds);
          break;
        // ... другие состояния
      }

      // Проверка опасности
      checkForDanger(world, eid);
    }

    return world;
  });
};

function handleIdleState(world: IWorld, eid: number, gameMap: GameMap): void {
  if (PedestrianAI.stateTimer[eid] <= 0) {
    // Выбрать новую цель на тротуаре
    const newTarget = findRandomSidewalkPosition(gameMap, Position.x[eid], Position.y[eid], 500);
    if (newTarget) {
      PedestrianAI.targetX[eid] = newTarget.x;
      PedestrianAI.targetY[eid] = newTarget.y;
      PedestrianAI.hasTarget[eid] = 1;
      changeState(world, eid, PedestrianState.WALKING);
    } else {
      PedestrianAI.stateTimer[eid] = 2 + Math.random() * 3;
    }
  }
}

function handleWalkingState(world: IWorld, eid: number, dt: number): void {
  if (!PedestrianAI.hasTarget[eid]) {
    changeState(world, eid, PedestrianState.IDLE);
    return;
  }

  // Движение к цели
  const dx = PedestrianAI.targetX[eid] - Position.x[eid];
  const dy = PedestrianAI.targetY[eid] - Position.y[eid];
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 10) {
    // Достигли цели
    PedestrianAI.hasTarget[eid] = 0;
    changeState(world, eid, PedestrianState.IDLE);
    return;
  }

  // Нормализация и применение скорости
  const speed = PedestrianAI.walkSpeed[eid];
  Velocity.x[eid] = (dx / dist) * speed;
  Velocity.y[eid] = (dy / dist) * speed;
  Rotation.angle[eid] = Math.atan2(dy, dx);
}

function checkForDanger(world: IWorld, eid: number): void {
  // Проверка опасности в радиусе
  const dangerRadius = 200;
  const dangers = findDangersNear(world, Position.x[eid], Position.y[eid], dangerRadius);

  if (dangers.length > 0) {
    PedestrianAI.fearLevel[eid] += 30;

    if (PedestrianAI.fearLevel[eid] > 50) {
      // Бегство
      const danger = dangers[0];
      const fleeAngle = Math.atan2(Position.y[eid] - danger.y, Position.x[eid] - danger.x);

      PedestrianAI.targetX[eid] = Position.x[eid] + Math.cos(fleeAngle) * 500;
      PedestrianAI.targetY[eid] = Position.y[eid] + Math.sin(fleeAngle) * 500;
      PedestrianAI.hasTarget[eid] = 1;

      changeState(world, eid, PedestrianState.FLEEING);
    }
  } else {
    // Успокоение
    PedestrianAI.fearLevel[eid] = Math.max(0, PedestrianAI.fearLevel[eid] - 0.1);
  }
}
```

### 19.3 Pathfinding (A*)

**src/ai/Pathfinding.ts:**
```typescript
export class Pathfinder {
  private gameMap: GameMap;
  private gridScale: number = 32; // Размер ячейки навигационной сетки

  public findPath(
    startX: number, startY: number,
    endX: number, endY: number,
    z: number = 0
  ): Vector2[] | null {
    // A* алгоритм
    const openSet = new PriorityQueue<Node>();
    const closedSet = new Set<string>();

    // ... реализация A* ...

    return path;
  }
}
```

### 19.4 Фабрика пешеходов

```typescript
public static createNPCPedestrian(
  world: IWorld,
  x: number,
  y: number,
  type: number = 0
): number {
  const eid = this.createPedestrian(world, x, y, type);

  addComponent(world, PedestrianAI, eid);
  PedestrianAI.state[eid] = PedestrianState.IDLE;
  PedestrianAI.walkSpeed[eid] = 80 + Math.random() * 40;
  PedestrianAI.runSpeed[eid] = 180 + Math.random() * 60;
  PedestrianAI.fearLevel[eid] = 0;
  PedestrianAI.sightRange[eid] = 300;
  PedestrianAI.stateTimer[eid] = Math.random() * 3;

  return eid;
}
```

## Состояния пешехода (FSM)

```
     ┌───────────┐
     │   IDLE    │◄─────────────┐
     └─────┬─────┘              │
           │ timer expired      │ arrived
           ▼                    │
     ┌───────────┐              │
     │  WALKING  ├──────────────┘
     └─────┬─────┘
           │ danger detected
           ▼
     ┌───────────┐
     │  FLEEING  │
     └─────┬─────┘
           │ safe / hit
           ▼
     ┌───────────┐
     │   DEAD    │
     └───────────┘
```

## Результат
- NPC-пешеходы ходят по тротуарам
- При опасности (взрывы, выстрелы) убегают
- Разные скорости ходьбы/бега
- FSM управляет поведением

## Следующий шаг
Шаг 20: AI трафика
