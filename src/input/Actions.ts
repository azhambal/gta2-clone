/**
 * Все игровые действия
 */
export enum GameAction {
  // Движение пешехода
  MOVE_UP = 'moveUp',
  MOVE_DOWN = 'moveDown',
  MOVE_LEFT = 'moveLeft',
  MOVE_RIGHT = 'moveRight',
  RUN = 'run',

  // Управление машиной
  ACCELERATE = 'accelerate',
  BRAKE = 'brake',
  STEER_LEFT = 'steerLeft',
  STEER_RIGHT = 'steerRight',
  HANDBRAKE = 'handbrake',
  HORN = 'horn',

  // Общие действия
  FIRE = 'fire',
  ENTER_EXIT_VEHICLE = 'enterExitVehicle',
  NEXT_WEAPON = 'nextWeapon',
  PREV_WEAPON = 'prevWeapon',
  RELOAD = 'reload',

  // UI
  PAUSE = 'pause',
  MENU = 'menu',

  // Камера (для отладки)
  ZOOM_IN = 'zoomIn',
  ZOOM_OUT = 'zoomOut',
}

/**
 * Типы устройств ввода
 */
export enum InputDevice {
  KEYBOARD = 'keyboard',
  MOUSE = 'mouse',
  GAMEPAD = 'gamepad',
}

/**
 * Привязка клавиши к действию
 */
export interface KeyBinding {
  action: GameAction;
  device: InputDevice;
  key: string;          // Клавиша или кнопка
  alt?: string;         // Альтернативная клавиша
}
