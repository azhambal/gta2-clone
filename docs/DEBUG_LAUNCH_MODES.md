# Debug Launch Modes
## Режимы запуска для отладки GTA2 Clone

Этот документ описывает все варианты запуска игры для целей отладки и тестирования. Каждый режим изолирует определённые подсистемы или включает специфический набор функций.

---

## Содержание

1. [Уровни запуска по сложности](#уровни-запуска-по-сложности)
2. [Изолированные режимы систем](#изолированные-режимы-систем)
3. [Комбинированные режимы](#комбинированные-режимы)
4. [Специальные режимы тестирования](#специальные-режимы-тестирования)
5. [Режимы производительности](#режимы-производительности)
6. [Конфигурация через URL параметры](#конфигурация-через-url-параметры)
7. [Конфигурация через конфиг-файл](#конфигурация-через-конфиг-файл)

---

## Уровни запуска по сложности

### Уровень 0: BARE_MINIMAL
**Только проверка инициализации движка**

```typescript
{
  mode: "BARE_MINIMAL",
  description: "Минимальный запуск - проверка инициализации PixiJS",
  systems: {
    renderer: true,
    map: false,
    entities: false,
    input: false,
    physics: false,
    ai: false,
    audio: false
  },
  spawn: {
    player: false,
    vehicles: 0,
    pedestrians: 0
  },
  purpose: "Проверить что PixiJS инициализируется, canvas создаётся"
}
```

**Что проверяется:**
- Canvas создаётся и отображается
- PixiJS Application запускается
- Нет ошибок при загрузке

---

### Уровень 1: WORLD_ONLY
**Только рендеринг карты**

```typescript
{
  mode: "WORLD_ONLY",
  description: "Только карта - проверка генерации и рендеринга блоков",
  systems: {
    renderer: true,
    map: true,
    entities: false,
    input: false,
    physics: false,
    ai: false,
    audio: false
  },
  spawn: {
    player: false,
    vehicles: 0,
    pedestrians: 0
  },
  camera: {
    followPlayer: false,
    position: { x: "center", y: "center" }
  },
  purpose: "Проверить загрузку карты, рендеринг блоков, слои Z-уровней"
}
```

**Что проверяется:**
- Карта генерируется правильно
- Блоки рендерятся корректно
- Z-уровни отображаются верно
- Производительность рендеринга карты

---

### Уровень 2: STATIC_ENTITIES
**Карта + статические сущности**

```typescript
{
  mode: "STATIC_ENTITIES",
  description: "Карта + статические машины (без физики)",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: false,
    physics: false,
    ai: false,
    audio: false
  },
  spawn: {
    player: false,
    vehicles: 10,  // статические, не двигаются
    vehicleType: "static", // без RigidBody
    pedestrians: 0
  },
  purpose: "Проверить спавн сущностей, спрайты, позиционирование"
}
```

**Что проверяется:**
- Сущности спавнятся в правильных позициях
- Спрайты загружаются и отображаются
- Порядок отрисовки (depth sorting)
- Z-индексы сущностей

---

### Уровень 3: PLAYER_BASIC
**Игрок + базовое движение**

```typescript
{
  mode: "PLAYER_BASIC",
  description: "Игрок с базовым движением без коллизий",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: false,
    ai: false,
    audio: false
  },
  spawn: {
    player: true,
    vehicles: 0,
    pedestrians: 0
  },
  player: {
    collisionEnabled: false,
    canEnterVehicles: false
  },
  purpose: "Проверить управление игроком, ввод, камеру"
}
```

**Что проверяется:**
- WASD управление работает
- Мышь работает
- Камера следует за игроком
- Зум работает

---

### Уровень 4: PLAYER_COLLISION
**Игрок + коллизии**

```typescript
{
  mode: "PLAYER_COLLISION",
  description: "Игрок с коллизией со стенами",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: false,
    collision: true,
    ai: false,
    audio: false
  },
  spawn: {
    player: true,
    vehicles: 0,
    pedestrians: 0
  },
  collision: {
    mapCollision: true,
    entityCollision: false
  },
  purpose: "Проверить систему коллизий со статикой"
}
```

**Что проверяется:**
- Игрок не проходит сквозь стены
- Скользящее движение вдоль стен
- Коррекция позиции при коллизии

---

### Уровень 5: VEHICLES_ONLY
**Только транспорт (игрок в машине)**

```typescript
{
  mode: "VEHICLES_ONLY",
  description: "Игрок + машины без других сущностей",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    ai: false,
    audio: true
  },
  spawn: {
    player: true,
    playerStartsInVehicle: true,
    vehicles: 5,  // разные типы
    pedestrians: 0
  },
  vehicles: {
    enableAI: false,
    enablePhysics: true
  },
  purpose: "Проверить физику транспорта, управление, вход/выход"
}
```

**Что проверяется:**
- Управление машиной (газ/тормоз/руль)
- Физика движения
- Вход/выход из машины
- Разные типы транспорта

---

### Уровень 6: COMBAT_ONLY
**Только боевая система**

```typescript
{
  mode: "COMBAT_ONLY",
  description: "Игрок + оружие + статические мишени",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: false,
    collision: true,
    weapon: true,
    projectile: true,
    health: true,
    ai: false,
    audio: true
  },
  spawn: {
    player: true,
    vehicles: 0,
    pedestrians: 10,  // статические мишени
    targets: 20  // деревянные мишени
  },
  player: {
    startingWeapons: ["pistol", "uzi", "shotgun"],
    infiniteAmmo: true
  },
  purpose: "Проверить боевую систему: стрельба, урон, попадания"
}
```

**Что проверяется:**
- Оружие стреляет
- Снаряды летят
- Попадания детектируются
- Урон применяется
- Звуки выстрелов

---

### Уровень 7: AI_ONLY
**Только AI (игрок-наблюдатель)**

```typescript
{
  mode: "AI_ONLY",
  description: "Только AI системы, игрок наблюдатель",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,  // только камеры
    physics: true,
    collision: true,
    ai: true,
    audio: false
  },
  spawn: {
    player: true,  // как наблюдатель
    playerInvulnerable: true,
    playerCollisionsDisabled: true,
    vehicles: 20,  // все с AI
    pedestrians: 50
  },
  ai: {
    traffic: true,
    pedestrians: true,
    debug: true  // показать цели, состояния
  },
  purpose: "Проверить AI системы без вмешательства игрока"
}
```

**Что проверяется:**
- Traffic AI следует по дорогам
- Pedestrian AI патрулирует
- AI избегает препятствий
- Состояния AI меняются корректно

---

### Уровень 8: COLLISION_STRESS
**Стресс-тест коллизий**

```typescript
{
  mode: "COLLISION_STRESS",
  description: "Много сущностей для теста коллизий",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    ai: false,  // без AI, просто толпа
    audio: false
  },
  spawn: {
    player: true,
    vehicles: 50,  // без физики, просто коллайдеры
    pedestrians: 200
  },
  entities: {
    noAI: true,  // стоят на месте или двигаются случайно
    physicsDisabled: true  // только коллизии
  },
  purpose: "Тест производительности системы коллизий"
}
```

**Что проверяется:**
- Производительность при многих коллизиях
- Корректность разрешения коллизий
- Нет "застревания" сущностей

---

### Уровень 9: GAMEPLAY_BASIC
**Базовый геймплей**

```typescript
{
  mode: "GAMEPLAY_BASIC",
  description: "Полный базовый геймплей",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: true,
    weapon: true,
    projectile: true,
    health: true,
    ai: false,  // без AI
    audio: true,
    ui: true
  },
  spawn: {
    player: true,
    vehicles: 10,  // пустые, без AI
    pedestrians: 0
  },
  purpose: "Полный цикл геймплея без AI"
}
```

**Что проверяется:**
- Полный цикл игры
- Все системы работают вместе
- Нет критических багов

---

### Уровень 10: AI_INTERACTION
**AI + взаимодействие**

```typescript
{
  mode: "AI_INTERACTION",
  description: "Игрок + AI системы",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: true,
    ai: true,
    health: true,
    weapon: false,  // без оружия
    audio: true,
    ui: true
  },
  spawn: {
    player: true,
    vehicles: 15,  // с AI
    pedestrians: 30
  },
  purpose: "Проверить взаимодействие игрока с AI"
}
```

**Что проверяется:**
- Игрок может въехать в AI машину
- AI реагирует на игрока
- Pedestrian AI уворачивается

---

### Уровень 11: COMBAT_AI
**Бой с AI**

```typescript
{
  mode: "COMBAT_AI",
  description: "Боевая система + AI противники",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    weapon: true,
    projectile: true,
    health: true,
    ai: true,  // враждебный AI
    audio: true,
    ui: true
  },
  spawn: {
    player: true,
    playerStartsInVehicle: true,
    vehicles: 10,  // враждебные
    pedestrians: 20  // враждебные
  },
  ai: {
    hostile: true,
    canShoot: true
  },
  purpose: "Проверить боевую систему против AI"
}
```

**Что проверяется:**
- AI стреляет в игрока
- Игрок может убить AI
- AI убегает при ранении

---

### Уровень 12: FULL_GAME
**Полная игра**

```typescript
{
  mode: "FULL_GAME",
  description: "Полная игра со всеми системами",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: true,
    weapon: true,
    projectile: true,
    health: true,
    ai: true,
    audio: true,
    ui: true,
    districts: true,
    spawning: true,
    surfaceEffects: true,
    slopes: true
  },
  spawn: {
    player: true,
    vehicles: "auto",  // через SpawnManager
    pedestrians: "auto"
  },
  game: {
    wantedLevel: true,
    police: true,
    missions: false
  },
  purpose: "Полная игра - все системы включены"
}
```

---

## Изолированные режимы систем

### Режим: PHYSICS_ONLY
**Только физика Matter.js**

```typescript
{
  mode: "PHYSICS_ONLY",
  description: "Только физика без рендеринга",
  systems: {
    renderer: "minimal",  // только базовый рендер
    physics: true,
    physicsDebug: true,  // Matter.js debug render
    map: true,  // только коллизии
    input: false
  },
  spawn: {
    player: false,
    vehicles: 20,  // для теста физики
    pedestrians: 0
  },
  physics: {
    showDebug: true,
    showColliders: true,
    showVelocity: true
  },
  purpose: "Отладка физики Matter.js"
}
```

---

### Режим: RENDERER_ONLY
**Только рендеринг**

```typescript
{
  mode: "RENDERER_ONLY",
  description: "Тест рендеринга без логики",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: false,  // только для управления камерой
    physics: false
  },
  renderer: {
    showFPS: true,
    showDrawCalls: true,
    showEntities: true,
    wireframeMode: true
  },
  spawn: {
    player: false,
    vehicles: 100,  // статические
    pedestrians: 200
  },
  purpose: "Тест производительности рендеринга"
}
```

---

### Режим: AI_DEBUG
**Отладка AI**

```typescript
{
  mode: "AI_DEBUG",
  description: "AI с максимальной отладочной информацией",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    ai: true,
    debug: "maximum"
  },
  debug: {
    ai: {
      showStates: true,
      showTargets: true,
      showPaths: true,
      showWaypoints: true,
      showDecisionTimers: true,
      logStateChanges: true,
      showThinkProcess: true
    },
    traffic: {
      showNetwork: true,
      showConnections: true,
      showCurrentWaypoint: true,
      showNextWaypoint: true
    }
  },
  spawn: {
    player: true,
    playerInvulnerable: true,
    vehicles: 10,
    pedestrians: 20
  },
  purpose: "Глубокая отладка AI"
}
```

---

### Режим: COLLISION_DEBUG
**Отладка коллизий**

```typescript
{
  mode: "COLLISION_DEBUG",
  description: "Максимальная отладка коллизий",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: false,
    collision: true,
    debug: "maximum"
  },
  debug: {
    collision: {
      showColliders: true,
      showCollisionNormals: true,
      showCollisionEvents: true,
      highlightColliding: true,
      showPenetrationDepth: true,
      logCollisions: true,
      slowMotion: 0.1  // замедление для детального просмотра
    }
  },
  spawn: {
    player: true,
    vehicles: 5,
    pedestrians: 10
  },
  purpose: "Детальная отладка коллизий"
}
```

---

### Режим: Z_LEVELS_TEST
**Тест Z-уровней**

```typescript
{
  mode: "Z_LEVELS_TEST",
  description: "Специальная карта для теста Z-уровней",
  map: {
    type: "z_levels_test",  // специальная карта
    features: {
      bridges: true,
      tunnels: true,
      slopes: true,
      multiLevel: true
    }
  },
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    slopes: true,
    debug: true
  },
  spawn: {
    player: true,
    vehicles: 5,  // на разных уровнях
    pedestrians: 10
  },
  debug: {
    zLevels: {
      showCurrentZ: true,
      colorCodeByZ: true,
      showSlopeBlocks: true,
      showDepthSorting: true
    }
  },
  purpose: "Тест многоуровневости"
}
```

---

### Режим: WEAPONS_TEST
**Полигон для теста оружия**

```typescript
{
  mode: "WEAPONS_TEST",
  description: "Полигон для теста всех типов оружия",
  map: {
    type: "weapons_test_range"
  },
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    weapon: true,
    projectile: true,
    health: true,
    debug: true
  },
  spawn: {
    player: true,
    playerInvulnerable: true,
    targets: {
      stationary: 20,
      moving: 10,
      armored: 5
    }
  },
  player: {
    allWeapons: true,
    infiniteAmmo: true,
    weaponSwitch: "all"
  },
  debug: {
    weapons: {
      showTrajectories: true,
      showHitboxes: true,
      showDamage: true,
      logHits: true
    }
  },
  purpose: "Тест всех типов оружия"
}
```

---

### Режим: VEHICLE_TEST
**Полигон для теста транспорта**

```typescript
{
  mode: "VEHICLE_TEST",
  description: "Полигон для теста всех типов транспорта",
  map: {
    type: "vehicle_test_track",
    features: {
      straightRoads: true,
      curves: true,
      jumps: true,
      obstacles: true
    }
  },
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: true,
    debug: true
  },
  spawn: {
    player: true,
    playerStartsInVehicle: true,
    availableVehicles: "all"
  },
  debug: {
    vehicles: {
      showPhysics: true,
      showSpeed: true,
      showThrottle: true,
      showSteering: true,
      showGrip: true
    }
  },
  vehicle: {
    instantEnter: true,  // без анимации
    indestructible: true,
    allTypesUnlocked: true
  },
  purpose: "Тест физики всех типов транспорта"
}
```

---

## Комбинированные режимы

### Режим: NO_VEHICLES
**Без транспорта**

```typescript
{
  mode: "NO_VEHICLES",
  description: "Только пешеходный режим",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: false,
    weapon: true,
    ai: true,
    audio: true
  },
  spawn: {
    player: true,
    vehicles: 0,
    pedestrians: 50
  },
  purpose: "Тест пешеходного геймплея"
}
```

---

### Режим: NO_AI
**Без AI**

```typescript
{
  mode: "NO_AI",
  description: "Пустой мир для свободного исследования",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: true,
    weapon: true,
    ai: false,
    audio: true
  },
  spawn: {
    player: true,
    vehicles: 20,  // пустые
    pedestrians: 0
  },
  purpose: "Свободное исследование мира"
}
```

---

### Режим: NO_COLLISION
**Без коллизий**

```typescript
{
  mode: "NO_COLLISION",
  description: "Режим полёта - без коллизий",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: false,
    vehicle: true,
    ai: true
  },
  spawn: {
    player: true,
    playerCanFly: true,  // noclip режим
    vehicles: 10,
    pedestrians: 20
  },
  purpose: "Проход сквозь стены для тестирования"
}
```

---

### Режим: NO_BUILDINGS
**Без зданий**

```typescript
{
  mode: "NO_BUILDINGS",
  description: "Только дороги - без зданий",
  map: {
    type: "roads_only",
    generateBuildings: false
  },
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: true,
    ai: true
  },
  spawn: {
    player: true,
    vehicles: 20,
    pedestrians: 30
  },
  purpose: "Тест на пустой карте"
}
```

---

### Режим: NO_ENVIRONMENT
**Без окружения**

```typescript
{
  mode: "NO_ENVIRONMENT",
  description: "Пустая плоскость",
  map: {
    type: "empty_plane",
    generateRoads: false,
    generateBuildings: false,
    generateProps: false
  },
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: false
  },
  spawn: {
    player: true,
    vehicles: 5,
    pedestrians: 10
  },
  purpose: "Минимальное окружение"
}
```

---

### Режим: PEDESTRIANS_ONLY
**Только пешеходы**

```typescript
{
  mode: "PEDESTRIANS_ONLY",
  description: "Толпа - без транспорта",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: false,
    ai: true
  },
  spawn: {
    player: true,
    vehicles: 0,
    pedestrians: 200  // много пешеходов
  },
  ai: {
    pedestrian: {
      variety: true,  // разные типы
      behaviors: ["walk", "idle", "flee", "wander"]
    }
  },
  purpose: "Стресс-тест пешеходного AI"
}
```

---

### Режим: TRAFFIC_ONLY
**Только трафик**

```typescript
{
  mode: "TRAFFIC_ONLY",
  description: "Только машины - без пешеходов",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: true,
    ai: true
  },
  spawn: {
    player: true,
    playerStartsInVehicle: true,
    vehicles: 50,  // плотный трафик
    pedestrians: 0
  },
  ai: {
    traffic: {
      density: "high",
      obeyRules: true,
      reactToPlayer: true
    }
  },
  purpose: "Стресс-тест трафик AI"
}
```

---

## Специальные режимы тестирования

### Режим: GOD_MODE
**Режим бога**

```typescript
{
  mode: "GOD_MODE",
  description: "Игрок бессмертен, всё разблокировано",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: true,
    weapon: true,
    projectile: true,
    health: true,
    ai: true,
    audio: true
  },
  player: {
    godMode: true,
    invulnerable: true,
    infiniteAmmo: true,
    allWeapons: true,
    canFly: true,
    noclip: true,
    instantVehicleEnter: true
  },
  spawn: {
    player: true,
    vehicles: "auto",
    pedestrians: "auto"
  },
  purpose: "Свободное тестирование без ограничений"
}
```

---

### Режим: SANDBOX
**Песочница**

```typescript
{
  mode: "SANDBOX",
  description: "Творческий режим - спавн чего угодно",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: true,
    weapon: true,
    ai: false  // только по запросу
  },
  sandbox: {
    spawnMenu: true,  // UI для спавна
    canSpawnAnyEntity: true,
    canModifyMap: true,
    godMode: true
  },
  purpose: "Творческий режим для тестирования"
}
```

---

### Режим: SLOW_MOTION
**Замедленная съемка**

```typescript
{
  mode: "SLOW_MOTION",
  description: "Замедление времени для отладки",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: true,
    weapon: true,
    ai: true
  },
  time: {
    scale: 0.1,  // 10% скорости
    adjustable: true,  // можно менять на лету
    physicsAffectsTime: false
  },
  purpose: "Детальный просмотр физических взаимодействий"
}
```

---

### Режим: FRAME_BY_FRAME
**Покадровый режим**

```typescript
{
  mode: "FRAME_BY_FRAME",
  description: "Один кадр по нажатию клавиши",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true
  },
  time: {
    paused: true,
    advanceOnInput: true,  // Space для следующего кадра
    showFrameNumber: true
  },
  purpose: "Детальная отладка конкретных кадров"
}
```

---

### Режим: PERFORMANCE_TEST
**Тест производительности**

```typescript
{
  mode: "PERFORMANCE_TEST",
  description: "Максимальная нагрузку",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: true,
    ai: true,
    weapon: true,
    projectile: true
  },
  spawn: {
    player: true,
    vehicles: 200,
    pedestrians: 500,
    projectiles: 100
  },
  performance: {
    showFPS: true,
    showMemory: true,
    showDrawCalls: true,
    showEntityCount: true,
    logStats: true,
    autoReport: true
  },
  map: {
    size: "large",  // большая карта
    renderDistance: "maximum"
  },
  purpose: "Проверка производительности на максимальной нагрузке"
}
```

---

### Режим: MEMORY_TEST
**Тест памяти**

```typescript
{
  mode: "MEMORY_TEST",
  description: "Тест утечек памяти",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    physics: true,
    ai: true
  },
  test: {
    spawnDespawn: true,  // циклический спавн/деспавн
    cycleTime: 5000,  // каждые 5 секунд
    entitiesPerCycle: 50,
    duration: 60000,  // тест минуту
    reportMemory: true
  },
  purpose: "Поиск утечек памяти"
}
```

---

### Режим: SAVE_LOAD_TEST
**Тест сохранения/загрузки**

```typescript
{
  mode: "SAVE_LOAD_TEST",
  description: "Тест системы сохранения",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    saveLoad: true
  },
  test: {
    autoSave: true,
    autoLoad: true,
    saveInterval: 10000,
    verifyState: true,
    compareBeforeAfter: true
  },
  purpose: "Проверка сохранения/загрузки"
}
```

---

### Режим: NETWORK_PREDICTION
**Предсказание сети (для будущей мультиплеер функции)**

```typescript
{
  mode: "NETWORK_PREDICTION",
  description: "Симуляция сетевого лага",
  systems: {
    renderer: true,
    map: true,
    entities: true,
    input: true,
    physics: true,
    collision: true,
    vehicle: true,
    ai: true,
    network: {
      enabled: true,
      simulated: true,  // эмуляция
      latency: 100,  // мс
      jitter: 50,
      packetLoss: 0.05
    }
  },
  purpose: "Подготовка к мультиплееру"
}
```

---

## Режимы производительности

### Режим: LOW_END
**Настройки для слабых ПК**

```typescript
{
  mode: "LOW_END",
  description: "Минимальное качество",
  renderer: {
    resolution: 0.5,  // 50% разрешения
    antialiasing: false,
    shadows: false,
    particles: false,
    effects: false,
    drawDistance: 0.5
  },
  spawn: {
    vehicles: 5,
    pedestrians: 10
  },
  ai: {
    thinkInterval: 500,  // реже обновления
    pathfindingPrecision: "low"
  },
  physics: {
    subSteps: 1
  }
}
```

---

### Режим: HIGH_END
**Настройки для мощных ПК**

```typescript
{
  mode: "HIGH_END",
  description: "Максимальное качество",
  renderer: {
    resolution: 1.0,
    antialiasing: true,
    shadows: true,
    particles: true,
    effects: true,
    drawDistance: 2.0
  },
  spawn: {
    vehicles: 50,
    pedestrians: 100
  },
  ai: {
    thinkInterval: 16,
    pathfindingPrecision: "high"
  },
  physics: {
    subSteps: 8
  }
}
```

---

### Режим: BENCHMARK
**Бенчмарк**

```typescript
{
  mode: "BENCHMARK",
  description: "Автоматический бенчмарк",
  benchmark: {
    scenarios: [
      "idle",
      "walking",
      "driving",
      "combat",
      "crowded"
    ],
    duration: 30000,  // 30 сек на сценарий
    autoReport: true,
    exportResults: true
  },
  purpose: "Сравнение производительности"
}
```

---

## Конфигурация через URL параметры

### Примеры использования

```
# Базовый режим
index.html?mode=WORLD_ONLY

# Без транспорта
index.html?mode=NO_VEHICLES

# Режим бога
index.html?mode=GOD_MODE

# Кастомная конфигурация
index.html?systems.physics=true&systems.ai=false&spawn.vehicles=0&spawn.pedestrians=50

# Замедление
index.html?time.scale=0.1

# Отладка коллизий
index.html?debug.collision=true&debug.showColliders=true

# Комбинация
index.html?mode=GOD_MODE&debug.all=true&time.scale=0.5
```

### Поддерживаемые URL параметры

```typescript
// Режим
mode=string                  // Предустановленный режим

// Системы (true/false)
systems.renderer=true
systems.map=true
systems.physics=true
systems.collision=true
systems.ai=true
systems.weapon=true

// Спавн
spawn.player=true
spawn.vehicles=number
spawn.pedestrians=number

// Игрок
player.godMode=true
player.infiniteAmmo=true
player.allWeapons=true

// Время
time.scale=number            // 1.0 = нормально, 0.1 = замедление
time.paused=true

// Отладка
debug.all=true               // Включить всю отладку
debug.collision=true
debug.ai=true
debug.physics=true
debug.zLevels=true
debug.fps=true
debug.memory=true

// Производительность
perf.showStats=true
perf.logStats=true
```

---

## Конфигурация через конфиг-файл

### Структура конфиг-файла

```typescript
// debug-config.json
{
  "mode": "CUSTOM",
  "description": "Кастомная конфигурация для теста",

  "systems": {
    "renderer": true,
    "map": true,
    "entities": true,
    "input": true,
    "physics": true,
    "collision": true,
    "vehicle": true,
    "weapon": true,
    "projectile": true,
    "health": true,
    "ai": true,
    "audio": true,
    "ui": true
  },

  "spawn": {
    "player": true,
    "vehicles": 10,
    "pedestrians": 20
  },

  "player": {
    "godMode": false,
    "invulnerable": false,
    "infiniteAmmo": false,
    "allWeapons": false,
    "startsInVehicle": false
  },

  "world": {
    "mapType": "generated",
    "mapSize": "medium",
    "timeOfDay": "day"
  },

  "debug": {
    "collision": false,
    "ai": false,
    "physics": false,
    "zLevels": false,
    "fps": false,
    "memory": false
  },

  "performance": {
    "targetFPS": 60,
    "drawDistance": 1.0,
    "particleQuality": "medium"
  },

  "time": {
    "scale": 1.0,
    "paused": false
  }
}
```

### Загрузка конфиг-файла

```typescript
// В коде игры
import debugConfig from './debug-config.json';

const game = new Game({
  // Использовать конфиг
  debugMode: true,
  debugConfig: debugConfig
});
```

---

## Клавиши для переключения режимов во время игры

### Глобальные горячие клавиши

```
F1     - Переключить отладку коллизий
F2     - Переключить отладку AI
F3     - Переключить отладку физики
F4     - Переключить отладку Z-уровней
F5     - Переключить всю отладку

F9     - Режим бога (toggle)
F10    - Замедление времени (toggle: 1.0 / 0.1x)
F11    - Полный экран
F12    - Скриншот

Pause  - Пауза
,      - Покадровый режим (продвинуть на кадр)
.      - Покадровый режим (пауза/-play)

1-9    - Быстрый выбор режима
0      - Вернуться в FULL_GAME

H      - Скрыть/показать HUD
O      - Скрыть/показать весь UI
```

---

## Рекомендации по использованию

### Для разработки новых функций

1. **Начинайте с BARE_MINIMAL** - проверьте что ничего не сломалось
2. **Перейдите на WORLD_ONLY** - проверьте карту
3. **Добавьте свой режим** - изолируйте новую функцию
4. **Тестируйте комбинациями** - убедитесь что работает с остальными системами

### Для поиска багов

1. **COLLISION_DEBUG** - если проблема с коллизиями
2. **AI_DEBUG** - если проблема с AI
3. **SLOW_MOTION** - для быстродействующих багов
4. **FRAME_BY_FRAME** - для точного определения момента бага

### Для оптимизации

1. **PERFORMANCE_TEST** - найдите узкие места
2. **RENDERER_ONLY** - проверьте рендеринг
3. **PHYSICS_ONLY** - проверьте физику
4. **MEMORY_TEST** - найдите утечки

---

## Матрица режимов

| Режим | Карта | Игрок | Машины | Пешеходы | Физика | Коллизии | AI | Оружие | Отладка |
|-------|-------|-------|--------|----------|--------|----------|-----|--------|---------|
| BARE_MINIMAL | - | - | - | - | - | - | - | - | - |
| WORLD_ONLY | ✓ | - | - | - | - | - | - | - | - |
| STATIC_ENTITIES | ✓ | - | ✓ | - | - | - | - | - | - |
| PLAYER_BASIC | ✓ | ✓ | - | - | - | - | - | - | - |
| PLAYER_COLLISION | ✓ | ✓ | - | - | - | ✓ | - | - | - |
| VEHICLES_ONLY | ✓ | ✓ | ✓ | - | ✓ | ✓ | - | - | - |
| COMBAT_ONLY | ✓ | ✓ | - | ✓ | - | ✓ | - | ✓ | - |
| AI_ONLY | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | ✓ |
| GAMEPLAY_BASIC | ✓ | ✓ | ✓ | - | ✓ | ✓ | - | - | - |
| FULL_GAME | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| GOD_MODE | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |

---

## Заключение

Этот документ покрывает все основные сценарии запуска для отладки. При добавлении новых функций в игру рекомендуется добавлять соответствующий режим отладки.

Для выбора режима используйте принцип: **начинайте с простого, постепенно добавляя сложность**. Это позволит быстрее локализовать проблемы.
