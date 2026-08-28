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
  private titleText: Text;
  private subtitleText: Text;
  private dividerGraphics: Graphics;

  // Temple status & build button
  private templesCountText: Text;
  private goldRateText: Text;
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

    // 3. Header
    this.titleText = new Text({
      text: 'TEMPLO SAGRADO',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.titleText.anchor.set(0.5, 0);
    this.titleText.position.set(this.cardWidth / 2, 14);
    this.addChild(this.titleText);

    this.subtitleText = new Text({
      text: 'Gera Ouro e concede Bênçãos Ancestrais',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 10,
        fontWeight: '600',
        fill: THEME.colors.grayMuted,
        align: 'center'
      })
    });
    this.subtitleText.anchor.set(0.5, 0);
    this.subtitleText.position.set(this.cardWidth / 2, 33);
    this.addChild(this.subtitleText);

    // 4. Temple Icon
    this.templeSprite = Sprite.from('/assets/icons/icon_cathedral.png');
    this.templeSprite.anchor.set(0.5);
    this.templeSprite.width = 68;
    this.templeSprite.height = 68;
    this.templeSprite.position.set(this.cardWidth / 2, 88);
    this.addChild(this.templeSprite);

    // 5. Temple Stats
    this.templesCountText = new Text({
      text: '0 Templos Construídos',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 13,
        fontWeight: '700',
        fill: THEME.colors.pureWhite,
        align: 'center'
      })
    });
    this.templesCountText.anchor.set(0.5, 0);
    this.templesCountText.position.set(this.cardWidth / 2, 126);
    this.addChild(this.templesCountText);

    this.goldRateText = new Text({
      text: 'Produção: +0 Ouro/s',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 11,
        fontWeight: '600',
        fill: THEME.colors.silver,
        align: 'center'
      })
    });
    this.goldRateText.anchor.set(0.5, 0);
    this.goldRateText.position.set(this.cardWidth / 2, 145);
    this.addChild(this.goldRateText);

    // 6. Build Temple Button (costs 30 fiéis)
    this.buildTempleBtn = new UIButton({
      width: this.cardWidth - 40,
      height: 40,
      label: 'Construir Templo',
      subLabel: 'Custa 30 Fiéis',
      fontSize: 12,
      bgColor: THEME.colors.btnSuccess,
      hoverColor: THEME.colors.btnSuccessHover,
      textColor: THEME.colors.textDark,
      disabled: false,
      onClick: () => this.onBuyTempleCallback()
    });
    this.buildTempleBtn.position.set(this.cardWidth / 2, 190);
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
    this.upgradesTitleText.position.set(20, 226);
    this.addChild(this.upgradesTitleText);

    // Row layout coordinates
    const rowStartX = 20;
    const btnW = 95;
    const btnH = 36;
    const btnRightX = this.cardWidth - 20 - btnW / 2;

    // --- UPGRADE 1: Prece Dourada (Fé por Toque) ---
    const y1 = 250;
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
    const y2 = 308;
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
    const y3 = 366;
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
      text: 'Mult. Fé: 1.00x',
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
    this.dividerGraphics.moveTo(20, 218);
    this.dividerGraphics.lineTo(this.cardWidth - 20, 218);
    this.dividerGraphics.stroke({ width: 1, color: THEME.colors.cardBorderLight, alpha: 0.5 });

    // Background boxes for the 3 upgrade rows
    const rowW = this.cardWidth - 40;
    const rowH = 48;
    this.bgGraphics.roundRect(20, 245, rowW, rowH, 8);
    this.bgGraphics.fill({ color: 0x080808, alpha: 0.7 });
    this.bgGraphics.stroke({ width: 1, color: 0x1f1f1f });

    this.bgGraphics.roundRect(20, 303, rowW, rowH, 8);
    this.bgGraphics.fill({ color: 0x080808, alpha: 0.7 });
    this.bgGraphics.stroke({ width: 1, color: 0x1f1f1f });

    this.bgGraphics.roundRect(20, 361, rowW, rowH, 8);
    this.bgGraphics.fill({ color: 0x080808, alpha: 0.7 });
    this.bgGraphics.stroke({ width: 1, color: 0x1f1f1f });

    // Outer subtle halo behind icon
    this.glowGraphics.clear();
    this.glowGraphics.circle(this.cardWidth / 2, 88, 50);
    this.glowGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.04 });
  }

  public updateData(
    templosCount: number,
    goldRate: number,
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
    this.templesCountText.text = `${Formatters.formatNumber(templosCount)} ${templosCount === 1 ? 'Templo Construído' : 'Templos Construídos'}`;
    this.goldRateText.text = `Produção: +${Formatters.formatNumber(goldRate)} Ouro/s`;

    // Temple build button (costs 30 fiéis)
    const canAffordTemple = fiesCount >= 30;
    this.buildTempleBtn.setLabel('Construir Templo', `Custa 30 Fiéis (${fiesCount}/30)`);
    this.buildTempleBtn.setDisabled(!canAffordTemple);

    // Upgrade 1
    this.u1Mult.text = `Fé/toque: ${u1MultVal.toFixed(2)}x (+0.50x)`;
    this.u1Btn.setLabel('+Melhorar', `${Formatters.formatNumber(u1Cost)} Ouro`);
    this.u1Btn.setDisabled(!u1Afford);

    // Upgrade 2
    this.u2Mult.text = `Ganho Fiéis: ${u2MultVal.toFixed(2)}x (+0.25x)`;
    this.u2Btn.setLabel('+Melhorar', `${Formatters.formatNumber(u2Cost)} Ouro`);
    this.u2Btn.setDisabled(!u2Afford);

    // Upgrade 3
    this.u3Mult.text = `Mult: ${u3MultVal.toFixed(2)}x (+${faithBonusPct.toFixed(0)}% Fé)`;
    this.u3Btn.setLabel('+Melhorar', `${Formatters.formatNumber(u3Cost)} Ouro`);
    this.u3Btn.setDisabled(!u3Afford);
  }

  public update(dt: number): void {
    // Subtle rotation of architectural halo
    this.rotationAngle += dt * 0.6;
    this.haloGraphics.clear();

    const cx = this.cardWidth / 2;
    const cy = 88;
    const r = 42;

    for (let i = 0; i < 4; i++) {
      const startAngle = this.rotationAngle + (i * Math.PI) / 2;
      const endAngle = startAngle + Math.PI / 4;
      this.haloGraphics.arc(cx, cy, r, startAngle, endAngle);
      this.haloGraphics.stroke({ width: 1.5, color: THEME.colors.pureWhite, alpha: 0.3 });
    }

    // Subtle breathing
    const breath = Math.sin(performance.now() * 0.002) * 1.2;
    this.templeSprite.position.y = 88 + breath;
  }
}
