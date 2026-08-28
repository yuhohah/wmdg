import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { UIButton } from './UIButton';
import { Formatters } from '../utils/Formatters';

export interface ActionCardTemplesProps {
  width?: number;
  height?: number;
  onBuyTemple: () => void;
  onBuyUpgrade: (upgradeId: string) => void;
}

export class ActionCardTemples extends Container {
  private cardWidth: number;
  private cardHeight: number;
  private bgGraphics: Graphics;
  private glowGraphics: Graphics;
  private haloGraphics: Graphics;
  private templeSprite: Sprite;

  // Header: "VOCÊ TEM X OURO" e abaixo "+Y/s"
  private titleText: Text;
  private rateText: Text;
  private dividerGraphics: Graphics;

  // Temple status & build button
  private templeStatusText: Text;
  private buildTempleBtn: UIButton;

  // Upgrades Section
  private upgradesTitleText: Text;

  // Upgrade 1: Click power
  private u1Title: Text;
  private u1Mult: Text;
  private u1Btn: UIButton;

  // Upgrade 2: Faithful production
  private u2Title: Text;
  private u2Mult: Text;
  private u2Btn: UIButton;

  // Upgrade 3: Faith boosts gold
  private u3Title: Text;
  private u3Mult: Text;
  private u3Btn: UIButton;

  private currentDisplayGold: number = 0;
  private targetGold: number = 0;
  private rotationAngle: number = 0;
  private onBuyTempleCallback: () => void;
  private onBuyUpgradeCallback: (id: string) => void;

