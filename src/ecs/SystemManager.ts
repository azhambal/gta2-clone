import type { GameWorld } from './World.js';

type SystemFunction = (world: GameWorld, dt: number) => GameWorld;

/**
 * Менеджер систем — управляет порядком выполнения
 */
export class SystemManager {
  private systems: Map<string, SystemFunction> = new Map();
  private executionOrder: string[] = [];

  /**
   * Регистрация системы
   */
  public register(name: string, system: SystemFunction, priority?: number): void {
    this.systems.set(name, system);

    // Добавляем в порядок выполнения
    if (priority !== undefined) {
      this.executionOrder.splice(priority, 0, name);
    } else {
      this.executionOrder.push(name);
    }
  }

  /**
   * Удаление системы
   */
  public unregister(name: string): void {
    this.systems.delete(name);
    this.executionOrder = this.executionOrder.filter(n => n !== name);
  }

  /**
   * Выполнение всех систем
   */
  public update(world: GameWorld, dt: number): void {
    for (const name of this.executionOrder) {
      const system = this.systems.get(name);
      if (system) {
        system(world, dt);
      }
    }
  }

  /**
   * Получение списка систем
   */
  public getSystems(): string[] {
    return [...this.executionOrder];
  }
}
