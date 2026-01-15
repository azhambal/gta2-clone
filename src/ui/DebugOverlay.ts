import { Container, Text, Graphics } from 'pixi.js';
import { Debug } from '../utils/Debug.js';
import { eventBus } from '../core/EventBus.js';
import { getDebugModeManager, DebugMode } from '../debug/index.js';

/**
 * Overlay для отображения информации об отладке на экране
 */
export class DebugOverlay {
  private container: Container;
  private debugText!: Text;
  private background!: Graphics;
  private messageQueue: Array<{ text: string; timestamp: number }> = [];
  private currentMessage: string = '';
  private displayDuration: number = 4000; // 4 секунды
  private isEnabled: boolean = true;

  constructor(container: Container) {
    this.container = container;
    this.createOverlay();
    this.setupEventListeners();
    this.showInitialMode();
  }

  private createOverlay(): void {
    // Создаём под-контейнер для оверлея
    const overlayContainer = new Container();
    overlayContainer.zIndex = 999999; // Поверх всего
    this.container.addChild(overlayContainer);

    // Фон
    this.background = new Graphics();
    overlayContainer.addChild(this.background);

    // Текст
    this.debugText = new Text({
      text: '',
      style: {
        fontFamily: 'monospace',
        fontSize: 16,
        fill: 0x00ff00,
        align: 'left',
      },
    });
    this.debugText.anchor.set(0, 0);
    this.debugText.position.set(10, 10);
    overlayContainer.addChild(this.debugText);

    // Позиция контейнера
    overlayContainer.position.set(0, 0);
  }

  private setupEventListeners(): void {
    // Слушаем изменения режима
    eventBus.on('debug:modeChanged', ({ to }: { to: DebugMode }) => {
      this.showModeChange(to);
    });

    // Режим бога
    eventBus.on('debug:godMode', ({ enabled }: { enabled: boolean }) => {
      this.showMessage(enabled ? '🔥 GOD MODE: ON 🔥' : 'God Mode: OFF');
    });

    // Пауза
    eventBus.on('debug:pause', ({ paused }: { paused: boolean }) => {
      this.showMessage(paused ? '⏸️ PAUSED' : 'RESUMED');
    });

    // Замедление
    eventBus.on('debug:timeScale', ({ scale }: { scale: number }) => {
      if (scale < 1) {
        this.showMessage(`🐌 SLOW MOTION: ${scale}x`);
      } else {
        this.showMessage(`Time Scale: ${scale}x`);
      }
    });

    // Покадровый режим
    eventBus.on('debug:frameByFrame', ({ enabled }: { enabled: boolean }) => {
      this.showMessage(enabled ? '🎬 FRAME BY FRAME MODE (Space to advance)' : 'Frame by Frame: OFF');
    });
  }

  private showInitialMode(): void {
    const manager = getDebugModeManager();
    const mode = manager.getCurrentMode();
    const config = manager.getCurrentConfig();
    this.showMessage(`MODE: ${mode}\n${config.description}`);
  }

  private showModeChange(_mode: DebugMode): void {
    this.showMessage(`MODE: ${getDebugModeManager().getCurrentMode()}`);
  }

  /**
   * Показать сообщение на экране
   */
  showMessage(text: string): void {
    this.messageQueue.push({
      text,
      timestamp: Date.now(),
    });

    // Если это первое сообщение, показываем сразу
    if (this.messageQueue.length === 1) {
      this.displayNextMessage();
    }
  }

  private displayNextMessage(): void {
    if (this.messageQueue.length === 0) {
      this.currentMessage = '';
      this.updateDisplay();
      return;
    }

    const msg = this.messageQueue[0];
    this.currentMessage = msg.text;
    this.updateDisplay();
  }

