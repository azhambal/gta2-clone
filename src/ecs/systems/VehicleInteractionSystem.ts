import { query, addComponent } from 'bitecs';
import type { GameWorld } from '../World.js';
import type { InputManager } from '../../input/InputManager.js';
import { GameAction } from '../../input/index.js';
import { eventBus } from '../../core/EventBus.js';
import { PlayerControlled, Driver, Vehicle, Position } from '../components/index.js';

/**
 * Максимальное расстояние для входа в машину (в пикселях)
 */
const ENTER_VEHICLE_DISTANCE = 80;

/**
 * Смещение позиции игрока при выходе из машины
 */
const EXIT_OFFSET = 40;

/**
 * Создание системы взаимодействия с транспортом
 *
 * Обрабатывает вход и выход игрока из машин по нажатию E
 */
export const createVehicleInteractionSystem = (inputManager: InputManager) => {
  return (world: GameWorld, _dt: number) => {
    // Проверяем нажатие клавиши входа/выхода
    if (!inputManager.isActionJustPressed(GameAction.ENTER_EXIT_VEHICLE)) {
      return world;
    }

    // Находим всех игроков, управляемых игроком
    const players = query(world, [PlayerControlled, Position]);

    for (const playerEid of players) {
      // Проверяем, в машине ли игрок
      const isDriver = Driver.vehicleEntity[playerEid] !== 0;

      if (isDriver) {
        // === ВЫХОД ИЗ МАШИНЫ ===
        exitVehicle(world, playerEid);
      } else {
        // === ПОИСК И ВХОД В МАШИНУ ===
        const nearestVehicle = findNearestVehicle(world, playerEid, ENTER_VEHICLE_DISTANCE);
        if (nearestVehicle !== 0) {
          enterVehicle(world, playerEid, nearestVehicle);
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
  maxDistance: number
): number {
  // Получаем все машины
  const vehicles = query(world, [Vehicle, Position]);
  const { Position: Pos, VehicleOccupants } = world.components;

  let nearest = 0;
  let nearestDist = maxDistance;

  for (const vehicleEid of vehicles) {
    // Проверяем, что есть свободное место для водителя
    if (VehicleOccupants.driver[vehicleEid] !== 0) {
      continue; // Место занято
    }

    // Вычисляем расстояние
    const dx = Pos.x[vehicleEid] - Pos.x[playerEid];
    const dy = Pos.y[vehicleEid] - Pos.y[playerEid];
    const dist = Math.sqrt(dx * dx + dy * dy);

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
  vehicleEid: number
): void {
  const { VehicleOccupants, SpriteComponent } = world.components;

  // Проверка: есть ли свободное место (уже проверили в findNearestVehicle, но на всякий случай)
  if (VehicleOccupants.driver[vehicleEid] !== 0) {
    return;
  }

  // Добавляем компонент Driver игроку
  addComponent(world, playerEid, Driver);
  Driver.vehicleEntity[playerEid] = vehicleEid;

  // Записываем водителя в машину
  VehicleOccupants.driver[vehicleEid] = playerEid;

  // Скрываем спрайт игрока
  SpriteComponent.visible[playerEid] = 0;

  // Событие для других систем
  eventBus.emit('vehicle:entered', { player: playerEid, vehicle: vehicleEid });
}

/**
 * Выход из машины
 */
function exitVehicle(
  world: GameWorld,
  playerEid: number
): void {
  const vehicleEid = Driver.vehicleEntity[playerEid];
  if (!vehicleEid) {
    return;
  }

  const { VehicleOccupants, Position, Rotation, SpriteComponent, VehiclePhysics } = world.components;

  // Позиция выхода (сбоку от машины)
  const angle = Rotation.angle[vehicleEid];
  const exitX = Position.x[vehicleEid] + Math.cos(angle + Math.PI / 2) * EXIT_OFFSET;
  const exitY = Position.y[vehicleEid] + Math.sin(angle + Math.PI / 2) * EXIT_OFFSET;

  // Позиция выхода
  Position.x[playerEid] = exitX;
  Position.y[playerEid] = exitY;

  // Останавливаем машину
  VehiclePhysics.throttle[vehicleEid] = 0;
  VehiclePhysics.steering[vehicleEid] = 0;
  VehiclePhysics.speed[vehicleEid] = 0;

  // Удаляем компонент Driver у игрока (устанавливаем vehicleEntity в 0)
  Driver.vehicleEntity[playerEid] = 0;

  // Очищаем место водителя в машине
  VehicleOccupants.driver[vehicleEid] = 0;

  // Показываем спрайт игрока
  SpriteComponent.visible[playerEid] = 1;

  // Событие для других систем
  eventBus.emit('vehicle:exited', { player: playerEid, vehicle: vehicleEid });
}
