# GTA2 Clone - Required Fixes and Improvements

## Executive Summary

This document outlines critical issues in the GTA2 clone implementation and provides detailed descriptions of what needs to be fixed. The project has a solid architectural foundation but several core mechanics are either non-functional or incomplete.

---

## 1. Collision System Issues

### Current State

The `MapCollisionSystem.ts` exists and implements basic AABB (Axis-Aligned Bounding Box) vs Circle collision detection for solid blocks. However, there are several critical problems:

**File:** `src/ecs/systems/MapCollisionSystem.ts:103`

### Problems Identified

#### 1.1 Missing Entity-to-Entity Collision Detection

**Issue:** The current collision system only handles map collisions (entities vs static blocks). There is **no system** for detecting collisions between entities (vehicles vs vehicles, pedestrians vs vehicles, etc.).

**Impact:**
- Vehicles pass through each other
- Pedestrians can overlap with vehicles and other pedestrians
- No collision response between dynamic objects
- Traffic AI cannot detect obstacles

**What needs to be implemented:**
1. Create `EntityCollisionSystem.ts` that:
   - Uses spatial hashing to find nearby entities efficiently
   - Implements circle-circle and box-box collision detection
   - Handles collision response (impulse resolution, position correction)
   - Supports collision layers from the architecture (STATIC, VEHICLE, PEDESTRIAN, PROJECTILE, PICKUP, TRIGGER)
   - Implements the collision matrix defined in the architecture document (section 7.4)

2. Integrate with existing `SpatialHash` class (if implemented) or create one:
   - Grid-based spatial partitioning for O(1) nearby entity queries
   - Cell size should be configurable (architecture suggests 128 units)
   - Update entity positions in hash grid every frame

#### 1.2 Incomplete Collision Response

**Issue:** Current map collision system simply stops velocity and corrects position, but doesn't:
- Calculate proper collision normals for sliding along walls
- Handle angular collision response (entities should slide along surfaces)
- Apply friction or bounce effects
- Trigger collision events for gameplay systems

**What needs to be fixed:**
1. Implement sliding collision response:
   - When hitting a wall at an angle, the entity should slide along it
   - Use projection: `velocity = velocity - (velocity · normal) × normal`
   - This allows smooth movement along walls instead of getting stuck

2. Add collision event system:
   - Emit events when collisions occur: `collision:entity`, `collision:map`
   - Include collision data: entities involved, normal, penetration depth, impact force
   - Allow other systems (damage, sound, particles) to respond to collisions

#### 1.3 Slope Collision Not Integrated

**Issue:** The architecture mentions slopes (CollisionType.SLOPE = 2), and `SlopeSystem.ts` exists, but:
- Slopes are excluded from collision detection (`MapCollisionSystem.ts:103`)
- No clear integration between slope system and collision system
- Uncertain if entities can properly interact with slopes

**What needs to be checked and potentially fixed:**
1. Verify `SlopeSystem.ts` properly handles:
   - Smooth transitions between Z-levels
   - Speed adjustments when going up/down slopes
   - Proper collision detection on slopes (raycasting from entity to slope surface)

2. Ensure MapCollisionSystem and SlopeSystem work together:
   - MapCollisionSystem should pass entities on slopes to SlopeSystem
   - Clear priority/order of execution

#### 1.4 Physics Engine Not Utilized for Collisions

**Issue:** The architecture specifies Matter.js for physics, but collision detection appears to be custom-implemented rather than using Matter.js collision features.

**Current approach problems:**
- Duplicate collision detection logic
- Missing advanced features (friction, restitution, constraints)
- No integration with Matter.js world

**What should be evaluated:**
1. Decide on collision strategy:
   - **Option A:** Fully use Matter.js for all collision detection and response
   - **Option B:** Use custom collision for map, Matter.js for vehicles only
   - **Option C:** Hybrid approach with clear separation of responsibilities

2. If using Matter.js:
   - Ensure all vehicles have Matter.js bodies (check `PhysicsManager`)
   - Use Matter.js collision events (`collisionStart`, `collisionActive`, `collisionEnd`)
   - Sync ECS positions with Matter.js body positions (check `PhysicsSyncSystem.ts`)

---

## 2. Vehicle Enter/Exit System Issues

### Current State

`VehicleInteractionSystem.ts` exists and implements basic enter/exit functionality. The code structure looks reasonable but likely has bugs or integration issues.

