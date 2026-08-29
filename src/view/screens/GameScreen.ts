import { Container, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { GameEngine } from '../../engine/GameEngine';
import { ResourceCard } from '../components/ResourceCard';
import { ActionCardInitial } from '../components/ActionCardInitial';
import { ActionCardTemples } from '../components/ActionCardTemples';
import { ActionCardMonuments } from '../components/ActionCardMonuments';
import { UIButton } from '../components/UIButton';
import { FloatingTextManager } from '../components/FloatingTextManager';
import { OfflineModal } from '../components/OfflineModal';
import { BackgroundStars } from '../components/BackgroundStars';
import { Formatters } from '../utils/Formatters';

export class GameScreen extends Container {
  private engine: GameEngine;

  // Visual layers
  private backgroundStars: BackgroundStars;
  private headerContainer: Container;
  private actionCardsContainer: Container;
  private floatingText: FloatingTextManager;
  private offlineModal: OfflineModal;

  // Header components
  private headerIconSprite: Sprite;
  private gameTitleText: Text;
  private saveStatusText: Text;
  private manualSaveBtn: UIButton;
  private resetBtn: UIButton;
  private timeSpeedBtn: UIButton;

  // HUD & Action Cards
  private resourceCard: ResourceCard;
  private initialCard: ActionCardInitial;
  private templesCard: ActionCardTemples;
  private monumentsCard: ActionCardMonuments;
  private statsText: Text;

  private currentWidth: number = 1000;
  private currentHeight: number = 700;

  constructor(engine: GameEngine) {
    super();
    this.engine = engine;

    // 1. Background Atmosphere & Particles
    this.backgroundStars = new BackgroundStars();
    this.addChild(this.backgroundStars);

    // 2. Header Container
    this.headerContainer = new Container();
    this.addChild(this.headerContainer);

    // 3. Action Cards Container
    this.actionCardsContainer = new Container();
    this.addChild(this.actionCardsContainer);

    // 4. Header Elements (Top Bar)
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

    // Header Buttons: Time Speed, Save, Reset
    const SPEED_STEPS = [1, 2, 3, 5, 10];
    let currentSpeedIndex = 0;

    this.timeSpeedBtn = new UIButton({
      width: 75,
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
      width: 80,
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
      width: 75,
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
          this.resize(this.currentWidth, this.currentHeight);
        }
      }
    });
    this.headerContainer.addChild(this.resetBtn);

    // 5. Top-Left Resource Card (Recursos: Fé, Fiéis, Ouro, Templos, Monumentos)
    this.resourceCard = new ResourceCard(260);
    this.resourceCard.position.set(24, 18);
    this.addChild(this.resourceCard);

    // 6. Action Card 1: Initial Card (Esfera Clicável + Converter Fiel / Converter Max)
    this.initialCard = new ActionCardInitial({
      width: 360,
      height: 520,
      onOrbClick: (clickX, clickY) => {
        const earned = this.engine.clickResource('faith', clickX, clickY);
        this.floatingText.spawn(clickX, clickY, earned);
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

    // 7. Action Card 2: Temples Card (Unlocked at 30 Fiéis, costs 30 fiéis, produces gold)
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
      onBuyUpgrade: (upgradeId: string) => {
        const bought = this.engine.buyTempleUpgrade(upgradeId);
        if (bought) {
          this.updateHUD();
        }
      }
    });
    this.templesCard.visible = this.engine.isTemplesUnlocked();
    this.actionCardsContainer.addChild(this.templesCard);

    // 8. Action Card 3: Monuments Card (Unlocked at 10,000 Gold, 7 monuments)
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
    this.addChild(this.statsText);

    // 10. Floating Text Layer
    this.floatingText = new FloatingTextManager();
    this.addChild(this.floatingText);

    // 11. Offline Modal Layer
    this.offlineModal = new OfflineModal(() => {
      this.engine.claimOfflineEarnings();
      this.updateHUD();
    });
    this.addChild(this.offlineModal);

    // Setup Engine Event Listeners
    this.bindEngineEvents();
    this.updateHUD();
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
    const monumentsCount = this.engine.getMonumentsCount();
    const isMonumentsUnlocked = this.engine.isMonumentsUnlocked();

    // 1. Update Resource HUD Card
    this.resourceCard.setValues(
      faith,
      faithRate,
      fiesCount,
      gold,
      goldRate,
      templosCount,
      isTempleUnlocked,
      monumentsCount,
      isMonumentsUnlocked
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
      this.resize(this.currentWidth, this.currentHeight);
    }

    // 3. Update Initial Action Card
    const fielCost = this.engine.upgrades.getUpgradeCost('fiel', 1);
    const canAffordFiel = this.engine.resources.hasAmount('faith', fielCost);
    const maxAffordable = this.engine.getMaxAffordableFiel();
    this.initialCard.updateData(
      faith,
      faithRate,
      fielCost,
      canAffordFiel,
      fiesCount,
      maxAffordable.count,
      maxAffordable.cost
    );

    // 4. Update Temples Action Card if visible
    if (this.templesCard.visible) {
      const isTempleBuilt = this.engine.isTempleBuilt();
      const enhLevel = this.engine.getTempleEnhancementLevel();
      const enhCost = this.engine.getTempleEnhancementCost();
      const canEnhance = this.engine.canUpgradeTempleWithFaith();

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
        u1Cost,
        u1Afford,
        u1Mult,
        u2Cost,
        u2Afford,
        u2Mult,
        u3Cost,
        u3Afford,
        u3Mult,
        faithBonusPct
      );
    }

    // 5. Update Monuments Action Card if visible
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

    // 6. Update Stats Footer
    const state = this.engine.getState();
    this.statsText.text = `Adorações Manuais: ${Formatters.formatNumber(state.stats.totalClicks)}   •   Tempo de Devoção: ${Formatters.formatDuration(state.stats.playTimeSeconds)}`;
  }

  public resize(width: number, height: number): void {
    this.currentWidth = width;
    this.currentHeight = height;

    this.backgroundStars.resize(width, height);

    // Top Header Positioning
    const isDesktop = width >= 820;

    if (isDesktop) {
      this.headerIconSprite.position.set(width - 480, 24);
      this.gameTitleText.position.set(width - 446, 24);
      this.saveStatusText.position.set(width - 446, 46);

      this.timeSpeedBtn.position.set(width - 225, 34);
      this.manualSaveBtn.position.set(width - 140, 34);
      this.resetBtn.position.set(width - 50, 34);
    } else {
      this.headerIconSprite.position.set(width - 170, 20);
      this.gameTitleText.position.set(width - 138, 20);
      this.saveStatusText.position.set(width - 138, 40);

      this.timeSpeedBtn.position.set(width - 180, 68);
      this.manualSaveBtn.position.set(width - 100, 68);
      this.resetBtn.position.set(width - 20, 68);
    }

    // Action Cards Layout (up to 3 cards)
    const cardW = 360;
    const cardGap = 20;
    const cardsTopY = Math.max(130, this.resourceCard.position.y + 140);

    const hasTemples = this.templesCard.visible;
    const hasMonuments = this.monumentsCard.visible;

    if (hasTemples && hasMonuments) {
      if (width >= 1180) {
        // 3 Cards Side by Side
        const totalCardsW = cardW * 3 + cardGap * 2;
        const startX = Math.max(20, (width - totalCardsW) / 2);

        this.initialCard.position.set(startX, cardsTopY);
        this.templesCard.position.set(startX + cardW + cardGap, cardsTopY);
        this.monumentsCard.position.set(startX + (cardW + cardGap) * 2, cardsTopY);
      } else if (width >= 780) {
        // 2 Cards top, 1 card centered below
        const totalTopW = cardW * 2 + cardGap;
        const startX = Math.max(20, (width - totalTopW) / 2);

        this.initialCard.position.set(startX, cardsTopY);
        this.templesCard.position.set(startX + cardW + cardGap, cardsTopY);
        this.monumentsCard.position.set((width - cardW) / 2, cardsTopY + 520 + cardGap);
      } else {
        // Vertical Stack
        const centerX = Math.max(0, (width - cardW) / 2);
        this.initialCard.position.set(centerX, cardsTopY);
        this.templesCard.position.set(centerX, cardsTopY + 520 + cardGap);
        this.monumentsCard.position.set(centerX, cardsTopY + (520 + cardGap) * 2);
      }
    } else if (hasTemples) {
      if (width >= 780) {
        // 2 Cards Side by Side
        const totalCardsW = cardW * 2 + cardGap;
        const startX = Math.max(24, (width - totalCardsW) / 2);

        this.initialCard.position.set(startX, cardsTopY);
        this.templesCard.position.set(startX + cardW + cardGap, cardsTopY);
      } else {
        // Vertical Stack
        const centerX = Math.max(0, (width - cardW) / 2);
        this.initialCard.position.set(centerX, cardsTopY);
        this.templesCard.position.set(centerX, cardsTopY + 520 + cardGap);
      }
    } else {
      // Single Initial Card Centered
      const centerX = Math.max(24, (width - cardW) / 2);
      this.initialCard.position.set(centerX, cardsTopY);
    }

    // Stats Footer positioning
    this.statsText.position.set(width / 2, height - 16);

    // Modal resize
    if (this.offlineModal.visible) {
      const report = { elapsedSeconds: 60, gains: { faith: 100 } };
      this.offlineModal.show(report, width, height);
    }
  }

  public update(dt: number): void {
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
