import type { Achievement } from '../types.js';
import { DISPLAY_CONFIG } from '../config/display.js';
import { icon as renderIcon, iconOrText } from '../ui/icons.js';

export class NotificationManager {
  private container!: HTMLElement;
  private shownNotificationKeys: Set<string> = new Set<string>();

  constructor(containerId: string = 'achievements-popup-container') {
    if (typeof document !== 'undefined') {
      this.container = document.getElementById(containerId) as HTMLElement;
    }
  }

  public resetHistory(): void {
    this.shownNotificationKeys.clear();
  }

  public getNotificationKey(title: string, desc: string, badge: string): string {
    const cleanTitle = title.trim().toLowerCase();
    const cleanBadge = badge.trim().toLowerCase();
    const cleanDesc = desc.trim().toLowerCase();
    // Normalize dynamic numbers so repeated notifications with changing amounts (e.g. transmute) count as the same notification
    const normalizedDesc = cleanDesc.replace(/[0-9.,kmbqt+]+/gi, "#");
    return `${cleanBadge}::${cleanTitle}::${normalizedDesc}`;
  }

  private getAchievementFallbackIcon(ach: Achievement): string {
    if (ach.icon && ach.icon.trim().length > 0) {
      return ach.icon;
    }
    if (ach.id.startsWith('ach_click')) return 'sphere';
    if (ach.id.startsWith('ach_f_')) return 'followers';
    if (ach.id.startsWith('ach_faith')) return 'orb';
    if (ach.id.startsWith('ach_fps')) return 'bolt';
    if (ach.id.startsWith('ach_fervor')) return 'fervor';
    if (ach.id.startsWith('ach_relic')) return 'gem';
    return 'laurel';
  }

  private getCustomFallbackIcon(title: string, badge: string): string {
    const combined = `${title} ${badge}`.toUpperCase();
    if (combined.includes('MILAGRE') || combined.includes('CLIQUE')) return 'bolt';
    if (combined.includes('CONQUISTA')) return 'laurel';
    if (combined.includes('INCARNA') || combined.includes('ASCENSÃO') || combined.includes('EVOLUÇÃO')) return 'crown';
    if (combined.includes('FERVOR') || combined.includes('CHAMA')) return 'fervor';
    if (combined.includes('RELÍQUIA') || combined.includes('TRANSMUTAÇÃO')) return 'gem';
    if (combined.includes('SALV') || combined.includes('REGISTRO')) return 'codex';
    if (combined.includes('EXPORT') || combined.includes('IMPORT')) return 'scroll';
    if (combined.includes('ALERTA') || combined.includes('ERRO')) return 'warning';
    if (combined.includes('DESBLOQUEIO') || combined.includes('MECÂNICA')) return 'unlock';
    return 'bell';
  }

  private getToastVariant(title: string, badge: string): string {
    const combined = `${title} ${badge}`.toUpperCase();
    if (combined.includes('ALERTA') || combined.includes('ERRO')) return 'ach-popup-toast-alert';
    if (combined.includes('FERVOR') || combined.includes('CHAMA')) return 'ach-popup-toast-crimson';
    if (combined.includes('RELÍQUIA') || combined.includes('TRANSMUTAÇÃO')) return 'ach-popup-toast-silver';
    if (combined.includes('SALV') || combined.includes('REGISTRO') || combined.includes('EXPORT') || combined.includes('IMPORT')) return 'ach-popup-toast-emerald';
    if (combined.includes('DESBLOQUEIO') || combined.includes('MECÂNICA')) return 'ach-popup-toast-purple';
    return 'ach-popup-toast-gold';
  }

  public showAchievementPopup(ach: Achievement): void {
    const key = `ach::${ach.id.trim().toLowerCase()}`;
    if (this.shownNotificationKeys.has(key)) return;
    this.shownNotificationKeys.add(key);

    const popup = document.createElement('div');
    popup.className = 'ach-popup-toast ach-popup-toast-achievement ach-popup-square';

    const icon = DISPLAY_CONFIG.showEmojisAndSymbols
      ? this.getAchievementFallbackIcon(ach)
      : '';

    const iconHtml = icon
      ? `<div class="ach-popup-icon-box"><span class="ach-popup-icon">${iconOrText(icon)}</span></div>`
      : '';

    const buffHtml = ach.buffText
      ? `<div class="ach-popup-buff">
          <span class="ach-popup-buff-icon">${renderIcon('star')}</span>
          <span class="ach-popup-buff-text">Bônus: ${ach.buffText}</span>
        </div>`
      : '';

    popup.innerHTML = `
      <div class="ach-popup-timer-bar"></div>
      ${iconHtml}
      <div class="ach-popup-content">
        <div class="ach-popup-header-row">
          <span class="ach-popup-badge">CONQUISTA DESBLOQUEADA</span>
          <button type="button" class="ach-popup-close" aria-label="Fechar">&times;</button>
        </div>
        <div class="ach-popup-title">${ach.name}</div>
        <div class="ach-popup-desc">${ach.desc}</div>
        ${buffHtml}
      </div>
    `;

    this.bindPopupLifecycle(popup, key);
    this.container.appendChild(popup);
  }

  public showCustomPopup(
    title: string,
    desc: string,
    icon: string = '',
    badge: string = 'NOVA MECÂNICA'
  ): void {
    const key = this.getNotificationKey(title, desc, badge);
    if (this.shownNotificationKeys.has(key)) return;
    this.shownNotificationKeys.add(key);

    const popup = document.createElement('div');
    const variantClass = this.getToastVariant(title, badge);
    popup.className = `ach-popup-toast ${variantClass} ach-popup-square`;

    const finalIcon = DISPLAY_CONFIG.showEmojisAndSymbols
      ? (icon && icon.trim().length > 0 ? icon : this.getCustomFallbackIcon(title, badge))
      : '';

    const iconHtml = finalIcon
      ? `<div class="ach-popup-icon-box"><span class="ach-popup-icon">${iconOrText(finalIcon)}</span></div>`
      : '';

    popup.innerHTML = `
      <div class="ach-popup-timer-bar"></div>
      ${iconHtml}
      <div class="ach-popup-content">
        <div class="ach-popup-header-row">
          <span class="ach-popup-badge">${badge}</span>
          <button type="button" class="ach-popup-close" aria-label="Fechar">&times;</button>
        </div>
        <div class="ach-popup-title">${title}</div>
        <div class="ach-popup-desc">${desc}</div>
      </div>
    `;

    this.bindPopupLifecycle(popup, key);
    this.container.appendChild(popup);
  }

  private bindPopupLifecycle(popup: HTMLElement, key?: string): void {
    let closed = false;
    const closePopup = () => {
      if (closed) return;
      closed = true;
      popup.classList.add('closing');
      setTimeout(() => {
        if (popup.parentElement) popup.remove();
        if (key && !key.startsWith('ach::')) {
          this.shownNotificationKeys.delete(key);
        }
      }, 400);
    };

    popup.addEventListener('click', closePopup);

    const closeBtn = popup.querySelector('.ach-popup-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closePopup();
      });
    }

    // Auto-dismiss after 2s (visible for exactly 2 seconds)
    setTimeout(closePopup, 2000);
  }
}
