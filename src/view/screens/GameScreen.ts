import { Container, Graphics, Sprite, Text, TextStyle, FederatedPointerEvent } from 'pixi.js';
import { THEME } from '../theme';
import { GameEngine } from '../../engine/GameEngine';
import { ResourceCard } from '../components/ResourceCard';
import { ActionCardInitial } from '../components/ActionCardInitial';
import { ActionCardTemples } from '../components/ActionCardTemples';
import { ActionCardMonuments } from '../components/ActionCardMonuments';
import { UIButton } from '../components/UIButton';
import { FloatingTextManager } from '../components/FloatingTextManager';
import { OfflineModal } from '../components/OfflineModal';
import { PrestigeModal } from '../components/PrestigeModal';
import { BackgroundStars } from '../components/BackgroundStars';
import { ZoomControls } from '../components/ZoomControls';
import { Formatters } from '../utils/Formatters';

export class GameScreen extends Container {
  private engine: GameEngine;

  // Visual layers
  private backgroundStars: BackgroundStars;
  private panLayer: Graphics;
  private worldContainer: Container;
  private actionCardsContainer: Container;
  private floatingText: FloatingTextManager;
  private hudContainer: Container;
  private headerContainer: Container;
  private zoomControls: ZoomControls;
  private offlineModal: OfflineModal;
  private prestigeModal: PrestigeModal;

  // Header components
  private headerIconSprite: Sprite;
  private gameTitleText: Text;
  private saveStatusText: Text;
  private prestigeBtn: UIButton;
  private timeSpeedBtn: UIButton;
  private manualSaveBtn: UIButton;
  private resetBtn: UIButton;

  // HUD & Action Cards
  private resourceCard: ResourceCard;
  private initialCard: ActionCardInitial;
  private templesCard: ActionCardTemples;
  private monumentsCard: ActionCardMonuments;
  private statsText: Text;

  private currentWidth: number = 1000;
  private currentHeight: number = 700;

  // Viewport / Zoom & Pan State
  private currentZoom: number = 1.0;
  private targetZoom: number = 1.0;
  private currentPanX: number = 0;
  private currentPanY: number = 0;
  private targetPanX: number = 0;
  private targetPanY: number = 0;

  private readonly minZoom: number = 0.45;
  private readonly maxZoom: number = 2.4;

  // Dragging State
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragStartPanX: number = 0;
  private dragStartPanY: number = 0;

  // Touch Pinch Zoom State
  private activePointers: Map<number, { x: number; y: number }> = new Map();
  private initialPinchDistance: number = 0;
  private initialPinchZoom: number = 1.0;

