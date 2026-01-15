import { Engine } from './core/Engine.js';
import { eventBus } from './core/EventBus.js';
import { Debug } from './utils/Debug.js';
import { GAME_CONSTANTS, type GameConfig } from './core/Types.js';
import { Renderer } from './rendering/Renderer.js';
import { Camera } from './rendering/Camera.js';
import { MapGenerator } from './world/MapGenerator.js';
import { GameMap } from './world/GameMap.js';
import { InputManager, GameAction } from './input/index.js';
import { ecsWorld, EntityFactory, SystemManager, movementSystem, animationSystem, createPlayerInputSystem, createMapCollisionSystem, createEntityCollisionSystem, createSlopeSystem } from './ecs/index.js';
import { PhysicsManager } from './physics/PhysicsManager.js';
import { createPhysicsSyncSystem } from './ecs/systems/PhysicsSyncSystem.js';
import { createVehiclePhysicsSystem } from './ecs/systems/VehiclePhysicsSystem.js';
import { createVehicleInteractionSystem } from './ecs/systems/VehicleInteractionSystem.js';
import { addComponent } from 'bitecs';
import { createSurfaceEffectSystem } from './ecs/systems/SurfaceEffectSystem.js';
import { VehicleType } from './data/VehicleDefinitions.js';
import { audioManager, preloadSounds } from './audio/index.js';
import { createPedestrianAISystem, generateTrafficNetwork, TrafficNetwork } from './ai/index.js';
import { createTrafficAISystem } from './ecs/systems/TrafficAISystem.js';
import { createWeaponSystem } from './ecs/systems/WeaponSystem.js';
import { createProjectileSystem } from './ecs/systems/ProjectileSystem.js';
import { createHealthSystem } from './ecs/systems/HealthSystem.js';
import { createDebugRenderSystem, DebugMode as RenderDebugMode } from './ecs/systems/DebugRenderSystem.js';
import { getDebugModeManager, DebugMode } from './debug/index.js';
import { SpawnManager } from './gameplay/index.js';
import { DistrictManager, createRectDistrictConfig } from './world/index.js';
import { getDistrictIndicator, DebugOverlay } from './ui/index.js';
import { Position, Vehicle, TrafficAI, Rotation } from './ecs/components/index.js';

/**
 * Главный класс игры
 */
export class Game {
  private engine: Engine;
  private renderer: Renderer;
  private config: GameConfig;
  private currentMap: GameMap | null = null;
  private camera!: Camera;
  private inputManager!: InputManager;
  private systemManager!: SystemManager;
  private physicsManager!: PhysicsManager;
  private spawnManager!: SpawnManager;
  private districtManager!: DistrictManager;
  private trafficNetwork!: TrafficNetwork;
  private playerEntity: number = 0;
  private debugModeManager = getDebugModeManager();
  private debugOverlay: DebugOverlay | null = null;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = {
      width: config.width ?? 1280,
      height: config.height ?? 720,
      backgroundColor: config.backgroundColor ?? 0x1a1a2e,
      targetFps: config.targetFps ?? 60,
    };

    this.engine = new Engine();
    this.renderer = new Renderer();

    // Регистрация callbacks
    this.engine.onUpdate(this.update.bind(this));
    this.engine.onFixedUpdate(this.fixedUpdate.bind(this));
    this.engine.onRender(this.render.bind(this));

