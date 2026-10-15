import { GameStateManager } from '../../core/GameState.js';
import { AudioManager } from '../../systems/audio.js';
import { NotificationManager } from '../../systems/notifications.js';
import { BOSS_GODS, getBossHp } from '../../config/bosses.js';
import type { BossGodConfig } from '../../types.js';
import { formatNumber } from '../../systems/calculations.js';
import { events, GameEvents } from '../../core/EventBus.js';

export interface BossBattleOptions {
  gameState: GameStateManager;
  audio: AudioManager;
  notifications: NotificationManager;
  onBattleEnd?: () => void;
}

export class BossBattleController {
  private gameState: GameStateManager;
  private audio: AudioManager;
  private notifications: NotificationManager;
  private onBattleEnd?: () => void;

  // Battle State
  public activeBoss: BossGodConfig | null = null;
  public bossMaxHp: number = 0;
  public bossCurrentHp: number = 0;
  public timeRemaining: number = 0;
  public isFighting: boolean = false;
  private ascensionLevel: number = 0;
  private riftSpawnTimer: number = 0;

  // DOM Elements
  private overlayEl: HTMLElement | null = null;
  private bossTitleEl: HTMLElement | null = null;
  private bossNameEl: HTMLElement | null = null;
  private hpBarFillEl: HTMLElement | null = null;
  private hpTextEl: HTMLElement | null = null;
  private timerTextEl: HTMLElement | null = null;
  private retreatBtnEl: HTMLElement | null = null;
  private blasphemyRiftContainerEl: HTMLElement | null = null;

  constructor(options: BossBattleOptions) {
    this.gameState = options.gameState;
    this.audio = options.audio;
    this.notifications = options.notifications;
    this.onBattleEnd = options.onBattleEnd;

    this.initElements();
    this.bindEvents();
  }

  private initElements(): void {
    this.overlayEl = document.getElementById('boss-battle-overlay');
    this.bossTitleEl = document.getElementById('boss-battle-title');
    this.bossNameEl = document.getElementById('boss-battle-name');
    this.hpBarFillEl = document.getElementById('boss-hp-fill');
    this.hpTextEl = document.getElementById('boss-hp-text');
    this.timerTextEl = document.getElementById('boss-timer-text');
    this.retreatBtnEl = document.getElementById('boss-retreat-btn');
    this.blasphemyRiftContainerEl = document.getElementById('blasphemy-rift-container');
  }

  private bindEvents(): void {
    this.retreatBtnEl?.addEventListener('click', () => {
      this.retreat();
    });

    // Central Sphere click during battle also damages boss!
    const sphereBtn = document.getElementById('divine-sphere-btn');
    sphereBtn?.addEventListener('click', (e: MouseEvent) => {
      if (this.isFighting) {
        this.dealDamageFromPlayerClick(e.clientX, e.clientY);
      }
    });
  }

  public startBattle(bossId: string): void {
    const boss = BOSS_GODS.find((b) => b.id === bossId);
    if (!boss) return;

    this.initElements();

    const record = this.gameState.bossRecords.get(bossId) || {
      id: bossId,
      defeated: false,
      ascensionLevel: 0
    };

    this.activeBoss = boss;
    this.ascensionLevel = record.ascensionLevel;
    this.bossMaxHp = getBossHp(boss, this.ascensionLevel);
    this.bossCurrentHp = this.bossMaxHp;
    this.timeRemaining = boss.timeLimitSec;
    this.isFighting = true;
    this.riftSpawnTimer = 3.0; // First rift after 3s

    if (this.overlayEl) {
      this.overlayEl.style.display = 'flex';
      this.overlayEl.classList.add('battle-active');
      this.overlayEl.style.setProperty('--boss-glow-color', boss.artThemeColor);
    }

    if (this.bossTitleEl) {
      this.bossTitleEl.textContent = `BATALHA CÓSMICA · ${boss.title.toUpperCase()}`;
    }
    if (this.bossNameEl) {
      this.bossNameEl.textContent = `${boss.name} ${this.ascensionLevel > 0 ? `(Ascensão ${this.ascensionLevel})` : ''}`;
      this.bossNameEl.style.color = boss.artThemeColor;
    }

    // Shake screen when boss enters
    this.shakeArena(15);
    this.audio.playTone(150, 'sawtooth', 0.4);
    setTimeout(() => this.audio.playTone(220, 'triangle', 0.3), 150);

    this.updateHpBar();
    this.updateTimerDisplay();

    this.notifications.showCustomPopup(
      `Confronto de Deuses: ${boss.name}!`,
      `Você desafiou ${boss.name}, ${boss.title}. Destrua sua forma cósmica antes que o tempo esgote!`,
      '',
      'TEOMAQUIA'
    );
  }