**File:** `src/ecs/systems/VehicleInteractionSystem.ts`

### Problems Identified

#### 2.1 Potential Component Synchronization Issues

**Issues to investigate:**

1. **Driver component management** (`line 105-106, 145`):
   - `addComponent` is called for Driver, but component might already exist
   - `Driver.vehicleEntity[playerEid] = 0` to "remove" component is not proper cleanup
   - Should use `removeComponent(world, playerEid, Driver)` for proper removal

2. **Sprite visibility state** (`line 112, 151`):
   - Setting `visible = 0` might not trigger re-render
   - EntityRenderer might not check visibility flag properly
   - Need to verify sprite is actually hidden/shown

3. **Vehicle occupancy tracking** (`line 72-74, 100-102, 109, 148`):
   - Bidirectional reference: Driver.vehicleEntity and VehicleOccupants.driver
   - Risk of desynchronization if one is updated but not the other
   - No validation that both references match

**What needs to be fixed:**

1. Use proper component lifecycle:
   ```
   // Entering
   if (!hasComponent(world, playerEid, Driver)) {
     addComponent(world, playerEid, Driver);
   }

   // Exiting
   if (hasComponent(world, playerEid, Driver)) {
     removeComponent(world, playerEid, Driver);
   }
   ```

2. Ensure EntityRenderer respects `SpriteComponent.visible` flag

3. Add validation/safety checks:
   - Verify vehicle still exists before exiting
   - Check that player is still the driver
   - Handle edge cases (vehicle destroyed while player inside)

#### 2.2 Exit Position Collision Not Checked

**Issue:** (`line 131-137`)

When exiting vehicle, the system calculates exit position but **does not check if that position is valid**:
- Exit position might be inside a wall
- Exit position might be off a cliff or in water
- Exit position might overlap with another vehicle

**What needs to be implemented:**

1. Validate exit position before placing player:
   - Use `canMoveTo()` from MapCollisionSystem (already exists at `line 154`)
   - Check for nearby vehicles/entities
   - Try multiple exit positions (right side, left side, front, back)
   - If all positions blocked, keep player in vehicle or push vehicle slightly

2. Add visual/audio feedback:
   - Show "Cannot exit" message if blocked
   - Play error sound

#### 2.3 Missing Animation and State Transitions

**What's missing:**

1. Enter/exit animations:
   - Player should play "opening door" animation
   - Smooth camera transition when entering vehicle
   - Brief delay before player can drive (animation time)

2. Physics state during transition:
   - Player collider should be disabled when entering
   - Vehicle should be locked (not moveable) during animation

3. Z-level verification:
   - Ensure player and vehicle are on same Z-level before entering
   - Handle multi-level roads/bridges properly

---

## 3. Traffic AI (Car Bots) Not Moving

### Current State

`TrafficAISystem.ts` exists and has state machine logic, but vehicles aren't moving.

**File:** `src/ecs/systems/TrafficAISystem.ts`

### Problems Identified

#### 3.1 Waypoint Network Likely Not Initialized

**Issue:** (`line 84-98`)

The system queries `trafficNetwork.getWaypoint()` and `getNearestWaypoint()`, but:
- If waypoint network is empty or not loaded, all vehicles will have no target
- Vehicles will execute the fallback: `VehiclePhysics.throttle[eid] = 0` (line 94)
- This causes all traffic to be stationary

**What needs to be verified:**

1. Check `TrafficWaypoints.ts` / `TrafficNetwork` class:
   - Is it being initialized in `Game.ts` or `World.ts`?
   - Are waypoints being loaded from map data?
   - Are waypoints placed on roads and connected properly?

2. Debug waypoint network:
   - Add console logging to verify waypoint count
   - Visualize waypoints in debug mode (draw circles/lines)
   - Verify waypoint connectivity (each waypoint has `next` references)

**What needs to be implemented if missing:**

1. Waypoint generation system:
   - Scan GameMap for road blocks
   - Place waypoints at regular intervals on roads
   - Detect intersections and create waypoint connections
   - Assign speed limits based on road type

2. Waypoint editor/loader:
   - Load waypoint data from JSON or generate at runtime
   - Store waypoint data in map file format

#### 3.2 VehiclePhysics Throttle Not Being Applied

**Issue:**

