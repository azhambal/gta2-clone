# Шаг 18: Аудио система

## Цель
Реализовать аудио систему с использованием Howler.js. После этого шага работают базовые звуковые эффекты.

## Зависимости
- Шаг 17: Многоуровневость

## Задачи

### 18.1 AudioManager

**src/audio/AudioManager.ts:**
```typescript
import { Howl, Howler } from 'howler';

export class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private music: Howl | null = null;

  private masterVolume: number = 1.0;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 0.5;

  constructor() {
    Howler.autoUnlock = true;
  }

  // === Загрузка ===

  public loadSound(id: string, src: string | string[], options?: any): void {
    const sound = new Howl({
      src: Array.isArray(src) ? src : [src],
      volume: this.sfxVolume * this.masterVolume,
      ...options,
    });
    this.sounds.set(id, sound);
  }

  // === Воспроизведение SFX ===

  public playSound(id: string, options?: { volume?: number; rate?: number }): number {
    const sound = this.sounds.get(id);
    if (!sound) return -1;

    const soundId = sound.play();
    if (options?.volume) sound.volume(options.volume * this.sfxVolume * this.masterVolume, soundId);
    if (options?.rate) sound.rate(options.rate, soundId);

    return soundId;
  }

  public playSoundAt(id: string, x: number, y: number, listenerX: number, listenerY: number): number {
    const sound = this.sounds.get(id);
    if (!sound) return -1;

    const dx = x - listenerX;
    const dy = y - listenerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 1000;

    const volume = Math.max(0, 1 - distance / maxDistance);
    const pan = Math.max(-1, Math.min(1, dx / 500));

    const soundId = sound.play();
    sound.volume(volume * this.sfxVolume * this.masterVolume, soundId);
    sound.stereo(pan, soundId);

    return soundId;
  }

  public stopSound(id: string): void {
    this.sounds.get(id)?.stop();
  }

  // === Музыка ===

  public playMusic(src: string, loop: boolean = true): void {
    this.stopMusic();
    this.music = new Howl({
      src: [src],
      volume: this.musicVolume * this.masterVolume,
      loop,
    });
    this.music.play();
  }

  public stopMusic(): void {
    this.music?.stop();
    this.music = null;
  }

  // === Громкость ===

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  public setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.music?.volume(this.musicVolume * this.masterVolume);
  }
}

export const audioManager = new AudioManager();
```

### 18.2 Предзагрузка звуков

**src/audio/SoundAssets.ts:**
```typescript
export const SOUND_ASSETS = {
  // Транспорт
  'engine_idle': 'assets/audio/sfx/engine_idle.mp3',
  'engine_running': 'assets/audio/sfx/engine_running.mp3',
  'car_horn': 'assets/audio/sfx/car_horn.mp3',
  'car_crash': 'assets/audio/sfx/car_crash.mp3',
  'tire_screech': 'assets/audio/sfx/tire_screech.mp3',

  // Пешеходы
  'footstep_road': 'assets/audio/sfx/footstep_road.mp3',
  'footstep_grass': 'assets/audio/sfx/footstep_grass.mp3',

  // Оружие
  'pistol_fire': 'assets/audio/sfx/pistol_fire.mp3',
  'explosion': 'assets/audio/sfx/explosion.mp3',

  // UI
  'ui_click': 'assets/audio/sfx/ui_click.mp3',
};

export function preloadSounds(audioManager: AudioManager): void {
  for (const [id, src] of Object.entries(SOUND_ASSETS)) {
    audioManager.loadSound(id, src);
  }
}
```

### 18.3 Интеграция с игрой

```typescript
// При столкновении машин
eventBus.on('physics:collisionStart', ({ entityA, entityB }) => {
  if (isVehicle(entityA) && isVehicle(entityB)) {
    audioManager.playSoundAt('car_crash', Position.x[entityA], Position.y[entityA], cameraX, cameraY);
  }
});

// При входе в машину
eventBus.on('vehicle:entered', () => {
  audioManager.playSound('engine_idle');
});
```

## Результат
- Звуки загружаются и воспроизводятся
- Позиционный звук работает
- Громкость зависит от расстояния
- Управление громкостью

## Следующий шаг
Шаг 19: AI пешеходов
