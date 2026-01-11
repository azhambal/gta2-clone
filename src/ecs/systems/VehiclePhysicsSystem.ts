import { query } from 'bitecs';
import type { GameWorld } from '../World.js';
import type { PhysicsManager } from '../../physics/PhysicsManager.js';
import type { GameMap } from '../../world/GameMap.js';
import {
  calculateSurfaceGrip,
  calculateSurfaceFriction,
  calculateSurfaceMaxSpeed,
} from '../../physics/SurfaceTypes.js';
import { Position, Velocity, Rotation, Vehicle, VehiclePhysics, RigidBody } from '../components/index.js';

// Alias for Position for code clarity
const Pos = Position;

/**
 * Параметры физики по умолчанию
 */
const DEFAULT_PHYSICS = {
  airFriction: 0.02,      // Трение воздуха
  rollingFriction: 0.01,  // Трение качения
  minSpeedForTurn: 10,    // Минимальная скорость для поворота
  maxTurnSpeedFactor: 1,  // Максимальный коэффициент скорости для поворота
};

/**
 * Создание системы физики транспорта
 *
 * Ключевые концепции:
 * - Thrust (Тяга): сила от двигателя в направлении машины
 * - Friction (Трение): замедление от поверхности
 * - Lateral Grip (Боковое сцепление): сопротивление заносу
 * - Steering (Поворот): изменение угла в зависимости от скорости и руля
 * - Surface Types: разные поверхности меняют физику (грязь, лёд, дорога)
 */