Even if waypoints exist, setting `VehiclePhysics.throttle[eid]` might not move the vehicle if:
- `VehiclePhysicsSystem` is not running or not processing TrafficAI vehicles
- `VehiclePhysicsSystem` ignores vehicles without PlayerControlled component
- Physics integration is broken

**What needs to be checked:**

1. Verify `VehiclePhysicsSystem.ts`:
   - Check query: should include ALL vehicles, not just player-controlled
   - Should process `throttle` and `steering` values
   - Should update `Velocity` component

2. Check system execution order in `Game.ts` or `World.ts`:
   - TrafficAISystem should run BEFORE VehiclePhysicsSystem
   - VehiclePhysicsSystem should run BEFORE MovementSystem
   - Verify dt (delta time) is being passed correctly

#### 3.3 TrafficAI Component Not Added to Vehicles

**Issue:**

Traffic vehicles must have `TrafficAI` component to be processed by the system.

**What needs to be checked:**

1. Review `EntityFactory.ts` `createVehicle()` method:
   - Does it add `TrafficAI` component for NPC vehicles?
   - Current code shows Vehicle and VehiclePhysics being added, but no TrafficAI

2. Check `SpawnManager.ts` or wherever traffic is spawned:
   - Are vehicles being created with TrafficAI component?
   - Is initial state set to `TrafficState.DRIVING`?
   - Is initial waypoint assigned?

**What needs to be implemented:**

Add to `EntityFactory.ts` or create `createTrafficVehicle()`:
```
addComponent(world, eid, TrafficAI);
TrafficAI.state[eid] = TrafficState.DRIVING;
TrafficAI.currentWaypointId[eid] = nearestWaypointId;
TrafficAI.nextWaypointId[eid] = 0;
TrafficAI.targetSpeed[eid] = baseSpeed;
// ... other TrafficAI fields
```

#### 3.4 Incomplete State Machine Logic

**Issue:** (`TrafficAISystem.ts:48-64`)

The system switches on `TrafficState` but some handlers are incomplete:
- `handleDrivingState()` is partially shown (line 78+)
- Other handlers (`handleStoppedState`, `handleWaitingState`, etc.) exist but their implementation is unknown
- Logic bugs in any handler will prevent movement

**What needs to be reviewed:**

1. Complete implementation review of all handlers:
   - `handleDrivingState`: Should set throttle, steering toward waypoint
   - `handleStoppedState`: Should check when to resume driving
   - `handleTurningState`: Should handle intersection navigation
   - Others should have clear transition conditions

2. Verify waypoint following logic:
   - Calculate direction to target waypoint
   - Steer toward waypoint
   - Detect waypoint reached (distance threshold)
   - Transition to next waypoint

---

## 4. Pedestrian AI Issues

### Current State

`PedestrianAISystem.ts` exists and implements basic wandering behavior.

**File:** `src/ai/PedestrianAISystem.ts`

### Problems Identified

#### 4.1 Pedestrians Don't Walk on Sidewalks

**Issue:** (`line 90-100, 131-160`)

Current implementation:
- Calls `pathfinder.findRandomWalkablePosition()` and `findNearestWalkablePosition()`
- No distinction between road and sidewalk
- Pedestrians will walk anywhere that's "walkable"

**What "walkable" probably means currently:**
- Any position without a SOLID block
- This includes roads, sidewalks, grass, etc.

**What needs to be implemented:**

1. Sidewalk detection in Pathfinder:
   - Modify `Pathfinding.ts` to check block type, not just collision
   - Add `isSidewalk(x, y, z)` method that checks:
     - Block type is `BlockType.SIDEWALK` (or similar)
     - Or: Block has specific surface type flag
   - `findRandomWalkablePosition` should prefer/require sidewalk tiles

2. Road avoidance logic:
   - Pathfinding should heavily penalize road tiles
   - Pedestrians should only cross roads at crosswalks
   - Add `BlockType.CROSSWALK` detection

3. Alternative approach - Navigation mesh:
   - Generate navigation mesh from map data
   - Mark sidewalks as pedestrian nav areas
   - Use A* pathfinding on this mesh

#### 4.2 Pedestrians Pass Through World Elements (Walls, Buildings)

**Issue:**

Pedestrians are subject to `MapCollisionSystem` (they have Position, Velocity, Collider components), but may still pass through walls due to:

1. **Collision system not working** (see Section 1)

