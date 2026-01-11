import { query } from 'bitecs';
import type { GameWorld } from '../ecs/World.js';
import type { GameMap } from '../world/GameMap.js';
import { Pathfinder } from './Pathfinding.js';
import { Position, Velocity, Rotation, PlayerControlled, PedestrianAI } from '../ecs/components/index.js';
import { PedestrianState } from '../ecs/components/Transform.js';

/**
 * Query для всех пешеходов с AI
 */
const pedestrianQuery = (world: GameWorld) =>
  query(world, [PedestrianAI, Position, Velocity, Rotation]);

/**
 * Создать систему AI пешеходов
 */
export const createPedestrianAISystem = (gameMap: GameMap) => {
  const pathfinder = new Pathfinder(gameMap, 32);

  return (world: GameWorld, dt: number) => {
    const deltaSeconds = dt / 1000;
    const entities = pedestrianQuery(world);

    for (const eid of entities) {
      // Пропускаем игрока (проверяем наличие тега PlayerControlled)
      if (eid in PlayerControlled) continue;

      // Обновление таймеров
      PedestrianAI.stateTimer[eid] -= deltaSeconds;
      PedestrianAI.thinkTimer[eid] -= deltaSeconds;
      PedestrianAI.pathCooldown[eid] -= deltaSeconds;

      // Обработка состояния
      const state = PedestrianAI.state[eid] as PedestrianState;

      switch (state) {
        case PedestrianState.IDLE:
          handleIdleState(world, eid, pathfinder);
          break;
        case PedestrianState.WALKING:
          handleWalkingState(world, eid);
          break;
        case PedestrianState.RUNNING:
          handleRunningState(world, eid);
          break;
        case PedestrianState.FLEEING:
          handleFleeingState(world, eid);
          break;
        case PedestrianState.DEAD:
          // Мертвые пешеходы не двигаются
          Velocity.x[eid] = 0;
          Velocity.y[eid] = 0;
          break;
        case PedestrianState.ENTERING_VEHICLE:
          // TODO: Реализовать состояние входа в машину
          break;
      }

      // Проверка опасности (если не мертв)
      if (state !== PedestrianState.DEAD) {
        checkForDanger(eid);
      }
    }

    return world;
  };
};

/**
 * Обработка состояния IDLE
 */
function handleIdleState(
  _world: GameWorld,
  eid: number,
  pathfinder: Pathfinder
): void {
  const x = Position.x[eid];
  const y = Position.y[eid];

  // Когда таймер истекает, выбираем новую цель
  if (PedestrianAI.stateTimer[eid] <= 0) {
    // Ищем случайную позицию на тротуаре рядом
    const newTarget = pathfinder.findNearestWalkablePosition(x, y, 500, 0);

    if (newTarget) {
      PedestrianAI.targetX[eid] = newTarget.x;
      PedestrianAI.targetY[eid] = newTarget.y;
      PedestrianAI.hasTarget[eid] = 1;
      changeState(eid, PedestrianState.WALKING);
    } else {
      // Если не нашли цель, ждем еще
      PedestrianAI.stateTimer[eid] = 2 + Math.random() * 3;
    }
  }

  // Останавливаем движение
  Velocity.x[eid] = 0;
  Velocity.y[eid] = 0;
}

/**
 * Обработка состояния WALKING
 */
function handleWalkingState(_world: GameWorld, eid: number): void {
  if (!PedestrianAI.hasTarget[eid]) {
    changeState(eid, PedestrianState.IDLE);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    return;
  }

  // Движение к цели
  const dx = PedestrianAI.targetX[eid] - Position.x[eid];
  const dy = PedestrianAI.targetY[eid] - Position.y[eid];
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Достигли цели?
  if (dist < 10) {
    PedestrianAI.hasTarget[eid] = 0;
    changeState(eid, PedestrianState.IDLE);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    return;
  }

  // Нормализация и применение скорости
  const speed = PedestrianAI.walkSpeed[eid];
  Velocity.x[eid] = (dx / dist) * speed;
  Velocity.y[eid] = (dy / dist) * speed;
  Rotation.angle[eid] = Math.atan2(dy, dx);
}

/**
 * Обработка состояния RUNNING
 */
function handleRunningState(_world: GameWorld, eid: number): void {
  if (!PedestrianAI.hasTarget[eid]) {
    changeState(eid, PedestrianState.IDLE);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    return;
  }

  // Движение к цели с беговой скоростью
  const dx = PedestrianAI.targetX[eid] - Position.x[eid];
  const dy = PedestrianAI.targetY[eid] - Position.y[eid];
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 10) {
    PedestrianAI.hasTarget[eid] = 0;
    changeState(eid, PedestrianState.IDLE);
    Velocity.x[eid] = 0;
    Velocity.y[eid] = 0;
    return;
  }

  const speed = PedestrianAI.runSpeed[eid];
  Velocity.x[eid] = (dx / dist) * speed;
  Velocity.y[eid] = (dy / dist) * speed;
  Rotation.angle[eid] = Math.atan2(dy, dx);
}