  constructor(props: ActionCardTemplesProps) {
    super();

    this.cardWidth = props.width || 360;
    this.cardHeight = props.height || 520;
    this.onBuyTempleCallback = props.onBuyTemple;
    this.onBuyUpgradeCallback = props.onBuyUpgrade;

    // 1. Card Background
    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    // 2. Halo & Glow behind Temple Icon
    this.glowGraphics = new Graphics();
    this.addChild(this.glowGraphics);

    this.haloGraphics = new Graphics();
    this.addChild(this.haloGraphics);

    // 3. Header: "VOCÊ TEM 0 OURO" e abaixo "+0/s"
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
    this.titleText.position.set(this.cardWidth / 2, 16);
    this.addChild(this.titleText);

    this.rateText = new Text({
      text: '+0/s',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 13,
        fontWeight: '700',
        fill: THEME.colors.silverLight,
        align: 'center'
      })
    });
    this.rateText.anchor.set(0.5, 0);
    this.rateText.position.set(this.cardWidth / 2, 36);
    this.addChild(this.rateText);

    // 4. Temple Icon
    this.templeSprite = Sprite.from('/assets/icons/icon_cathedral.png');
    this.templeSprite.anchor.set(0.5);
    this.templeSprite.width = 66;
    this.templeSprite.height = 66;
    this.templeSprite.position.set(this.cardWidth / 2, 94);
    this.addChild(this.templeSprite);

    // 5. Temple Status Text
    this.templeStatusText = new Text({
      text: 'Templo Sagrado Não Construído',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 12,
        fontWeight: '700',
        fill: THEME.colors.silver,
        align: 'center'
      })
    });
    this.templeStatusText.anchor.set(0.5, 0);
    this.templeStatusText.position.set(this.cardWidth / 2, 134);
    this.addChild(this.templeStatusText);

    // 6. Build Temple Button (Custo Único de 30 Fiéis - Bem Grande na Frente)
    this.buildTempleBtn = new UIButton({
      width: this.cardWidth - 40,
      height: 60,
      label: 'CONSTRUIR TEMPLO SAGRADO',
      subLabel: 'Custo Único: 30 Fiéis',
      fontSize: 13,
      bgColor: THEME.colors.btnSuccess,
      hoverColor: THEME.colors.btnSuccessHover,
      textColor: THEME.colors.textDark,
      disabled: false,
      onClick: () => this.onBuyTempleCallback()
    });
    this.buildTempleBtn.position.set(this.cardWidth / 2, 166);
    this.addChild(this.buildTempleBtn);

    // 7. Divider
    this.dividerGraphics = new Graphics();
    this.addChild(this.dividerGraphics);

    // 8. Upgrades Header Title
    this.upgradesTitleText = new Text({
      text: 'UPGRADES DO TEMPLO (OURO)',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        fill: THEME.colors.silverDark
      })
    });
    this.upgradesTitleText.position.set(20, 224);
    this.addChild(this.upgradesTitleText);

    // Row layout coordinates
    const rowStartX = 20;
    const btnW = 95;
    const btnH = 36;
    const btnRightX = this.cardWidth - 20 - btnW / 2;

    // --- UPGRADE 1: Prece Dourada (Fé por Toque) ---
    const y1 = 248;
    this.u1Title = new Text({
      text: 'Prece Dourada',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 12,
        fontWeight: '700',
        fill: THEME.colors.pureWhite
      })
    });
    this.u1Title.position.set(rowStartX, y1);
    this.addChild(this.u1Title);

    this.u1Mult = new Text({
      text: 'Fé/toque: 1.00x',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 10,
        fontWeight: '600',
        fill: THEME.colors.silverLight
      })
    });
    this.u1Mult.position.set(rowStartX, y1 + 17);
    this.addChild(this.u1Mult);

    this.u1Btn = new UIButton({
      width: btnW,
      height: btnH,
      label: '+Melhorar',
      subLabel: '10 Ouro',
      fontSize: 11,
      bgColor: THEME.colors.cardBgHover,
      hoverColor: 0x2e2e2e,
      textColor: THEME.colors.pureWhite,
      disabled: true,
      onClick: () => this.onBuyUpgradeCallback('temple_click')
    });
    this.u1Btn.position.set(btnRightX, y1 + 14);
    this.addChild(this.u1Btn);

    // --- UPGRADE 2: Glória aos Devotos (Produção dos Fiéis) ---
    const y2 = 306;
    this.u2Title = new Text({
      text: 'Glória aos Devotos',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 12,
        fontWeight: '700',
        fill: THEME.colors.pureWhite
      })
    });
    this.u2Title.position.set(rowStartX, y2);
    this.addChild(this.u2Title);

    this.u2Mult = new Text({
      text: 'Ganho Fiéis: 1.00x',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 10,
        fontWeight: '600',
        fill: THEME.colors.silverLight
      })
    });
    this.u2Mult.position.set(rowStartX, y2 + 17);
    this.addChild(this.u2Mult);

    this.u2Btn = new UIButton({
      width: btnW,
      height: btnH,
      label: '+Melhorar',
      subLabel: '15 Ouro',
      fontSize: 11,
      bgColor: THEME.colors.cardBgHover,
      hoverColor: 0x2e2e2e,
      textColor: THEME.colors.pureWhite,
      disabled: true,
      onClick: () => this.onBuyUpgradeCallback('temple_fiel')
    });
    this.u2Btn.position.set(btnRightX, y2 + 14);
    this.addChild(this.u2Btn);

    // --- UPGRADE 3: Alquimia Espiritual (Fé aumenta Ouro/s) ---
    const y3 = 364;
    this.u3Title = new Text({
      text: 'Alquimia Espiritual',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 12,
        fontWeight: '700',
        fill: THEME.colors.pureWhite
      })
    });
    this.u3Title.position.set(rowStartX, y3);
    this.addChild(this.u3Title);

    this.u3Mult = new Text({
      text: 'Mult: 1.00x',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 10,
        fontWeight: '600',
        fill: THEME.colors.silverLight
      })
    });
    this.u3Mult.position.set(rowStartX, y3 + 17);
    this.addChild(this.u3Mult);

    this.u3Btn = new UIButton({
      width: btnW,
      height: btnH,
      label: '+Melhorar',
      subLabel: '25 Ouro',
      fontSize: 11,
      bgColor: THEME.colors.cardBgHover,
      hoverColor: 0x2e2e2e,
      textColor: THEME.colors.pureWhite,
      disabled: true,
      onClick: () => this.onBuyUpgradeCallback('temple_gold_faith')
    });
    this.u3Btn.position.set(btnRightX, y3 + 14);
    this.addChild(this.u3Btn);

    this.drawBackground();
  }

  private drawBackground(): void {
    this.bgGraphics.clear();

    // Dark monochrome glass container
    this.bgGraphics.roundRect(0, 0, this.cardWidth, this.cardHeight, 18);
    this.bgGraphics.fill({ color: THEME.colors.panelBg, alpha: 0.94 });
    this.bgGraphics.stroke({ width: 1.5, color: THEME.colors.cardBorder });

    // Inner top highlight line
    this.bgGraphics.roundRect(2, 2, this.cardWidth - 4, 1.5, 8);
    this.bgGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.15 });

    // Divider line between temple build and upgrades
    this.dividerGraphics.clear();
    this.dividerGraphics.moveTo(20, 214);
    this.dividerGraphics.lineTo(this.cardWidth - 20, 214);
    this.dividerGraphics.stroke({ width: 1, color: THEME.colors.cardBorderLight, alpha: 0.5 });

    // Background boxes for the 3 upgrade rows
    const rowW = this.cardWidth - 40;
    const rowH = 48;
    this.bgGraphics.roundRect(20, 243, rowW, rowH, 8);
    this.bgGraphics.fill({ color: 0x080808, alpha: 0.7 });
    this.bgGraphics.stroke({ width: 1, color: 0x1f1f1f });

    this.bgGraphics.roundRect(20, 301, rowW, rowH, 8);
    this.bgGraphics.fill({ color: 0x080808, alpha: 0.7 });
    this.bgGraphics.stroke({ width: 1, color: 0x1f1f1f });

    this.bgGraphics.roundRect(20, 359, rowW, rowH, 8);
    this.bgGraphics.fill({ color: 0x080808, alpha: 0.7 });
    this.bgGraphics.stroke({ width: 1, color: 0x1f1f1f });

    // Outer subtle halo behind icon
    this.glowGraphics.clear();
    this.glowGraphics.circle(this.cardWidth / 2, 94, 48);
    this.glowGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.04 });
  }

  public updateData(
    goldAmount: number,
    goldRate: number,
    isTempleBuilt: boolean,
    fiesCount: number,
    u1Cost: number,
    u1Afford: boolean,
    u1MultVal: number,
    u2Cost: number,
    u2Afford: boolean,
    u2MultVal: number,
    u3Cost: number,
    u3Afford: boolean,
    u3MultVal: number,
    faithBonusPct: number
  ): void {
    this.targetGold = goldAmount;
    this.rateText.text = `+${Formatters.formatNumber(goldRate)}/s`;

    if (isTempleBuilt) {
      this.buildTempleBtn.visible = false;
      this.templeStatusText.text = '🏛️ TEMPLO SAGRADO ATIVO';
      this.templeStatusText.style.fill = THEME.colors.pureWhite;
      this.templeStatusText.position.y = 154;
    } else {
      this.buildTempleBtn.visible = true;
      this.templeStatusText.text = 'Desperte o Templo Sagrado';
      this.templeStatusText.style.fill = THEME.colors.silver;
      this.templeStatusText.position.y = 126;

      const canAfford = fiesCount >= 30;
      this.buildTempleBtn.setLabel('CONSTRUIR TEMPLO SAGRADO', `Custo Único: 30 Fiéis (${fiesCount}/30)`);
      this.buildTempleBtn.setDisabled(!canAfford);
    }

    // Upgrade 1
    this.u1Mult.text = `Fé/toque: ${u1MultVal.toFixed(2)}x (+0.50x)`;
    this.u1Btn.setLabel('+Melhorar', `${Formatters.formatNumber(u1Cost)} Ouro`);
    this.u1Btn.setDisabled(!u1Afford || !isTempleBuilt);

    // Upgrade 2
    this.u2Mult.text = `Ganho Fiéis: ${u2MultVal.toFixed(2)}x (+0.25x)`;
    this.u2Btn.setLabel('+Melhorar', `${Formatters.formatNumber(u2Cost)} Ouro`);
    this.u2Btn.setDisabled(!u2Afford || !isTempleBuilt);

    // Upgrade 3
    this.u3Mult.text = `Mult: ${u3MultVal.toFixed(2)}x (+${faithBonusPct.toFixed(0)}% Fé)`;
    this.u3Btn.setLabel('+Melhorar', `${Formatters.formatNumber(u3Cost)} Ouro`);
    this.u3Btn.setDisabled(!u3Afford || !isTempleBuilt);
  }

  public update(dt: number): void {
    // Smooth interpolation for gold in header
    if (Math.abs(this.targetGold - this.currentDisplayGold) > 0.01) {
      const diff = this.targetGold - this.currentDisplayGold;
      this.currentDisplayGold += diff * Math.min(1, dt * 15);
      this.titleText.text = `VOCÊ TEM ${Formatters.formatNumber(this.currentDisplayGold)} OURO`;
    } else {
      this.currentDisplayGold = this.targetGold;
      this.titleText.text = `VOCÊ TEM ${Formatters.formatNumber(this.targetGold)} OURO`;
    }

    // Subtle rotation of architectural halo
    this.rotationAngle += dt * 0.6;
    this.haloGraphics.clear();

    const cx = this.cardWidth / 2;
    const cy = 94;
    const r = 40;

    for (let i = 0; i < 4; i++) {
      const startAngle = this.rotationAngle + (i * Math.PI) / 2;
      const endAngle = startAngle + Math.PI / 4;
      this.haloGraphics.arc(cx, cy, r, startAngle, endAngle);
      this.haloGraphics.stroke({ width: 1.5, color: THEME.colors.pureWhite, alpha: 0.3 });
    }

    // Subtle breathing
    const breath = Math.sin(performance.now() * 0.002) * 1.2;
    this.templeSprite.position.y = 94 + breath;
  }

  public reset(): void {
    this.targetGold = 0;
    this.currentDisplayGold = 0;
    this.titleText.text = 'VOCÊ TEM 0 OURO';
    this.rateText.text = '+0/s';
    this.buildTempleBtn.visible = true;
    this.buildTempleBtn.setDisabled(true);
    this.templeStatusText.text = 'Desperte o Templo Sagrado';
    this.templeStatusText.style.fill = THEME.colors.silver;
    this.templeStatusText.position.y = 126;
  }
}
