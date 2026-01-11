/**
 * Простой менеджер ввода (будет расширен позже)
 */
export class InputManager {
  private keysDown: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private keysJustReleased: Set<string> = new Set();

  constructor() {
    this.setupListeners();
  }

  /**
   * Настройка слушателей событий
   */
  private setupListeners(): void {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
    window.addEventListener('blur', this.onBlur.bind(this));
  }

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (!this.keysDown.has(key)) {
      this.keysJustPressed.add(key);
    }
    this.keysDown.add(key);
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keysDown.delete(key);
    this.keysJustReleased.add(key);
  }

  private onBlur(): void {
    // Сброс всех клавиш при потере фокуса
    this.keysDown.clear();
  }

  /**
   * Проверка удержания клавиши
   */
  public isKeyDown(key: string): boolean {
    return this.keysDown.has(key.toLowerCase());
  }

  /**
   * Проверка нажатия клавиши (один кадр)
   */
  public isKeyJustPressed(key: string): boolean {
    return this.keysJustPressed.has(key.toLowerCase());
  }

  /**
   * Проверка отпускания клавиши (один кадр)
   */
  public isKeyJustReleased(key: string): boolean {
    return this.keysJustReleased.has(key.toLowerCase());
  }

  /**
   * Получение направления движения (WASD/стрелки)
   */
  public getMovementVector(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.isKeyDown('w') || this.isKeyDown('arrowup')) y -= 1;
    if (this.isKeyDown('s') || this.isKeyDown('arrowdown')) y += 1;
    if (this.isKeyDown('a') || this.isKeyDown('arrowleft')) x -= 1;
    if (this.isKeyDown('d') || this.isKeyDown('arrowright')) x += 1;

    return { x, y };
  }

  /**
   * Очистка состояния "just pressed/released"
   * Вызывать в конце каждого кадра
   */
  public update(): void {
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
  }

  /**
   * Уничтожение
   */
  public destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('keyup', this.onKeyUp.bind(this));
    window.removeEventListener('blur', this.onBlur.bind(this));
  }
}
