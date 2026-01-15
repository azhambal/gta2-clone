import type { GameMap } from '../world/GameMap.js';
import { BlockType } from '../world/BlockTypes.js';
import { GAME_CONSTANTS } from '../core/Types.js';

const { BLOCK_SIZE } = GAME_CONSTANTS;

/**
 * Waypoint for vehicle navigation
 */
export interface Waypoint {
  id: number;
  x: number;
  y: number;
  z: number;
  connections: number[];
  speedLimit: number;
  isIntersection: boolean;
  lane: 'forward' | 'backward' | 'both';
  trafficLight?: {
    redDuration: number;
    greenDuration: number;
    phase: number; // For coordinating with other lights
  };
}

/**
 * Route for traffic AI
 */
export interface TrafficRoute {
  id: number;
  name: string;
  waypoints: Waypoint[];
}

/**
 * Traffic network - graph of waypoints for vehicle navigation
 */
export class TrafficNetwork {
  private waypoints: Map<number, Waypoint> = new Map();
  private nextId: number = 0;
  private roadBlocks: Set<string> = new Set();

  constructor() {
    // Инициализация пустого конструктора
  }

  /**
   * Add a waypoint to the network
   */
  public addWaypoint(waypoint: Omit<Waypoint, 'id'>): number {
    const id = this.nextId++;
    const fullWaypoint: Waypoint = {
      ...waypoint,
      id,
    };
    this.waypoints.set(id, fullWaypoint);
    return id;
  }

  /**
   * Get waypoint by ID
   */
  public getWaypoint(id: number): Waypoint | null {
    return this.waypoints.get(id) ?? null;
  }

  /**
   * Get all waypoints
   */
  public getAllWaypoints(): Waypoint[] {
    return Array.from(this.waypoints.values());
  }

  /**
   * Connect two waypoints (bidirectional)
   */
  public connectWaypoints(id1: number, id2: number): void {
    const wp1 = this.waypoints.get(id1);
    const wp2 = this.waypoints.get(id2);

    if (!wp1 || !wp2) {
      console.warn(`Cannot connect waypoints: one or both not found (${id1}, ${id2})`);
      return;
    }

    // Add bidirectional connection if not already connected
    if (!wp1.connections.includes(id2)) {
      wp1.connections.push(id2);
    }
    if (!wp2.connections.includes(id1)) {
      wp2.connections.push(id1);
    }
  }

  /**
   * Get next waypoint from current (random choice at intersections)
   */
  public getNextWaypoint(currentId: number, previousId?: number): Waypoint | null {
    const current = this.waypoints.get(currentId);
    if (!current || current.connections.length === 0) {
      return null;
    }

    // If coming from somewhere, try not to go back (unless dead end)
    let availableConnections = current.connections;

    if (previousId !== undefined && current.connections.length > 1) {
      availableConnections = current.connections.filter(id => id !== previousId);
    }

    // Fallback to all connections if filtered list is empty
    if (availableConnections.length === 0) {
      availableConnections = current.connections;
    }

    const nextId = availableConnections[Math.floor(Math.random() * availableConnections.length)];
    return this.waypoints.get(nextId) ?? null;
  }

  /**
   * Get nearest waypoint to position
   */
  public getNearestWaypoint(x: number, y: number, z: number = 0, maxDistance: number = 200): Waypoint | null {
    let nearest: Waypoint | null = null;
    let minDist = maxDistance;

    for (const wp of this.waypoints.values()) {
      // Check Z level first (allow small difference for slopes)
      if (Math.abs(wp.z - z) > 1) {
        continue;
      }

      const dist = Math.hypot(wp.x - x, wp.y - y);
      if (dist < minDist) {
        minDist = dist;
        nearest = wp;
      }
    }

    return nearest;
  }

  /**
   * Get random waypoint
   */
  public getRandomWaypoint(): Waypoint | null {
    if (this.waypoints.size === 0) {return null;}
    const ids = Array.from(this.waypoints.keys());
    const randomId = ids[Math.floor(Math.random() * ids.length)];
    return this.waypoints.get(randomId) ?? null;
  }