2. **AI setting target positions inside walls:**
   - `findRandomWalkablePosition()` might return position inside building
   - No validation that path to target is clear

3. **High velocity bypassing collision detection:**
   - If pedestrian walks too fast, discrete collision detection might miss
   - Tunneling effect: entity moves through thin walls in one frame

**What needs to be fixed:**

1. Fix core collision system (Section 1)

2. Improve pathfinding validation:
   - `findRandomWalkablePosition()` should:
     - Check that position is not inside SOLID block
     - Use actual collision radius when checking (pedestrian radius = 12 from EntityFactory.ts:75)
     - Verify line-of-sight to target (raycasting)

3. Add continuous collision detection for fast-moving entities:
   - For pedestrians running or fleeing at high speed
   - Raycast from old position to new position
   - Detect if ray intersects any solid blocks

4. Implement pathfinding instead of direct movement:
   - Instead of walking straight to target, use A* path
   - Follow waypoints that avoid obstacles
   - Recalculate path if blocked

#### 4.3 Missing Pedestrian-Vehicle Collision Response

**Issue:**

When pedestrian collides with vehicle:
- No health/damage system integration
- Pedestrians should ragdoll or play death animation
- Should trigger FLEEING state for nearby pedestrians
- Should affect wanted level if player hits pedestrian

**What needs to be implemented:**

1. Collision event handler:
   - Listen for `collision:entity` events
   - Check if collision is Vehicle + Pedestrian
   - Calculate damage based on vehicle speed
   - Apply damage to Health component

2. Ragdoll/death logic:
   - Apply physics impulse to pedestrian (knock them back)
   - Play death animation
   - Transition to `PedestrianState.DEAD`
   - Despawn after timeout

3. AI reaction to violence:
   - Nearby pedestrians detect collision event
   - Increase `fearLevel`
   - Transition to `PedestrianState.FLEEING`
   - Run away from danger source

#### 4.4 No Crosswalk Behavior

**What's missing:**

1. Road crossing logic:
   - Pedestrians should prefer crosswalks
   - Look for oncoming traffic before crossing
   - Wait if vehicles approaching

2. Intersection behavior:
   - Stop at red lights (if traffic lights implemented)
   - Cross when safe

**What needs to be implemented:**

1. Crosswalk detection:
   - Tag crosswalk blocks in map data
   - Pedestrian pathfinding prefers crossing at crosswalks

2. Traffic awareness:
   - Check for nearby vehicles before crossing
   - Estimate vehicle arrival time
   - Wait if unsafe

---

## 5. Vertical Levels (Z-Levels) Issues

### Current State

The architecture document describes a full 3D system with 8 Z-levels (0-7), slopes for transitions, and multi-level roads (bridges, tunnels).

**Relevant files:**
- `src/ecs/systems/SlopeSystem.ts`
- `src/ecs/components/Transform.ts` (Position.z)

### Problems Identified

#### 5.1 Unclear if Z-Levels Are Actually Implemented

**Questions to investigate:**

1. **Map data:**
   - Is the `GameMap` actually loading 3D block data?
   - Are there any blocks at Z > 0?
   - Does the map loader support loading Tiled maps with layers as Z-levels?

2. **Rendering:**
   - Does `MapRenderer` render all Z-levels or just Z=0?
   - Is there Z-sorting for entities at different heights?
   - Do bridges render correctly above roads below?

3. **Camera:**
   - Does camera show all levels or focus on player's level?
   - Should camera height adjust based on player Z-level?

**What needs to be verified:**

1. Check `GameMap.ts` / map loading:
   - Verify 3D array structure: `blocks[x][y][z]` or `blocks[chunkId][localX][localY][z]`
   - Check if test maps have multi-level geometry

2. Check `MapRenderer.ts`:
   - Verify rendering loop includes Z-dimension
   - Ensure proper painter's algorithm (render back-to-front, bottom-to-top)

#### 5.2 Slope System May Not Function Properly

**File:** `src/ecs/systems/SlopeSystem.ts`

**What needs to be checked:**

1. Slope detection:
   - Does system correctly identify when entity is on slope block?
   - How does it determine slope direction and angle?

2. Z-level transitions:
   - When entity crosses slope, does Position.z update?
   - Is transition smooth or instant?
   - What about velocity during transition?

