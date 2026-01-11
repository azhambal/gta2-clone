/**
 * Типы транспорта
 */
export enum VehicleType {
  CAR_SPORT = 0,
  CAR_SEDAN = 1,
  CAR_TAXI = 2,
  CAR_POLICE = 3,
  TRUCK = 4,
  BUS = 5,
  MOTORCYCLE = 6,
  TANK = 7,
}

/**
 * Определение типа транспортного средства
 */
export interface VehicleDefinition {
  type: VehicleType;
  name: string;

  // Визуал
  spriteWidth: number;
  spriteHeight: number;
  spriteAngles: number; // Количество углов поворота

  // Коллайдер
  colliderWidth: number;
  colliderHeight: number;

  // Физика
  mass: number;
  maxSpeed: number;
  acceleration: number;
  braking: number;
  handling: number;
  grip: number;

  // Геймплей
  health: number;
  seats: number;
  canExplode: boolean;
}

/**
 * Определения всех типов транспорта
 */
export const VEHICLE_DEFINITIONS: Record<VehicleType, VehicleDefinition> = {
  [VehicleType.CAR_SPORT]: {
    type: VehicleType.CAR_SPORT,
    name: 'Sports Car',
    spriteWidth: 64,
    spriteHeight: 32,
    spriteAngles: 32,
    colliderWidth: 56,
    colliderHeight: 24,
    mass: 1000,
    maxSpeed: 400,
    acceleration: 200,
    braking: 150,
    handling: 0.9,
    grip: 0.85,
    health: 100,
    seats: 2,
    canExplode: true,
  },

  [VehicleType.CAR_SEDAN]: {
    type: VehicleType.CAR_SEDAN,
    name: 'Sedan',
    spriteWidth: 64,
    spriteHeight: 32,
    spriteAngles: 32,
    colliderWidth: 56,
    colliderHeight: 24,
    mass: 1200,
    maxSpeed: 300,
    acceleration: 150,
    braking: 120,
    handling: 0.7,
    grip: 0.8,
    health: 120,
    seats: 4,
    canExplode: true,
  },

  [VehicleType.CAR_TAXI]: {
    type: VehicleType.CAR_TAXI,
    name: 'Taxi',
    spriteWidth: 64,
    spriteHeight: 32,
    spriteAngles: 32,
    colliderWidth: 56,
    colliderHeight: 24,
    mass: 1300,
    maxSpeed: 280,
    acceleration: 140,
    braking: 130,
    handling: 0.75,
    grip: 0.8,
    health: 110,
    seats: 4,
    canExplode: true,
  },

  [VehicleType.CAR_POLICE]: {
    type: VehicleType.CAR_POLICE,
    name: 'Police Car',
    spriteWidth: 64,
    spriteHeight: 32,
    spriteAngles: 32,
    colliderWidth: 56,
    colliderHeight: 24,
    mass: 1400,
    maxSpeed: 350,
    acceleration: 180,
    braking: 160,
    handling: 0.85,
    grip: 0.9,
    health: 150,
    seats: 4,
    canExplode: true,
  },

  [VehicleType.TRUCK]: {
    type: VehicleType.TRUCK,
    name: 'Truck',
    spriteWidth: 80,
    spriteHeight: 40,
    spriteAngles: 32,
    colliderWidth: 72,
    colliderHeight: 32,
    mass: 3000,
    maxSpeed: 200,
    acceleration: 80,
    braking: 100,
    handling: 0.4,
    grip: 0.7,
    health: 200,
    seats: 2,
    canExplode: true,
  },

  [VehicleType.BUS]: {
    type: VehicleType.BUS,
    name: 'Bus',
    spriteWidth: 96,
    spriteHeight: 40,
    spriteAngles: 32,
    colliderWidth: 88,
    colliderHeight: 32,
    mass: 5000,
    maxSpeed: 150,
    acceleration: 50,
    braking: 80,
    handling: 0.3,
    grip: 0.6,
    health: 250,
    seats: 8,
    canExplode: true,
  },

  [VehicleType.MOTORCYCLE]: {
    type: VehicleType.MOTORCYCLE,
    name: 'Motorcycle',
    spriteWidth: 40,
    spriteHeight: 20,
    spriteAngles: 32,
    colliderWidth: 32,
    colliderHeight: 16,
    mass: 300,
    maxSpeed: 450,
    acceleration: 250,
    braking: 180,
    handling: 0.95,
    grip: 0.75,
    health: 50,
    seats: 2,
    canExplode: true,
  },

  [VehicleType.TANK]: {
    type: VehicleType.TANK,
    name: 'Tank',
    spriteWidth: 80,
    spriteHeight: 48,
    spriteAngles: 32,
    colliderWidth: 72,
    colliderHeight: 40,
    mass: 10000,
    maxSpeed: 100,
    acceleration: 40,
    braking: 200,
    handling: 0.2,
    grip: 0.95,
    health: 1000,
    seats: 2,
    canExplode: true,
  },
};

/**
 * Получение определения типа транспорта
 */
export function getVehicleDefinition(type: VehicleType): VehicleDefinition {
  return VEHICLE_DEFINITIONS[type];
}
