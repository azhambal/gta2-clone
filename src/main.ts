import './style.css';
import { Game } from './Game';

async function main() {
  // Очистка контейнера
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) {
    throw new Error('App container not found');
  }
  app.innerHTML = '<div id="game-container"></div>';

  // Создание и запуск игры
  const game = new Game({
    width: 1280,
    height: 720,
  });

  await game.init();
  game.start();

  // Для отладки в консоли
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).game = game;
}

main().catch(console.error);
