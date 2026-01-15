/**
 * Типы оружия
 */
export enum WeaponType {
  FIST = 0,
  PISTOL = 1,
  UZI = 2,
  SHOTGUN = 3,
  MACHINE_GUN = 4,
  FLAMETHROWER = 5,
  ROCKET_LAUNCHER = 6,
  SNIPER_RIFLE = 7,
}

/**
 * Определение типа оружия
 */
export interface WeaponDefinition {
  type: WeaponType;
  name: string;

  // Стрельба
  damage: number;              // Урон за выстрел
  fireRate: number;            // Выстрелов в секунду
  range: number;               // Максимальная дальность (в пикселях)
  accuracy: number;            // Точность (0-1, 1 = идеально точно)
  automatic: boolean;          // Автоматический огонь (зажатие кнопки)
  projectileSpeed: number;     // Скорость снаряда (0 = мгновенный попадание)
  projectileCount: number;     // Количество снарядов за выстрел
  spread: number;              // Разброс (в радианах)

  // Патроны
  maxAmmo: number;             // Максимальное количество патронов
  reloadTime: number;          // Время перезарядки (в секундах)

  // Геймплей
  canShootWhileMoving: boolean;// Можно ли стрелять во время движения
  recoil: number;              // Отдача (0-1)
}

/**
 * Определения всех типов оружия
 */
export const WEAPON_DEFINITIONS: Record<WeaponType, WeaponDefinition> = {
  [WeaponType.FIST]: {
    type: WeaponType.FIST,
    name: 'Fist',
    damage: 10,
    fireRate: 2,
    range: 40,
    accuracy: 0.9,
    automatic: false,
    projectileSpeed: 0,        // Мгновенный попадание (ближний бой)
    projectileCount: 1,
    spread: 0,
    maxAmmo: Infinity,
    reloadTime: 0,
    canShootWhileMoving: true,
    recoil: 0.1,
  },

  [WeaponType.PISTOL]: {
    type: WeaponType.PISTOL,
    name: 'Pistol',
    damage: 25,
    fireRate: 3,
    range: 500,
    accuracy: 0.85,
    automatic: false,
    projectileSpeed: 800,
    projectileCount: 1,
    spread: 0.05,
    maxAmmo: 50,
    reloadTime: 1.5,
    canShootWhileMoving: true,
    recoil: 0.2,
  },

  [WeaponType.UZI]: {
    type: WeaponType.UZI,
    name: 'Uzi',
    damage: 15,
    fireRate: 10,
    range: 400,
    accuracy: 0.6,
    automatic: true,
    projectileSpeed: 900,
    projectileCount: 1,
    spread: 0.15,
    maxAmmo: 120,
    reloadTime: 2,
    canShootWhileMoving: true,
    recoil: 0.3,
  },

  [WeaponType.SHOTGUN]: {
    type: WeaponType.SHOTGUN,
    name: 'Shotgun',
    damage: 15,
    fireRate: 1.5,
    range: 250,
    accuracy: 0.5,
    automatic: false,
    projectileSpeed: 700,
    projectileCount: 8,         // 8 пеллет
    spread: 0.3,
    maxAmmo: 30,
    reloadTime: 2.5,
    canShootWhileMoving: false,
    recoil: 0.6,
  },

  [WeaponType.MACHINE_GUN]: {
    type: WeaponType.MACHINE_GUN,
    name: 'Machine Gun',
    damage: 20,
    fireRate: 12,
    range: 600,
    accuracy: 0.7,
    automatic: true,
    projectileSpeed: 1000,
    projectileCount: 1,
    spread: 0.1,
    maxAmmo: 200,
    reloadTime: 3,
    canShootWhileMoving: false,
    recoil: 0.4,
  },

  [WeaponType.FLAMETHROWER]: {
    type: WeaponType.FLAMETHROWER,
    name: 'Flamethrower',
    damage: 5,                   // Урон в секунду (DoT)
    fireRate: 30,                 // Частота тиков
    range: 200,
    accuracy: 0.3,
    automatic: true,
    projectileSpeed: 400,
    projectileCount: 1,
    spread: 0.4,
    maxAmmo: 100,
    reloadTime: 3,
    canShootWhileMoving: true,
    recoil: 0.1,
  },

  [WeaponType.ROCKET_LAUNCHER]: {
    type: WeaponType.ROCKET_LAUNCHER,
    name: 'Rocket Launcher',
    damage: 200,                 // Взрывной урон
    fireRate: 0.5,
    range: 800,
    accuracy: 0.8,
    automatic: false,
    projectileSpeed: 500,
    projectileCount: 1,
    spread: 0.02,
    maxAmmo: 5,
    reloadTime: 3,
    canShootWhileMoving: false,
    recoil: 0.8,
  },

  [WeaponType.SNIPER_RIFLE]: {
    type: WeaponType.SNIPER_RIFLE,
    name: 'Sniper Rifle',
    damage: 150,
    fireRate: 0.8,
    range: 1200,
    accuracy: 0.98,
    automatic: false,
    projectileSpeed: 1500,
    projectileCount: 1,
    spread: 0,
    maxAmmo: 10,
    reloadTime: 2.5,
    canShootWhileMoving: false,
    recoil: 0.5,
  },
};

/**
 * Получение определения типа оружия
 */
export function getWeaponDefinition(type: WeaponType): WeaponDefinition {
  return WEAPON_DEFINITIONS[type];
}
