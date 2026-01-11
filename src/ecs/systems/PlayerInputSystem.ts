import { query } from 'bitecs';
import type { GameWorld } from '../World.js';
import type { InputManager } from '../../input/InputManager.js';
import { GameAction } from '../../input/index.js';
import { PlayerControlled, VehiclePhysics, Vehicle, VehicleOccupants } from '../components/index.js';

const WALK_SPEED = 100;
const RUN_SPEED = 200;

/**
 * Система управления игроком — обрабатывает ввод и применяет скорость
 * Также обрабатывает управление транспортом когда игрок является водителем
 */
export const createPlayerInputSystem = (inputManager: InputManager) => {
  return (world: GameWorld, _dt: number) => {
    const { Position, Velocity, Rotation, Driver: Drv } = world.components;
    const entities = query(world, [PlayerControlled, Position, Velocity, Rotation]);

    for (const eid of entities) {
      // Проверяем, является ли игрок водителем
      const vehicleEntity = Drv && Drv.vehicleEntity[eid] ? Drv.vehicleEntity[eid] : 0;

      if (vehicleEntity) {
        // === УПРАВЛЕНИЕ ТРАНСПОРТОМ ===
        const vPhys = VehiclePhysics;
        const vOcc = VehicleOccupants;

        // Синхронизируем позицию игрока с машиной для камеры
        Position.x[eid] = Position.x[vehicleEntity];
        Position.y[eid] = Position.y[vehicleEntity];

        // Проверяем, что игрок действительно водитель этой машины
        if (vOcc.driver[vehicleEntity] === eid) {
          // Управление газом/тормозом
          let throttle = 0;
          if (inputManager.isActionDown(GameAction.ACCELERATE)) {
            throttle = 1.0;
          } else if (inputManager.isActionDown(GameAction.BRAKE)) {
            throttle = -1.0;
          }

          // Управление рулём
          let steering = 0;
          if (inputManager.isActionDown(GameAction.STEER_LEFT)) {
            steering = -1.0;
          } else if (inputManager.isActionDown(GameAction.STEER_RIGHT)) {
            steering = 1.0;
          }

          // Ручной тормоз (уменьшает grip для заноса)
          if (inputManager.isActionDown(GameAction.HANDBRAKE)) {
            // Временное уменьшение сцепления для эффекта заноса
            vPhys.grip[vehicleEntity] = vPhys.grip[vehicleEntity] * 0.5;
          } else {
            // Восстанавливаем оригинальный grip (упрощено, должен браться из определения)
            const originalGrip = getOriginalGrip(Vehicle.type[vehicleEntity]);
            if (vPhys.grip[vehicleEntity] < originalGrip) {
              vPhys.grip[vehicleEntity] = Math.min(vPhys.grip[vehicleEntity] * 1.1, originalGrip);
            }
          }

          // Применяем ввод
          vPhys.throttle[vehicleEntity] = throttle;
          vPhys.steering[vehicleEntity] = steering;
        }

        // Водитель не двигается пешком
        Velocity.x[eid] = 0;
        Velocity.y[eid] = 0;
      } else {
        // === УПРАВЛЕНИЕ ПЕШКОМ ===
        // Получаем вектор движения от InputManager
        const movement = inputManager.getMovementVector();

        // Проверяем, нажата ли клавиша бега
        const isRunning = inputManager.isActionDown(GameAction.RUN);
        const speed = isRunning ? RUN_SPEED : WALK_SPEED;

        // Применяем скорость
        Velocity.x[eid] = movement.x * speed;
        Velocity.y[eid] = movement.y * speed;

        // Обновляем направление взгляда при движении
        if (movement.x !== 0 || movement.y !== 0) {
          Rotation.angle[eid] = Math.atan2(movement.y, movement.x);
        }
      }
    }

    return world;
  };
};

/**
 * Вспомогательная функция для получения оригинального grip по типу машины
 * В будущем это должно браться из VehicleDefinitions
 */
function getOriginalGrip(vehicleType: number): number {
  // Базовые значения grip по типам (должны совпадать с VehicleDefinitions)
  const gripMap: Record<number, number> = {
    0: 0.85, // CAR_SPORT
    1: 0.80, // CAR_SEDAN
    2: 0.80, // CAR_TAXI
    3: 0.90, // CAR_POLICE
    4: 0.70, // TRUCK
    5: 0.60, // BUS
    6: 0.75, // MOTORCYCLE
    7: 0.95, // TANK
  };
  return gripMap[vehicleType] ?? 0.8;
}
