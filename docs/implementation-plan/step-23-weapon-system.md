# Шаг 23: Система оружия

## Цель
Реализовать систему оружия и стрельбы. После этого шага игрок может стрелять.

## Зависимости
- Шаг 22: Районы

## Задачи

### 23.1 Компоненты оружия

**src/ecs/components/Weapon.ts:**
```typescript
export enum WeaponType {
  FISTS = 0,
  PISTOL = 1,
  UZI = 2,
  SHOTGUN = 3,
  ROCKET_LAUNCHER = 4,
  FLAMETHROWER = 5,
}

export const WeaponComponent = defineComponent({
  type: Types.ui8,
  damage: Types.f32,
  fireRate: Types.f32,      // Выстрелов в секунду
  range: Types.f32,
  spread: Types.f32,        // Разброс (градусы)
  ammoInClip: Types.ui16,
  clipSize: Types.ui16,
  reloadTime: Types.f32,
  isReloading: Types.ui8,
  reloadTimer: Types.f32,
  fireTimer: Types.f32,
});

export const Inventory = defineComponent({
  currentWeapon: Types.ui8,
  weapon0Ammo: Types.ui16,  // FISTS (без патронов)
  weapon1Ammo: Types.ui16,  // PISTOL
  weapon2Ammo: Types.ui16,  // UZI
  weapon3Ammo: Types.ui16,  // SHOTGUN
  weapon4Ammo: Types.ui16,  // ROCKET_LAUNCHER
  weapon5Ammo: Types.ui16,  // FLAMETHROWER
});

export const Projectile = defineComponent({
  damage: Types.f32,
  speed: Types.f32,
  lifetime: Types.f32,
  ownerEntity: Types.eid,
  type: Types.ui8,
});
```

### 23.2 Определения оружия

**src/data/WeaponDefinitions.ts:**
```typescript
export interface WeaponDefinition {
  type: WeaponType;
  name: string;
  damage: number;
  fireRate: number;
  range: number;
  spread: number;
  clipSize: number;
  reloadTime: number;
  projectileSpeed: number;
  sound: string;
}

export const WEAPON_DEFINITIONS: Record<WeaponType, WeaponDefinition> = {
  [WeaponType.PISTOL]: {
    type: WeaponType.PISTOL,
    name: 'Pistol',
    damage: 15,
    fireRate: 3,
    range: 500,
    spread: 2,
    clipSize: 12,
    reloadTime: 1.5,
    projectileSpeed: 1000,
    sound: 'pistol_fire',
  },
  [WeaponType.UZI]: {
    type: WeaponType.UZI,
    name: 'Uzi',
    damage: 8,
    fireRate: 10,
    range: 400,
    spread: 5,
    clipSize: 30,
    reloadTime: 2,
    projectileSpeed: 800,
    sound: 'uzi_fire',
  },
  // ... другие оружия
};
```

### 23.3 WeaponSystem

**src/ecs/systems/WeaponSystem.ts:**
```typescript
export const createWeaponSystem = (inputManager: InputManager, audioManager: AudioManager) => {
  return defineSystem((world: IWorld, dt: number) => {
    const entities = armedQuery(world);
    const deltaSeconds = dt / 1000;

    for (const eid of entities) {
      // Обновление таймеров
      WeaponComponent.fireTimer[eid] -= deltaSeconds;
      if (WeaponComponent.isReloading[eid]) {
        WeaponComponent.reloadTimer[eid] -= deltaSeconds;
        if (WeaponComponent.reloadTimer[eid] <= 0) {
          finishReload(world, eid);
        }
        continue;
      }

      // Только для игрока
      if (!hasComponent(world, PlayerControlled, eid)) continue;

      // Стрельба
      if (inputManager.isActionDown(GameAction.FIRE)) {
        tryFire(world, eid, audioManager);
      }

      // Перезарядка
      if (inputManager.isActionJustPressed(GameAction.RELOAD)) {
        startReload(world, eid);
      }

      // Смена оружия
      if (inputManager.isActionJustPressed(GameAction.NEXT_WEAPON)) {
        switchWeapon(world, eid, 1);
      }
      if (inputManager.isActionJustPressed(GameAction.PREV_WEAPON)) {
        switchWeapon(world, eid, -1);
      }
    }

    return world;
  });
};

function tryFire(world: IWorld, eid: number, audioManager: AudioManager): void {
  if (WeaponComponent.fireTimer[eid] > 0) return;
  if (WeaponComponent.ammoInClip[eid] <= 0) {
    startReload(world, eid);
    return;
  }

  const weaponType = WeaponComponent.type[eid] as WeaponType;
  const def = WEAPON_DEFINITIONS[weaponType];

  // Создание пули
  const angle = Rotation.angle[eid];
  const spread = (Math.random() - 0.5) * def.spread * (Math.PI / 180);
  const bulletAngle = angle + spread;

  const bulletX = Position.x[eid] + Math.cos(angle) * 30;
  const bulletY = Position.y[eid] + Math.sin(angle) * 30;

  createProjectile(world, bulletX, bulletY, bulletAngle, def, eid);

  // Расход патронов и таймер
  WeaponComponent.ammoInClip[eid]--;
  WeaponComponent.fireTimer[eid] = 1 / def.fireRate;

  // Звук
  audioManager.playSound(def.sound);

  // Событие
  eventBus.emit('weapon:fired', { entity: eid, weapon: weaponType });
}

function createProjectile(
  world: IWorld,
  x: number, y: number,
  angle: number,
  weaponDef: WeaponDefinition,
  owner: number
): number {
  const eid = addEntity(world);

  addComponent(world, Position, eid);
  Position.x[eid] = x;
  Position.y[eid] = y;

  addComponent(world, Velocity, eid);
  Velocity.x[eid] = Math.cos(angle) * weaponDef.projectileSpeed;
  Velocity.y[eid] = Math.sin(angle) * weaponDef.projectileSpeed;

  addComponent(world, Rotation, eid);
  Rotation.angle[eid] = angle;

  addComponent(world, Projectile, eid);
  Projectile.damage[eid] = weaponDef.damage;
  Projectile.speed[eid] = weaponDef.projectileSpeed;
  Projectile.lifetime[eid] = weaponDef.range / weaponDef.projectileSpeed;
  Projectile.ownerEntity[eid] = owner;

  addComponent(world, SpriteComponent, eid);
  SpriteComponent.visible[eid] = 1;
  SpriteComponent.width[eid] = 8;
  SpriteComponent.height[eid] = 4;

  return eid;
}
```

### 23.4 ProjectileSystem

**src/ecs/systems/ProjectileSystem.ts:**
```typescript
export const createProjectileSystem = () => {
  return defineSystem((world: IWorld, dt: number) => {
    const entities = projectileQuery(world);
    const deltaSeconds = dt / 1000;

    for (const eid of entities) {
      Projectile.lifetime[eid] -= deltaSeconds;

      if (Projectile.lifetime[eid] <= 0) {
        removeEntity(world, eid);
        continue;
      }

      // Проверка попадания (будет в HealthSystem)
    }

    return world;
  });
};
```

## Результат
- Игрок может стрелять (LMB или Ctrl)
- Пули летят и исчезают
- Перезарядка работает (R)
- Смена оружия ([ и ])
- Звуки стрельбы

## Следующий шаг
Шаг 24: Здоровье и урон
