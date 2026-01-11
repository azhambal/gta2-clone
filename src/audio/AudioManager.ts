import { Howl, Howler } from 'howler';

export interface PlayOptions {
  volume?: number;
  rate?: number;
}

export interface SoundLoadOptions {
  sprite?: Record<string, [number, number]>;
  loop?: boolean;
  autoplay?: boolean;
  preload?: boolean;
}

/**
 * AudioManager - Управление всеми звуками в игре
 * Основано на Howler.js для кроссбраузерности
 */
export class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private music: Howl | null = null;

  private masterVolume: number = 1.0;
  private sfxVolume: number = 1.0;
  private musicVolume: number = 0.5;

  private enabled: boolean = true;

  constructor() {
    Howler.autoUnlock = true;
    Howler.volume(this.masterVolume);
  }

  // === Загрузка ===

  /**
   * Загрузить звуковой эффект
   */
  public loadSound(id: string, src: string | string[], options?: SoundLoadOptions): void {
    const sound = new Howl({
      src: Array.isArray(src) ? src : [src],
      volume: this.sfxVolume * this.masterVolume,
      preload: options?.preload ?? true,
      loop: options?.loop ?? false,
      autoplay: options?.autoplay ?? false,
      sprite: options?.sprite,
    });
    this.sounds.set(id, sound);
  }

  /**
   * Загрузить звук из asset manifest
   */
  public loadSounds(manifest: Record<string, string | string[] | { src: string | string[]; options?: SoundLoadOptions }>): void {
    for (const [id, data] of Object.entries(manifest)) {
      if (typeof data === 'string' || Array.isArray(data)) {
        this.loadSound(id, data);
      } else {
        this.loadSound(id, data.src, data.options);
      }
    }
  }

  /**
   * Проверить, загружен ли звук
   */
  public isLoaded(id: string): boolean {
    const sound = this.sounds.get(id);
    return sound?.state() === 'loaded';
  }

  // === Воспроизведение SFX ===

  /**
   * Воспроизвести звук
   * @returns soundId - ID экземпляра звука (для управления)
   */
  public playSound(id: string, options?: PlayOptions): number {
    if (!this.enabled) return -1;

    const sound = this.sounds.get(id);
    if (!sound) {
      console.warn(`Sound not found: ${id}`);
      return -1;
    }

    const soundId = sound.play();
    if (soundId === -1) return -1;

    if (options?.volume !== undefined) {
      sound.volume(options.volume * this.sfxVolume * this.masterVolume, soundId);
    }
    if (options?.rate !== undefined) {
      sound.rate(options.rate, soundId);
    }

    return soundId;
  }

  /**
   * Воспроизвести звук с 3D позиционированием
   * @returns soundId - ID экземпляра звука
   */
  public playSoundAt(
    id: string,
    x: number,
    y: number,
    listenerX: number,
    listenerY: number,
    options?: PlayOptions
  ): number {
    if (!this.enabled) return -1;

    const sound = this.sounds.get(id);
    if (!sound) {
      console.warn(`Sound not found: ${id}`);
      return -1;
    }

    const dx = x - listenerX;
    const dy = y - listenerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxDistance = 1000;

    // Volume attenuation based on distance
    const volume = Math.max(0, 1 - distance / maxDistance);
    if (volume === 0) return -1;

    // Stereo panning
    const pan = Math.max(-1, Math.min(1, dx / 500));

    const soundId = sound.play();
    if (soundId === -1) return -1;

    sound.volume(volume * (options?.volume ?? 1) * this.sfxVolume * this.masterVolume, soundId);
    sound.stereo(pan, soundId);

    if (options?.rate !== undefined) {
      sound.rate(options.rate, soundId);
    }

    return soundId;
  }

  /**
   * Остановить все экземпляры звука
   */
  public stopSound(id: string): void {
    this.sounds.get(id)?.stop();
  }

  /**
   * Остановить конкретный экземпляр звука
   */
  public stopSoundInstance(id: string, soundId: number): void {
    this.sounds.get(id)?.stop(soundId);
  }

  /**
   * Приостановить звук
   */
  public pauseSound(id: string): void {
    this.sounds.get(id)?.pause();
  }

  /**
   * Возобновить звук
   */
  public resumeSound(id: string): void {
    this.sounds.get(id)?.play();
  }

  /**
   * Проверить, играет ли звук
   */
  public isPlaying(id: string): boolean {
    return this.sounds.get(id)?.playing() ?? false;
  }

  /**
   * Воспроизвести спрайт звука
   */
  public playSprite(id: string, spriteName: string, options?: PlayOptions): number {
    if (!this.enabled) return -1;

    const sound = this.sounds.get(id);
    if (!sound) {
      console.warn(`Sound not found: ${id}`);
      return -1;
    }

    const soundId = sound.play(spriteName);
    if (soundId === -1) return -1;

    if (options?.volume !== undefined) {
      sound.volume(options.volume * this.sfxVolume * this.masterVolume, soundId);
    }
    if (options?.rate !== undefined) {
      sound.rate(options.rate, soundId);
    }

    return soundId;
  }

  // === Музыка ===

  /**
   * Воспроизвести музыкальный трек
   */
  public playMusic(src: string, loop: boolean = true, fadeDuration: number = 1000): void {
    if (!this.enabled) return;

    this.stopMusic();

    this.music = new Howl({
      src: [src],
      volume: 0,
      loop,
    });

    this.music.play();

    // Fade in
    this.music.fade(0, this.musicVolume * this.masterVolume, fadeDuration);
  }

  /**
   * Остановить музыку с fade out
   */
  public stopMusic(fadeDuration: number = 1000): void {
    if (!this.music) return;

    if (fadeDuration > 0) {
      const currentMusic = this.music;
      currentMusic.fade(currentMusic.volume() as number, 0, fadeDuration);
      setTimeout(() => {
        currentMusic.stop();
      }, fadeDuration);
    } else {
      this.music.stop();
    }

    this.music = null;
  }

  /**
   * Установить громкость музыки
   */
  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.music) {
      this.music.volume(this.musicVolume * this.masterVolume);
    }
  }

  // === Громкость ===

  /**
   * Установить мастер-громкость
   */
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  /**
   * Получить мастер-громкость
   */
  public getMasterVolume(): number {
    return this.masterVolume;
  }

  /**
   * Установить громкость SFX
   */
  public setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Получить громкость SFX
   */
  public getSFXVolume(): number {
    return this.sfxVolume;
  }

  /**
   * Получить громкость музыки
   */
  public getMusicVolume(): number {
    return this.musicVolume;
  }

  // === Включение/выключение ===

  /**
   * Включить звук
   */
  public enable(): void {
    this.enabled = true;
    Howler.mute(false);
  }

  /**
   * Выключить звук (mute)
   */
  public disable(): void {
    this.enabled = false;
    Howler.mute(true);
  }

  /**
   * Переключить звук
   */
  public toggle(): boolean {
    this.enabled = !this.enabled;
    Howler.mute(!this.enabled);
    return this.enabled;
  }

  /**
   * Проверить, включен ли звук
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  // === Утилиты ===

  /**
   * Остановить все звуки
   */
  public stopAll(): void {
    Howler.stop();
  }

  /**
   * Освободить ресурсы
   */
  public unload(id: string): void {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.unload();
      this.sounds.delete(id);
    }
  }

  /**
   * Освободить все ресурсы
   */
  public unloadAll(): void {
    this.stopMusic(0);
    for (const sound of this.sounds.values()) {
      sound.unload();
    }
    this.sounds.clear();
  }

  /**
   * Получить количество загруженных звуков
   */
  public getSoundCount(): number {
    return this.sounds.size;
  }
}

// Глобальный экземпляр
export const audioManager = new AudioManager();
