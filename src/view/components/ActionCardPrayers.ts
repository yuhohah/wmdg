import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { THEME } from '../theme';
import { UIButton } from './UIButton';
import { Formatters } from '../utils/Formatters';

export interface PrayerItemState {
  id: string;
  name: string;
  description: string;
  requiredTempleLevel: number;
  level: number;
  cost: number;
  isUnlockedByTemple: boolean;
  canAfford: boolean;
}

export interface ActionCardPrayersProps {
  width?: number;
  height?: number;
  onBuyPrayer: (prayerId: string) => void;
}

export class ActionCardPrayers extends Container {
  private cardWidth: number;
  private cardHeight: number;
  private bgGraphics: Graphics;
  private titleText: Text;
  private subtitleText: Text;

  private slotsGraphics: Graphics;
  private prayerTitleTexts: Text[] = [];
  private prayerReqTexts: Text[] = [];
  private prayerDescTexts: Text[] = [];
  private prayerButtons: UIButton[] = [];

  private onBuyPrayerCallback: (id: string) => void;

  constructor(props: ActionCardPrayersProps) {
    super();

    // Standard card dimensions: 360px wide x 520px high
    this.cardWidth = props.width || 360;
    this.cardHeight = props.height || 520;
    this.onBuyPrayerCallback = props.onBuyPrayer;

    // 1. Background Box
    this.bgGraphics = new Graphics();
    this.addChild(this.bgGraphics);

    // 2. Header
    this.titleText = new Text({
      text: '✦ REZAS E PRECES SAGRADAS ✦',
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

    this.subtitleText = new Text({
      text: 'Bênçãos Divinas Desbloqueadas pelo Templo',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 10,
        fontWeight: '500',
        fill: THEME.colors.silverLight,
        align: 'center'
      })
    });
    this.subtitleText.anchor.set(0.5, 0);
    this.subtitleText.position.set(this.cardWidth / 2, 38);
    this.addChild(this.subtitleText);

    // Graphics for slot backgrounds
    this.slotsGraphics = new Graphics();
    this.addChild(this.slotsGraphics);

    // Create 4 vertical prayer slots
    this.initPrayerSlots();

    this.drawCardBackground();
  }

  private initPrayerSlots(): void {
    const slotW = 320;
    const slotH = 96;
    const startX = 20;
    const startY = 66;
    const gapY = 12;

    const PRAYER_IDS = ['reza_1', 'reza_2', 'reza_3', 'reza_4'];

    for (let i = 0; i < 4; i++) {
      const y = startY + i * (slotH + gapY);

      // Title
      const title = new Text({
        text: `Prece ${i + 1}`,
        style: new TextStyle({
          fontFamily: THEME.fonts.heading,
          fontSize: 11,
          fontWeight: '800',
          fill: THEME.colors.pureWhite
        })
      });
      title.position.set(startX + 14, y + 10);
      this.addChild(title);
      this.prayerTitleTexts.push(title);

      // Requirement / Level tag
      const req = new Text({
        text: `Requer Nv. ${i + 1}`,
        style: new TextStyle({
          fontFamily: THEME.fonts.numbers,
          fontSize: 9,
          fontWeight: '700',
          fill: THEME.colors.silverDark
        })
      });
      req.position.set(startX + 14, y + 28);
      this.addChild(req);
      this.prayerReqTexts.push(req);

      // Description
      const desc = new Text({
        text: 'Efeito da prece sagrada',
        style: new TextStyle({
          fontFamily: THEME.fonts.body,
          fontSize: 9,
          fontWeight: '500',
          fill: THEME.colors.silver,
          wordWrap: true,
          wordWrapWidth: 170,
          lineHeight: 12
        })
      });
      desc.position.set(startX + 14, y + 46);
      this.addChild(desc);
      this.prayerDescTexts.push(desc);

      // Action Button
      const prayerId = PRAYER_IDS[i];
      const btn = new UIButton({
        width: 110,
        height: 42,
        label: 'Consagrar',
        subLabel: '50k PF',
        fontSize: 10,
        bgColor: THEME.colors.btnSuccess,
        hoverColor: THEME.colors.btnSuccessHover,
        textColor: THEME.colors.textDark,
        disabled: true,
        onClick: () => this.onBuyPrayerCallback(prayerId)
      });
      btn.position.set(startX + slotW - 65, y + slotH / 2);
      this.addChild(btn);
      this.prayerButtons.push(btn);
    }
  }

  private drawCardBackground(): void {
    this.bgGraphics.clear();
    this.bgGraphics.roundRect(0, 0, this.cardWidth, this.cardHeight, 18);
    this.bgGraphics.fill({ color: THEME.colors.panelBg, alpha: 0.94 });
    this.bgGraphics.stroke({ width: 1.5, color: THEME.colors.cardBorder });
  }