  public tick(deltaSec: number): void {
    if (!this.isFighting || !this.activeBoss) return;

    // 1. Tick Countdown Timer
    this.timeRemaining -= deltaSec;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.defeatTimeOut();
      return;
    }
    this.updateTimerDisplay();

    // 2. Passive Continuous DPS from followers & fervor
    const fps = this.gameState.getFaithPerSecond();
    if (fps > 0) {
      const passiveDmg = fps * deltaSec;
      this.inflictDamage(passiveDmg, false);
    }

    // 3. Blasphemy Rifts Spawning
    this.riftSpawnTimer -= deltaSec;
    if (this.riftSpawnTimer <= 0) {
      this.spawnBlasphemyRift();
      // Next rift in 4-7 seconds
      this.riftSpawnTimer = 4.0 + Math.random() * 3.0;
    }
  }

  public dealDamageFromPlayerClick(clientX?: number, clientY?: number): void {
    if (!this.isFighting) return;

    const baseFpc = this.gameState.getFaithPerClick();
    let dmg = baseFpc;
    let isCrit = false;

    // Check Morvath fragment crit (5% chance of 5x)
    if (this.gameState.hasFragment('fragment_morvath') && Math.random() < 0.05) {
      dmg *= 5;
      isCrit = true;
      this.audio.playBossCrit();
    } else {
      this.audio.playBossHit();
    }

    this.inflictDamage(dmg, isCrit, clientX, clientY);
  }

  private inflictDamage(amount: number, isCrit: boolean = false, clientX?: number, clientY?: number): void {
    if (!this.isFighting || this.bossCurrentHp <= 0) return;

    this.bossCurrentHp = Math.max(0, this.bossCurrentHp - amount);
    this.updateHpBar();

    if (clientX !== undefined && clientY !== undefined) {
      this.spawnDamageNumber(clientX, clientY, amount, isCrit);
    }

    if (isCrit) {
      this.shakeArena(8);
    }

    // Check Victory
    if (this.bossCurrentHp <= 0) {
      this.victory();
    }
  }

  private spawnDamageNumber(x: number, y: number, amount: number, isCrit: boolean): void {
    const dmgEl = document.createElement('div');
    dmgEl.className = `boss-damage-number ${isCrit ? 'crit-damage' : 'normal-damage'}`;
    dmgEl.textContent = `${isCrit ? '💥 ' : ''}-${formatNumber(amount)}`;

    const spreadX = (Math.random() - 0.5) * 60;
    dmgEl.style.left = `${x + spreadX}px`;
    dmgEl.style.top = `${y - 20}px`;

    document.body.appendChild(dmgEl);
    setTimeout(() => dmgEl.remove(), 750);
  }

  private spawnBlasphemyRift(): void {
    if (!this.isFighting || !this.blasphemyRiftContainerEl) return;

    const rift = document.createElement('button');
    rift.className = 'blasphemy-rift';
    rift.setAttribute('aria-label', 'Fenda de Blasfêmia - Clique para dano crítico maciço');

    // Random position within presentation container (20% to 80%)
    const leftPercent = 20 + Math.random() * 60;
    const topPercent = 20 + Math.random() * 60;

    rift.style.left = `${leftPercent}%`;
    rift.style.top = `${topPercent}%`;

    rift.innerHTML = `<span class="rift-glyph">𖤍</span>`;

    const riftLifespan = 3000; // 3 seconds before fading
    const expireTimer = setTimeout(() => {
      rift.remove();
    }, riftLifespan);

    rift.addEventListener('click', (e) => {
      e.stopPropagation();
      clearTimeout(expireTimer);
      rift.remove();

      this.audio.playAnomalyShatter();
      this.shakeArena(12);

      // Rift burst: 20x player click damage + 5% max HP bonus
      const burstDmg = (this.gameState.getFaithPerClick() * 20) + (this.bossMaxHp * 0.05);
      this.inflictDamage(burstDmg, true, e.clientX, e.clientY);

      this.notifications.showCustomPopup(
        'Fenda Rompida!',
        `Você atingiu o ponto fraco celestial! Dano colStyles: -${formatNumber(burstDmg)}`,
        '',
        'RUPTURA CÓSMICA'
      );
    });

    this.blasphemyRiftContainerEl.appendChild(rift);
  }

  private shakeArena(intensity: number = 10): void {
    const sphereContainer = document.getElementById('divine-sphere-container');
    if (!sphereContainer) return;

    sphereContainer.style.transform = `translate(${(Math.random() - 0.5) * intensity}px, ${(Math.random() - 0.5) * intensity}px)`;
    setTimeout(() => {
      if (sphereContainer) sphereContainer.style.transform = '';
    }, 120);
  }

  private updateHpBar(): void {
    if (!this.hpBarFillEl || !this.hpTextEl) return;

    const pct = Math.max(0, Math.min(100, (this.bossCurrentHp / this.bossMaxHp) * 100));
    this.hpBarFillEl.style.width = `${pct}%`;
    this.hpTextEl.textContent = `${formatNumber(this.bossCurrentHp)} / ${formatNumber(this.bossMaxHp)} HP (${pct.toFixed(1)}%)`;
  }

  private updateTimerDisplay(): void {
    if (!this.timerTextEl) return;
    this.timerTextEl.textContent = `${Math.ceil(this.timeRemaining)}s`;

    if (this.timeRemaining <= 10) {
      this.timerTextEl.classList.add('timer-warning');
    } else {
      this.timerTextEl.classList.remove('timer-warning');
    }
  }

  private victory(): void {
    if (!this.activeBoss) return;
    const boss = this.activeBoss;

    this.isFighting = false;
    this.audio.playBossVictory();

    const { relicsGained, fragmentUnlocked } = this.gameState.recordBossDefeat(boss.id);

    // Clean up rifts
    if (this.blasphemyRiftContainerEl) {
      this.blasphemyRiftContainerEl.innerHTML = '';
    }

    if (this.overlayEl) {
      this.overlayEl.style.display = 'none';
      this.overlayEl.classList.remove('battle-active');
    }

    let msg = `O deus rival ${boss.name} caiu ante seu poder supremo! Você ganhou +${relicsGained} Relíquias sagradas.`;
    if (fragmentUnlocked) {
      msg += ` Além disso, você forjou o ${boss.fragmentId === 'fragment_morvath' ? 'Olho de Morvath' : boss.fragmentId === 'fragment_aethelgard' ? 'Coração de Aethelgard' : 'Manto de Xul\'Khor'}!`;
    }

    this.notifications.showCustomPopup(
      `DEICÍDIO! ${boss.name} DERROTADO!`,
      msg,
      '',
      'VITÓRIA CÓSMICA'
    );

    events.emit(GameEvents.STATE_CHANGED);

    if (this.onBattleEnd) {
      this.onBattleEnd();
    }
  }

  private defeatTimeOut(): void {
    if (!this.activeBoss) return;
    const boss = this.activeBoss;

    this.isFighting = false;
    this.audio.playTone(180, 'sine', 0.5);

    // Clean up rifts
    if (this.blasphemyRiftContainerEl) {
      this.blasphemyRiftContainerEl.innerHTML = '';
    }

    if (this.overlayEl) {
      this.overlayEl.style.display = 'none';
      this.overlayEl.classList.remove('battle-active');
    }

    this.notifications.showCustomPopup(
      'Tempo Esgotado!',
      `${boss.name} dissipou sua energia antes de ser subjugado. Nenhuma fé foi perdida. Fortaleça seu culto e desafie-o novamente!`,
      '',
      'RETIRADA TÁTICA'
    );

    if (this.onBattleEnd) {
      this.onBattleEnd();
    }
  }

  public retreat(): void {
    if (!this.isFighting) return;

    this.isFighting = false;
    this.audio.playTone(240, 'sine', 0.2);

    if (this.blasphemyRiftContainerEl) {
      this.blasphemyRiftContainerEl.innerHTML = '';
    }

    if (this.overlayEl) {
      this.overlayEl.style.display = 'none';
      this.overlayEl.classList.remove('battle-active');
    }

    this.notifications.showCustomPopup(
      'Você Recuou!',
      'Suas preces cessaram o combate e você preservou seus devotos.',
      '',
      'COMBATE ENCERRADO'
    );

    if (this.onBattleEnd) {
      this.onBattleEnd();
    }
  }
}