  private updateDisplay(): void {
    if (!this.isEnabled) {return;}

    const lines = this.formatMessage(this.currentMessage);
    this.debugText.text = lines;

    // Обновляем фон под текстом
    this.background.clear();
    if (this.currentMessage) {
      const padding = 8;
      const lineHeight = 20;
      const textWidth = this.debugText.width;
      const textHeight = lines.split('\n').length * lineHeight;

      this.background.beginPath();
      this.background.roundRect(
        5,
        5,
        textWidth + padding * 2,
        textHeight + padding * 2,
        5,
      );
      this.background.fill({ color: 0x000000, alpha: 0.7 });
      this.background.fill();
    }
  }

  private formatMessage(message: string): string {
    // Добавляем FPS и другую информацию
    const manager = getDebugModeManager();
    const timeScale = manager.getTimeScale();
    const paused = manager.isPaused();
    const godMode = manager.isGodMode();

    let result = '';

    // Заголовок режима
    if (message) {
      result += `${message}\n`;
    }

    // Статус
    const status = [];
    if (godMode) {status.push('GOD');}
    if (paused) {status.push('PAUSED');}
    if (timeScale < 1) {status.push(`${timeScale}x`);}
    if (manager.isFrameByFrame()) {status.push('FRAME-BY-FRAME');}

    if (status.length > 0) {
      result += `[${status.join(' ')}] `;
    }

    // Горячие клавиши
    result += '\nF1-F5:Debug | F9:God | F10:Slow | 1-0:Modes';

    return result;
  }

  /**
   * Обновление оверлея (вызывать каждый кадр)
   */
  update(_dt: number): void {
    if (!this.isEnabled || this.messageQueue.length === 0) {return;}

    const now = Date.now();
    const msg = this.messageQueue[0];
    const elapsed = now - msg.timestamp;

    // Удаляем сообщения через displayDuration
    if (elapsed > this.displayDuration) {
      this.messageQueue.shift();
      this.displayNextMessage();
    }
  }

  /**
   * Показать полную информацию об отладке
   */
  showFullDebugInfo(): void {
    const manager = getDebugModeManager();
    const config = manager.getCurrentConfig();

    const systems = Object.entries(config.systems)
      .filter(([_, v]) => v)
      .map(([k]) => k)
      .slice(0, 6)
      .join(', ');

    let info = `=== ${manager.getCurrentMode()} ===\n`;
    info += `${config.description}\n\n`;
    info += `Systems: ${systems}${Object.entries(config.systems).filter(([_, v]) => v).length > 6 ? '...' : ''}\n`;
    info += `Spawn: player=${config.spawn.player}, vehicles=${config.spawn.vehicles}, peds=${config.spawn.pedestrians}`;

    // Сохраняем текущую длительность и устанавливаем новую
    const originalDuration = this.displayDuration;
    this.displayDuration = 6000;
    this.showMessage(info);
    this.displayDuration = originalDuration;
  }

  /**
   * Включить/выключить оверлей
   */
  toggle(): void {
    this.isEnabled = !this.isEnabled;
    this.container.visible = this.isEnabled;
    Debug.log('DebugOverlay', `Overlay: ${this.isEnabled ? 'ON' : 'OFF'}`);
  }

  /**
   * Установить продолжительность отображения сообщений
   */
  setDisplayDuration(duration: number): void {
    this.displayDuration = duration;
  }

  /**
   * Очистить очередь сообщений
   */
  clearMessages(): void {
    this.messageQueue = [];
    this.currentMessage = '';
    this.updateDisplay();
  }

  /**
   * Уничтожить оверлей
   */
  destroy(): void {
    this.background.destroy();
    this.debugText.destroy();
    this.container.removeFromParent();
  }
}

/**
 * Глобальный экземпляр для доступа из любого места
 */
let debugOverlayInstance: DebugOverlay | null = null;

export function getDebugOverlay(): DebugOverlay | null {
  return debugOverlayInstance;
}

export function setDebugOverlay(overlay: DebugOverlay): void {
  debugOverlayInstance = overlay;
}