export const createVehiclePhysicsSystem = (
  physicsManager: PhysicsManager | null = null,
  gameMap: GameMap | null = null
) => {
  return (world: GameWorld, dt: number) => {
    const deltaSeconds = dt / 1000;

    // Находим все сущности с Vehicle и VehiclePhysics компонентами
    const entities = query(world, [Vehicle, VehiclePhysics, Position, Velocity, Rotation]);

    for (const eid of entities) {
      const vPhys = VehiclePhysics;

      // Получаем ввод от водителя
      const throttle = vPhys.throttle[eid];
      const steering = vPhys.steering[eid];
      const currentSpeed = vPhys.speed[eid];
      const currentAngle = Rotation.angle[eid];

      // === 0. ОПРЕДЕЛЕНИЕ ТИПА ПОВЕРХНОСТИ ===
      let surfaceType = 0; // ROAD по умолчанию
      let surfaceFrictionMod = 0;
      let surfaceGripMod = 1.0;
      let surfaceMaxSpeedMod = 1.0;

      if (gameMap) {
        const entityX = Pos.x[eid];
        const entityY = Pos.y[eid];
        // getSurfaceAt возвращает BlockTypes.SurfaceType (NONE=0, ROAD=1, etc)
        // Для physics нам нужно сместить на -1, так как physics SurfaceType использует ROAD=0
        const rawSurfaceType = gameMap.getSurfaceAt(entityX, entityY);
        // Преобразуем BlockTypes.SurfaceType -> physics.SurfaceType
        // NONE(0) -> ROAD(0) как fallback, ROAD(1) -> ROAD(0), GRASS(2) -> GRASS(1), etc.
        surfaceType = Math.max(0, rawSurfaceType - 1);

        // Получаем модификаторы от поверхности
        const baseGrip = vPhys.grip[eid];

        surfaceGripMod = calculateSurfaceGrip(baseGrip, surfaceType) / baseGrip;
        surfaceFrictionMod = calculateSurfaceFriction(0, surfaceType); // base 0
        surfaceMaxSpeedMod = calculateSurfaceMaxSpeed(1, surfaceType); // returns factor
      }

      // === 1. РАСЧЁТ УСКОРЕНИЯ ===
      let acceleration = 0;
      if (throttle > 0) {
        // Газ: ускорение вперёд
        acceleration = vPhys.acceleration[eid] * throttle;
      } else if (throttle < 0) {
        // Торможение/задний ход
        if (currentSpeed > 1) {
          // Торможение при движении вперёд
          acceleration = -vPhys.braking[eid];
        } else {
          // Задний ход (слабее ускорения)
          acceleration = -vPhys.acceleration[eid] * 0.5 * Math.abs(throttle);
        }
      }

      // === 2. НОВАЯ СКОРОСТЬ С УЧЁТОМ ТРЕНИЯ ===
      let newSpeed = currentSpeed + acceleration * deltaSeconds;

      // Применяем трение воздуха (зависит от скорости)
      const airResistance = newSpeed * DEFAULT_PHYSICS.airFriction;
      newSpeed -= airResistance * deltaSeconds;

      // Трение качения + трение поверхности
      const totalFriction = DEFAULT_PHYSICS.rollingFriction + surfaceFrictionMod;
      newSpeed -= newSpeed * totalFriction * deltaSeconds;

      // Ограничение скорости с учётом поверхности
      const maxSpeed = vPhys.maxSpeed[eid] * surfaceMaxSpeedMod;
      const maxReverseSpeed = -maxSpeed * 0.3; // Задний ход - 30% от максимальной
      newSpeed = Math.max(maxReverseSpeed, Math.min(maxSpeed, newSpeed));

      // Останавливаем машину если скорость очень мала
      if (Math.abs(newSpeed) < 0.5 && Math.abs(throttle) < 0.1) {
        newSpeed = 0;
      }

      // === 3. ПОВОРОТ ===
      // Поворот зависит от скорости (на месте не повернёшь)
      const turnRate = vPhys.handling[eid] * 3; // Базовая скорость поворота
      const speedFactor = Math.min(Math.abs(currentSpeed) / 100, DEFAULT_PHYSICS.maxTurnSpeedFactor);
      const turnAmount = steering * turnRate * speedFactor * deltaSeconds;

      // При заднем ходе руль работает инвертированно
      const directionSign = currentSpeed >= 0 ? 1 : -1;
      const newAngle = currentAngle + turnAmount * directionSign;

      // === 4. ДРИФТ (БОКОВОЕ СКОЛЬЖЕНИЕ) ===
      // Grip определяет сколько боковой скорости сохраняется при повороте
      // grip = 1.0 -> полное сцепление (без заноса)
      // grip = 0.0 -> полное скольжение (лёд)
      const baseGrip = vPhys.grip[eid];
      const effectiveGrip = baseGrip * surfaceGripMod;

      // Рассчитываем боковую составляющую скорости
      // Текущий вектор скорости
      const currentVelX = Velocity.x[eid];
      const currentVelY = Velocity.y[eid];

      // Желаемое направление движения (куда смотрит машина)
      const desiredDirX = Math.cos(newAngle);
      const desiredDirY = Math.sin(newAngle);

      // Проекция текущей скорости на желаемое направление (вперёд/назад)
      const forwardSpeed = currentVelX * desiredDirX + currentVelY * desiredDirY;

      // Боковая составляющая скорости (перпендикулярно направлению)
      const lateralDirX = -desiredDirY;
      const lateralDirY = desiredDirX;
      const lateralSpeed = currentVelX * lateralDirX + currentVelY * lateralDirY;

      // Применяем grip: чем ниже grip, тем больше боковая скорость сохраняется
      const newLateralSpeed = lateralSpeed * (1 - effectiveGrip * deltaSeconds * 5);

      // Собираем новый вектор скорости
      // Продольная составляющая + остаточная боковая (с учётом grip)
      const newVelX = desiredDirX * forwardSpeed + lateralDirX * newLateralSpeed;
      const newVelY = desiredDirY * forwardSpeed + lateralDirY * newLateralSpeed;

      // === 5. ПРИМЕНЕНИЕ РЕЗУЛЬТАТОВ ===
      // Обновляем компоненты ECS
      Rotation.angle[eid] = newAngle;
      VehiclePhysics.speed[eid] = newSpeed;

      // Если есть физическое тело в Matter.js - синхронизируем
      if (physicsManager && RigidBody.bodyId[eid]) {
        physicsManager.setBodyAngle(eid, newAngle);
        physicsManager.setVelocity(eid, { x: newVelX, y: newVelY });
      } else {
        // Если нет Matter.js тела - обновляем напрямую
        Velocity.x[eid] = newVelX;
        Velocity.y[eid] = newVelY;
      }

      // Обновляем угловую скорость для дрифта
      VehiclePhysics.angularVelocity[eid] = turnAmount / deltaSeconds;
      VehiclePhysics.drifting[eid] = Math.abs(lateralSpeed) > 10 ? 1 : 0;
    }

    return world;
  };
};
