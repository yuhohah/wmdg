import { Container, Graphics, Sprite, Text, TextStyle, FederatedPointerEvent, FederatedWheelEvent } from 'pixi.js';
import { THEME } from '../theme';
import { AchievementDefinition, AchievementState } from '../../engine/AchievementManager';
import { UIButton } from './UIButton';

export interface AchievementModalProps {
  onClose: () => void;
}

interface CategoryGroup {
  id: string;
  name: string;
  icon: string;
  achievements: AchievementDefinition[];
}

export class AchievementModal extends Container {
  private backdrop: Graphics;
  private cardGraphics: Graphics;
  private titleText: Text;
  private progressText: Text;
  private progressBarBg: Graphics;
  private progressBarFill: Graphics;
  private closeBtn: UIButton;

  // Scrollable Matrix Container
  private matrixContainer: Container;
  private matrixMask: Graphics;
  private scrollY: number = 0;
  private maxScrollY: number = 0;

  private isDraggingList: boolean = false;
  private dragStartY: number = 0;
  private dragStartScrollY: number = 0;

  // Floating Tooltip
  private tooltipContainer: Container;
  private tooltipBg: Graphics;
  private tooltipTitle: Text;
  private tooltipDesc: Text;
  private tooltipStatus: Text;

  constructor(props: AchievementModalProps) {
    super();

    this.visible = false;
    this.eventMode = 'static';

    // 1. Dark semi-transparent backdrop
    this.backdrop = new Graphics();
    this.backdrop.eventMode = 'static';
    this.backdrop.on('pointertap', () => this.hide());
    this.addChild(this.backdrop);

    // 2. Main Modal Card
    this.cardGraphics = new Graphics();
    this.cardGraphics.eventMode = 'static';
    this.addChild(this.cardGraphics);

    // 3. Header: 🏆 CONQUISTAS DO CULTO
    this.titleText = new Text({
      text: '🏆 MATRIZ DE CONQUISTAS',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 2,
        fill: THEME.colors.pureWhite
      })
    });
    this.addChild(this.titleText);

    // Progress text
    this.progressText = new Text({
      text: 'Progresso: 0 / 17 (0%)',
      style: new TextStyle({
        fontFamily: THEME.fonts.numbers,
        fontSize: 11,
        fontWeight: '700',
        fill: THEME.colors.silverLight
      })
    });
    this.addChild(this.progressText);

    // Progress Bar
    this.progressBarBg = new Graphics();
    this.addChild(this.progressBarBg);

    this.progressBarFill = new Graphics();
    this.addChild(this.progressBarFill);

    // 4. Matrix Container & Mask
    this.matrixContainer = new Container();
    this.addChild(this.matrixContainer);

    this.matrixMask = new Graphics();
    this.addChild(this.matrixMask);
    this.matrixContainer.mask = this.matrixMask;

    // 5. Close Button
    this.closeBtn = new UIButton({
      width: 120,
      height: 36,
      label: 'Fechar',
      fontSize: 11,
      bgColor: THEME.colors.cardBgHover,
      hoverColor: 0x2e2e2e,
      textColor: THEME.colors.pureWhite,
      onClick: () => {
        this.hide();
        props.onClose();
      }
    });
    this.addChild(this.closeBtn);

    // 6. Floating Hover Tooltip (drawn on top)
    this.tooltipContainer = new Container();
    this.tooltipContainer.visible = false;
    this.tooltipContainer.eventMode = 'none';

    this.tooltipBg = new Graphics();
    this.tooltipContainer.addChild(this.tooltipBg);

    this.tooltipTitle = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 12,
        fontWeight: '800',
        fill: THEME.colors.pureWhite
      })
    });
    this.tooltipTitle.position.set(12, 10);
    this.tooltipContainer.addChild(this.tooltipTitle);

    this.tooltipDesc = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: THEME.fonts.body,
        fontSize: 10,
        fontWeight: '500',
        fill: THEME.colors.silver,
        wordWrap: true,
        wordWrapWidth: 256
      })
    });
    this.tooltipDesc.position.set(12, 28);
    this.tooltipContainer.addChild(this.tooltipDesc);

    this.tooltipStatus = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: THEME.fonts.heading,
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.8
      })
    });
    this.tooltipContainer.addChild(this.tooltipStatus);

    this.addChild(this.tooltipContainer);

    // Setup interactive wheel & drag scrolling
    this.setupScrollInteractivity();
  }

  private setupScrollInteractivity(): void {
    this.cardGraphics.on('wheel', (e: FederatedWheelEvent) => {
      e.stopPropagation();
      const wheelDelta = e.deltaY || 0;
      this.scrollY = Math.max(-this.maxScrollY, Math.min(0, this.scrollY - wheelDelta * 0.8));
      this.matrixContainer.position.y = this.scrollY;
      this.hideTooltip();
    });

    this.cardGraphics.on('pointerdown', (e: FederatedPointerEvent) => {
      this.isDraggingList = true;
      this.dragStartY = e.global.y;
      this.dragStartScrollY = this.scrollY;
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.isDraggingList && this.visible) {
        const dy = e.clientY - this.dragStartY;
        this.scrollY = Math.max(-this.maxScrollY, Math.min(0, this.dragStartScrollY + dy));
        this.matrixContainer.position.y = this.scrollY;
        this.hideTooltip();
      }
    });

    const endDrag = () => {
      this.isDraggingList = false;
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  }

  public show(
    definitions: AchievementDefinition[],
    states: Record<string, AchievementState>,
    screenW: number,
    screenH: number
  ): void {
    this.visible = true;
    this.hideTooltip();

    // 1. Backdrop
    this.backdrop.clear();
    this.backdrop.rect(0, 0, screenW, screenH);
    this.backdrop.fill({ color: 0x000000, alpha: 0.88 });

    const modalW = Math.min(620, screenW - 32);
    const modalH = Math.min(540, screenH - 40);
    const centerX = screenW / 2;
    const centerY = screenH / 2;
    const modalX = centerX - modalW / 2;
    const modalY = centerY - modalH / 2;

    // 2. Card background
    this.cardGraphics.clear();
    this.cardGraphics.roundRect(modalX, modalY, modalW, modalH, 18);
    this.cardGraphics.fill({ color: THEME.colors.panelBg });
    this.cardGraphics.stroke({ width: 1.5, color: THEME.colors.cardBorderLight });

    // Inner top highlight line
    this.cardGraphics.roundRect(modalX + 2, modalY + 2, modalW - 4, 1.5, 8);
    this.cardGraphics.fill({ color: THEME.colors.pureWhite, alpha: 0.2 });

    // 3. Header Text
    this.titleText.position.set(modalX + 24, modalY + 18);

    // Calculate progress
    let unlockedCount = 0;
    definitions.forEach(d => {
      if (states[d.id]?.unlocked) unlockedCount++;
    });
    const totalCount = definitions.length;
    const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    this.progressText.text = `Progresso: ${unlockedCount} / ${totalCount} (${pct}%)  •  Passe o cursor sobre os ícones para detalhes`;
    this.progressText.position.set(modalX + 24, modalY + 44);

    // Progress bar
    const barW = modalW - 48;
    this.progressBarBg.clear();
    this.progressBarBg.roundRect(modalX + 24, modalY + 62, barW, 4, 2);
    this.progressBarBg.fill({ color: 0x1f1f1f });

    this.progressBarFill.clear();
    const fillW = Math.max(2, barW * (unlockedCount / Math.max(1, totalCount)));
    this.progressBarFill.roundRect(modalX + 24, modalY + 62, fillW, 4, 2);
    this.progressBarFill.fill({ color: THEME.colors.pureWhite });

    // 4. Group Achievements into Category Rows
    const groups: CategoryGroup[] = [
      {
        id: 'clicks',
        name: 'CLIQUES & ADORAÇÃO MANUAL',
        icon: '👆',
        achievements: definitions.filter(d => d.category === 'clicks')
      },
      {
        id: 'faith',
        name: 'PRODUÇÃO DE FÉ (PF/s)',
        icon: '⚡',
        achievements: definitions.filter(d => d.category === 'faith')
      },
      {
        id: 'fies',
        name: 'DEVOTOS (FIÉIS & SACERDOTES)',
        icon: '🔥',
        achievements: definitions.filter(d => d.category === 'fies')
      },
      {
        id: 'temples_gold',
        name: 'TEMPLOS & ECONOMIA',
        icon: '🏛️',
        achievements: definitions.filter(d => d.category === 'temples' || d.category === 'gold')
      },
      {
        id: 'monuments_time',
        name: 'MONUMENTOS & TEMPO DE CULTO',
        icon: '🗿',
        achievements: definitions.filter(d => d.category === 'monuments' || d.category === 'time')
      }
    ];

    // 5. Setup Matrix Container and Mask
    const listX = modalX + 24;
    const listY = modalY + 76;
    const listW = barW;
    const listH = modalH - 128;

    this.matrixMask.clear();
    this.matrixMask.rect(listX, listY, listW, listH);
    this.matrixMask.fill({ color: 0xffffff });

    this.matrixContainer.removeChildren();
    this.matrixContainer.position.set(listX, listY);
    this.scrollY = 0;

    let currentY = 0;
    const tileSize = 50;
    const tileGap = 10;

    groups.forEach(group => {
      if (group.achievements.length === 0) return;

      const groupContainer = new Container();
      groupContainer.position.set(0, currentY);

      // Row Header Label
      const rowTitle = new Text({
        text: `${group.icon} ${group.name}`,
        style: new TextStyle({
          fontFamily: THEME.fonts.heading,
          fontSize: 10,
          fontWeight: '900',
          letterSpacing: 1.2,
          fill: THEME.colors.silverDark
        })
      });
      rowTitle.position.set(0, 0);
      groupContainer.addChild(rowTitle);

      // Row Tiles Container
      const tilesRow = new Container();
      tilesRow.position.set(0, 18);

      group.achievements.forEach((ach, index) => {
        const isUnlocked = !!states[ach.id]?.unlocked;
        const tileX = index * (tileSize + tileGap);

        const tile = new Container();
        tile.position.set(tileX + tileSize / 2, tileSize / 2);
        tile.eventMode = 'static';
        tile.cursor = 'pointer';

        // Tile Box Background
        const tileBg = new Graphics();
        this.drawTileBackground(tileBg, tileSize, isUnlocked, false);
        tile.addChild(tileBg);

        // Achievement Icon Sprite
        const icon = Sprite.from(ach.icon || '/assets/icons/icon_star.png');
        icon.width = 28;
        icon.height = 28;
        icon.anchor.set(0.5);
        icon.alpha = isUnlocked ? 1.0 : 0.22;
        tile.addChild(icon);

        // If locked, small padlock overlay indicator
        if (!isUnlocked) {
          const lockBadge = new Text({
            text: '🔒',
            style: new TextStyle({
              fontSize: 10
            })
          });
          lockBadge.anchor.set(0.5);
          lockBadge.position.set(tileSize / 2 - 8, tileSize / 2 - 8);
          lockBadge.alpha = 0.5;
          tile.addChild(lockBadge);
        } else {
          // If unlocked, subtle checkmark dot
          const checkDot = new Graphics();
          checkDot.circle(tileSize / 2 - 6, -tileSize / 2 + 6, 3.5);
          checkDot.fill({ color: THEME.colors.pureWhite });
          tile.addChild(checkDot);
        }

        // Hover events
        tile.on('pointerenter', (e: FederatedPointerEvent) => {
          tile.scale.set(1.08);
          this.drawTileBackground(tileBg, tileSize, isUnlocked, true);
          this.showTooltip(ach, isUnlocked, e.global.x, e.global.y);
        });

        tile.on('pointermove', (e: FederatedPointerEvent) => {
          this.showTooltip(ach, isUnlocked, e.global.x, e.global.y);
        });

        tile.on('pointerleave', () => {
          tile.scale.set(1.0);
          this.drawTileBackground(tileBg, tileSize, isUnlocked, false);
          this.hideTooltip();
        });

        tilesRow.addChild(tile);
      });

      groupContainer.addChild(tilesRow);
      this.matrixContainer.addChild(groupContainer);

      currentY += tileSize + 32;
    });

    const totalContentHeight = currentY;
    this.maxScrollY = Math.max(0, totalContentHeight - listH);

    // Close button
    this.closeBtn.position.set(centerX, modalY + modalH - 26);
  }

  private drawTileBackground(g: Graphics, size: number, isUnlocked: boolean, isHovered: boolean): void {
    g.clear();
    const half = size / 2;

    if (isUnlocked) {
      g.roundRect(-half, -half, size, size, 10);
      g.fill({ color: isHovered ? 0x222222 : 0x141414, alpha: 0.95 });
      g.stroke({
        width: isHovered ? 2 : 1.5,
        color: isHovered ? THEME.colors.pureWhite : THEME.colors.cardBorderLight
      });

      // Top subtle inner shine
      g.roundRect(-half + 2, -half + 2, size - 4, 1.5, 4);
      g.fill({ color: THEME.colors.pureWhite, alpha: 0.25 });
    } else {
      g.roundRect(-half, -half, size, size, 10);
      g.fill({ color: isHovered ? 0x121212 : 0x0a0a0a, alpha: 0.8 });
      g.stroke({
        width: 1,
        color: isHovered ? THEME.colors.cardBorderLight : 0x1f1f1f
      });
    }
  }

  private showTooltip(ach: AchievementDefinition, isUnlocked: boolean, globalX: number, globalY: number): void {
    this.tooltipContainer.visible = true;

    this.tooltipTitle.text = ach.title;
    this.tooltipDesc.text = ach.description;

    this.tooltipStatus.text = isUnlocked ? '✓ CONQUISTADO' : '🔒 BLOQUEADO';
    this.tooltipStatus.style.fill = isUnlocked ? THEME.colors.pureWhite : THEME.colors.grayMuted;

    // Calculate dimensions
    const tipW = 280;
    const descH = this.tooltipDesc.height;
    const tipH = Math.max(76, 44 + descH + 18);

    this.tooltipStatus.position.set(12, 32 + descH + 4);

    this.tooltipBg.clear();
    this.tooltipBg.roundRect(0, 0, tipW, tipH, 10);
    this.tooltipBg.fill({ color: 0x050505, alpha: 0.97 });
    this.tooltipBg.stroke({ width: 1.5, color: isUnlocked ? THEME.colors.pureWhite : THEME.colors.cardBorderLight });

    // Inner shine line
    this.tooltipBg.roundRect(2, 2, tipW - 4, 1.5, 4);
    this.tooltipBg.fill({ color: THEME.colors.pureWhite, alpha: 0.25 });

    // Position tooltip near cursor with boundary clamping
    let tipX = globalX + 16;
    let tipY = globalY - tipH - 12;

    if (tipX + tipW > window.innerWidth - 16) {
      tipX = globalX - tipW - 16;
    }
    if (tipY < 16) {
      tipY = globalY + 20;
    }

    this.tooltipContainer.position.set(tipX, tipY);
  }

  private hideTooltip(): void {
    this.tooltipContainer.visible = false;
  }

  public hide(): void {
    this.visible = false;
    this.hideTooltip();
  }
}
