import { query } from 'bitecs';
import type { GameWorld } from '../World.js';
import { TrafficNetwork } from '../../ai/TrafficWaypoints.js';
import {
  Position,
  Velocity,
  Rotation,
  Vehicle,
  VehiclePhysics,
  PlayerControlled,
  TrafficAI,
} from '../components/index.js';
import { TrafficState } from '../components/Transform.js';

/**
 * Query для всех машин с AI трафика
 */
const trafficQuery = (world: GameWorld) =>
  query(world, [TrafficAI, Vehicle, VehiclePhysics, Position, Velocity, Rotation]);

/**
 * Query для всех машин (для проверки препятствий)
 */
const allVehiclesQuery = (world: GameWorld) =>
  query(world, [Vehicle, Position, Rotation, VehiclePhysics]);

/**
 * Создать систему AI трафика
 */
export const createTrafficAISystem = (trafficNetwork: TrafficNetwork) => {
  return (world: GameWorld, dt: number) => {
    const deltaSeconds = dt / 1000;
    const entities = trafficQuery(world);

    for (const eid of entities) {
      // Пропускаем управляемых игроком машин
      if (eid in PlayerControlled) continue;

      // Обновление таймеров
      TrafficAI.stateTimer[eid] -= deltaSeconds;
      TrafficAI.waitTimer[eid] -= deltaSeconds;

      // Обработка состояния
      const state = TrafficAI.state[eid] as TrafficState;

      switch (state) {
        case TrafficState.DRIVING:
          handleDrivingState(world, eid, trafficNetwork, deltaSeconds);
          break;
        case TrafficState.STOPPED:
          handleStoppedState(world, eid, trafficNetwork, deltaSeconds);
          break;
        case TrafficState.WAITING:
          handleWaitingState(world, eid, trafficNetwork, deltaSeconds);
          break;
        case TrafficState.TURNING:
          handleTurningState(world, eid, trafficNetwork, deltaSeconds);
          break;
        case TrafficState.CRASHED:
          handleCrashedState(world, eid);
          break;
        case TrafficState.FLEEING:
          handleFleeingState(world, eid, trafficNetwork, deltaSeconds);
          break;
      }

      // Проверка препятствий
      checkForObstacles(world, eid);
    }

    return world;
  };
};

/**
 * Обработка состояния DRIVING
 */
function handleDrivingState(
  _world: GameWorld,
  eid: number,
  network: TrafficNetwork,
  dt: number
): void {
  const waypointId = TrafficAI.currentWaypointId[eid];
  const waypoint = network.getWaypoint(waypointId);

  if (!waypoint) {
    // Нет waypoints - ищем ближайший
    const nearest = network.getNearestWaypoint(Position.x[eid], Position.y[eid], Position.z[eid]);
    if (nearest) {
      TrafficAI.currentWaypointId[eid] = nearest.id;
    } else {
      // Нет дорожной сети - останавливаемся
      VehiclePhysics.throttle[eid] = 0;
      return;
    }
    return;
  }

  // Вычисление направления к waypoint
  const dx = waypoint.x - Position.x[eid];
  const dy = waypoint.y - Position.y[eid];
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Достигли waypoint? (с некоторым допуском для скорости)
  const reachThreshold = 50 + VehiclePhysics.speed[eid] * 0.5;
  if (dist < reachThreshold) {
    // Переходим к следующему waypoint
    const next = network.getNextWaypoint(waypoint.id, TrafficAI.previousState[eid] || undefined);
    if (next) {
      TrafficAI.previousState[eid] = waypoint.id;
      TrafficAI.currentWaypointId[eid] = next.id;

      // Если это перекрёсток, возможно нужно повернуть
      if (waypoint.isIntersection) {
        changeState(eid, TrafficState.TURNING);
      }
    } else {
      // Тупик - разворот
      VehiclePhysics.throttle[eid] = -0.5;
      setTimeout(() => {
        VehiclePhysics.throttle[eid] = 0;
        changeState(eid, TrafficState.DRIVING);
      }, 1000);
    }
    return;
  }

  // Управление машиной
  const targetAngle = Math.atan2(dy, dx);
  const currentAngle = Rotation.angle[eid];
  let angleDiff = normalizeAngle(targetAngle - currentAngle);

  // Если нужно развернуться (> 90 градусов), притормозить
  if (Math.abs(angleDiff) > Math.PI / 2) {
    VehiclePhysics.throttle[eid] *= 0.5;
  }

  // Рулевое управление
  VehiclePhysics.steering[eid] = Math.sign(angleDiff) * Math.min(1, Math.abs(angleDiff) * 2);

  // Газ с учётом препятствий и угла поворота
  if (TrafficAI.hasObstacle[eid]) {
    VehiclePhysics.throttle[eid] = 0;
  } else {
    const speedFactor = Math.max(0.3, 1 - Math.abs(angleDiff) * 0.5);
    const desiredSpeed = TrafficAI.desiredSpeed[eid];
    VehiclePhysics.throttle[eid] = speedFactor;

    // Ограничиваем скорость
    if (VehiclePhysics.speed[eid] > desiredSpeed) {
      VehiclePhysics.throttle[eid] = -0.3; // Легкое торможение
    }
  }

  // Поворот на месте при малой скорости
  if (VehiclePhysics.speed[eid] < 10 && Math.abs(angleDiff) > 0.5) {
    VehiclePhysics.throttle[eid] = 0;
    Rotation.angle[eid] += Math.sign(angleDiff) * 0.05 * dt;
  }
}