    Debug.log('Game', 'Instance created');
  }

  /**
   * Инициализация игры
   */
  public async init(): Promise<void> {
    Debug.init();
    Debug.log('Game', 'Initializing...');

    // Получение контейнера
    const container = document.getElementById('game-container');
    if (!container) {
      throw new Error('Game container not found');
    }

    // Инициализация рендерера
    await this.renderer.init(this.config, container);
    Debug.log('Game', 'Renderer initialized');

    // Создание тестовой карты
    this.currentMap = MapGenerator.createTestMap(4, 4);
    Debug.log('Game', `Map created: ${this.currentMap.widthInBlocks}x${this.currentMap.heightInBlocks} blocks`);

    // Инициализация камеры
    const worldWidth = this.currentMap.widthInBlocks * GAME_CONSTANTS.BLOCK_SIZE;
    const worldHeight = this.currentMap.heightInBlocks * GAME_CONSTANTS.BLOCK_SIZE;

    this.camera = new Camera({
      screenWidth: this.config.width,
      screenHeight: this.config.height,
      worldBounds: {
        x: 0,
        y: 0,
        width: worldWidth,
        height: worldHeight,
      },
      smoothing: 0.1,
    });

    // Привязка камеры к контейнеру
    this.camera.attachTo(this.renderer.getGameContainer());

    // Начальная позиция камеры (центр карты)
    this.camera.setPosition(worldWidth / 2, worldHeight / 2);

    // Инициализация ввода
    this.inputManager = new InputManager();

    // Инициализация физики
    this.physicsManager = new PhysicsManager({
      gravity: { x: 0, y: 0 }, // Вид сверху
    });
    Debug.log('Game', 'Physics initialized');

    // Инициализация аудио
    preloadSounds(audioManager);
    this.setupAudioEvents();
    Debug.log('Game', 'Audio initialized');

    // Инициализация ECS
    this.systemManager = new SystemManager();
    // VehicleInteractionSystem должен идти ПЕРЕД playerInput (чтобы обработать вход/выход первым)
    this.systemManager.register('vehicleInteraction', createVehicleInteractionSystem(this.inputManager, this.currentMap), -5);
    this.systemManager.register('playerInput', createPlayerInputSystem(this.inputManager), 0);
    // Инициализация сети трафика
    this.trafficNetwork = generateTrafficNetwork(this.currentMap);
    Debug.log('Game', 'Traffic network generated');

    // AI системы ДОЛЖНЫ идти ДО vehiclePhysics, чтобы их ввод (throttle/steering) обрабатывался в том же кадре
    // PedestrianAISystem для управления NPC пешеходами
    this.systemManager.register('pedestrianAI', createPedestrianAISystem(this.currentMap), 1);
    // TrafficAISystem для управления NPC машинами
    this.systemManager.register('trafficAI', createTrafficAISystem(this.trafficNetwork), 2);
    // WeaponSystem для обработки стрельбы (после AI, перед physics)
    this.systemManager.register('weapon', createWeaponSystem(this.inputManager), 3);
    // VehiclePhysicsSystem должен идти ПОСЛЕ AI (для получения AI ввода) и перед movement/mapCollision
    this.systemManager.register('vehiclePhysics', createVehiclePhysicsSystem(this.physicsManager, this.currentMap), 5);
    // SurfaceEffectSystem для спавна частиц поверхностей (после vehiclePhysics для получения скорости)
    this.systemManager.register('surfaceEffects', createSurfaceEffectSystem(this.currentMap), 6);
    this.systemManager.register('movement', movementSystem, 10);
    // SlopeSystem для обработки наклонных блоков (после movement, до collision)
    this.systemManager.register('slope', createSlopeSystem(this.currentMap), 11);
    // ProjectileSystem для обработки снарядов (после slope, перед collision)
    this.systemManager.register('projectile', createProjectileSystem(this.currentMap), 12);
    // Регистрация системы коллизий после movement и slope
    this.systemManager.register('mapCollision', createMapCollisionSystem(this.currentMap), 15);
    // EntityCollisionSystem для коллизий между сущностями (после mapCollision)
    this.systemManager.register('entityCollision', createEntityCollisionSystem(), 17);
    // HealthSystem для обработки урона и смерти (после collision/projectile, перед animation)
    this.systemManager.register('health', createHealthSystem(), 18);
    this.systemManager.register('animation', animationSystem, 20);
    // Регистрация системы синхронизации физики (после всех физических систем)
    this.systemManager.register('physicsSync', createPhysicsSyncSystem(this.physicsManager), 50);

    // Создание тестового игрока
    const world = ecsWorld.getWorld();
    this.playerEntity = EntityFactory.createPlayer(world, worldWidth / 2, worldHeight / 2);
    Debug.log('Game', `Player entity created: ${this.playerEntity}`);

    // Инициализация SpawnManager
    this.spawnManager = new SpawnManager(world, this.currentMap, this.physicsManager, {
      pedestrianDensity: 0.3,
      vehicleDensity: 0.2,
      spawnRadius: 800,
      despawnRadius: 1200,
      maxPedestrians: 30,
      maxVehicles: 15,
    });
    // Set traffic network for AI navigation
    this.spawnManager.setTrafficNetwork(this.trafficNetwork);
    Debug.log('Game', 'SpawnManager initialized');

    // Инициализация DistrictManager и создание районов
    this.districtManager = new DistrictManager();
    this.setupDistricts(worldWidth, worldHeight);
    this.spawnManager.setDistrictManager(this.districtManager);
    this.setupDistrictEvents();
    Debug.log('Game', 'DistrictManager initialized');

    // Создание тестовых машин разных типов
    const vehicle1 = EntityFactory.createVehicle(
      world,
      worldWidth / 2 - 100,
      worldHeight / 2,
      VehicleType.CAR_SPORT,
      this.physicsManager,
    );
    const vehicle2 = EntityFactory.createVehicle(
      world,
      worldWidth / 2 + 100,
      worldHeight / 2,
      VehicleType.CAR_SEDAN,
      this.physicsManager,
    );
    const vehicle3 = EntityFactory.createVehicle(
      world,
      worldWidth / 2,
      worldHeight / 2 - 100,
      VehicleType.CAR_TAXI,
      this.physicsManager,
    );
    const vehicle4 = EntityFactory.createVehicle(
      world,
      worldWidth / 2,
      worldHeight / 2 + 100,
      VehicleType.TRUCK,
      this.physicsManager,
    );
    const vehicle5 = EntityFactory.createVehicle(
      world,
      worldWidth / 2 - 200,
      worldHeight / 2 - 100,
      VehicleType.BUS,
      this.physicsManager,
    );
    const vehicle6 = EntityFactory.createVehicle(
      world,
      worldWidth / 2 + 200,
      worldHeight / 2 - 100,
      VehicleType.MOTORCYCLE,
      this.physicsManager,
    );
    const vehicle7 = EntityFactory.createVehicle(
      world,
      worldWidth / 2 - 200,
      worldHeight / 2 + 100,
      VehicleType.TANK,
      this.physicsManager,
    );

    // Добавляем AI трафика к тестовым машинам, чтобы они двигались
    const testVehicles = [vehicle1, vehicle2, vehicle3, vehicle4, vehicle5, vehicle6, vehicle7];
    for (const eid of testVehicles) {
      addComponent(world, eid, TrafficAI);
      TrafficAI.state[eid] = 0; // DRIVING
      TrafficAI.previousState[eid] = 0;
      TrafficAI.desiredSpeed[eid] = 100 + Math.random() * 50;
      TrafficAI.aggressiveness[eid] = 0.3 + Math.random() * 0.4;
      TrafficAI.patience[eid] = 3 + Math.random() * 3;
      TrafficAI.distanceToNext[eid] = 0;
      TrafficAI.hasObstacle[eid] = 0;
      TrafficAI.stateTimer[eid] = 0;
      TrafficAI.waitTimer[eid] = 0;

      // Находим ближайший waypoint для инициализации
      const nearestWaypoint = this.trafficNetwork.getNearestWaypoint(Position.x[eid], Position.y[eid], 0);
      if (nearestWaypoint) {
        TrafficAI.currentWaypointId[eid] = nearestWaypoint.id;
        // Поворачиваем машину к следующему waypoint
        const nextWaypoint = this.trafficNetwork.getNextWaypoint(nearestWaypoint.id);
        if (nextWaypoint) {
          const dx = nextWaypoint.x - Position.x[eid];
          const dy = nextWaypoint.y - Position.y[eid];
          Rotation.angle[eid] = Math.atan2(dy, dx);
        }
      } else {
        console.warn(`No waypoint found for test vehicle ${eid}`);
      }
    }
    Debug.log('Game', `Test vehicles created: ${vehicle1}, ${vehicle2}, ${vehicle3}, ${vehicle4}, ${vehicle5}, ${vehicle6}, ${vehicle7}`);

    // Создание тестовых NPC пешеходов
    const pedestrianCount = 20;
    const pedestrians: number[] = [];
    for (let i = 0; i < pedestrianCount; i++) {
      const angle = (i / pedestrianCount) * Math.PI * 2;
      const radius = 200 + Math.random() * 300;
      const pedX = worldWidth / 2 + Math.cos(angle) * radius;
      const pedY = worldHeight / 2 + Math.sin(angle) * radius;
      const pedType = Math.floor(Math.random() * 3); // 0-2 разные типы пешеходов
      const ped = EntityFactory.createPedestrian(world, pedX, pedY, pedType);
      pedestrians.push(ped);
    }
    Debug.log('Game', `Test pedestrians created: ${pedestrians.length} NPCs`);

    // Передача карты рендереру
    this.renderer.setMap(this.currentMap);

    // Инициализация отладочной визуализации
    const debugRenderSystem = createDebugRenderSystem(this.renderer.getDebugContainer());
    this.renderer.setDebugRenderSystem(debugRenderSystem);
    Debug.log('Game', 'Debug render system initialized');

    // Инициализация отладочного оверлея (текст на экране)
    this.debugOverlay = new DebugOverlay(this.renderer.getUIContainer());
    Debug.log('Game', 'Debug overlay initialized');

    // Обработка ресайза
    window.addEventListener('resize', this.handleResize.bind(this));

    Debug.log('Game', 'Initialization complete');
  }

  /**
   * Запуск игры
   */
  public start(): void {
    Debug.log('Game', 'Starting...');
    this.engine.start();
    eventBus.emit('game:started');
  }

  /**
   * Остановка игры
   */
  public stop(): void {
    Debug.log('Game', 'Stopping...');
    this.engine.stop();
    eventBus.emit('game:stopped');
  }

  /**
   * Обновление каждый кадр
   */
  private update(_dt: number): void {
    Debug.updateFps(this.engine.getFps());

    // Камера следует за игроком
    if (this.playerEntity && Position.x[this.playerEntity] !== undefined) {
      const playerX = Position.x[this.playerEntity];
      const playerY = Position.y[this.playerEntity];
      this.camera.follow({ x: playerX, y: playerY });
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

    // Debug mode toggles (F1-F5 keys) - render debug
    if (this.inputManager.isKeyJustPressed('F1')) {
      this.debugModeManager.toggleRenderDebugMode(RenderDebugMode.COLLISION);
    }
    if (this.inputManager.isKeyJustPressed('F2')) {
      this.debugModeManager.toggleRenderDebugMode(RenderDebugMode.AI);
    }
    if (this.inputManager.isKeyJustPressed('F3')) {
      this.debugModeManager.toggleRenderDebugMode(RenderDebugMode.PHYSICS);
    }
    if (this.inputManager.isKeyJustPressed('F4')) {
      this.debugModeManager.toggleRenderDebugMode(RenderDebugMode.Z_LEVEL);
    }
    if (this.inputManager.isKeyJustPressed('F5')) {
      this.debugModeManager.toggleRenderDebugMode(RenderDebugMode.ALL);
    }

    // Special debug modes (F9-F12)
    if (this.inputManager.isKeyJustPressed('F9')) {
      this.debugModeManager.toggleGodMode();
    }
    if (this.inputManager.isKeyJustPressed('F10')) {
      this.debugModeManager.toggleSlowMotion();
    }
    if (this.inputManager.isKeyJustPressed('F11')) {
      // Toggle fullscreen
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    }

    // Frame by frame mode (Comma/Period)
    if (this.inputManager.isKeyJustPressed(',')) {
      this.debugModeManager.toggleFrameByFrame();
    }
    if (this.inputManager.isKeyJustPressed('.')) {
      if (this.debugModeManager.isFrameByFrame()) {
        this.debugModeManager.advanceFrame();
      } else {
        this.debugModeManager.togglePause();
      }
    }

    // Number keys for quick mode switching (1-9, 0)
    const numberKeys: Record<string, DebugMode> = {
      '1': DebugMode.WORLD_ONLY,
      '2': DebugMode.PLAYER_BASIC,
      '3': DebugMode.VEHICLES_ONLY,
      '4': DebugMode.COMBAT_ONLY,
      '5': DebugMode.AI_ONLY,
      '6': DebugMode.GAMEPLAY_BASIC,
      '7': DebugMode.NO_VEHICLES,
      '8': DebugMode.NO_AI,
      '9': DebugMode.GOD_MODE,
      '0': DebugMode.FULL_GAME,
    };
    for (const [key, mode] of Object.entries(numberKeys)) {
      if (this.inputManager.isKeyJustPressed(key)) {
        this.debugModeManager.switchMode(mode);
      }
    }

    // H key - show full debug info
    if (this.inputManager.isKeyJustPressed('h')) {
      this.debugOverlay?.showFullDebugInfo();
    }

    // Обновление камеры
    this.camera.update(16.67); // dt для камеры

    // Обновление viewport для culling
    const viewport = this.camera.getViewport();
    this.renderer.getMapRenderer()?.setViewport(viewport);

    // Обновление рендерера (передаём world для debug render system)
    const world = ecsWorld.getWorld();
    this.renderer.update(world);

    // Обновление debug overlay
    if (this.debugOverlay) {
      this.debugOverlay.update(_dt);
    }

    // Очистка состояния ввода
    this.inputManager.update();
  }

  /**
   * Фиксированное обновление (физика)
   */
  private fixedUpdate(dt: number): void {
    // Применяем масштаб времени из debug mode manager
    const scaledDt = this.debugModeManager.getScaledDt(dt);

    // Если на паузе и не в покадровом режиме - пропускаем
    if (scaledDt === 0 && !this.debugModeManager.isFrameByFrame()) {
      return;
    }

    const world = ecsWorld.getWorld();

    // Обновление ECS систем
    this.systemManager.update(world, scaledDt);

    // Обновление SpawnManager (спавн/деспавн сущностей)
    if (this.playerEntity > 0) {
      const playerX = Position.x[this.playerEntity] ?? 0;
      const playerY = Position.y[this.playerEntity] ?? 0;
      this.spawnManager.update(playerX, playerY, scaledDt);

      // Обновление текущего района
      this.districtManager.updateCurrentDistrict(playerX, playerY);
    }

    // Обновление физики
    this.physicsManager.update(scaledDt);
  }

  /**
   * Рендеринг
   */
  private render(_interpolation: number): void {
    this.renderer.beginFrame();
    // Рендеринг объектов будет здесь
    this.renderer.endFrame();
  }

  /**
   * Обработка изменения размера окна
   */
  private handleResize(): void {
    // В будущем можно адаптировать размер
  }

  /**
   * Настройка аудио событий
   */
  private setupAudioEvents(): void {
    // Звук при входе в машину
    eventBus.on('vehicle:entered', ({ vehicle, player }) => {
      audioManager.playSound('engine_idle');
      Debug.log('Audio', `Vehicle entered: ${vehicle} by ${player}`);
    });

    // Звук при выходе из машины
    eventBus.on('vehicle:exited', ({ vehicle, player }) => {
      audioManager.stopSound('engine_idle');
      Debug.log('Audio', `Vehicle exited: ${vehicle} by ${player}`);
    });

    // Обработка коллизий для звуков столкновений
    eventBus.on('physics:collisionStart', ({ entityA, entityB, pair }) => {
      // Проверяем, что обе сущности - машины
      const isVehicleA = Vehicle.type[entityA] !== undefined;
      const isVehicleB = Vehicle.type[entityB] !== undefined;

      if (isVehicleA && isVehicleB) {
        // Вычисляем импульс столкновения через относительную скорость
        const { bodyA, bodyB } = pair;
        const relativeVelocity = Math.sqrt(
          Math.pow(bodyA.velocity.x - bodyB.velocity.x, 2) +
          Math.pow(bodyA.velocity.y - bodyB.velocity.y, 2),
        );
        const threshold = 10; // Порог для проигрывания звука

        if (relativeVelocity > threshold) {
          const ax = Position.x[entityA] ?? 0;
          const ay = Position.y[entityA] ?? 0;
          const cameraPos = this.camera.getPosition();

          // Volume зависит от силы удара
          const volume = Math.min(1, relativeVelocity / 100);
          audioManager.playSoundAt('car_crash', ax, ay, cameraPos.x, cameraPos.y, { volume });
          Debug.log('Audio', `Vehicle crash: ${entityA} <-> ${entityB}, velocity: ${relativeVelocity.toFixed(2)}`);
        }
      }
    });

    // Звук при нажатии UI кнопок
    eventBus.on('ui:click', () => {
      audioManager.playSound('ui_click');
    });

    // Звук при изменении настроек громкости
    eventBus.on('audio:volumeChanged', ({ category, volume }) => {
      switch (category) {
        case 'master':
          audioManager.setMasterVolume(volume);
          break;
        case 'sfx':
          audioManager.setSFXVolume(volume);
          break;
        case 'music':
          audioManager.setMusicVolume(volume);
          break;
      }
      Debug.log('Audio', `Volume changed: ${category} = ${volume.toFixed(2)}`);
    });
  }

  /**
   * Настройка районов карты
   */
  private setupDistricts(worldWidth: number, worldHeight: number): void {
    const quarterWidth = worldWidth / 4;
    const quarterHeight = worldHeight / 4;

    // Downtown (центр города) - высокая плотность пешеходов и машин
    this.districtManager.addDistrict(createRectDistrictConfig(
      'downtown',
      'Downtown',
      quarterWidth,
      quarterHeight,
      quarterWidth * 2,
      quarterHeight * 2,
      {
        pedestrianDensity: 0.8,
        vehicleDensity: 0.6,
        vehicleTypes: [VehicleType.CAR_SEDAN, VehicleType.CAR_TAXI, VehicleType.CAR_SPORT, VehicleType.BUS],
        pedestrianTypes: [0, 1, 2],
        ambientTrack: 'ambient_city',
        policePresence: 0.7,
      },
    ));

    // Industrial Zone (юго-восток) - низкая плотность, грузовики
    this.districtManager.addDistrict(createRectDistrictConfig(
      'industrial',
      'Industrial Zone',
      quarterWidth * 2,
      quarterHeight * 2,
      quarterWidth * 2,
      quarterHeight * 2,
      {
        pedestrianDensity: 0.2,
        vehicleDensity: 0.4,
        vehicleTypes: [VehicleType.TRUCK, VehicleType.BUS],
        pedestrianTypes: [3, 4],
        ambientTrack: 'ambient_industrial',
        policePresence: 0.2,
      },
    ));

    // Residential District (северо-запад) - средняя плотность, легковые машины
    this.districtManager.addDistrict(createRectDistrictConfig(
      'residential',
      'Residential District',
      0,
      0,
      quarterWidth * 2,
      quarterHeight * 2,
      {
        pedestrianDensity: 0.5,
        vehicleDensity: 0.3,
        vehicleTypes: [VehicleType.CAR_SEDAN, VehicleType.CAR_TAXI],
        pedestrianTypes: [0, 1, 2],
        ambientTrack: 'ambient_quiet',
        policePresence: 0.3,
      },
    ));

    // Entertainment District (северо-восток) - высокая плотность, спортивные машины
    this.districtManager.addDistrict(createRectDistrictConfig(
      'entertainment',
      'Entertainment District',
      quarterWidth * 2,
      0,
      quarterWidth * 2,
      quarterHeight * 2,
      {
        pedestrianDensity: 0.9,
        vehicleDensity: 0.5,
        vehicleTypes: [VehicleType.CAR_SPORT, VehicleType.CAR_SEDAN, VehicleType.MOTORCYCLE],
        pedestrianTypes: [0, 1, 2],
        ambientTrack: 'ambient_nightlife',
        policePresence: 0.5,
      },
    ));

    // Suburbs (юго-запад) - низкая плотность
    this.districtManager.addDistrict(createRectDistrictConfig(
      'suburbs',
      'Suburbs',
      0,
      quarterHeight * 2,
      quarterWidth * 2,
      quarterHeight * 2,
      {
        pedestrianDensity: 0.3,
        vehicleDensity: 0.2,
        vehicleTypes: [VehicleType.CAR_SEDAN, VehicleType.CAR_TAXI],
        pedestrianTypes: [0, 1],
        ambientTrack: 'ambient_quiet',
        policePresence: 0.1,
      },
    ));

    Debug.log('Game', `Created ${this.districtManager.getCount()} districts`);
  }

  /**
   * Настройка событий районов
   */
  private setupDistrictEvents(): void {
    eventBus.on('district:changed', ({ from, to }) => {
      const fromName = from?.name ?? 'Wilderness';
      const toName = to?.name ?? 'Wilderness';

      Debug.log('District', `Entered: ${toName} (from ${fromName})`);

      // Показать UI уведомление о смене района
      if (to) {
        const indicator = getDistrictIndicator();
        indicator.show(to.name);
      }

      // TODO: Сменить фоновую музыку/звуки в соответствии с районом
    });
  }

  /**
   * Получить рендерер
   */
  public getRenderer(): Renderer {
    return this.renderer;
  }

  /**
   * Получить карту
   */
  public getMap(): GameMap | null {
    return this.currentMap;
  }

  /**
   * Получить камеру
   */
  public getCamera(): Camera {
    return this.camera;
  }

  /**
   * Получить конфигурацию
   */
  public getConfig(): GameConfig {
    return this.config;
  }

  /**
   * Получить аудио менеджер
   */
  public getAudioManager() {
    return audioManager;
  }
}
