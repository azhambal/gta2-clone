/**
 * Ядро игрового движка
 * Управляет главным игровым циклом и временем
 */
export class Engine {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private accumulator: number = 0;
  private readonly fixedDeltaTime: number = 1000 / 60; // 60 FPS для физики

  // Callbacks
  private updateCallback: ((dt: number) => void) | null = null;
  private fixedUpdateCallback: ((dt: number) => void) | null = null;
  private renderCallback: ((interpolation: number) => void) | null = null;

  // Метрики
  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 0;

  constructor() {}

  /**
   * Регистрация callback для обновления (каждый кадр)
   */
  public onUpdate(callback: (dt: number) => void): void {
    this.updateCallback = callback;
  }

  /**
   * Регистрация callback для фиксированного обновления (физика)
   */
  public onFixedUpdate(callback: (dt: number) => void): void {
    this.fixedUpdateCallback = callback;
  }

  /**
   * Регистрация callback для рендеринга
   */
  public onRender(callback: (interpolation: number) => void): void {
    this.renderCallback = callback;
  }

  /**
   * Запуск игрового цикла
   */
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.fpsTime = this.lastTime;
    this.frameCount = 0;

    this.loop(this.lastTime);
  }

  /**
   * Остановка игрового цикла
   */
  public stop(): void {
    this.isRunning = false;
  }

  /**
   * Получить текущий FPS
   */
  public getFps(): number {
    return this.currentFps;
  }

  /**
   * Главный игровой цикл
   */
  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.loop);

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Ограничение deltaTime для предотвращения "spiral of death"
    const clampedDelta = Math.min(deltaTime, 250);

    // Подсчёт FPS
    this.frameCount++;
    if (currentTime - this.fpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = currentTime;
    }

    // Обновление каждый кадр (переменный timestep)
    if (this.updateCallback) {
      this.updateCallback(clampedDelta);
    }

    // Фиксированное обновление для физики
    this.accumulator += clampedDelta;
    while (this.accumulator >= this.fixedDeltaTime) {
      if (this.fixedUpdateCallback) {
        this.fixedUpdateCallback(this.fixedDeltaTime);
      }
      this.accumulator -= this.fixedDeltaTime;
    }

    // Рендеринг с интерполяцией
    const interpolation = this.accumulator / this.fixedDeltaTime;
    if (this.renderCallback) {
      this.renderCallback(interpolation);
    }
  };
}
