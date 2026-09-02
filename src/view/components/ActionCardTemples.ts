import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { UIButton } from './UIButton';
import { Formatters } from '../utils/Formatters';
import { MilestoneProgress } from '../../engine/GameMath';
import { IconManager } from '../utils/IconManager';

export interface ActionCardTemplesProps {
  width?: number;
  height?: number;
  onBuyTemple: () => void;
  onUpgradeTempleWithFaith: () => void;
  onBuySacerdote: () => void;
  onUpgradeApostolo: (slotIndex: number) => void;
}

export class ActionCardTemples extends Container {
  private cardWidth: number;
  private cardHeight: number;
  private bgGraphics: Graphics;
  private templeSprite: Sprite;

  // Header: "VOCÊ TEM X OURO" e "+Y/s" (Centered across 360px card)
  private titleText: Text;
  private rateText: Text;
  private dividerGraphics: Graphics;

  // Temple status & build / enhancement / apostolo buttons
  private templeStatusText: Text;
  private buildTempleBtn: UIButton;
  private enhancementBtn: UIButton;
  private apostoloBtn: UIButton;

  // Sacerdotes & Apóstolos Management Section
  private sacerdotesTitleText: Text;
  private buySacerdoteBtn: UIButton;
  private sacerdotesHelperText: Text;

  // Salão dos Sacerdotes & Apóstolos Grid (8 slots)
  private priestsGridGraphics: Graphics;
  private priestSprites: Sprite[] = [];
  private priestSlotLabels: Text[] = [];
  private priestSlotClickContainers: Container[] = [];

  private MAX_HALL_PRIESTS = 8;
  private currentDisplayGold: number = 0;
  private targetGold: number = 0;
  private currentSacerdotesCount: number = 0;
  private currentApostolosCount: number = 0;
  private apostolosPurchased: boolean[] = new Array(8).fill(false);
  private isBuiltState: boolean = false;

  private onBuyTempleCallback: () => void;
  private onUpgradeTempleWithFaithCallback: () => void;
  private onBuySacerdoteCallback: () => void;
  private onUpgradeApostoloCallback: (slotIndex: number) => void;