  public updateData(prayers: PrayerItemState[], templeLevel: number): void {
    const slotW = 320;
    const slotH = 96;
    const startX = 20;
    const startY = 66;
    const gapY = 12;

    this.slotsGraphics.clear();

    for (let i = 0; i < 4; i++) {
      const y = startY + i * (slotH + gapY);
      const pData = prayers[i];
      const isUnlocked = templeLevel >= (i + 1);

      this.slotsGraphics.roundRect(startX, y, slotW, slotH, 12);
      if (i === 0 && pData && pData.level > 0) {
        this.slotsGraphics.fill({ color: 0x161616, alpha: 0.95 });
        this.slotsGraphics.stroke({ width: 1.5, color: THEME.colors.pureWhite, alpha: 0.7 });
      } else if (isUnlocked && i === 0) {
        this.slotsGraphics.fill({ color: 0x0c0c0c, alpha: 0.85 });
        this.slotsGraphics.stroke({ width: 1, color: THEME.colors.cardBorderLight, alpha: 0.5 });
      } else {
        this.slotsGraphics.fill({ color: 0x050505, alpha: 0.5 });
        this.slotsGraphics.stroke({ width: 1, color: 0x1a1a1a, alpha: 0.3 });
      }

      if (pData) {
        if (i === 0) {
          // Slot 1: Infinite Logarithmic Prayer for Faith (Reza 1)
          const lvl = pData.level;
          this.prayerTitleTexts[i].text = lvl > 0 ? `Prece dos Fiéis (Nv. ${lvl})` : 'Prece dos Fiéis';
          this.prayerDescTexts[i].text = `+25% PF por log(Fé) a cada nível (Sem Limite)`;

          if (isUnlocked) {
            this.prayerReqTexts[i].text = lvl > 0 ? `✦ Nível Ativo: ${lvl}` : 'Desbloqueado (Templo Nv. 1)';
            this.prayerReqTexts[i].style.fill = lvl > 0 ? THEME.colors.pureWhite : THEME.colors.silverLight;
            this.prayerButtons[i].visible = true;
            this.prayerButtons[i].setLabel(lvl > 0 ? 'Consagrar (+1)' : 'Consagrar', `${Formatters.formatNumber(pData.cost)} PF`);
            this.prayerButtons[i].setDisabled(!pData.canAfford);
          } else {
            this.prayerReqTexts[i].text = '🔒 Requer Templo Nível 1';
            this.prayerReqTexts[i].style.fill = THEME.colors.grayMuted;
            this.prayerButtons[i].visible = true;
            this.prayerButtons[i].setLabel('Bloqueado', 'Templo Nv. 1');
            this.prayerButtons[i].setDisabled(true);
          }
        } else if (i === 1) {
          // Slot 2: Infinite Logarithmic Prayer for Gold (Reza 2)
          const lvl = pData.level;
          this.prayerTitleTexts[i].text = lvl > 0 ? `Prece do Ouro Sagrado (Nv. ${lvl})` : 'Prece do Ouro Sagrado';
          this.prayerDescTexts[i].text = `+25% Ouro por log(Fé) a cada nível (Sem Limite)`;

          if (isUnlocked) {
            this.prayerReqTexts[i].text = lvl > 0 ? `✦ Nível Ativo: ${lvl}` : 'Desbloqueado (Templo Nv. 2)';
            this.prayerReqTexts[i].style.fill = lvl > 0 ? THEME.colors.pureWhite : THEME.colors.silverLight;
            this.prayerButtons[i].visible = true;
            this.prayerButtons[i].setLabel(lvl > 0 ? 'Consagrar (+1)' : 'Consagrar', `${Formatters.formatNumber(pData.cost)} PF`);
            this.prayerButtons[i].setDisabled(!pData.canAfford);
          } else {
            this.prayerReqTexts[i].text = '🔒 Requer Templo Nível 2';
            this.prayerReqTexts[i].style.fill = THEME.colors.grayMuted;
            this.prayerButtons[i].visible = true;
            this.prayerButtons[i].setLabel('Bloqueado', 'Templo Nv. 2');
            this.prayerButtons[i].setDisabled(true);
          }
        } else {
          // Slots 3 & 4: Locked (Em Breve)
          this.prayerTitleTexts[i].text = `Prece Sagrada ${i + 1}`;
          this.prayerDescTexts[i].text = 'Segredo cósmico em desenvolvimento';
          this.prayerReqTexts[i].text = '🔒 BLOQUEADO (Em Breve)';
          this.prayerReqTexts[i].style.fill = THEME.colors.grayMuted;
          this.prayerButtons[i].visible = true;
          this.prayerButtons[i].setLabel('🔒 Bloqueado', 'Em Breve');
          this.prayerButtons[i].setDisabled(true);
        }
      }
    }
  }
}
