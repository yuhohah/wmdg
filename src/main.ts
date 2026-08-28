import { GameEngine } from './engine/GameEngine';
import { PixiApp } from './view/PixiApp';

async function bootstrap() {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    throw new Error('Element #app not found in document');
  }

  // 1. Instantiate pure math game engine
  const engine = new GameEngine();

  // 2. Instantiate PixiJS rendering layer
  const pixiApp = new PixiApp(engine, appContainer);
  await pixiApp.init();

  // 3. Start engine simulation loop
  engine.start();

  console.log('🎮 Quantum Clicker Idle Game initialized successfully with PixiJS v8 and TypeScript.');
}

bootstrap().catch((err) => {
  console.error('Failed to bootstrap idle game:', err);
});
