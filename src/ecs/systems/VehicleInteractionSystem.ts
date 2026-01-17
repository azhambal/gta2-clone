import { query, addComponent, removeComponent, hasComponent } from 'bitecs';
import type { GameWorld } from '../World.js';
import type { InputManager } from '../../input/InputManager.js';
import type { GameMap } from '../../world/GameMap.js';
import { GameAction } from '../../input/index.js';
import { eventBus } from '../../core/EventBus.js';
import { PlayerControlled, Driver, Vehicle, Position, VehicleOccupants, Rotation, SpriteComponent, VehiclePhysics } from '../components/index.js';
import { canMoveTo } from './MapCollisionSystem.js';

// Alias for Position for code clarity
const Pos = Position;

/**
 * Максимальное расстояние для входа в машину (в пикселях)
 */
const ENTER_VEHICLE_DISTANCE = 120;

/**
 * Смещение позиции игрока при выходе из машины
 */
const EXIT_OFFSET = 40;

/**
 * Радиус коллайдера игрока для проверки коллизий при выходе
 */
const PLAYER_COLLIDER_RADIUS = 12;

/**
 * Создание системы взаимодействия с транспортом
 *
 * Обрабатывает вход и выход игрока из машин по нажатию E
 */
export const createVehicleInteractionSystem = (inputManager: InputManager, gameMap: GameMap) => {
  // Флаг для предотвращения повторной обработки в том же кадре
  // (fixedUpdate может вызываться несколько раз за кадр)
  let lastProcessedTime = 0;
  const DEBOUNCE_MS = 200; // Минимальный интервал между входом/выходом

  return (world: GameWorld, _dt: number) => {
    // Проверяем нажатие клавиши входа/выхода
    if (!inputManager.isActionJustPressed(GameAction.ENTER_EXIT_VEHICLE)) {
      return world;
    }

    // Защита от повторных срабатываний
    const now = performance.now();
    if (now - lastProcessedTime < DEBOUNCE_MS) {
      return world;
    }
    lastProcessedTime = now;

    // Находим всех игроков, управляемых игроком
    const players = query(world, [PlayerControlled, Position]);

    for (const playerEid of players) {
      // Проверяем, в машине ли игрок
      // Используем hasComponent для точной проверки наличия компонента Driver
      const isDriver = hasComponent(world, playerEid, Driver) && Driver.vehicleEntity[playerEid] !== 0;

      if (isDriver) {
        // === ВЫХОД ИЗ МАШИНЫ ===
        exitVehicle(world, playerEid, gameMap);
      } else {
        // === ПОИСК И ВХОД В МАШИНУ ===
        const nearestVehicle = findNearestVehicle(world, playerEid, ENTER_VEHICLE_DISTANCE);
        if (nearestVehicle !== 0) {
          enterVehicle(world, playerEid, nearestVehicle, gameMap);
        }
      }
    }

    return world;
  };
};

/**
 * Найти ближайшую машину в радиусе
 */
function findNearestVehicle(
  world: GameWorld,
  playerEid: number,
  maxDistance: number,
): number {
  // Получаем все машины
  const vehicles = query(world, [Vehicle, Position]);

  const playerX = Pos.x[playerEid];
  const playerY = Pos.y[playerEid];

  let nearest = 0;
  let nearestDist = maxDistance;

  for (const vehicleEid of vehicles) {
    const vx = Pos.x[vehicleEid];
    const vy = Pos.y[vehicleEid];
    const dx = vx - playerX;
    const dy = vy - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Проверяем, что машина имеет компонент VehicleOccupants и место водителя свободно
    const hasOccupants = hasComponent(world, vehicleEid, VehicleOccupants);
    const driverSeat = hasOccupants ? VehicleOccupants.driver[vehicleEid] : -1;
    const isOccupied = driverSeat !== 0;

    if (isOccupied) {
      continue; // Место занято или нет компонента
    }

    if (dist < nearestDist) {
      nearest = vehicleEid;
      nearestDist = dist;
    }
  }

  return nearest;
}

/**
 * Вход в машину
 */
