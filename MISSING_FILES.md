# Missing Files Report

This document lists all files that are referenced in the codebase but do not exist in the repository.

## Summary

- **Total Missing Files**: 20
- **Audio Files**: 19
- **Other Files**: 1 (favicon)

## Missing Files

### Audio Files (19 files)

All audio files are expected to be in `public/assets/audio/sfx/` directory (relative to project root).

#### Vehicle Sounds (5 files)
- `public/assets/audio/sfx/engine_idle.mp3`
- `public/assets/audio/sfx/engine_running.mp3`
- `public/assets/audio/sfx/car_horn.mp3`
- `public/assets/audio/sfx/car_crash.mp3`
- `public/assets/audio/sfx/tire_screech.mp3`

#### Footstep Sounds (4 files)
- `public/assets/audio/sfx/footstep_road.mp3`
- `public/assets/audio/sfx/footstep_grass.mp3`
- `public/assets/audio/sfx/footstep_metal.mp3`
- `public/assets/audio/sfx/footstep_water.mp3`

#### Weapon Sounds (5 files)
- `public/assets/audio/sfx/pistol_fire.mp3`
- `public/assets/audio/sfx/rifle_fire.mp3`
- `public/assets/audio/sfx/shotgun_fire.mp3`
- `public/assets/audio/sfx/explosion.mp3`
- `public/assets/audio/sfx/reload.mp3`

#### UI Sounds (3 files)
- `public/assets/audio/sfx/ui_click.mp3`
- `public/assets/audio/sfx/ui_hover.mp3`
- `public/assets/audio/sfx/ui_error.mp3`

#### Impact Sounds (3 files)
- `public/assets/audio/sfx/hit.mp3`
- `public/assets/audio/sfx/pickup.mp3`
- `public/assets/audio/sfx/death.mp3`

### Other Files (1 file)

#### Favicon
- `public/favicon.ico` (referenced in `index.html`)

## File References

### Audio Files
All audio files are referenced in:
- **Source**: `src/audio/SoundAssets.ts`
- **Usage**: The `preloadSounds()` function in `src/Game.ts` loads all these sounds via `audioManager.loadSound()`

### Favicon
- **Source**: `index.html` (line 5)
- **Reference**: `<link rel="icon" type="image/svg+xml" href="/favicon.ico" />`

## Directory Structure

The code expects the following directory structure (which doesn't exist):

```
public/
├── favicon.ico
└── assets/
    └── audio/
        └── sfx/
            ├── engine_idle.mp3
            ├── engine_running.mp3
            ├── car_horn.mp3
            ├── car_crash.mp3
            ├── tire_screech.mp3
            ├── footstep_road.mp3
            ├── footstep_grass.mp3
            ├── footstep_metal.mp3
            ├── footstep_water.mp3
            ├── pistol_fire.mp3
            ├── rifle_fire.mp3
            ├── shotgun_fire.mp3
            ├── explosion.mp3
            ├── reload.mp3
            ├── ui_click.mp3
            ├── ui_hover.mp3
            ├── ui_error.mp3
            ├── hit.mp3
            ├── pickup.mp3
            └── death.mp3
```

## Notes

1. **Vite Configuration**: In Vite, files in the `public/` directory are served from the root path. So `public/assets/audio/sfx/engine_idle.mp3` is accessible as `/assets/audio/sfx/engine_idle.mp3` in the browser.

2. **Current State**: The `public/` directory does not exist in the repository. It needs to be created along with all the asset files.

3. **Code Impact**: The game will attempt to load these audio files when `preloadSounds()` is called during game initialization. Missing files will cause errors or silent failures depending on how Howler.js handles missing audio files.

4. **Texture/Image Files**: The codebase uses `TextureGenerator` to create placeholder textures programmatically, so no texture/image files are currently required. However, the architecture documentation mentions texture atlases that may be needed in the future.
