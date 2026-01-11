/**
 * Утилиты для отладки
 */
export class Debug {
  private static fpsElement: HTMLElement | null = null;
  private static debugPanel: HTMLElement | null = null;
  private static isEnabled: boolean = true;

  /**
   * Инициализация отладочного интерфейса
   */
  public static init(): void {
    if (!this.isEnabled) return;

    // Создание панели отладки
    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'debug-panel';
    this.debugPanel.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #0f0;
      font-family: monospace;
      font-size: 14px;
      padding: 10px;
      border-radius: 4px;
      z-index: 9999;
      pointer-events: none;
    `;
    document.body.appendChild(this.debugPanel);

    // Элемент FPS
    this.fpsElement = document.createElement('div');
    this.fpsElement.id = 'fps-counter';
    this.debugPanel.appendChild(this.fpsElement);
  }

  /**
   * Обновление FPS
   */
  public static updateFps(fps: number): void {
    if (this.fpsElement) {
      this.fpsElement.textContent = `FPS: ${fps}`;
    }
  }

  /**
   * Логирование
   */
  public static log(category: string, message: string): void {
    if (this.isEnabled) {
      console.log(`[${category}] ${message}`);
    }
  }

  /**
   * Включение/выключение отладки
   */
  public static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (this.debugPanel) {
      this.debugPanel.style.display = enabled ? 'block' : 'none';
    }
  }
}