  /**
   * Generate traffic network from map
   */
  public generateFromMap(gameMap: GameMap, z: number = 0): void {
    this.waypoints.clear();
    this.nextId = 0;
    this.roadBlocks.clear();

    // First pass: identify road blocks
    for (let y = 0; y < gameMap.heightInBlocks; y++) {
      for (let x = 0; x < gameMap.widthInBlocks; x++) {
        const block = gameMap.getBlock(x, y, z);
        if (this.isRoadBlock(block.getType())) {
          this.roadBlocks.add(`${x},${y}`);
        }
      }
    }

    // Second pass: create waypoints at road centers and intersections
    const processed = new Set<string>();

    for (const blockKey of this.roadBlocks) {
      if (processed.has(blockKey)) {continue;}

      const [bx, by] = blockKey.split(',').map(Number);
      const neighbors = this.getRoadNeighborCount(bx, by);

      // Check if this is an intersection (3+ road neighbors)
      if (neighbors >= 3) {
        this.createIntersectionWaypoint(bx, by, z, gameMap, processed);
      }
    }

    // Third pass: create waypoints along road segments
    for (const blockKey of this.roadBlocks) {
      if (processed.has(blockKey)) {continue;}

      const [bx, by] = blockKey.split(',').map(Number);
      this.createSegmentWaypoints(bx, by, z, gameMap, processed);
    }

    // Fourth pass: connect adjacent waypoints
    this.connectAdjacentWaypoints();
  }

  /**
   * Check if block type is a road
   */
  private isRoadBlock(type: BlockType): boolean {
    return (
      type === BlockType.ROAD ||
      type === BlockType.ROAD_LINE_H ||
      type === BlockType.ROAD_LINE_V ||
      type === BlockType.CROSSWALK
    );
  }

  /**
   * Get count of road neighbor blocks
   */
  private getRoadNeighborCount(bx: number, by: number): number {
    const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    let count = 0;

    for (const [dx, dy] of directions) {
      const key = `${bx + dx},${by + dy}`;
      if (this.roadBlocks.has(key)) {count++;}
    }

    return count;
  }

  /**
   * Create waypoint at intersection
   */
  private createIntersectionWaypoint(
    bx: number,
    by: number,
    z: number,
    _gameMap: GameMap,
    processed: Set<string>,
  ): void {
    const x = bx * BLOCK_SIZE + BLOCK_SIZE / 2;
    const y = by * BLOCK_SIZE + BLOCK_SIZE / 2;

    this.addWaypoint({
      x,
      y,
      z,
      connections: [],
      speedLimit: 80,
      isIntersection: true,
      lane: 'both',
      trafficLight: {
        redDuration: 3000,
        greenDuration: 5000,
        phase: 0,
      },
    });

    processed.add(`${bx},${by}`);
  }

  /**
   * Create waypoints along road segments
   */
  private createSegmentWaypoints(
    bx: number,
    by: number,
    z: number,
    _gameMap: GameMap,
    processed: Set<string>,
  ): void {
    // Find road segment direction (reserved for future use - lane determination)
    // const hasNorth = this.roadBlocks.has(`${bx},${by - 1}`);
    // const hasSouth = this.roadBlocks.has(`${bx},${by + 1}`);
    // const hasWest = this.roadBlocks.has(`${bx - 1},${by}`);
    // const hasEast = this.roadBlocks.has(`${bx + 1},${by}`);

    // Create waypoint at center of road segment
    const x = bx * BLOCK_SIZE + BLOCK_SIZE / 2;
    const y = by * BLOCK_SIZE + BLOCK_SIZE / 2;

    const lane: 'forward' | 'backward' | 'both' = 'both';

    this.addWaypoint({
      x,
      y,
      z,
      connections: [],
      speedLimit: 150,
      isIntersection: false,
      lane,
    });

    processed.add(`${bx},${by}`);
  }

  /**
   * Connect waypoints that are spatially adjacent
   */
  private connectAdjacentWaypoints(): void {
    const maxConnectDistance = BLOCK_SIZE * 2.5;

    for (const wp1 of this.waypoints.values()) {
      for (const wp2 of this.waypoints.values()) {
        if (wp1.id === wp2.id) {continue;}

        // Check if already connected
        if (wp1.connections.includes(wp2.id)) {continue;}

        // Only connect waypoints on same Z level
        if (wp1.z !== wp2.z) {continue;}

        // Check spatial proximity
        const dist = Math.hypot(wp1.x - wp2.x, wp1.y - wp2.y);
        if (dist <= maxConnectDistance) {
          this.connectWaypoints(wp1.id, wp2.id);
        }
      }
    }
  }

  /**
   * Clear all waypoints
   */
  public clear(): void {
    this.waypoints.clear();
    this.nextId = 0;
    this.roadBlocks.clear();
  }

  /**
   * Get waypoint count
   */
  public size(): number {
    return this.waypoints.size;
  }
}

/**
 * Generate traffic network from game map
 */
export function generateTrafficNetwork(gameMap: GameMap, z: number = 0): TrafficNetwork {
  const network = new TrafficNetwork();
  network.generateFromMap(gameMap, z);
  return network;
}
