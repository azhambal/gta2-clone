import { GameAction, type KeyBinding } from './Actions.js';
import { ActionMapper } from './ActionMapper.js';
import type { Vector2 } from '../core/Types.js';

/**
 * Расширенный менеджер ввода
 */
export class InputManager {
  private keysDown: Set<string> = new Set();
  private keysJustPressed: Set<string> = new Set();
  private keysJustReleased: Set<string> = new Set();

  private mousePosition: Vector2 = { x: 0, y: 0 };
  private mouseButtons: Set<number> = new Set();
  private mouseButtonsJustPressed: Set<number> = new Set();
  private mouseButtonsJustReleased: Set<number> = new Set();
  private mouseWheel: number = 0;

  private actionMapper: ActionMapper;

  constructor(customBindings?: KeyBinding[]) {
    this.actionMapper = new ActionMapper(customBindings);
    this.setupListeners();
  }

  /**
   * Настройка слушателей
   */
  private setupListeners(): void {
    // Клавиатура
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));

    // Мышь
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    window.addEventListener('contextmenu', e => e.preventDefault());

    // Потеря фокуса
    window.addEventListener('blur', this.onBlur.bind(this));
  }

  // === Обработчики событий ===

  private onKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (!this.keysDown.has(key)) {
      this.keysJustPressed.add(key);
    }
    this.keysDown.add(key);

    // Предотвращаем стандартное поведение для игровых клавиш
    if (this.isGameKey(key)) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.keysDown.delete(key);
    this.keysJustReleased.add(key);
  }

  private onMouseMove(e: MouseEvent): void {
    this.mousePosition.x = e.clientX;
    this.mousePosition.y = e.clientY;
  }

  private onMouseDown(e: MouseEvent): void {
    if (!this.mouseButtons.has(e.button)) {
      this.mouseButtonsJustPressed.add(e.button);
    }
    this.mouseButtons.add(e.button);
  }

  private onMouseUp(e: MouseEvent): void {
    this.mouseButtons.delete(e.button);
    this.mouseButtonsJustReleased.add(e.button);
  }

  private onWheel(e: WheelEvent): void {
    this.mouseWheel = Math.sign(e.deltaY);
    e.preventDefault();
  }

  private onBlur(): void {
    this.keysDown.clear();
    this.mouseButtons.clear();
  }

  private isGameKey(key: string): boolean {
    return [
      'w', 'a', 's', 'd', ' ', 'e', 'r', 'shift', 'control',
      'arrowup', 'arrowdown', 'arrowleft', 'arrowright',
      'escape', 'p', 'q', 'h',  // 'h' for help/debug info
      'f1', 'f2', 'f3', 'f4', 'f5', 'f9', 'f10', 'f11', 'f12',
      ',', '.',  // Frame by frame
      '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',  // Mode switching
    ].includes(key);
  }

  // === Проверка действий ===

  /**
   * Проверка удержания действия
   */
  public isActionDown(action: GameAction): boolean {
    // Клавиатура
    const keys = this.actionMapper.getKeysForAction(action);
    for (const key of keys) {
      if (this.keysDown.has(key)) {return true;}
    }

    // Мышь
    const buttons = this.actionMapper.getMouseButtonsForAction(action);
    for (const button of buttons) {
      if (this.mouseButtons.has(button)) {return true;}
    }

    return false;
  }

  /**
   * Проверка нажатия действия (один кадр)
   */
  public isActionJustPressed(action: GameAction): boolean {
    const keys = this.actionMapper.getKeysForAction(action);
    for (const key of keys) {
      if (this.keysJustPressed.has(key)) {return true;}
    }

    const buttons = this.actionMapper.getMouseButtonsForAction(action);
    for (const button of buttons) {
      if (this.mouseButtonsJustPressed.has(button)) {return true;}
    }

    return false;
  }

  /**
   * Проверка отпускания действия
   */
  public isActionJustReleased(action: GameAction): boolean {
    const keys = this.actionMapper.getKeysForAction(action);
    for (const key of keys) {
      if (this.keysJustReleased.has(key)) {return true;}
    }

    const buttons = this.actionMapper.getMouseButtonsForAction(action);
    for (const button of buttons) {
      if (this.mouseButtonsJustReleased.has(button)) {return true;}
    }

    return false;
  }

  /**
   * Проверка нажатия конкретной клавиши (один кадр)
   */
  public isKeyJustPressed(key: string): boolean {
    return this.keysJustPressed.has(key.toLowerCase());
  }

  /**
   * Проверка удержания конкретной клавиши
   */
  public isKeyDown(key: string): boolean {
    return this.keysDown.has(key.toLowerCase());
  }

  // === Утилиты ===

  /**
   * Получение вектора движения пешехода
   */
  public getMovementVector(): Vector2 {
    let x = 0;
    let y = 0;

    if (this.isActionDown(GameAction.MOVE_UP)) {y -= 1;}
    if (this.isActionDown(GameAction.MOVE_DOWN)) {y += 1;}
    if (this.isActionDown(GameAction.MOVE_LEFT)) {x -= 1;}
    if (this.isActionDown(GameAction.MOVE_RIGHT)) {x += 1;}

    // Нормализация диагонального движения
    if (x !== 0 && y !== 0) {
      const length = Math.sqrt(x * x + y * y);
      x /= length;
      y /= length;
    }

    return { x, y };
  }

  /**
   * Получение вектора управления машиной
   */
  public getVehicleInput(): { throttle: number; steer: number; brake: boolean; handbrake: boolean } {
    let throttle = 0;
    let steer = 0;

    if (this.isActionDown(GameAction.ACCELERATE)) {throttle = 1;}
    if (this.isActionDown(GameAction.BRAKE)) {throttle = -1;}
    if (this.isActionDown(GameAction.STEER_LEFT)) {steer = -1;}
    if (this.isActionDown(GameAction.STEER_RIGHT)) {steer = 1;}

    return {
      throttle,
      steer,
      brake: this.isActionDown(GameAction.BRAKE),
      handbrake: this.isActionDown(GameAction.HANDBRAKE),
    };
  }

  /**
   * Позиция мыши
   */
  public getMousePosition(): Vector2 {
    return { ...this.mousePosition };
  }

  /**
   * Колёсико мыши
   */
  public getMouseWheel(): number {
    return this.mouseWheel;
  }

  /**
   * Получение ActionMapper для настройки
   */
  public getActionMapper(): ActionMapper {
    return this.actionMapper;
  }

  /**
   * Обновление (вызывать в конце кадра)
   */
  public update(): void {
    this.keysJustPressed.clear();
    this.keysJustReleased.clear();
    this.mouseButtonsJustPressed.clear();
    this.mouseButtonsJustReleased.clear();
    this.mouseWheel = 0;
  }

  /**
   * Уничтожение
   */
  public destroy(): void {
    // Слушатели будут удалены при закрытии страницы
  }
}
