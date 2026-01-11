# Шаг 14: Физика транспорта

## Цель
Реализовать аркадную физику транспорта в стиле GTA2. После этого шага машины можно "толкать" и они реагируют физически.

## Зависимости
- Шаг 13: Транспорт — базовая структура

## Задачи

### 14.1 VehiclePhysicsSystem

**src/ecs/systems/VehiclePhysicsSystem.ts:**

Ключевые концепции:
- **Тяга (Thrust)**: сила от двигателя в направлении машины
- **Трение (Friction)**: замедление от поверхности
- **Боковое сцепление (Grip)**: сопротивление заносу
- **Поворот**: изменение угла в зависимости от скорости и руля

```typescript
/**
 * Физическая модель машины (упрощённая)
 */
export const createVehiclePhysicsSystem = (physicsManager: PhysicsManager) => {
  return defineSystem((world: IWorld, dt: number) => {
    const entities = vehicleQuery(world);
    const deltaSeconds = dt / 1000;

    for (const eid of entities) {
      const physics = VehiclePhysics;

      // Получаем ввод
      const throttle = physics.throttle[eid];
      const steering = physics.steering[eid];
      const currentSpeed = physics.speed[eid];
      const angle = Rotation.angle[eid];

      // Ускорение
      let acceleration = 0;
      if (throttle > 0) {
        acceleration = physics.acceleration[eid] * throttle;
      } else if (throttle < 0) {
        acceleration = -physics.braking[eid];
      }

      // Новая скорость с учётом трения
      let newSpeed = currentSpeed + acceleration * deltaSeconds;
      newSpeed *= (1 - 0.02); // Трение воздуха

      // Ограничение скорости
      const maxSpeed = physics.maxSpeed[eid];
      newSpeed = Math.max(-maxSpeed * 0.3, Math.min(maxSpeed, newSpeed));

      // Поворот (зависит от скорости)
      const turnRate = physics.handling[eid] * 3;
      const speedFactor = Math.min(Math.abs(currentSpeed) / 100, 1);
      const turnAmount = steering * turnRate * speedFactor * deltaSeconds;

      // Применение
      const newAngle = angle + turnAmount * Math.sign(currentSpeed);
      Rotation.angle[eid] = newAngle;
      physics.speed[eid] = newSpeed;

      // Скорость в компонентах
      Velocity.x[eid] = Math.cos(newAngle) * newSpeed;
      Velocity.y[eid] = Math.sin(newAngle) * newSpeed;

      // Синхронизация с физикой
      if (physicsManager) {
        physicsManager.setBodyAngle(eid, newAngle);
        physicsManager.setVelocity(eid, {
          x: Velocity.x[eid],
          y: Velocity.y[eid]
        });
      }
    }

    return world;
  });
};
```

### 14.2 Ключевые формулы

```
Ускорение:
  a = throttle * acceleration - friction * speed

Поворот:
  angular_velocity = steering * handling * speed_factor

Дрифт (если grip < порог):
  lateral_slip = (1 - grip) * lateral_velocity
```

### 14.3 Параметры поверхностей

| Поверхность | Grip | Friction | Эффект |
|-------------|------|----------|--------|
| Road | 1.0 | 0.02 | Норма |
| Grass | 0.7 | 0.05 | Замедление |
| Ice | 0.2 | 0.01 | Скольжение |
| Oil | 0.1 | 0.01 | Потеря контроля |
| Water | 0.5 | 0.10 | Сильное замедление |

## Результат
- Машины двигаются по физике
- Инерция и торможение работают
- Поворот зависит от скорости
- Базовый дрифт возможен

## Следующий шаг
Шаг 15: Вход/выход из машины
