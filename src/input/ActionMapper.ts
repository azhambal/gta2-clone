import { GameAction, InputDevice, KeyBinding } from './Actions.js';

/**
 * Дефолтные привязки клавиш
 */
export const DEFAULT_KEY_BINDINGS: KeyBinding[] = [
  // Движение пешехода
  { action: GameAction.MOVE_UP, device: InputDevice.KEYBOARD, key: 'w', alt: 'arrowup' },
  { action: GameAction.MOVE_DOWN, device: InputDevice.KEYBOARD, key: 's', alt: 'arrowdown' },
  { action: GameAction.MOVE_LEFT, device: InputDevice.KEYBOARD, key: 'a', alt: 'arrowleft' },
  { action: GameAction.MOVE_RIGHT, device: InputDevice.KEYBOARD, key: 'd', alt: 'arrowright' },
  { action: GameAction.RUN, device: InputDevice.KEYBOARD, key: 'shift' },

  // Управление машиной (те же что и движение + дополнительные)
  { action: GameAction.ACCELERATE, device: InputDevice.KEYBOARD, key: 'w', alt: 'arrowup' },
  { action: GameAction.BRAKE, device: InputDevice.KEYBOARD, key: 's', alt: 'arrowdown' },
  { action: GameAction.STEER_LEFT, device: InputDevice.KEYBOARD, key: 'a', alt: 'arrowleft' },
  { action: GameAction.STEER_RIGHT, device: InputDevice.KEYBOARD, key: 'd', alt: 'arrowright' },
  { action: GameAction.HANDBRAKE, device: InputDevice.KEYBOARD, key: ' ' },  // Space
  { action: GameAction.HORN, device: InputDevice.KEYBOARD, key: 'h' },

  // Общие действия
  { action: GameAction.FIRE, device: InputDevice.KEYBOARD, key: 'control' },
  { action: GameAction.FIRE, device: InputDevice.MOUSE, key: '0' },  // LMB
  { action: GameAction.ENTER_EXIT_VEHICLE, device: InputDevice.KEYBOARD, key: 'e', alt: 'enter' },
  { action: GameAction.NEXT_WEAPON, device: InputDevice.KEYBOARD, key: ']' },
  { action: GameAction.PREV_WEAPON, device: InputDevice.KEYBOARD, key: '[' },
  { action: GameAction.RELOAD, device: InputDevice.KEYBOARD, key: 'r' },

  // UI
  { action: GameAction.PAUSE, device: InputDevice.KEYBOARD, key: 'escape', alt: 'p' },

  // Камера
  { action: GameAction.ZOOM_IN, device: InputDevice.KEYBOARD, key: '=' },
  { action: GameAction.ZOOM_OUT, device: InputDevice.KEYBOARD, key: '-' },
];

/**
 * Маппер действий — преобразует сырой ввод в игровые действия
 */
export class ActionMapper {
  private bindings: Map<GameAction, KeyBinding[]> = new Map();

  constructor(customBindings?: KeyBinding[]) {
    this.loadBindings(customBindings || DEFAULT_KEY_BINDINGS);
  }

  /**
   * Загрузка привязок
   */
  public loadBindings(bindings: KeyBinding[]): void {
    this.bindings.clear();

    for (const binding of bindings) {
      const existing = this.bindings.get(binding.action) || [];
      existing.push(binding);
      this.bindings.set(binding.action, existing);
    }
  }

  /**
   * Получение всех клавиш для действия
   */
  public getKeysForAction(action: GameAction): string[] {
    const bindings = this.bindings.get(action) || [];
    const keys: string[] = [];

    for (const binding of bindings) {
      if (binding.device === InputDevice.KEYBOARD) {
        keys.push(binding.key);
        if (binding.alt) {keys.push(binding.alt);}
      }
    }

    return keys;
  }

  /**
   * Получение мышиных кнопок для действия
   */
  public getMouseButtonsForAction(action: GameAction): number[] {
    const bindings = this.bindings.get(action) || [];
    const buttons: number[] = [];

    for (const binding of bindings) {
      if (binding.device === InputDevice.MOUSE) {
        buttons.push(parseInt(binding.key, 10));
      }
    }

    return buttons;
  }

  /**
   * Переназначение клавиши
   */
  public rebind(action: GameAction, device: InputDevice, key: string): void {
    const bindings = this.bindings.get(action) || [];

    // Удаляем старую привязку для этого устройства
    const filtered = bindings.filter(b => b.device !== device);

    // Добавляем новую
    filtered.push({ action, device, key });

    this.bindings.set(action, filtered);
  }

  /**
   * Экспорт привязок для сохранения
   */
  public exportBindings(): KeyBinding[] {
    const result: KeyBinding[] = [];
    this.bindings.forEach(bindings => {
      result.push(...bindings);
    });
    return result;
  }
}
