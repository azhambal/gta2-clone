/**
 * UI индикатор текущего района
 * Показывает название района при входе
 */
export class DistrictIndicator {
  private element: HTMLElement;
  private textElement: HTMLElement;
  private visible: boolean = false;
  private hideTimer: number | null = null;
  private fadeOutTimer: number | null = null;

  constructor() {
    // Создаем элемент индикатора
    this.element = document.createElement('div');
    this.element.id = 'district-indicator';
    this.element.className = 'district-indicator';
    this.element.innerHTML = `
      <div class="district-indicator-content">
        <div class="district-indicator-text"></div>
      </div>
    `;

    this.textElement = this.element.querySelector('.district-indicator-text') as HTMLElement;
    this.element.style.display = 'none';
    document.body.appendChild(this.element);

    // Добавляем стили
    this.addStyles();
  }

  /**
   * Показать уведомление о районе
   */
  public show(districtName: string, duration: number = 3000): void {
    // Очищаем предыдущие таймеры
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.fadeOutTimer !== null) {
      clearTimeout(this.fadeOutTimer);
      this.fadeOutTimer = null;
    }

    // Устанавливаем текст
    this.textElement.textContent = districtName.toUpperCase();

    // Показываем элемент
    this.element.style.display = 'block';
    this.element.style.opacity = '1';
    this.element.style.transform = 'translateY(0)';
    this.visible = true;

    // Автоматически скрываем через заданное время
    this.hideTimer = window.setTimeout(() => {
      this.hide();
    }, duration);
  }

  /**
   * Скрыть уведомление
   */
  public hide(): void {
    if (!this.visible) return;

    this.element.style.opacity = '0';
    this.element.style.transform = 'translateY(-20px)';

    this.fadeOutTimer = window.setTimeout(() => {
      this.element.style.display = 'none';
      this.visible = false;
    }, 300); // Должно соответствовать transition duration
  }

  /**
   * Добавить CSS стили
   */
  private addStyles(): void {
    const styleId = 'district-indicator-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .district-indicator {
        position: fixed;
        top: 15%;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        z-index: 1000;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }

      .district-indicator-content {
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        padding: 12px 32px;
        text-align: center;
      }

      .district-indicator-text {
        color: #ffffff;
        font-family: 'Arial', sans-serif;
        font-size: 24px;
        font-weight: bold;
        letter-spacing: 2px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
        text-transform: uppercase;
      }

      /* Анимация появления */
      .district-indicator.show {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }

      /* Анимация исчезновения */
      .district-indicator.hide {
        opacity: 0;
        transform: translateX(-50%) translateY(-20px);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Уничтожить индикатор
   */
  public destroy(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
    }
    if (this.fadeOutTimer !== null) {
      clearTimeout(this.fadeOutTimer);
    }
    this.element.remove();
  }
}

// Глобальный экземпляр синглтона
let districtIndicatorInstance: DistrictIndicator | null = null;

/**
 * Получить или создать индикатор района
 */
export function getDistrictIndicator(): DistrictIndicator {
  if (!districtIndicatorInstance) {
    districtIndicatorInstance = new DistrictIndicator();
  }
  return districtIndicatorInstance;
}

/**
 * Уничтожить индикатор района
 */
export function destroyDistrictIndicator(): void {
  if (districtIndicatorInstance) {
    districtIndicatorInstance.destroy();
    districtIndicatorInstance = null;
  }
}