3. Integration with physics:
   - Do vehicles slow down going uphill?
   - Do vehicles speed up going downhill?
   - Is slope angle factored into acceleration?

**Potential issues:**

1. **No slope blocks in map:**
   - If map doesn't contain slope blocks, system does nothing
   - Need to place slopes in test maps

2. **Slope detection algorithm flawed:**
   - Might not detect all slope types
   - Might not handle diagonal slopes

3. **Z-update logic broken:**
   - Position.z might not interpolate smoothly
   - Entities might snap to wrong Z-level

**What needs to be implemented if missing:**

1. Slope block definitions:
   - Define all slope variants: SlopeN, SlopeS, SlopeE, SlopeW, DiagonalNE, etc.
   - Add to `BlockRegistry`

2. Smooth Z-transition:
   - Interpolate Z based on position within slope block
   - Example: If moving north on SlopeN, Z = lerp(0, 1, progressThroughBlock)

3. Physics adjustments:
   - Calculate slope angle
   - Apply gravity component along slope
   - Reduce vehicle acceleration uphill

#### 5.3 Entity Rendering at Different Z-Levels

**Issue:**

Entities at different Z-levels need correct visual layering:
- Entity on bridge (Z=3) should render above road below (Z=0)
- Depth sorting must consider Z-level

**Check `EntityRenderer.ts`:**

1. Depth calculation formula:
   - Should be: `depth = Y + (Z × mapHeight) + spriteHeight/2`
   - This ensures higher Z always renders in front

2. Verify sprite positioning:
   - Sprites should have Y-offset for Z-level (isometric projection)
   - Higher Z should appear "higher" on screen

**What might need fixing:**

1. If depth calculation is wrong or missing Z-component:
   - Entities on bridges will render behind ground entities
   - Visual glitches when crossing levels

2. Camera projection:
   - Isometric view should show height difference
   - Might need Y-offset for each Z-level

---

## 6. Weapon System Missing

### Current State

**The weapon system is completely missing:**
- No `WeaponSystem.ts` file
- No weapon components beyond basic `Weapon` definition in components
- No shooting mechanics
- Player doesn't spawn with weapon

**Architecture specifies:**
- Section 6.2: Weapon, Projectile, Explosion components
- Section 6.3: WeaponSystem, ProjectileSystem, ExplosionSystem
- Phase 4: Combat & Police (4-6 weeks)

### What Needs to Be Implemented

#### 6.1 Component Definitions

**Need to fully define (expand existing stubs):**

1. **Weapon component:**
   ```
   - type: WeaponType (pistol, uzi, shotgun, etc.)
   - damage: number
   - fireRate: number (shots per second)
   - range: number (max distance)
   - ammo: number (current)
   - maxAmmo: number
   - reloadTime: number
   - accuracy: number (0-1, spread)
   - automatic: boolean
   - projectileSpeed: number
   ```

2. **Projectile component:**
   ```
   - damage: number
   - speed: number
   - range: number (remaining)
   - owner: EntityId (who shot it)
   - penetration: number (how many targets it can hit)
   - lifetime: number
   ```

3. **Explosion component:**
   ```
   - radius: number
   - damage: number
   - force: number (knockback)
   - timer: number
   - source: EntityId
   ```

4. **Inventory component:**
   ```
   - weapons: EntityId[] (array of weapon entities)
   - currentWeaponIndex: number
   - maxWeapons: number (how many can carry)
   ```

#### 6.2 WeaponSystem Implementation

**Core functionality needed:**

1. **Weapon firing:**
   - Listen for fire input action
   - Check ammo count
   - Apply fire rate cooldown
   - Create projectile entity
   - Play firing animation/sound
   - Apply recoil to camera

2. **Weapon switching:**
   - Listen for next/prev weapon input
   - Update current weapon index
   - Update sprite to show weapon
   - Play weapon swap animation

3. **Reloading:**
   - Auto-reload when ammo empty
   - Manual reload on input
   - Reload time delay
   - Play reload animation/sound

4. **Aiming:**
   - Calculate aim direction from player rotation
   - Or use mouse position for top-down aiming
   - Apply accuracy spread (randomize angle slightly)

#### 6.3 ProjectileSystem Implementation

**Core functionality:**

1. **Projectile movement:**
   - Move in straight line at constant speed
   - Update based on dt
   - Reduce lifetime