/**
 * Обработка состояния STOPPED (светофор)
 */
function handleStoppedState(
  _world: GameWorld,
  eid: number,
  _network: TrafficNetwork,
  _dt: number
): void {
  VehiclePhysics.throttle[eid] = 0;
  VehiclePhysics.braking[eid] = 1;

  // Ждём таймер
  if (TrafficAI.stateTimer[eid] <= 0) {
    VehiclePhysics.braking[eid] = 0;
    changeState(eid, TrafficState.DRIVING);
  }
}

/**
 * Обработка состояния WAITING (препятствие)
 */
function handleWaitingState(
  _world: GameWorld,
  eid: number,
  _network: TrafficNetwork,
  _dt: number
): void {
  VehiclePhysics.throttle[eid] = 0;

  // Проверка терпения
  if (TrafficAI.waitTimer[eid] <= 0) {
    // Теряем терпение - пытаемся объехать
    const aggressiveness = TrafficAI.aggressiveness[eid];

    if (aggressiveness > 0.7) {
      // Агрессивный - сигнал и ждём ещё немного
      TrafficAI.waitTimer[eid] = 2;
      // TODO: honk()
    } else {
      // Терпеливый - просто ждём
      TrafficAI.waitTimer[eid] = 3;
    }
  }

  // Если препятствие исчезло, продолжаем
  if (!TrafficAI.hasObstacle[eid]) {
    changeState(eid, TrafficState.DRIVING);
  }
}

/**
 * Обработка состояния TURNING (поворот на перекрёстке)
 */
function handleTurningState(
  _world: GameWorld,
  eid: number,
  network: TrafficNetwork,
  _dt: number
): void {
  const waypointId = TrafficAI.currentWaypointId[eid];
  const waypoint = network.getWaypoint(waypointId);

  if (!waypoint) {
    changeState(eid, TrafficState.DRIVING);
    return;
  }

  // Поворачиваем к новому waypoint
  const dx = waypoint.x - Position.x[eid];
  const dy = waypoint.y - Position.y[eid];
  const targetAngle = Math.atan2(dy, dx);
  const currentAngle = Rotation.angle[eid];
  const angleDiff = normalizeAngle(targetAngle - currentAngle);

  // Рулевое управление
  VehiclePhysics.steering[eid] = Math.sign(angleDiff) * Math.min(1, Math.abs(angleDiff) * 3);

  // Медленный газ при повороте
  VehiclePhysics.throttle[eid] = 0.3;

  // Закончили поворот?
  if (Math.abs(angleDiff) < 0.2 || TrafficAI.stateTimer[eid] <= 0) {
    changeState(eid, TrafficState.DRIVING);
  }
}

/**
 * Обработка состояния CRASHED
 */
function handleCrashedState(_world: GameWorld, eid: number): void {
  VehiclePhysics.throttle[eid] = 0;
  VehiclePhysics.steering[eid] = 0;

  // Если таймер истёк, пытаемся восстановиться
  if (TrafficAI.stateTimer[eid] <= 0) {
    changeState(eid, TrafficState.DRIVING);
  }
}

/**
 * Обработка состояния FLEEING (убегает от опасности)
 */
