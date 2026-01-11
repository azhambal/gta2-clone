import { query } from 'bitecs';
import type { GameWorld } from '../World.js';
import { SpriteComponent, AnimationComponent } from '../components/index.js';

/**
 * Система анимации — обновляет кадры спрайтов
 */
export const createAnimationSystem = () => {
  return (world: GameWorld, dt: number) => {
    const entities = query(world, [SpriteComponent, AnimationComponent]);

    for (const eid of entities) {
      if (!AnimationComponent.playing[eid]) continue;

      // Обновление таймера
      AnimationComponent.timer[eid] += dt / 1000;

      const frameTime = 1 / AnimationComponent.speed[eid];
      if (AnimationComponent.timer[eid] >= frameTime) {
        AnimationComponent.timer[eid] -= frameTime;

        // Следующий кадр
        let nextFrame = SpriteComponent.frame[eid] + 1;

        if (nextFrame > AnimationComponent.endFrame[eid]) {
          if (AnimationComponent.loop[eid]) {
            nextFrame = AnimationComponent.startFrame[eid];
          } else {
            nextFrame = AnimationComponent.endFrame[eid];
            AnimationComponent.playing[eid] = 0;
          }
        }

        SpriteComponent.frame[eid] = nextFrame;
      }
    }

    return world;
  };
};

export const animationSystem = createAnimationSystem();