2. **Collision detection:**
   - Raycast from previous position to current position
   - Check for hits on:
     - Map geometry (walls)
     - Entities (pedestrians, vehicles)
   - Use collision layers (projectile should hit STATIC, VEHICLE, PEDESTRIAN)

3. **Hit response:**
   - Apply damage to hit entity
   - Create impact particle effect
   - Play impact sound
   - Destroy projectile (or reduce penetration count)

4. **Lifetime expiration:**
   - Remove projectile after max range reached
   - Remove projectile after timeout

#### 6.4 Damage System Integration

**Need to create or verify:**

1. **HealthSystem:**
   - Process damage events
   - Reduce Health.current
   - Trigger death when health <= 0
   - Apply invulnerability period after hit

2. **DamageEvent handling:**
   - When projectile hits, emit `damage:entity` event
   - Include: target, amount, source, damageType

3. **Death handling:**
   - DeathSystem or within HealthSystem
   - Play death animation
   - Ragdoll physics
   - Drop items (weapons, money)
   - Despawn after timeout

#### 6.5 Player Weapon at Spawn

**Issue:** Player doesn't spawn with weapon (user requirement #6)

**What needs to be changed:**

In `EntityFactory.ts` `createPlayer()` method:

1. **Add Inventory component:**
   ```
   addComponent(world, eid, Inventory);
   ```

2. **Create default weapon (pistol):**
   ```
   const pistol = createWeapon(world, WeaponType.PISTOL);
   Inventory.weapons[eid] = pistol;
   Inventory.currentWeaponIndex[eid] = 0;
   ```

3. **Set initial ammo:**
   ```
   Weapon.ammo[pistol] = 50;
   Weapon.maxAmmo[pistol] = 50;
   ```

#### 6.6 Weapon Pickup System

**Also needs:**

1. Weapon pickup entities on map
2. Collision detection for player + pickup
3. Add weapon to inventory
4. Remove pickup from world
5. UI to show collected weapon

#### 6.7 Visual Feedback

**Essential for playability:**

1. **Muzzle flash:**
   - Particle effect when shooting
   - Brief sprite overlay

2. **Bullet tracers:**
   - Short line or particle trail
   - Helps player see where shooting

3. **Impact effects:**
   - Spark particles on wall hit
   - Blood particles on character hit
   - Dust on ground

4. **UI elements:**
   - Ammo counter
   - Weapon icon
   - Crosshair/reticle
   - Reload indicator

---

## 7. Additional Issues and Recommendations

### 7.1 System Execution Order

**Potential issue:**

The order systems execute matters. Incorrect order causes bugs:
- If MovementSystem runs before VehiclePhysicsSystem, vehicles won't move
- If AI runs after rendering, visual lag

**What needs to be verified in `Game.ts` or `World.ts`:**

Recommended order:
```
1. InputSystems (PlayerInputSystem)
2. AISystems (PedestrianAI, TrafficAI, PoliceAI)
3. GameplaySystems (WeaponSystem, DamageSystem)
4. PhysicsSystems (VehiclePhysicsSystem, PhysicsSyncSystem)
5. MovementSystems (MovementSystem, SlopeSystem)
6. CollisionSystems (MapCollisionSystem, EntityCollisionSystem)
7. StateSystems (HealthSystem, AnimationSystem)
8. RenderSystems (EntityRenderer, EffectsRenderer)
```

### 7.2 Debug Visualization

**Highly recommended to add:**

1. **Collision debug mode:**
   - Draw collision boxes around entities
   - Show collision normals when collision occurs
   - Highlight map blocks with collision

2. **AI debug mode:**
   - Draw pathfinding paths
   - Show AI state above entities
   - Visualize waypoint network for traffic
   - Show pedestrian targets

3. **Physics debug mode:**
   - Show velocity vectors
   - Display throttle/steering values
   - Render Matter.js debug view

4. **Z-level visualization:**
   - Color-code entities by Z-level
   - Show slope blocks differently
   - Display current Z-level on screen

### 7.3 Entity Component Completeness

**Need to verify all components are properly defined:**

Some components may exist as stubs but not be fully implemented:
- RigidBody (for Matter.js integration)
- Animation
- Audio
- ParticleEmitter

Check `src/ecs/components/` directory for incomplete definitions.

### 7.4 Event System Integration

**The architecture mentions EventBus:**

Verify:
- EventBus is initialized and working
- All systems emit/listen to appropriate events
- Event types are documented

