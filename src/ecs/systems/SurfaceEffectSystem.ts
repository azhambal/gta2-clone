import { query } from 'bitecs';
import type { GameWorld } from '../World.js';
import type { GameMap } from '../../world/GameMap.js';
import { Position, Velocity, Vehicle, VehiclePhysics } from '../components/index.js';
import { getSurfaceProperties } from '../../physics/SurfaceTypes.js';

/**
 * Параметры частиц для системы
 */
interface ParticleSpawnRequest {
  x: number;
  y: number;
  z: number;
  color: number;
  size: number;
  lifetime: number;
  velocityX: number;
  velocityY: number;
}

/**
 * Очередь спавна частиц (будет использоваться системой частиц)
 */
const particleQueue: ParticleSpawnRequest[] = [];

/**
 * Минимальная скорость движения для спавна частиц
 */
const MIN_SPEED_FOR_PARTICLES = 20;

/**
 * Интервал между спавном частиц (мс)
 */
const PARTICLE_SPAWN_INTERVAL = 50;

let lastSpawnTime = 0;

/**
 * Создание системы эффектов поверхности
 *
 * Спавнит частицы когда транспорт движется по разным поверхностям:
 * - Трава/грязь: пыль
 * - Вода: брызги
 * - Дорога при дрифте: дым от шин
 */
export const createSurfaceEffectSystem = (gameMap: GameMap | null = null) => {
  return (world: GameWorld, _dt: number) => {
    const currentTime = Date.now();

    // Ограничиваем частоту спавна частиц
    if (currentTime - lastSpawnTime < PARTICLE_SPAWN_INTERVAL) {
      return world;
    }

    const { Position: Pos, Velocity: Vel, VehiclePhysics: VPhys } = world.components;

    // Находим все движущиеся машины
    const vehicles = query(world, [Vehicle, VehiclePhysics, Position, Velocity]);

    for (const eid of vehicles) {
      const speed = VPhys.speed[eid];
      const absSpeed = Math.abs(speed);

      // Спавним частицы только если машина движется достаточно быстро
      if (absSpeed < MIN_SPEED_FOR_PARTICLES) {
        continue;
      }

      // Получаем тип поверхности под машиной
      let surfaceType = 0; // ROAD по умолчанию
      if (gameMap) {
        const rawSurfaceType = gameMap.getSurfaceAt(Pos.x[eid], Pos.y[eid]);
        surfaceType = Math.max(0, rawSurfaceType - 1);
      }

      const surface = getSurfaceProperties(surfaceType);

      // Проверяем, нужны ли частицы для этой поверхности
      if (!surface.dustParticles && !surface.waterSplash) {
        // Для дороги спавним частицы только при дрифте
        if (surfaceType !== 0 || !VPhys.drifting[eid]) {
          continue;
        }
      }

      // Вычисляем позицию спавна (сзади машины)
      const angle = Math.atan2(Vel.y[eid], Vel.x[eid]);
      const behindOffset = 30;
      const spawnX = Pos.x[eid] - Math.cos(angle) * behindOffset;
      const spawnY = Pos.y[eid] - Math.sin(angle) * behindOffset;

      // Спавним 1-3 частицы
      const particleCount = surface.waterSplash ? 3 : Math.floor(Math.random() * 2) + 1;

      for (let i = 0; i < particleCount; i++) {
        // Случайное смещение
        const offsetX = (Math.random() - 0.5) * 20;
        const offsetY = (Math.random() - 0.5) * 20;

        // Случайная скорость (разлет в стороны)
        const spread = 30;
        const velX = -Math.cos(angle) * absSpeed * 0.3 + (Math.random() - 0.5) * spread;
        const velY = -Math.sin(angle) * absSpeed * 0.3 + (Math.random() - 0.5) * spread;

        // Размер частицы
        const size = surface.waterSplash ? Math.random() * 8 + 4 : Math.random() * 4 + 2;

        // Время жизни
        const lifetime = surface.waterSplash ? 500 : 800;

        particleQueue.push({
          x: spawnX + offsetX,
          y: spawnY + offsetY,
          z: Pos.z[eid],
          color: surface.particleColor,
          size,
          lifetime,
          velocityX: velX,
          velocityY: velY,
        });
      }
    }

    lastSpawnTime = currentTime;

    return world;
  };
};

/**
 * Получить очередь частиц для других систем
 * (например, для ParticleSystem когда она будет реализована)
 */
export function getParticleQueue(): ParticleSpawnRequest[] {
  return particleQueue;
}

/**
 * Очистить очередь частиц
 */
export function clearParticleQueue(): void {
  particleQueue.length = 0;
}
