import { query } from 'bitecs';
import type { GameWorld } from '../World.js';
import type { InputManager } from '../../input/InputManager.js';
import { GameAction } from '../../input/index.js';
import { PlayerControlled } from '../components/index.js';

const WALK_SPEED = 100;
const RUN_SPEED = 200;

/**
 * Система управления игроком — обрабатывает ввод и применяет скорость
 */
export const createPlayerInputSystem = (inputManager: InputManager) => {
  return (world: GameWorld, _dt: number) => {
    const { Position, Velocity, Rotation, Driver } = world.components;
    const entities = query(world, [PlayerControlled, Position, Velocity, Rotation]);

    for (const eid of entities) {
      // Пропускаем водителей (они управляют машиной, не идут пешком)
      if (Driver && Driver.vehicleEntity[eid]) {
        continue;
      }

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

    return world;
  };
};