Critical events:
- `vehicle:entered`, `vehicle:exited`
- `collision:entity`, `collision:map`
- `damage:entity`
- `entity:death`
- `weapon:fired`, `weapon:reload`

### 7.5 Spawn Manager Issues

**Check `SpawnManager.ts`:**

1. **Is it spawning traffic vehicles?**
   - With TrafficAI component
   - At valid waypoint positions
   - With proper initialization

2. **Is it spawning pedestrians?**
   - With PedestrianAI component
   - On sidewalks only
   - With random types/appearances

3. **Despawn logic:**
   - Remove entities far from player (out of view)
   - Prevent memory leaks
   - Pool entities for reuse

---

## 8. Priority Recommendations

Based on severity and dependencies, recommended fix order:

### Phase 1: Critical Foundation (Must fix first)
1. **Fix collision system** (Section 1)
   - Implement entity-entity collisions
   - Fix collision response (sliding)
   - Add collision events

2. **Verify Z-levels work** (Section 5)
   - Check map loading and rendering
   - Test slope system
   - Ensure depth sorting works

### Phase 2: AI and Movement
3. **Fix Traffic AI** (Section 3)
   - Initialize waypoint network
   - Verify VehiclePhysicsSystem processes AI vehicles
   - Debug state machine

4. **Fix Pedestrian AI** (Section 4)
   - Implement sidewalk-only walking
   - Fix collision with walls
   - Add pathfinding

### Phase 3: Vehicle Interaction
5. **Fix vehicle enter/exit** (Section 2)
   - Proper component lifecycle
   - Validate exit positions
   - Add animations/feedback

### Phase 4: Combat
6. **Implement weapon system** (Section 6)
   - Create all weapon components
   - Implement WeaponSystem, ProjectileSystem
   - Add damage system
   - Give player starting weapon

---

## 9. Testing Checklist

After implementing fixes, verify:

### Collision System
- [ ] Vehicles collide with each other and bounce
- [ ] Pedestrians cannot walk through walls
- [ ] Entities slide along walls instead of getting stuck
- [ ] Player cannot drive through buildings
- [ ] Collision events are emitted and logged

### Vehicle Interaction
- [ ] Player can enter nearby vehicle with E key
- [ ] Player sprite disappears when in vehicle
- [ ] Player can exit vehicle with E key
- [ ] Exit position is valid (not in wall)
- [ ] Cannot exit if all sides are blocked

### Traffic AI
- [ ] Traffic vehicles drive along roads
- [ ] Traffic follows waypoints
- [ ] Traffic stops for obstacles
- [ ] Traffic turns at intersections
- [ ] Traffic vehicles don't pass through each other

### Pedestrian AI
- [ ] Pedestrians spawn on sidewalks
- [ ] Pedestrians walk only on sidewalks
- [ ] Pedestrians don't walk through walls
- [ ] Pedestrians flee when danger nearby
- [ ] Pedestrians use crosswalks to cross roads

### Z-Levels
- [ ] Map has multi-level geometry (bridges)
- [ ] Player can drive on bridges
- [ ] Entities under bridge render behind
- [ ] Slopes allow smooth level transitions
- [ ] Depth sorting is correct

### Weapon System
- [ ] Player spawns with pistol
- [ ] Player can fire weapon with left-click
- [ ] Projectiles travel and hit targets
- [ ] Damage is applied to targets
- [ ] Ammo depletes and can be reloaded
- [ ] Weapon can be switched
- [ ] Visual/audio feedback works

---

## 10. Conclusion

The GTA2 clone has solid architectural foundations with ECS, proper separation of concerns, and good code organization. However, several critical systems are incomplete or non-functional:

**Most Critical Issues:**
1. No entity-entity collision detection
2. Traffic AI not moving (waypoint network missing)
3. Pedestrians ignoring navigation rules
4. Weapon system completely absent

**Estimated Effort:**
- Collision system: 2-3 days
- Traffic AI: 1-2 days (if waypoint gen is simple)
- Pedestrian AI: 2-3 days
- Vehicle interaction polish: 1 day
- Z-levels verification: 1-2 days
- Weapon system: 3-5 days
- **Total: ~2-3 weeks** for one developer

The architecture document is comprehensive and the implementation follows it reasonably well. The main issues are incomplete implementation of planned systems rather than fundamental design flaws.
