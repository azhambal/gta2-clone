# Шаг 08: Расширенная система ввода

## Цель
Расширить систему ввода с поддержкой переназначения клавиш, действий и геймпада. После этого шага ввод полностью абстрагирован от конкретных клавиш.

## Зависимости
- Шаг 07: Камера

## Задачи

### 8.1 Определение игровых действий

**src/input/Actions.ts:**
```typescript
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
```

### 8.2 ActionMapper

**src/input/ActionMapper.ts:**
```typescript
import { GameAction, InputDevice, KeyBinding } from './Actions';

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
        if (binding.alt) keys.push(binding.alt);
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
```

### 8.3 Расширенный InputManager

**src/input/InputManager.ts:**
```typescript
import { GameAction, InputDevice } from './Actions';
import { ActionMapper, DEFAULT_KEY_BINDINGS } from './ActionMapper';
import { Vector2 } from '@core/Types';

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

  constructor(customBindings?: any[]) {
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
    window.addEventListener('wheel', this.onWheel.bind(this));
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
  }

  private onBlur(): void {
    this.keysDown.clear();
    this.mouseButtons.clear();
  }

  private isGameKey(key: string): boolean {
    return ['w', 'a', 's', 'd', ' ', 'e', 'r', 'shift', 'control'].includes(key);
  }

  // === Проверка действий ===

  /**
   * Проверка удержания действия
   */
  public isActionDown(action: GameAction): boolean {
    // Клавиатура
    const keys = this.actionMapper.getKeysForAction(action);
    for (const key of keys) {
      if (this.keysDown.has(key)) return true;
    }

    // Мышь
    const buttons = this.actionMapper.getMouseButtonsForAction(action);
    for (const button of buttons) {
      if (this.mouseButtons.has(button)) return true;
    }

    return false;
  }

  /**
   * Проверка нажатия действия (один кадр)
   */
  public isActionJustPressed(action: GameAction): boolean {
    const keys = this.actionMapper.getKeysForAction(action);
    for (const key of keys) {
      if (this.keysJustPressed.has(key)) return true;
    }

    const buttons = this.actionMapper.getMouseButtonsForAction(action);
    for (const button of buttons) {
      if (this.mouseButtonsJustPressed.has(button)) return true;
    }

    return false;
  }

  /**
   * Проверка отпускания действия
   */
  public isActionJustReleased(action: GameAction): boolean {
    const keys = this.actionMapper.getKeysForAction(action);
    for (const key of keys) {
      if (this.keysJustReleased.has(key)) return true;
    }

    const buttons = this.actionMapper.getMouseButtonsForAction(action);
    for (const button of buttons) {
      if (this.mouseButtonsJustReleased.has(button)) return true;
    }

    return false;
  }

  // === Утилиты ===

  /**
   * Получение вектора движения пешехода
   */
  public getMovementVector(): Vector2 {
    let x = 0;
    let y = 0;

    if (this.isActionDown(GameAction.MOVE_UP)) y -= 1;
    if (this.isActionDown(GameAction.MOVE_DOWN)) y += 1;
    if (this.isActionDown(GameAction.MOVE_LEFT)) x -= 1;
    if (this.isActionDown(GameAction.MOVE_RIGHT)) x += 1;

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

    if (this.isActionDown(GameAction.ACCELERATE)) throttle = 1;
    if (this.isActionDown(GameAction.BRAKE)) throttle = -1;
    if (this.isActionDown(GameAction.STEER_LEFT)) steer = -1;
    if (this.isActionDown(GameAction.STEER_RIGHT)) steer = 1;

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
```

### 8.4 Экспорт модулей

**src/input/index.ts:**
```typescript
export { GameAction, InputDevice, KeyBinding } from './Actions';
export { ActionMapper, DEFAULT_KEY_BINDINGS } from './ActionMapper';
export { InputManager } from './InputManager';
```

### 8.5 Обновление Game.ts

```typescript
import { GameAction } from './input/Actions';

// В методе update():
private update(dt: number): void {
  Debug.updateFps(this.engine.getFps());

  // Управление камерой через Actions
  const cameraSpeed = 5;
  const movement = this.inputManager.getMovementVector();

  if (movement.x !== 0 || movement.y !== 0) {
    this.camera.move(movement.x * cameraSpeed, movement.y * cameraSpeed);
  }

  // Зум через Actions
  if (this.inputManager.isActionDown(GameAction.ZOOM_IN)) {
    this.camera.zoomTo(this.camera.getZoom() + 0.02);
  }
  if (this.inputManager.isActionDown(GameAction.ZOOM_OUT)) {
    this.camera.zoomTo(this.camera.getZoom() - 0.02);
  }

  // Зум колёсиком мыши
  const wheel = this.inputManager.getMouseWheel();
  if (wheel !== 0) {
    this.camera.zoomTo(this.camera.getZoom() - wheel * 0.1);
  }

  // Пауза
  if (this.inputManager.isActionJustPressed(GameAction.PAUSE)) {
    Debug.log('Game', 'Pause toggled');
    // Пауза будет реализована позже
  }

  this.camera.update(dt);

  const viewport = this.camera.getViewport();
  this.renderer.getMapRenderer()?.setViewport(viewport);

  this.renderer.update();
  this.inputManager.update();
}
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `input/Actions.ts` | `GameAction` | Enum всех игровых действий |
| `input/Actions.ts` | `InputDevice` | Типы устройств ввода |
| `input/Actions.ts` | `KeyBinding` | Привязка клавиши к действию |
| `input/ActionMapper.ts` | `ActionMapper` | Маппинг клавиш на действия |
| `input/InputManager.ts` | `InputManager` | Менеджер ввода |

## Ключевые методы InputManager

| Метод | Описание |
|-------|----------|
| `isActionDown(action)` | Удержание действия |
| `isActionJustPressed(action)` | Нажатие (один кадр) |
| `isActionJustReleased(action)` | Отпускание (один кадр) |
| `getMovementVector()` | Вектор движения пешехода |
| `getVehicleInput()` | Ввод для управления машиной |
| `getMousePosition()` | Позиция мыши |
| `getMouseWheel()` | Колёсико мыши |
| `getActionMapper()` | Получение маппера для настройки |

## Результат
- Ввод полностью абстрагирован через GameAction
- Поддержка переназначения клавиш
- Поддержка мыши (позиция, кнопки, колёсико)
- Диагональное движение нормализовано
- Колёсико мыши управляет зумом

## Проверка
```bash
npm run dev
# WASD/стрелки — перемещение камеры
# Колёсико мыши — зум
# ESC/P — пауза (в консоли)
```

## Следующий шаг
Шаг 09: ECS Архитектура (bitECS)