/**
 * Обработка состояния FLEEING (бегство от опасности)
 */
function handleFleeingState(_world: GameWorld, eid: number): void {
  if (!PedestrianAI.hasTarget[eid]) {
    // Если нет цели, переходим в состояние бега в случайном направлении
    const angle = Math.random() * Math.PI * 2;
    const dist = 300;
    PedestrianAI.targetX[eid] = Position.x[eid] + Math.cos(angle) * dist;
    PedestrianAI.targetY[eid] = Position.y[eid] + Math.sin(angle) * dist;
    PedestrianAI.hasTarget[eid] = 1;
  }

  // Бежим к цели
  const dx = PedestrianAI.targetX[eid] - Position.x[eid];
  const dy = PedestrianAI.targetY[eid] - Position.y[eid];
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 10) {
    // Достигли точки убежища
    PedestrianAI.hasTarget[eid] = 0;

    // Если страх снизился, возвращаемся в обычное состояние
    if (PedestrianAI.fearLevel[eid] < 30) {
      changeState(eid, PedestrianState.IDLE);
    }
    return;
  }

  const speed = PedestrianAI.runSpeed[eid];
  Velocity.x[eid] = (dx / dist) * speed;
  Velocity.y[eid] = (dy / dist) * speed;
  Rotation.angle[eid] = Math.atan2(dy, dx);
}

/**
 * Проверка на опасность рядом
 */
function checkForDanger(eid: number): void {
  // TODO: Интегрировать с системой событий для поиска опасностей
  // Сейчас просто уменьшаем страх со временем
  PedestrianAI.fearLevel[eid] = Math.max(0, PedestrianAI.fearLevel[eid] - 0.5);

  // Если страх высок, переходим в состояние побега
  if (PedestrianAI.fearLevel[eid] > 50) {
    const currentState = PedestrianAI.state[eid] as PedestrianState;

    if (currentState !== PedestrianState.FLEEING && currentState !== PedestrianState.DEAD) {
      // Выбираем направление для побега (просто от текущей позиции)
      const angle = Math.random() * Math.PI * 2;
      const fleeDist = 400;
      const x = Position.x[eid];
      const y = Position.y[eid];

      PedestrianAI.targetX[eid] = x + Math.cos(angle) * fleeDist;
      PedestrianAI.targetY[eid] = y + Math.sin(angle) * fleeDist;
      PedestrianAI.hasTarget[eid] = 1;

      changeState(eid, PedestrianState.FLEEING);
    }
  }
}

/**
 * Сменить состояние AI
 */
function changeState(eid: number, newState: PedestrianState): void {
  const oldState = PedestrianAI.state[eid] as PedestrianState;

  PedestrianAI.previousState[eid] = oldState;
  PedestrianAI.state[eid] = newState;

  // Устанавливаем таймер состояния
  switch (newState) {
    case PedestrianState.IDLE:
      PedestrianAI.stateTimer[eid] = 2 + Math.random() * 3;
      break;
    case PedestrianState.WALKING:
      PedestrianAI.stateTimer[eid] = 10 + Math.random() * 10;
      break;
    case PedestrianState.RUNNING:
      PedestrianAI.stateTimer[eid] = 5 + Math.random() * 5;
      break;
    case PedestrianState.FLEEING:
      PedestrianAI.stateTimer[eid] = 3 + Math.random() * 3;
      break;
    case PedestrianState.ENTERING_VEHICLE:
      PedestrianAI.stateTimer[eid] = 2;
      break;
    case PedestrianState.DEAD:
      PedestrianAI.stateTimer[eid] = -1; // Бесконечно
      break;
  }
}

/**
 * Установить уровень страха пешехода
 * Для вызова из внешних систем (например, при взрыве)
 */
export function setPedestrianFear(_world: GameWorld, eid: number, fear: number): void {
  PedestrianAI.fearLevel[eid] = Math.min(100, Math.max(0, fear));
}

/**
 * Заставить пешехода бежать в заданном направлении
 */
export function makePedestrianFlee(
  _world: GameWorld,
  eid: number,
  fromX: number,
  fromY: number
): void {
  const x = Position.x[eid];
  const y = Position.y[eid];

  // Вектор от источника опасности
  const dx = x - fromX;
  const dy = y - fromY;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len > 0) {
    const fleeDist = 500;
    PedestrianAI.targetX[eid] = x + (dx / len) * fleeDist;
    PedestrianAI.targetY[eid] = y + (dy / len) * fleeDist;
    PedestrianAI.hasTarget[eid] = 1;
    PedestrianAI.fearLevel[eid] = 100;

    changeState(eid, PedestrianState.FLEEING);
  }
}

/**
 * Получить Pathfinder из системы (для внешнего использования)
 */
export function getPathfinderFromSystem(_system: ReturnType<typeof createPedestrianAISystem>): Pathfinder | null {
  // Pathfinder инкапсулирован в замыкании, поэтому напрямую недоступен
  // Для использования Pathfinder лучше создать отдельный экземпляр
  return null;
}
