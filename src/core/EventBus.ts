type EventCallback = (...args: any[]) => void;

/**
 * Простая шина событий для коммуникации между подсистемами
 */
export class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  /**
   * Подписка на событие
   */
  public on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Отписка от события
   */
  public off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Отправка события
   */
  public emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach(callback => callback(...args));
  }

  /**
   * Одноразовая подписка
   */
  public once(event: string, callback: EventCallback): void {
    const wrapper = (...args: any[]) => {
      callback(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }
}

// Глобальный экземпляр
export const eventBus = new EventBus();
