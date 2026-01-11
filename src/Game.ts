/**
 * Главный класс игры
 * Координирует все подсистемы
 */
export class Game {
  private _isRunning: boolean = false;

  get isRunning(): boolean {
    return this._isRunning;
  }

  constructor() {
    console.log('Game instance created');
  }

  public async init(): Promise<void> {
    console.log('Game initializing...');
    // Инициализация подсистем будет добавлена позже
  }

  public start(): void {
    this._isRunning = true;
    console.log('Game started');
  }

  public stop(): void {
    this._isRunning = false;
    console.log('Game stopped');
  }
}
