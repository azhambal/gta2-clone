import type { GameWorld } from './World.js';
import { Debug } from '../utils/Debug.js';

type SystemFunction = (world: GameWorld, dt: number) => GameWorld;

interface SystemEntry {
  name: string;
  system: SystemFunction;
  priority: number;
}

/**
 * Менеджер систем — управляет порядком выполнения
 */
export class SystemManager {
  private systems: Map<string, SystemEntry> = new Map();
  private executionOrder: string[] = [];

  /**
   * Регистрация системы
   */
  public register(name: string, system: SystemFunction, priority: number = 0): void {
    this.systems.set(name, { name, system, priority });
    this.rebuildExecutionOrder();
    Debug.log('SystemManager', `Registered system: ${name} (priority: ${priority})`);
  }

  /**
   * Удаление системы
   */
  public unregister(name: string): void {
    this.systems.delete(name);
    this.rebuildExecutionOrder();
  }

  /**
   * Пересборка порядка выполнения
   */
  private rebuildExecutionOrder(): void {
    this.executionOrder = Array.from(this.systems.values())
      .sort((a, b) => a.priority - b.priority)
      .map(entry => entry.name);
  }

  /**
   * Выполнение всех систем
   */
  public update(world: GameWorld, dt: number): void {
    for (const name of this.executionOrder) {
      const entry = this.systems.get(name);
      if (entry) {
        entry.system(world, dt);
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