  constructor(engine: GameEngine) {
    super();
    this.engine = engine;

    // 1. Background Atmosphere & Particles
    this.backgroundStars = new BackgroundStars();
    this.addChild(this.backgroundStars);

    // 2. Interactive Pan / Drag Background Surface
    this.panLayer = new Graphics();
    this.panLayer.eventMode = 'static';
    this.panLayer.cursor = 'grab';
    this.addChild(this.panLayer);

    // 3. Zoomable & Pannable World Container (Cards + Floating juice)
    this.worldContainer = new Container();
    this.addChild(this.worldContainer);

    this.actionCardsContainer = new Container();
    this.worldContainer.addChild(this.actionCardsContainer);

    this.floatingText = new FloatingTextManager();
    this.worldContainer.addChild(this.floatingText);

    // 4. Fixed HUD Layer (Unaffected by zoom/pan)
    this.hudContainer = new Container();
    this.addChild(this.hudContainer);

    // Header Container inside HUD
    this.headerContainer = new Container();
    this.hudContainer.addChild(this.headerContainer);

    // Header Elements
    this.headerIconSprite = Sprite.from('/assets/icons/icon_entity_eye.png');
    this.headerIconSprite.width = 24;
    this.headerIconSprite.height = 24;
    this.headerContainer.addChild(this.headerIconSprite);

    this.gameTitleText = new Text({
      text: 'A ENTIDADE DIVINA',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
        fill: THEME.colors.pureWhite
      })
    });
    this.headerContainer.addChild(this.gameTitleText);

    this.saveStatusText = new Text({
      text: '● Auto-salvamento ativo',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 11,
        fontWeight: '600',
        fill: THEME.colors.silver
      })
    });
    this.headerContainer.addChild(this.saveStatusText);

    // Header Buttons: Transcendence (Prestige), Speed, Save, Reset
    this.prestigeBtn = new UIButton({
      width: 140,
      height: 30,
      label: '✨ Transcender (+0)',
      fontSize: 11,
      bgColor: THEME.colors.pureWhite,
      hoverColor: THEME.colors.silverLight,
      textColor: THEME.colors.textDark,
      onClick: () => {
        const gain = this.engine.getPrestigeGain();
        const cur = this.engine.getPrestigeState().essence;
        this.prestigeModal.show(gain, cur, this.currentWidth, this.currentHeight);
      }
    });
    this.prestigeBtn.visible = false;
    this.headerContainer.addChild(this.prestigeBtn);

    const SPEED_STEPS = [1, 2, 3, 5, 10];
    let currentSpeedIndex = 0;

    this.timeSpeedBtn = new UIButton({
      width: 70,
      height: 30,
      label: '⚡ 1x',
      fontSize: 11,
      bgColor: THEME.colors.cardBg,
      hoverColor: THEME.colors.cardBgHover,
      textColor: THEME.colors.pureWhite,
      onClick: () => {
        currentSpeedIndex = (currentSpeedIndex + 1) % SPEED_STEPS.length;
        const newSpeed = SPEED_STEPS[currentSpeedIndex];
        this.engine.setTimeScale(newSpeed);
        this.timeSpeedBtn.setLabel(`⚡ ${newSpeed}x`);
      }
    });
    this.headerContainer.addChild(this.timeSpeedBtn);

    this.manualSaveBtn = new UIButton({
      width: 75,
      height: 30,
      label: 'Salvar',
      fontSize: 11,
      bgColor: THEME.colors.cardBg,
      hoverColor: THEME.colors.cardBgHover,
      textColor: THEME.colors.silverLight,
      onClick: () => {
        this.engine.save();
        this.flashSaveText();
      }
    });
    this.headerContainer.addChild(this.manualSaveBtn);

    this.resetBtn = new UIButton({
      width: 70,
      height: 30,
      label: 'Reset',
      fontSize: 11,
      bgColor: 0x181818,
      hoverColor: 0x242424,
      textColor: THEME.colors.grayMuted,
      onClick: () => {
        if (confirm('Deseja realmente apagar tudo e recomeçar do zero?')) {
          this.engine.resetGame();
          this.engine.setTimeScale(1);
          currentSpeedIndex = 0;
          this.timeSpeedBtn.setLabel('⚡ 1x');
          this.templesCard.visible = false;
          this.monumentsCard.visible = false;
          this.resourceCard.reset();
          this.initialCard.reset();
          this.templesCard.reset();
          this.monumentsCard.reset();
          this.updateHUD();
          this.resetViewport();
        }
      }
    });
    this.headerContainer.addChild(this.resetBtn);

    // 5. Fixed Top-Left Resource HUD Card
    this.resourceCard = new ResourceCard(260);
    this.resourceCard.position.set(24, 18);
    this.hudContainer.addChild(this.resourceCard);

    // 6. Action Card 1: Initial Card (Esfera Clicável + Converter Fiel)
    this.initialCard = new ActionCardInitial({
      width: 360,
      height: 520,
      onOrbClick: (clickX, clickY) => {
        const earned = this.engine.clickResource('faith', clickX, clickY);
        const localPos = this.worldContainer.toLocal({ x: clickX, y: clickY });
        this.floatingText.spawn(localPos.x, localPos.y, earned);
        this.updateHUD();
      },
      onConvertFiel: () => {
        const bought = this.engine.convertFiel();
        if (bought) {
          this.updateHUD();
        }
      },
      onConvertMaxFiel: () => {
        const result = this.engine.convertMaxFiel();
        if (result.count > 0) {
          this.updateHUD();
        }
      }
    });
    this.actionCardsContainer.addChild(this.initialCard);

    // 7. Action Card 2: Temples Card
    this.templesCard = new ActionCardTemples({
      width: 360,
      height: 520,
      onBuyTemple: () => {
        const bought = this.engine.buyTemple();
        if (bought) {
          this.updateHUD();
        }
      },
      onUpgradeTempleWithFaith: () => {
        const bought = this.engine.upgradeTempleWithFaith();
        if (bought) {
          this.updateHUD();
        }
      },
      onBuySacerdote: () => {
        const bought = this.engine.buySacerdote();
        if (bought) {
          this.updateHUD();
        }
      },
      onBuyMaxSacerdote: () => {
        const result = this.engine.buyMaxSacerdote();
        if (result.count > 0) {
          this.updateHUD();
        }
      },
      onBuyUpgrade: (upgradeId: string) => {
        const bought = this.engine.buyTempleUpgrade(upgradeId);
        if (bought) {
          this.updateHUD();
        }
      }
    });
    this.templesCard.visible = this.engine.isTemplesUnlocked();
    this.actionCardsContainer.addChild(this.templesCard);

    // 8. Action Card 3: Monuments Card
    this.monumentsCard = new ActionCardMonuments({
      width: 360,
      height: 520,
      onBuyMonument: () => {
        const bought = this.engine.buyNextMonument();
        if (bought) {
          this.updateHUD();
        }
      }
    });
    this.monumentsCard.visible = this.engine.isMonumentsUnlocked();
    this.actionCardsContainer.addChild(this.monumentsCard);

    // 9. Stats Footer Text
    this.statsText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 11,
        fontWeight: '600',
        fill: THEME.colors.grayMuted,
        align: 'center'
      })
    });
    this.statsText.anchor.set(0.5, 1);
    this.hudContainer.addChild(this.statsText);

    // 10. Zoom & Viewport Controls HUD Pill
    this.zoomControls = new ZoomControls({
      onZoomIn: () => this.zoomStep(1.2),
      onZoomOut: () => this.zoomStep(1 / 1.2),
      onReset: () => this.resetViewport(),
      getZoomText: () => `${Math.round(this.targetZoom * 100)}%`
    });
    this.hudContainer.addChild(this.zoomControls);

    // 11. Modals Layer: Offline & Prestige
    this.offlineModal = new OfflineModal(() => {
      this.engine.claimOfflineEarnings();
      this.updateHUD();
    });
    this.addChild(this.offlineModal);

    this.prestigeModal = new PrestigeModal({
      onPrestigeConfirm: () => {
        const success = this.engine.performPrestige();
        if (success) {
          this.updateHUD();
          this.resetViewport();
        }
      }
    });
    this.addChild(this.prestigeModal);

    // Setup Drag, Wheel & Pinch Viewport Handlers
    this.setupViewportInteractivity();

    // Setup Engine Event Listeners
    this.bindEngineEvents();
    this.updateHUD();
  }

  private setupViewportInteractivity(): void {
    this.panLayer.on('pointerdown', (e: FederatedPointerEvent) => {
      this.activePointers.set(e.pointerId, { x: e.global.x, y: e.global.y });

      if (this.activePointers.size === 1) {
        this.isDragging = true;
        this.dragStartX = e.global.x;
        this.dragStartY = e.global.y;
        this.dragStartPanX = this.targetPanX;
        this.dragStartPanY = this.targetPanY;
        this.panLayer.cursor = 'grabbing';
      } else if (this.activePointers.size === 2) {
        this.isDragging = false;
        const pts = Array.from(this.activePointers.values());
        this.initialPinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        this.initialPinchZoom = this.targetZoom;
      }
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.activePointers.has(e.pointerId)) {
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      if (this.activePointers.size === 2 && this.initialPinchDistance > 0) {
        const pts = Array.from(this.activePointers.values());
        const currentDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const factor = currentDistance / this.initialPinchDistance;
        const midX = (pts[0].x + pts[1].x) / 2;
        const midY = (pts[0].y + pts[1].y) / 2;
        this.setZoomAroundPoint(this.initialPinchZoom * factor, midX, midY);
      } else if (this.isDragging) {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;
        this.targetPanX = this.dragStartPanX + dx;
        this.targetPanY = this.dragStartPanY + dy;
      }
    });

    const endDrag = (e: PointerEvent) => {
      this.activePointers.delete(e.pointerId);
      if (this.activePointers.size < 2) {
        this.initialPinchDistance = 0;
      }
      if (this.activePointers.size === 0) {
        this.isDragging = false;
        this.panLayer.cursor = 'grab';
      }
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    window.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        this.setZoomAroundPoint(this.targetZoom * zoomFactor, e.clientX, e.clientY);
      },
      { passive: false }
    );
  }

  public setZoomAroundPoint(newZoom: number, focalX: number, focalY: number): void {
    const clampedZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    if (Math.abs(clampedZoom - this.targetZoom) < 0.001) return;

    const zoomRatio = clampedZoom / this.targetZoom;
    this.targetPanX = focalX - (focalX - this.targetPanX) * zoomRatio;
    this.targetPanY = focalY - (focalY - this.targetPanY) * zoomRatio;
    this.targetZoom = clampedZoom;
  }

  public zoomStep(factor: number): void {
    const centerX = this.currentWidth / 2;
    const centerY = this.currentHeight / 2;
    this.setZoomAroundPoint(this.targetZoom * factor, centerX, centerY);
  }

  public resetViewport(): void {
    this.targetZoom = 1.0;
    this.targetPanX = 0;
    this.targetPanY = 0;
  }

  private bindEngineEvents(): void {
    this.engine.events.on('tick', () => {
      this.updateHUD();
    });

    this.engine.events.on('offline:collected', (report) => {
      this.offlineModal.show(report, this.currentWidth, this.currentHeight);
    });

    this.engine.events.on('game:saved', () => {
      this.flashSaveText();
    });

    this.engine.events.on('milestone:reached', ({ label, multiplier }) => {
      const localPos = this.worldContainer.toLocal({ x: this.currentWidth / 2, y: 160 });
      this.floatingText.spawn(localPos.x, localPos.y, `⭐ MARCO: ${label} (${multiplier}x Bônus)!`);
    });
  }

  private flashSaveText(): void {
    this.saveStatusText.text = '✓ Jogo Salvo!';
    this.saveStatusText.style.fill = THEME.colors.pureWhite;
    setTimeout(() => {
      this.saveStatusText.text = '● Auto-salvamento ativo';
      this.saveStatusText.style.fill = THEME.colors.silver;
    }, 2000);
  }

  private updateHUD(): void {
    const faith = this.engine.resources.getResource('faith').amount;
    const faithRate = this.engine.getIncomePerSecond('faith');
    const gold = this.engine.resources.getResource('gold').amount;
    const goldRate = this.engine.getIncomePerSecond('gold');
    const fiesCount = this.engine.getFiesCount();
    const templosCount = this.engine.getTemplosCount();
    const isTempleUnlocked = this.engine.isTemplesUnlocked();
    const sacerdotesCount = this.engine.getSacerdotesCount();
    const monumentsCount = this.engine.getMonumentsCount();
    const isMonumentsUnlocked = this.engine.isMonumentsUnlocked();
    const curEssence = this.engine.getPrestigeState().essence;

    // 1. Update Resource HUD Card
    this.resourceCard.setValues(
      faith,
      faithRate,
      fiesCount,
      gold,
      goldRate,
      templosCount,
      isTempleUnlocked,
      sacerdotesCount,
      monumentsCount,
      isMonumentsUnlocked,
      curEssence
    );

    // 2. Check if Temples card or Monuments card should unlock/toggle
    let layoutChanged = false;

    if (isTempleUnlocked !== this.templesCard.visible) {
      this.templesCard.visible = isTempleUnlocked;
      layoutChanged = true;
    }

    if (isMonumentsUnlocked !== this.monumentsCard.visible) {
      this.monumentsCard.visible = isMonumentsUnlocked;
      layoutChanged = true;
    }

    if (layoutChanged) {
      this.layoutCards(this.currentWidth, this.currentHeight);
    }

    // 3. Update Initial Action Card (Fiéis Milestones)
    const fielCost = this.engine.upgrades.getUpgradeCost('fiel', 1);
    const canAffordFiel = this.engine.resources.hasAmount('faith', fielCost);
    const maxAffordable = this.engine.getMaxAffordableFiel();
    const fielMilestoneProg = this.engine.getFielMilestoneProgress();
    const fielMilestoneMult = this.engine.getFielMilestoneMultiplier();

    this.initialCard.updateData(
      faith,
      faithRate,
      fielCost,
      canAffordFiel,
      fiesCount,
      maxAffordable.count,
      maxAffordable.cost,
      fielMilestoneProg,
      fielMilestoneMult
    );

    // 4. Update Temples Action Card (Sacerdotes Milestones)
    if (this.templesCard.visible) {
      const isTempleBuilt = this.engine.isTempleBuilt();
      const enhLevel = this.engine.getTempleEnhancementLevel();
      const enhCost = this.engine.getTempleEnhancementCost();
      const canEnhance = this.engine.canUpgradeTempleWithFaith();

      const sacerdoteCost = this.engine.upgrades.getUpgradeCost('sacerdote', 1);
      const canAffordSacerdote = this.engine.resources.hasAmount('gold', sacerdoteCost);
      const maxSacerdotes = this.engine.getMaxAffordableSacerdote();
      const sacerdoteMilestoneProg = this.engine.getSacerdoteMilestoneProgress();
      const sacerdoteMilestoneMult = this.engine.getSacerdoteMilestoneMultiplier();

      const u1Cost = this.engine.upgrades.getUpgradeCost('temple_click', 1);
      const u1Afford = this.engine.resources.hasAmount('gold', u1Cost);
      const u1Mult = this.engine.getTempleClickMultiplier();

      const u2Cost = this.engine.upgrades.getUpgradeCost('temple_fiel', 1);
      const u2Afford = this.engine.resources.hasAmount('gold', u2Cost);
      const u2Mult = this.engine.getTempleFielMultiplier();

      const u3Cost = this.engine.upgrades.getUpgradeCost('temple_gold_faith', 1);
      const u3Afford = this.engine.resources.hasAmount('gold', u3Cost);
      const u3Mult = this.engine.getTempleGoldFaithMultiplier();

      const faithBonusPct = (Math.log10(Math.max(1, faith)) * 0.25 * u3Mult) * 100;

      this.templesCard.updateData(
        gold,
        goldRate,
        isTempleBuilt,
        fiesCount,
        enhLevel,
        enhCost,
        canEnhance,
        sacerdotesCount,
        sacerdoteCost,
        canAffordSacerdote,
        maxSacerdotes.count,
        maxSacerdotes.cost,
        u1Cost,
        u1Afford,
        u1Mult,
        u2Cost,
        u2Afford,
        u2Mult,
        u3Cost,
        u3Afford,
        u3Mult,
        faithBonusPct,
        sacerdoteMilestoneProg,
        sacerdoteMilestoneMult
      );
    }

    // 5. Update Monuments Action Card
    if (this.monumentsCard.visible) {
      const nextCost = this.engine.getNextMonumentCost();
      const canAffordNext = this.engine.canAffordNextMonument();
      const nextInfo = this.engine.getNextMonument();

      this.monumentsCard.updateData(
        gold,
        monumentsCount,
        nextCost,
        canAffordNext,
        nextInfo
      );
    }

    // 6. Update Prestige Button Status
    const prestigeGain = this.engine.getPrestigeGain();
    if (prestigeGain > 0 || curEssence > 0) {
      this.prestigeBtn.visible = true;
      this.prestigeBtn.setLabel(`✨ Transcender (+${Formatters.formatNumber(prestigeGain)})`);
    } else {
      this.prestigeBtn.visible = false;
    }

    // 7. Update Stats Footer
    const state = this.engine.getState();
    const essenceStr = curEssence > 0 ? `   •   Essência: ${Formatters.formatNumber(curEssence)} (+${curEssence * 10}% Global)` : '';
    this.statsText.text = `Adorações Manuais: ${Formatters.formatNumber(state.stats.totalClicks)}   •   Tempo de Devoção: ${Formatters.formatDuration(state.stats.playTimeSeconds)}${essenceStr}`;

    // 8. Update Zoom Controls Label
    this.zoomControls.update();
  }

  public resize(width: number, height: number): void {
    this.currentWidth = width;
    this.currentHeight = height;

    this.backgroundStars.resize(width, height);

    this.panLayer.clear();
    this.panLayer.rect(0, 0, width, height);
    this.panLayer.fill({ color: 0x000000, alpha: 0.001 });

    const isDesktop = width >= 860;

    if (isDesktop) {
      this.headerIconSprite.position.set(width - 560, 24);
      this.gameTitleText.position.set(width - 526, 24);
      this.saveStatusText.position.set(width - 526, 46);

      this.prestigeBtn.position.set(width - 325, 34);
      this.timeSpeedBtn.position.set(width - 200, 34);
      this.manualSaveBtn.position.set(width - 120, 34);
      this.resetBtn.position.set(width - 40, 34);
    } else {
      this.headerIconSprite.position.set(width - 170, 20);
      this.gameTitleText.position.set(width - 138, 20);
      this.saveStatusText.position.set(width - 138, 40);

      this.prestigeBtn.position.set(width - 260, 68);
      this.timeSpeedBtn.position.set(width - 160, 68);
      this.manualSaveBtn.position.set(width - 90, 68);
      this.resetBtn.position.set(width - 20, 68);
    }

    this.statsText.position.set(width / 2, height - 16);
    this.zoomControls.position.set(width - 110, height - 42);

    this.layoutCards(width, height);

    if (this.offlineModal.visible) {
      const report = { elapsedSeconds: 60, gains: { faith: 100 } };
      this.offlineModal.show(report, width, height);
    }
  }

  private layoutCards(width: number, _height: number): void {
    const cardW = 360;
    const cardGap = 20;
    const cardsTopY = Math.max(130, this.resourceCard.position.y + 140);

    const hasTemples = this.templesCard.visible;
    const hasMonuments = this.monumentsCard.visible;

    if (hasTemples && hasMonuments) {
      if (width >= 1180) {
        const totalCardsW = cardW * 3 + cardGap * 2;
        const startX = Math.max(20, (width - totalCardsW) / 2);

        this.initialCard.position.set(startX, cardsTopY);
        this.templesCard.position.set(startX + cardW + cardGap, cardsTopY);
        this.monumentsCard.position.set(startX + (cardW + cardGap) * 2, cardsTopY);
      } else if (width >= 780) {
        const totalTopW = cardW * 2 + cardGap;
        const startX = Math.max(20, (width - totalTopW) / 2);

        this.initialCard.position.set(startX, cardsTopY);
        this.templesCard.position.set(startX + cardW + cardGap, cardsTopY);
        this.monumentsCard.position.set((width - cardW) / 2, cardsTopY + 520 + cardGap);
      } else {
        const centerX = Math.max(0, (width - cardW) / 2);
        this.initialCard.position.set(centerX, cardsTopY);
        this.templesCard.position.set(centerX, cardsTopY + 520 + cardGap);
        this.monumentsCard.position.set(centerX, cardsTopY + (520 + cardGap) * 2);
      }
    } else if (hasTemples) {
      if (width >= 780) {
        const totalCardsW = cardW * 2 + cardGap;
        const startX = Math.max(24, (width - totalCardsW) / 2);

        this.initialCard.position.set(startX, cardsTopY);
        this.templesCard.position.set(startX + cardW + cardGap, cardsTopY);
      } else {
        const centerX = Math.max(0, (width - cardW) / 2);
        this.initialCard.position.set(centerX, cardsTopY);
        this.templesCard.position.set(centerX, cardsTopY + 520 + cardGap);
      }
    } else {
      const centerX = Math.max(24, (width - cardW) / 2);
      this.initialCard.position.set(centerX, cardsTopY);
    }
  }

  public update(dt: number): void {
    const lerpSpeed = Math.min(1, dt * 16);
    this.currentZoom += (this.targetZoom - this.currentZoom) * lerpSpeed;
    this.currentPanX += (this.targetPanX - this.currentPanX) * lerpSpeed;
    this.currentPanY += (this.targetPanY - this.currentPanY) * lerpSpeed;

    this.worldContainer.scale.set(this.currentZoom);
    this.worldContainer.position.set(this.currentPanX, this.currentPanY);

    this.backgroundStars.update(dt);
    this.resourceCard.update(dt);
    this.initialCard.update(dt);
    if (this.templesCard.visible) {
      this.templesCard.update(dt);
    }
    if (this.monumentsCard.visible) {
      this.monumentsCard.update(dt);
    }
    this.floatingText.update(dt);
  }
}
