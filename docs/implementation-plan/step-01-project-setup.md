# Шаг 01: Инициализация проекта

## Цель
Создать базовую структуру проекта с настроенными инструментами разработки. После этого шага проект должен запускаться и отображать пустую HTML-страницу.

## Предварительные требования
- Node.js 18+
- npm или yarn

## Задачи

### 1.1 Инициализация Vite проекта
```bash
npm create vite@latest gta2-clone -- --template vanilla-ts
cd gta2-clone
npm install
```

### 1.2 Установка основных зависимостей
```bash
# Основные библиотеки (устанавливать по мере необходимости в будущих шагах)
npm install pixi.js matter-js howler bitecs

# Типы
npm install -D @types/matter-js

# Инструменты разработки
npm install -D eslint prettier eslint-config-prettier @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

### 1.3 Конфигурация TypeScript

**tsconfig.json:**
```typescript
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"],
      "@core/*": ["./src/core/*"],
      "@ecs/*": ["./src/ecs/*"],
      "@rendering/*": ["./src/rendering/*"],
      "@physics/*": ["./src/physics/*"],
      "@world/*": ["./src/world/*"]
    }
  },
  "include": ["src"]
}
```

### 1.4 Создание структуры папок

```
src/
├── main.ts                 # Точка входа
├── Game.ts                 # Главный класс игры (заглушка)
├── core/                   # Ядро движка
│   └── index.ts
├── ecs/                    # Entity Component System
│   ├── components/
│   └── systems/
├── world/                  # Игровой мир
├── rendering/              # Рендеринг
├── physics/                # Физика
├── input/                  # Ввод
├── audio/                  # Аудио
├── ai/                     # Искусственный интеллект
├── assets/                 # Загрузка ресурсов
├── gameplay/               # Игровая логика
├── ui/                     # Интерфейс
├── scenes/                 # Сцены
└── utils/                  # Утилиты
    └── index.ts

assets/                     # Ресурсы игры
├── textures/
├── audio/
├── maps/
└── data/
```

### 1.5 Базовые файлы

**src/main.ts:**
```typescript
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div id="game-container">
    <h1>GTA 2 Clone</h1>
    <p>Инициализация...</p>
  </div>
`;

console.log('GTA 2 Clone - Project initialized');
```

**src/Game.ts:**
```typescript
/**
 * Главный класс игры
 * Координирует все подсистемы
 */
export class Game {
  private isRunning: boolean = false;

  constructor() {
    console.log('Game instance created');
  }

  public async init(): Promise<void> {
    console.log('Game initializing...');
    // Инициализация подсистем будет добавлена позже
  }

  public start(): void {
    this.isRunning = true;
    console.log('Game started');
  }

  public stop(): void {
    this.isRunning = false;
    console.log('Game stopped');
  }
}
```

**src/style.css:**
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1a1a2e;
  color: #eee;
  font-family: 'Courier New', monospace;
}

#app {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

#game-container {
  text-align: center;
}

canvas {
  display: block;
}
```

### 1.6 Конфигурация Vite

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@ecs': path.resolve(__dirname, './src/ecs'),
      '@rendering': path.resolve(__dirname, './src/rendering'),
      '@physics': path.resolve(__dirname, './src/physics'),
      '@world': path.resolve(__dirname, './src/world'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    target: 'ES2020',
    sourcemap: true,
  },
});
```

## Классы и интерфейсы

| Файл | Класс/Интерфейс | Описание |
|------|-----------------|----------|
| `src/Game.ts` | `Game` | Главный класс игры (заглушка) |

## Результат
- Проект запускается командой `npm run dev`
- Открывается браузер на `localhost:3000`
- Отображается страница "GTA 2 Clone - Инициализация..."
- Консоль показывает сообщения инициализации
- Горячая перезагрузка работает

## Проверка
```bash
npm run dev
# Открыть http://localhost:3000
# Проверить консоль браузера на наличие сообщений
```

## Следующий шаг
Шаг 02: Базовый движок и игровой цикл