function enterVehicle(
  world: GameWorld,
  playerEid: number,
  vehicleEid: number,
  gameMap: GameMap,
): void {

  // Проверка 1: есть ли свободное место (уже проверили в findNearestVehicle, но на всякий случай)
  if (VehicleOccupants.driver[vehicleEid] !== 0) {
    eventBus.emit('vehicle:enterFailed', { player: playerEid, vehicle: vehicleEid, reason: 'occupied' });
    return;
  }

  // Проверка 2: машина все еще существует (может быть удалена)
  if (!hasComponent(world, vehicleEid, Vehicle)) {
    eventBus.emit('vehicle:enterFailed', { player: playerEid, vehicle: vehicleEid, reason: 'not_found' });
    return;
  }

  // Проверка 3: игрок и машина на одном Z-уровне
  const playerZ = Math.floor(Position.z[playerEid]);
  const vehicleZ = Math.floor(Position.z[vehicleEid]);
  if (playerZ !== vehicleZ) {
    eventBus.emit('vehicle:enterFailed', { player: playerEid, vehicle: vehicleEid, reason: 'wrong_level' });
    return;
  }

  // Проверка 4: позиция игрока не внутри стены (для безопасности)
  const playerX = Position.x[playerEid];
  const playerY = Position.y[playerEid];
  if (!canMoveTo(gameMap, playerX, playerY, playerZ, PLAYER_COLLIDER_RADIUS)) {
    eventBus.emit('vehicle:enterFailed', { player: playerEid, vehicle: vehicleEid, reason: 'invalid_position' });
    return;
  }

  // Добавляем компонент Driver игроку (если его еще нет)
  if (!hasComponent(world, playerEid, Driver)) {
    addComponent(world, playerEid, Driver);
  }
  Driver.vehicleEntity[playerEid] = vehicleEid;

  // Записываем водителя в машину
  VehicleOccupants.driver[vehicleEid] = playerEid;

  // Скрываем спрайт игрока
  SpriteComponent.visible[playerEid] = 0;

  // Сбрасываем скорость машины перед входом
  VehiclePhysics.throttle[vehicleEid] = 0;
  VehiclePhysics.steering[vehicleEid] = 0;

  // Событие для других систем
  eventBus.emit('vehicle:entered', { player: playerEid, vehicle: vehicleEid });
}

/**
 * Выход из машины
 */
function exitVehicle(
  world: GameWorld,
  playerEid: number,
  gameMap: GameMap,
): void {
  const vehicleEid = Driver.vehicleEntity[playerEid];
  if (!vehicleEid) {
    return;
  }

  // Проверка 1: машина все еще существует
  if (!hasComponent(world, vehicleEid, Vehicle)) {
    // Машина уничтожена - все равно выходим, но игрок остается на месте
    eventBus.emit('vehicle:exited', { player: playerEid, vehicle: vehicleEid, reason: 'vehicle_destroyed' });
    removeDriverComponents(world, playerEid, vehicleEid);
    SpriteComponent.visible[playerEid] = 1;
    return;
  }

  // Получаем позицию и угол машины
  const vehicleX = Position.x[vehicleEid];
  const vehicleY = Position.y[vehicleEid];
  const vehicleAngle = Rotation.angle[vehicleEid];
  const vehicleZ = Math.floor(Position.z[vehicleEid]);

  // Останавливаем машину
  VehiclePhysics.throttle[vehicleEid] = 0;
  VehiclePhysics.steering[vehicleEid] = 0;
  VehiclePhysics.speed[vehicleEid] = 0;

  // Пробуем разные позиции для выхода (справа, слева, спереди, сзади)
  const exitOffsets = [
    { angleOffset: Math.PI / 2, name: 'right' },      // Справа от машины
    { angleOffset: -Math.PI / 2, name: 'left' },      // Слева от машины
    { angleOffset: 0, name: 'front' },                // Спереди от машины
    { angleOffset: Math.PI, name: 'back' },           // Сзади от машины
  ];

  let validExitFound = false;
  let exitX = vehicleX;
  let exitY = vehicleY;

  for (const offset of exitOffsets) {
    const candidateX = vehicleX + Math.cos(vehicleAngle + offset.angleOffset) * EXIT_OFFSET;
    const candidateY = vehicleY + Math.sin(vehicleAngle + offset.angleOffset) * EXIT_OFFSET;

    // Проверяем, что позиция валидна
    if (canMoveTo(gameMap, candidateX, candidateY, vehicleZ, PLAYER_COLLIDER_RADIUS)) {
      exitX = candidateX;
      exitY = candidateY;
      validExitFound = true;
      break;
    }
  }

  if (validExitFound) {
    // Нашли валидную позицию - выходим
    Position.x[playerEid] = exitX;
    Position.y[playerEid] = exitY;
    Position.z[playerEid] = vehicleZ;
    removeDriverComponents(world, playerEid, vehicleEid);
    SpriteComponent.visible[playerEid] = 1;
    eventBus.emit('vehicle:exited', { player: playerEid, vehicle: vehicleEid });
  } else {
    // Все позиции заблокированы - показываем уведомление
    eventBus.emit('vehicle:exitFailed', { player: playerEid, vehicle: vehicleEid, reason: 'blocked' });
  }
}

/**
 * Удаление компонентов Driver и очистка VehicleOccupants
 * Вынесено в отдельную функцию для переиспользования
 */
function removeDriverComponents(world: GameWorld, playerEid: number, vehicleEid: number): void {
  // Проверяем, что игрок все еще водитель этой машины
  if (Driver.vehicleEntity[playerEid] === vehicleEid) {
    // Удаляем компонент Driver у игрока
    if (hasComponent(world, playerEid, Driver)) {
      removeComponent(world, playerEid, Driver);
    }

    // Очищаем место водителя в машине
    if (hasComponent(world, vehicleEid, VehicleOccupants)) {
      VehicleOccupants.driver[vehicleEid] = 0;
    }
  }
}
