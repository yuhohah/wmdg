import { events, GameEvents } from '../core/EventBus.js';
import type { GameStateManager } from '../core/GameState.js';
import { SphereVisual } from '../features/sphere/SphereVisual.js';
import type { AudioManager } from '../systems/audio.js';

export interface StartScreenControllerOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  onStartPlay: () => void;
  onStartFrameReady: () => void;
}

export function bindStartScreen(options: StartScreenControllerOptions): void {
  const { gameState, audio, onStartPlay, onStartFrameReady } = options;
  const playBtn = document.getElementById('play-btn');
  const startScreen = document.getElementById('start-screen');
  const gameplayScreen = document.getElementById('gameplay-screen');
  const startSphereHost = document.getElementById('start-sphere');
  const startSphere = startSphereHost ? new SphereVisual(startSphereHost) : null;

  const syncStartSphere = () =>
    startSphere?.setProgress(
      gameState.isIncarnationUnlocked(),
      gameState.incarnationStage
    );
  syncStartSphere();
  const stopSyncStartSphere = events.on(GameEvents.STATE_CHANGED, syncStartSphere);

  playBtn?.addEventListener('click', () => {
    stopSyncStartSphere();
    startSphere?.destroy();
    gameState.startGameClock();
    onStartPlay();
    audio.init();
    audio.playMusic();
    audio.playTone(440, 'sine', 0.1);
    startScreen?.classList.remove('active');
    gameplayScreen?.classList.add('active');
    // Cheap hook for play-time styles (a body:has() selector re-ran style recalcs on every DOM change)
    document.body.classList.add('is-playing');
    requestAnimationFrame(() => {
      onStartFrameReady();
    });
  });
}
