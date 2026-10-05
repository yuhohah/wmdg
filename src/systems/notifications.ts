import type { Achievement } from '../types.js';
import { DISPLAY_CONFIG } from '../config/display.js';

export class NotificationManager {
  private container: HTMLElement;

  constructor(containerId: string = 'achievements-popup-container') {
    this.container = document.getElementById(containerId)!;
  }

  private getAchievementFallbackIcon(ach: Achievement): string {
    if (ach.icon && ach.icon.trim().length > 0) {
      return ach.icon;
    }
    if (ach.id.startsWith('ach_click')) return '👆';
    if (ach.id.startsWith('ach_f_')) return '👥';
    if (ach.id.startsWith('ach_faith')) return '🔮';
    if (ach.id.startsWith('ach_fps')) return '⚡';
    if (ach.id.startsWith('ach_fervor')) return '🔥';
    if (ach.id.startsWith('ach_relic')) return '✨';
    return '🏆';
  }

  private getCustomFallbackIcon(title: string, badge: string): string {
    const combined = `${title} ${badge}`.toUpperCase();
    if (combined.includes('MILAGRE') || combined.includes('CLIQUE')) return '⚡';
    if (combined.includes('CONQUISTA')) return '🏆';
    if (combined.includes('INCARNA') || combined.includes('ASCENSÃO') || combined.includes('EVOLUÇÃO')) return '👑';
    if (combined.includes('FERVOR') || combined.includes('CHAMA')) return '🔥';
    if (combined.includes('RELÍQUIA') || combined.includes('TRANSMUTAÇÃO')) return '✨';
    if (combined.includes('SALV') || combined.includes('REGISTRO')) return '💾';
    if (combined.includes('EXPORT') || combined.includes('IMPORT')) return '📋';
    if (combined.includes('ALERTA') || combined.includes('ERRO')) return '⚠️';
    if (combined.includes('DESBLOQUEIO') || combined.includes('MECÂNICA')) return '🔓';
    return '🔔';
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
    const popup = document.createElement('div');
    popup.className = 'ach-popup-toast ach-popup-toast-achievement ach-popup-square';

    const icon = DISPLAY_CONFIG.showEmojisAndSymbols
      ? this.getAchievementFallbackIcon(ach)
      : '';

    const iconHtml = icon
      ? `<div class="ach-popup-icon-box"><span class="ach-popup-icon">${icon}</span></div>`
      : '';

    const buffHtml = ach.buffText
      ? `<div class="ach-popup-buff">
          <span class="ach-popup-buff-icon">✨</span>
          <span class="ach-popup-buff-text">Bônus: ${ach.buffText}</span>
        </div>`
      : '';

    popup.innerHTML = `
      <div class="ach-popup-timer-bar"></div>
      ${iconHtml}
      <div class="ach-popup-content">
        <div class="ach-popup-header-row">
          <span class="ach-popup-badge">CONQUISTA DESBLOQUEADA</span>
          <button type="button" class="ach-popup-close" aria-label="Fechar" title="Fechar">&times;</button>
        </div>
        <div class="ach-popup-title">${ach.name}</div>
        <div class="ach-popup-desc">${ach.desc}</div>
        ${buffHtml}
      </div>
    `;

    this.bindPopupLifecycle(popup);
    this.container.appendChild(popup);
  }

  public showCustomPopup(
    title: string,
    desc: string,
    icon: string = '',
    badge: string = 'NOVA MECÂNICA'
  ): void {
    const popup = document.createElement('div');
    const variantClass = this.getToastVariant(title, badge);
    popup.className = `ach-popup-toast ${variantClass} ach-popup-square`;

    const finalIcon = DISPLAY_CONFIG.showEmojisAndSymbols
      ? (icon && icon.trim().length > 0 ? icon : this.getCustomFallbackIcon(title, badge))
      : '';

    const iconHtml = finalIcon
      ? `<div class="ach-popup-icon-box"><span class="ach-popup-icon">${finalIcon}</span></div>`
      : '';

    popup.innerHTML = `
      <div class="ach-popup-timer-bar"></div>
      ${iconHtml}
      <div class="ach-popup-content">
        <div class="ach-popup-header-row">
          <span class="ach-popup-badge">${badge}</span>
          <button type="button" class="ach-popup-close" aria-label="Fechar" title="Fechar">&times;</button>
        </div>
        <div class="ach-popup-title">${title}</div>
        <div class="ach-popup-desc">${desc}</div>
      </div>
    `;

    this.bindPopupLifecycle(popup);
    this.container.appendChild(popup);
  }

  private bindPopupLifecycle(popup: HTMLElement): void {
    let closed = false;
    const closePopup = () => {
      if (closed) return;
      closed = true;
      popup.classList.add('closing');
      setTimeout(() => {
        if (popup.parentElement) popup.remove();
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

    // Auto-dismiss after 4.8s with smooth exit animation
    setTimeout(closePopup, 4800);
  }
}