  constructor(props: ActionCardTemplesProps) {
    super();

    // Standard card width (360px wide x 520px high)
    this.cardWidth = props.width || 360;
    this.cardHeight = props.height || 520;

    this.onBuyTempleCallback = props.onBuyTemple;
    this.onUpgradeTempleWithFaithCallback = props.onUpgradeTempleWithFaith;
    this.onBuySacerdoteCallback = props.onBuySacerdote;
    this.onUpgradeApostoloCallback = props.onUpgradeApostolo;

    // 1. Card Background
    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    this.dividerGraphics = new Graphics();
    this.addChild(this.dividerGraphics);

    // 2. Header: "VOCÊ TEM 0 OURO" e "+0/s"
    this.titleText = new Text({
      text: 'VOCÊ TEM 0 OURO',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1.5,
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.position.set(this.cardWidth / 2, 14);
    this.addChild(this.titleText);

    this.rateText = new Text({
      text: '+0/s',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 12,
        fontWeight: '700',
        fill: THEME.colors.silverLight,
        align: 'center'
      })
    });
    this.rateText.anchor.set(0.5, 0);
    this.rateText.position.set(this.cardWidth / 2, 32);
    this.addChild(this.rateText);

    // 3. Temple Monolith Image
    this.templeSprite = new Sprite(IconManager.getTexture('/assets/temple/temple_monolith.jpg'));
    this.templeSprite.anchor.set(0.5);
    this.templeSprite.width = 95;
    this.templeSprite.height = 95;
    this.templeSprite.position.set(this.cardWidth / 2, 102);
    this.addChild(this.templeSprite);

    // 4. Temple Status Text
    this.templeStatusText = new Text({
      text: 'Desperte o Templo Sagrado',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 11,
        fontWeight: '700',
        fill: THEME.colors.silver,
        align: 'center'
      })
    });
    this.templeStatusText.anchor.set(0.5, 0);
    this.templeStatusText.position.set(this.cardWidth / 2, 160);
    this.addChild(this.templeStatusText);

    // 5. Build Temple Button (Unbuilt state)
    this.buildTempleBtn = new UIButton({
      width: 300,
      height: 50,
      label: 'CONSTRUIR TEMPLO SAGRADO',
      subLabel: 'Custo Único: 30 Fiéis',
      fontSize: 12,
      bgColor: THEME.colors.btnSuccess,
      hoverColor: THEME.colors.btnSuccessHover,
      textColor: THEME.colors.textDark,
      disabled: false,
      onClick: () => this.onBuyTempleCallback()
    });
    this.buildTempleBtn.position.set(this.cardWidth / 2, 260);
    this.addChild(this.buildTempleBtn);

    // 6. Sacerdotes & Apóstolos Title Text
    this.sacerdotesTitleText = new Text({
      text: 'SALÃO DOS SACERDOTES & APÓSTOLOS',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        fill: THEME.colors.silverLight,
        align: 'center'
      })
    });
    this.sacerdotesTitleText.anchor.set(0.5, 0);
    this.sacerdotesTitleText.position.set(this.cardWidth / 2, 198);
    this.addChild(this.sacerdotesTitleText);

    // Graphics layer for 8 priest slot backgrounds
    this.priestsGridGraphics = new Graphics();
    this.addChild(this.priestsGridGraphics);

    // Initialize 8 Priest Sprites & Labels
    this.initPriestsGrid();

    // Helper text above bottom button
    this.sacerdotesHelperText = new Text({
      text: 'Sacerdotes geram Ouro (+10/s). Promova-os a Apóstolos (+50/s).',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 9,
        fontWeight: '500',
        fill: THEME.colors.silverDark,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: 310
      })
    });
    this.sacerdotesHelperText.anchor.set(0.5, 0);
    this.sacerdotesHelperText.position.set(this.cardWidth / 2, 385);
    this.addChild(this.sacerdotesHelperText);

    // 7. Single Buy Sacerdote Button (Bottom position x = 180, y = 445)
    this.buySacerdoteBtn = new UIButton({
      width: 300,
      height: 46,
      label: 'Comprar Sacerdote',
      subLabel: '20 Ouro (+10 Ouro/s)',
      fontSize: 12,
      bgColor: THEME.colors.btnSuccess,
      hoverColor: THEME.colors.btnSuccessHover,
      textColor: THEME.colors.textDark,
      disabled: true,
      onClick: () => this.onBuySacerdoteCallback()
    });
    this.buySacerdoteBtn.position.set(this.cardWidth / 2, 445);
    this.addChild(this.buySacerdoteBtn);

    // 8. Consagrar Apóstolo Button (Same position x = 180, y = 445)
    this.apostoloBtn = new UIButton({
      width: 300,
      height: 46,
      label: 'CONSAGRAR 1º APÓSTOLO',
      subLabel: '50.000 PF (+50 Ouro/s)',
      fontSize: 11,
      bgColor: 0x9333ea,
      hoverColor: 0xa855f7,
      textColor: THEME.colors.pureWhite,
      disabled: true,
      onClick: () => {
        const nextIndex = this.apostolosPurchased.findIndex(p => !p);
        if (nextIndex >= 0 && nextIndex < this.currentSacerdotesCount) {
          this.onUpgradeApostoloCallback(nextIndex);
        }
      }
    });
    this.apostoloBtn.position.set(this.cardWidth / 2, 445);
    this.apostoloBtn.visible = false;
    this.addChild(this.apostoloBtn);

    // 9. Enhancement Button (Same position x = 180, y = 445, revealed when all 8 are Apóstolos)
    this.enhancementBtn = new UIButton({
      width: 300,
      height: 46,
      label: 'APRIMORAR TEMPLO (Nv. 0/4)',
      subLabel: '10.000 PF (+100% Ouro)',
      fontSize: 12,
      bgColor: THEME.colors.cardBgHover,
      hoverColor: 0x2e2e2e,
      textColor: THEME.colors.pureWhite,
      disabled: true,
      onClick: () => this.onUpgradeTempleWithFaithCallback()
    });
    this.enhancementBtn.position.set(this.cardWidth / 2, 445);
    this.enhancementBtn.visible = false;
    this.addChild(this.enhancementBtn);

    this.setElementsVisibility(false);
    this.drawBackground(false);
  }

  private initPriestsGrid(): void {
    const gridStartX = 36;
    const gridStartY = 218;
    const slotW = 64;
    const slotH = 72;
    const gapX = 8;
    const gapY = 8;
    const cols = 4;

    const priestTexture = IconManager.getTexture('/assets/icons/icon_sacerdote.jpg');

    for (let i = 0; i < this.MAX_HALL_PRIESTS; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const slotX = gridStartX + col * (slotW + gapX);
      const slotY = gridStartY + row * (slotH + gapY);

      const clickContainer = new Container();
      clickContainer.eventMode = 'static';
      clickContainer.cursor = 'pointer';
      clickContainer.on('pointerdown', () => {
        if (i < this.currentSacerdotesCount && !this.apostolosPurchased[i]) {
          this.onUpgradeApostoloCallback(i);
        }
      });
      this.addChild(clickContainer);
      this.priestSlotClickContainers.push(clickContainer);

      // Priest Sprite
      const sprite = new Sprite(priestTexture);
      sprite.anchor.set(0.5);
      sprite.width = 40;
      sprite.height = 40;
      sprite.position.set(slotX + slotW / 2, slotY + slotH / 2 - 6);
      sprite.visible = false;
      clickContainer.addChild(sprite);
      this.priestSprites.push(sprite);

      // Slot Label
      const label = new Text({
        text: `Nº ${i + 1}`,
        style: new TextStyle({
          fontFamily: THEME.fonts.numbers,
          fontSize: 8,
          fontWeight: '700',
          fill: THEME.colors.silverDark,
          align: 'center'
        })
      });
      label.anchor.set(0.5);
      label.position.set(slotX + slotW / 2, slotY + slotH - 10);
      label.visible = false;
      clickContainer.addChild(label);
      this.priestSlotLabels.push(label);
    }
  }

  private setElementsVisibility(isTempleBuilt: boolean): void {
    this.isBuiltState = isTempleBuilt;

    this.titleText.visible = isTempleBuilt;
    this.rateText.visible = isTempleBuilt;

    this.buildTempleBtn.visible = !isTempleBuilt;
    this.dividerGraphics.visible = isTempleBuilt;

    this.sacerdotesTitleText.visible = isTempleBuilt;
    this.sacerdotesHelperText.visible = isTempleBuilt;
    this.priestsGridGraphics.visible = isTempleBuilt;

    if (isTempleBuilt) {
      const isMaxSacerdotes = this.currentSacerdotesCount >= this.MAX_HALL_PRIESTS;
      const isMaxApostolos = this.currentApostolosCount >= this.MAX_HALL_PRIESTS;

      if (!isMaxSacerdotes) {
        this.buySacerdoteBtn.visible = true;
        this.apostoloBtn.visible = false;
        this.enhancementBtn.visible = false;
      } else if (!isMaxApostolos) {
        this.buySacerdoteBtn.visible = false;
        this.apostoloBtn.visible = true;
        this.enhancementBtn.visible = false;
      } else {
        this.buySacerdoteBtn.visible = false;
        this.apostoloBtn.visible = false;
        this.enhancementBtn.visible = true;
      }
    } else {
      this.buySacerdoteBtn.visible = false;
      this.apostoloBtn.visible = false;
      this.enhancementBtn.visible = false;
    }

    // Update visibility of priest sprites & slot labels
    for (let i = 0; i < this.MAX_HALL_PRIESTS; i++) {
      const isSlotActive = isTempleBuilt && i < this.currentSacerdotesCount;
      const isApostolo = isSlotActive && this.apostolosPurchased[i];

      this.priestSprites[i].visible = isSlotActive;
      this.priestSlotLabels[i].visible = isTempleBuilt;

      if (isApostolo) {
        this.priestSlotLabels[i].text = `APÓSTOLO ${i + 1}`;
        this.priestSlotLabels[i].style.fill = 0xffd700; // Gold text
      } else if (isSlotActive) {
        this.priestSlotLabels[i].text = `SACERDOTE ${i + 1}`;
        this.priestSlotLabels[i].style.fill = THEME.colors.pureWhite;
      } else {
        this.priestSlotLabels[i].text = `#${i + 1}`;
        this.priestSlotLabels[i].style.fill = THEME.colors.grayMuted;
      }
    }
  }

  private drawBackground(isTempleBuilt: boolean = true): void {
    this.bgGraphics.clear();
    this.bgGraphics.roundRect(0, 0, this.cardWidth, this.cardHeight, 18);
    this.bgGraphics.fill({ color: THEME.colors.panelBg, alpha: 0.94 });
    this.bgGraphics.stroke({ width: 1.5, color: THEME.colors.cardBorder });

    this.dividerGraphics.clear();
    this.priestsGridGraphics.clear();

    if (isTempleBuilt) {
      // Horizontal Divider Line
      this.dividerGraphics.moveTo(25, 185);
      this.dividerGraphics.lineTo(335, 185);
      this.dividerGraphics.stroke({ width: 1, color: THEME.colors.cardBorderLight, alpha: 0.4 });

      // Draw 8 Priest Grid Slot Boxes
      const gridStartX = 36;
      const gridStartY = 218;
      const slotW = 64;
      const slotH = 72;
      const gapX = 8;
      const gapY = 8;
      const cols = 4;

      for (let i = 0; i < this.MAX_HALL_PRIESTS; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const slotX = gridStartX + col * (slotW + gapX);
        const slotY = gridStartY + row * (slotH + gapY);

        const isActive = i < this.currentSacerdotesCount;
        const isApostolo = isActive && this.apostolosPurchased[i];

        this.priestsGridGraphics.roundRect(slotX, slotY, slotW, slotH, 8);
        if (isApostolo) {
          // Glowing Golden Frame for Apóstolos
          this.priestsGridGraphics.fill({ color: 0x221800, alpha: 0.95 });
          this.priestsGridGraphics.stroke({ width: 2, color: 0xffd700, alpha: 0.9 });
        } else if (isActive) {
          // Silver Frame for Sacerdotes
          this.priestsGridGraphics.fill({ color: 0x161616, alpha: 0.9 });
          this.priestsGridGraphics.stroke({ width: 1.5, color: THEME.colors.pureWhite, alpha: 0.6 });
        } else {
          // Locked Frame
          this.priestsGridGraphics.fill({ color: 0x060606, alpha: 0.5 });
          this.priestsGridGraphics.stroke({ width: 1, color: 0x1a1a1a, alpha: 0.4 });
        }
      }
    }
  }

  public updateData(
    goldAmount: number,
    goldRate: number,
    isTempleBuilt: boolean,
    fiesCount: number,
    enhLevel: number,
    enhCost: number,
    canEnhance: boolean,
    sacerdotesCount: number,
    sacerdoteCost: number,
    canAffordSacerdote: boolean,
    apostolosCount: number,
    apostolosPurchased: boolean[],
    nextApostoloCost: number,
    canAffordNextApostolo: boolean,
    _maxSacerdotesCount: number = 8,
    _maxSacerdotesCost: number = 0,
    _u1Cost: number = 0,
    _u1Afford: boolean = false,
    _u1MultVal: number = 0,
    _u2Cost: number = 0,
    _u2Afford: boolean = false,
    _u2MultVal: number = 0,
    _u3Cost: number = 0,
    _u3Afford: boolean = false,
    _u3MultVal: number = 0,
    _faithBonusPct: number = 0,
    _sacerdoteMilestoneProgress?: MilestoneProgress,
    _sacerdoteMilestoneMult?: number
  ): void {
    this.targetGold = goldAmount;
    this.rateText.text = `+${Formatters.formatNumber(goldRate)}/s`;
    this.currentSacerdotesCount = sacerdotesCount;
    this.currentApostolosCount = apostolosCount;
    this.apostolosPurchased = apostolosPurchased || new Array(8).fill(false);

    this.setElementsVisibility(isTempleBuilt);
    this.drawBackground(isTempleBuilt);

    if (isTempleBuilt) {
      this.templeStatusText.text = enhLevel > 0
        ? `🏛️ TEMPLO SAGRADO • NÍVEL ${enhLevel}`
        : '🏛️ TEMPLO SAGRADO ATIVO';
      this.templeStatusText.style.fill = THEME.colors.pureWhite;

      const isMaxSacerdotes = sacerdotesCount >= this.MAX_HALL_PRIESTS;
      const isMaxApostolos = apostolosCount >= this.MAX_HALL_PRIESTS;

      this.sacerdotesTitleText.text = `SACERDOTES (${sacerdotesCount}/8) • APÓSTOLOS (${apostolosCount}/8)`;

      if (!isMaxSacerdotes) {
        this.buySacerdoteBtn.setLabel('Comprar Sacerdote', `${Formatters.formatNumber(sacerdoteCost)} Ouro (+10 Ouro/s)`);
        this.buySacerdoteBtn.setDisabled(!canAffordSacerdote);
        
        const currentGoldRate = (sacerdotesCount - apostolosCount) * 10 + apostolosCount * 50;
        this.sacerdotesHelperText.text = `Você possui ${sacerdotesCount}/8 sacerdotes (+${currentGoldRate} Ouro/s). Ordene os 8 para consagrar Apóstolos.`;
      } else if (!isMaxApostolos) {
        const nextIndex = this.apostolosPurchased.findIndex(p => !p);
        const nextNum = nextIndex >= 0 ? nextIndex + 1 : 1;

        this.apostoloBtn.setLabel(`CONSAGRAR ${nextNum}º APÓSTOLO`, `${Formatters.formatNumber(nextApostoloCost)} PF (+50 Ouro/s)`);
        this.apostoloBtn.setDisabled(!canAffordNextApostolo);

        const currentGoldRate = (sacerdotesCount - apostolosCount) * 10 + apostolosCount * 50;
        this.sacerdotesHelperText.text = `✦ Sacerdotes Prontos! Promova-os a Apóstolos (+50 Ouro/s cada) (Atual: +${currentGoldRate} Ouro/s)`;
      } else {
        if (enhLevel >= 4) {
          this.enhancementBtn.setLabel('TEMPLO NO NÍVEL MÁXIMO', '4/4 Aprimorado');
          this.enhancementBtn.setDisabled(true);
        } else {
          this.enhancementBtn.setLabel(
            `APRIMORAR TEMPLO (Nv. ${enhLevel}/4)`,
            `${Formatters.formatNumber(enhCost)} PF (+100% Ouro)`
          );
          this.enhancementBtn.setDisabled(!canEnhance);
        }

        this.sacerdotesHelperText.text = `✦ Conclave Apostólico Supremo! 8 Apóstolos em Oração Sagrada (+400 Ouro/s base)`;
      }
    } else {
      this.templeStatusText.text = 'Desperte o Templo Sagrado';
      this.templeStatusText.style.fill = THEME.colors.silver;

      const canAfford = fiesCount >= 30;
      this.buildTempleBtn.setLabel('CONSTRUIR TEMPLO SAGRADO', `Custo Único: 30 Fiéis (${fiesCount}/30)`);
      this.buildTempleBtn.setDisabled(!canAfford);

      this.buySacerdoteBtn.setLabel('Comprar Sacerdote', `${Formatters.formatNumber(sacerdoteCost)} Ouro`);
      this.buySacerdoteBtn.setDisabled(true);
      this.sacerdotesHelperText.text = `Construa o Templo para ordenar sacerdotes`;
    }
  }

  public update(dt: number): void {
    if (Math.abs(this.targetGold - this.currentDisplayGold) > 0.01) {
      const diff = this.targetGold - this.currentDisplayGold;
      this.currentDisplayGold += diff * Math.min(1, dt * 15);
      this.titleText.text = `VOCÊ TEM ${Formatters.formatNumber(this.currentDisplayGold)} OURO`;
    } else {
      this.currentDisplayGold = this.targetGold;
      this.titleText.text = `VOCÊ TEM ${Formatters.formatNumber(this.targetGold)} OURO`;
    }

    const breath = Math.sin(performance.now() * 0.0018) * 1.5;
    this.templeSprite.position.y = 102 + breath;

    if (this.isBuiltState) {
      const gridStartY = 218;
      const slotH = 72;
      const gapY = 8;
      const cols = 4;

      for (let i = 0; i < Math.min(8, this.currentSacerdotesCount); i++) {
        const row = Math.floor(i / cols);
        const slotY = gridStartY + row * (slotH + gapY);
        const isApostolo = this.apostolosPurchased[i];
        const breathSpeed = isApostolo ? 0.004 : 0.0025;
        const breathAmount = isApostolo ? 2.5 : 1.2;
        const priestBreath = Math.sin(performance.now() * breathSpeed + i * 0.5) * breathAmount;

        if (this.priestSprites[i]) {
          this.priestSprites[i].position.y = slotY + slotH / 2 - 6 + priestBreath;
        }
      }
    }
  }

  public reset(): void {
    this.targetGold = 0;
    this.currentDisplayGold = 0;
    this.currentSacerdotesCount = 0;
    this.currentApostolosCount = 0;
    this.apostolosPurchased = new Array(8).fill(false);
    this.titleText.text = 'VOCÊ TEM 0 OURO';
    this.rateText.text = '+0/s';
    this.setElementsVisibility(false);
    this.drawBackground(false);
    this.buildTempleBtn.setDisabled(true);
    this.templeStatusText.text = 'Desperte o Templo Sagrado';
    this.templeStatusText.style.fill = THEME.colors.silver;
  }
}