function handleFleeingState(
  _world: GameWorld,
  eid: number,
  _network: TrafficNetwork,
  _dt: number
): void {
  // Едем быстро вперёд
  VehiclePhysics.throttle[eid] = 1;
  TrafficAI.desiredSpeed[eid] = 200; // Высокая скорость

  // Простираёмся от опасности
  // TODO: добавить реальное определение направления

  if (TrafficAI.stateTimer[eid] <= 0) {
    // Возвращаем нормальную скорость
    TrafficAI.desiredSpeed[eid] = 100;
    changeState(eid, TrafficState.DRIVING);
  }
}

/**
 * Проверка препятствий впереди
 */
function checkForObstacles(world: GameWorld, eid: number): void {
  const angle = Rotation.angle[eid];
  const speed = VehiclePhysics.speed[eid];
  const lookAhead = Math.max(100, speed * 0.8);

  const checkX = Position.x[eid] + Math.cos(angle) * lookAhead;
  const checkY = Position.y[eid] + Math.sin(angle) * lookAhead;

  // Проверяем другие машины
  const nearbyVehicles = findVehiclesNear(world, checkX, checkY, 80);
  const hasObstacle = nearbyVehicles.some(v => v !== eid);

  const previousObstacle = TrafficAI.hasObstacle[eid];
  TrafficAI.hasObstacle[eid] = hasObstacle ? 1 : 0;

  // Если появилось препятствие
  if (hasObstacle && !previousObstacle) {
    changeState(eid, TrafficState.WAITING);
    TrafficAI.waitTimer[eid] = 3 + Math.random() * 2;
  }
}

/**
 * Найти машины рядом с позицией
 */
function findVehiclesNear(world: GameWorld, x: number, y: number, radius: number): number[] {
  const vehicles = allVehiclesQuery(world);
  const nearby: number[] = [];

  for (const vid of vehicles) {
    const dx = Position.x[vid] - x;
    const dy = Position.y[vid] - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius) {
      nearby.push(vid);
    }
  }

  return nearby;
}

/**
 * Нормализовать угол в диапазон [-PI, PI]
 */
function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

/**
 * Сменить состояние AI трафика
 */
function changeState(eid: number, newState: TrafficState): void {
  const oldState = TrafficAI.state[eid] as TrafficState;

  TrafficAI.previousState[eid] = oldState;
  TrafficAI.state[eid] = newState;

  // Устанавливаем таймер состояния
  switch (newState) {
    case TrafficState.DRIVING:
      TrafficAI.stateTimer[eid] = -1; // Бесконечно
      break;
    case TrafficState.STOPPED:
      TrafficAI.stateTimer[eid] = 2 + Math.random() * 3;
      break;
    case TrafficState.WAITING:
      TrafficAI.stateTimer[eid] = 5 + Math.random() * 5;
      break;
    case TrafficState.TURNING:
      TrafficAI.stateTimer[eid] = 2;
      break;
    case TrafficState.CRASHED:
      TrafficAI.stateTimer[eid] = 5;
      break;
    case TrafficState.FLEEING:
      TrafficAI.stateTimer[eid] = 5 + Math.random() * 3;
      break;
  }
}

/**
 * Создать машину трафика на ближайшем waypoint
 */
export function spawnTrafficVehicle(
  _world: GameWorld,
  network: TrafficNetwork,
  x: number,
  y: number,
  z: number = 0,
  createVehicleFn: (x: number, y: number, z: number) => number
): number | null {
  const waypoint = network.getNearestWaypoint(x, y, z);
  if (!waypoint) return null;

  const eid = createVehicleFn(waypoint.x, waypoint.y, waypoint.z);

  // Инициализируем AI компоненты
  TrafficAI.state[eid] = TrafficState.DRIVING;
  TrafficAI.previousState[eid] = TrafficState.DRIVING;
  TrafficAI.currentWaypointId[eid] = waypoint.id;
  TrafficAI.desiredSpeed[eid] = waypoint.speedLimit || 100;
  TrafficAI.aggressiveness[eid] = 0.3 + Math.random() * 0.4; // 0.3-0.7
  TrafficAI.patience[eid] = 3 + Math.random() * 3;
  TrafficAI.distanceToNext[eid] = 0;
  TrafficAI.hasObstacle[eid] = 0;
  TrafficAI.stateTimer[eid] = -1;
  TrafficAI.waitTimer[eid] = 0;

  // Поворачиваем машину к следующему waypoint
  const next = network.getNextWaypoint(waypoint.id);
  if (next) {
    const dx = next.x - waypoint.x;
    const dy = next.y - waypoint.y;
    Rotation.angle[eid] = Math.atan2(dy, dx);
  }

  return eid;
}
