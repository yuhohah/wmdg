// --- App Manager for Cult of the Sphere ---
class AppManager {
  private startScreen: HTMLElement;
  private gameplayScreen: HTMLElement;
  private settingsModal: HTMLElement;
  private settingsBtn: HTMLButtonElement;
  private playBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;
  private closeSettingsBtn: HTMLButtonElement;
  private closeSettingsFooterBtn: HTMLButtonElement;
  private divineSphereBtn: HTMLElement;
  private recruitmentBtn: HTMLButtonElement;
  private faithCounterEl: HTMLElement;
  private followersCounterEl: HTMLElement;
  private footerStatusEl: HTMLElement;

  private faithPoints: number = 1;
  private followersCount: number = 0;

  // Web Audio Context for synthesized sound feedback
  private audioCtx: AudioContext | null = null;

  constructor() {
    this.startScreen = document.getElementById('start-screen')!;
    this.gameplayScreen = document.getElementById('gameplay-screen')!;
    this.settingsModal = document.getElementById('settings-modal')!;
    this.settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.backBtn = document.getElementById('back-to-menu-btn') as HTMLButtonElement;
    this.closeSettingsBtn = document.getElementById('close-settings-btn') as HTMLButtonElement;
    this.closeSettingsFooterBtn = document.getElementById('close-settings-footer-btn') as HTMLButtonElement;
    this.divineSphereBtn = document.getElementById('divine-sphere-btn')!;
    this.recruitmentBtn = document.getElementById('recruitment-btn') as HTMLButtonElement;
    this.faithCounterEl = document.getElementById('faith-counter')!;
    this.followersCounterEl = document.getElementById('followers-counter')!;
    this.footerStatusEl = document.getElementById('footer-status-text')!;

    this.initEvents();
    this.startPassiveFaithLoop();
    this.updateHUD();
  }

  private initEvents() {
    // Play Button -> Switch to gameplay screen
    this.playBtn.addEventListener('click', () => {
      this.initAudio();
      this.switchScreen('gameplay');
      this.playTone(440, 'sine', 0.1);
    });

    // Back to menu button
    this.backBtn.addEventListener('click', () => {
      this.switchScreen('start');
    });

    // CLICKABLE DIVINE SPHERE INTERACTION
    this.divineSphereBtn.addEventListener('click', (e: MouseEvent) => {
      this.onSphereClicked(e);
    });

    // Recruitment of Followers
    this.recruitmentBtn.addEventListener('click', () => {
      if (this.faithPoints >= 10) {
        this.faithPoints -= 10;
        this.followersCount += 1;
        this.updateHUD();
        this.playTone(523.25, 'triangle', 0.2); // C5 note tone
        this.spawnFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 80, '+1 FIÉL!');
      } else {
        this.playTone(200, 'sawtooth', 0.15); // Low error tone
      }
    });

    // Settings Modal
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.closeSettingsFooterBtn.addEventListener('click', () => this.closeSettings());

    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) {
        this.closeSettings();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.settingsModal.classList.contains('open')) {
        this.closeSettings();
      }
    });
  }

  private onSphereClicked(e: MouseEvent) {
    this.initAudio();
    // Add faith points (1 base + bonus per follower)
    const faithGained = 1 + this.followersCount;
    this.faithPoints += faithGained;
    this.updateHUD();

    // Sound effect
    const freq = 600 + Math.random() * 150;
    this.playTone(freq, 'sine', 0.08);

    // Spawn floating number at click position
    const x = e.clientX || window.innerWidth / 2;
    const y = e.clientY || window.innerHeight / 2;
    this.spawnFloatingText(x, y, `+${faithGained} FÉ`);
  }

  private spawnFloatingText(x: number, y: number, text: string) {
    const floatEl = document.createElement('div');
    floatEl.className = 'floating-faith-num';
    floatEl.textContent = text;
    floatEl.style.left = `${x}px`;
    floatEl.style.top = `${y}px`;

    document.body.appendChild(floatEl);

    // Remove element after animation completes
    setTimeout(() => {
      floatEl.remove();
    }, 850);
  }

  private updateHUD() {
    const faithFormatted = String(this.faithPoints).padStart(3, '0');
    this.faithCounterEl.textContent = `${faithFormatted} / H`;

    const followersFormatted = String(this.followersCount).padStart(2, '0');
    this.followersCounterEl.textContent = followersFormatted;

    // Update bottom status line
    if (this.followersCount > 0) {
      this.footerStatusEl.textContent = `A PROCISSÃO CRESCE (${this.followersCount} FIÉIS CANALIZANDO)`;
    } else {
      this.footerStatusEl.textContent = 'A PROCISSÃO CRESCE';
    }
  }

  private switchScreen(screen: 'start' | 'gameplay') {
    if (screen === 'gameplay') {
      this.startScreen.classList.remove('active');
      this.gameplayScreen.classList.add('active');
    } else {
      this.gameplayScreen.classList.remove('active');
      this.startScreen.classList.add('active');
    }
  }

  private openSettings() {
    this.settingsModal.classList.add('open');
  }

  private closeSettings() {
    this.settingsModal.classList.remove('open');
  }

  private startPassiveFaithLoop() {
    // Followers generate passive faith points over time
    window.setInterval(() => {
      if (this.followersCount > 0) {
        this.faithPoints += this.followersCount;
        this.updateHUD();
      }
    }, 1000);
  }

  private initAudio() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
  }

  private playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.1) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch {
      // Audio playback safety catch
    }
  }
}

// Bootstrap Cult of the Sphere Application
window.addEventListener('DOMContentLoaded', () => {
  new AppManager();
  console.log('🔮 Cult of the Sphere - Esfera Clicável e HUD ativados.');
});
