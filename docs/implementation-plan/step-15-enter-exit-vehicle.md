# Шаг 15: Вход/выход из машины

## Цель
Реализовать механику входа и выхода игрока из транспорта. После этого шага игрок может садиться в машину и управлять ей.

## Зависимости
- Шаг 14: Физика транспорта

## Задачи

### 15.1 Компонент водителя

**src/ecs/components/Driver.ts:**
```typescript
export const DriverComponent = defineComponent({
  vehicleEntity: Types.eid,  // В какой машине сидит
});

export const InVehicle = defineComponent(); // Tag: в машине
```

### 15.2 VehicleInteractionSystem

**src/ecs/systems/VehicleInteractionSystem.ts:**

```typescript
/**
 * Система входа/выхода из машины
 */
export const createVehicleInteractionSystem = (inputManager: InputManager) => {
  return defineSystem((world: IWorld, dt: number) => {
    // Проверяем нажатие E
    if (!inputManager.isActionJustPressed(GameAction.ENTER_EXIT_VEHICLE)) {
      return world;
    }

    const players = playerQuery(world);

    for (const playerEid of players) {
      if (hasComponent(world, InVehicle, playerEid)) {
        // ВЫХОД из машины
        exitVehicle(world, playerEid);
      } else {
        // Поиск ближайшей машины
        const nearestVehicle = findNearestVehicle(world, playerEid, 80);
        if (nearestVehicle !== -1) {
          enterVehicle(world, playerEid, nearestVehicle);
        }
      }
    }

    return world;
  });
};

function enterVehicle(world: IWorld, playerEid: number, vehicleEid: number): void {
  // Проверка: есть ли свободное место
  if (VehicleSeats.driver[vehicleEid] !== 0) return;

  // Добавляем компоненты
  addComponent(world, InVehicle, playerEid);
  addComponent(world, DriverComponent, playerEid);
  DriverComponent.vehicleEntity[playerEid] = vehicleEid;

  // Записываем водителя в машину
  VehicleSeats.driver[vehicleEid] = playerEid;
  VehicleComponent.engineRunning[vehicleEid] = 1;

  // Скрываем спрайт игрока
  SpriteComponent.visible[playerEid] = 0;

  eventBus.emit('vehicle:entered', { player: playerEid, vehicle: vehicleEid });
}

function exitVehicle(world: IWorld, playerEid: number): void {
  const vehicleEid = DriverComponent.vehicleEntity[playerEid];

  // Позиция выхода (сбоку от машины)
  const exitOffset = 40;
  const angle = Rotation.angle[vehicleEid];
  Position.x[playerEid] = Position.x[vehicleEid] + Math.cos(angle + Math.PI/2) * exitOffset;
  Position.y[playerEid] = Position.y[vehicleEid] + Math.sin(angle + Math.PI/2) * exitOffset;

  // Удаляем компоненты
  removeComponent(world, InVehicle, playerEid);
  removeComponent(world, DriverComponent, playerEid);

  // Очищаем машину
  VehicleSeats.driver[vehicleEid] = 0;
  VehicleComponent.engineRunning[vehicleEid] = 0;

  // Показываем спрайт игрока
  SpriteComponent.visible[playerEid] = 1;

  eventBus.emit('vehicle:exited', { player: playerEid, vehicle: vehicleEid });
}
```

### 15.3 Обновление PlayerInputSystem

```typescript
// Проверяем, в машине ли игрок
if (hasComponent(world, InVehicle, eid)) {
  // Управление машиной
  const vehicleEid = DriverComponent.vehicleEntity[eid];
  const input = inputManager.getVehicleInput();

  VehiclePhysics.throttle[vehicleEid] = input.throttle;
  VehiclePhysics.steering[vehicleEid] = input.steer;

  // Камера следит за машиной
  Position.x[eid] = Position.x[vehicleEid];
  Position.y[eid] = Position.y[vehicleEid];
} else {
  // Обычное управление пешеходом
  // ... существующий код ...
}
```

### 15.4 Визуальная индикация

- При приближении к машине показывать индикатор "E"
- При входе в машину скрывать пешехода
- Камера переключается на машину

## События

| Событие | Данные | Описание |
|---------|--------|----------|
| `vehicle:entered` | `{ player, vehicle }` | Игрок сел в машину |
| `vehicle:exited` | `{ player, vehicle }` | Игрок вышел из машины |

## Результат
- Нажатие E возле машины сажает игрока
- Повторное E — выход из машины
- В машине WASD управляет машиной, не персонажем
- Камера следует за машиной

## Следующий шаг
Шаг 16: Типы поверхностей
