import type { Achievement } from '../types.js';
import { DISPLAY_CONFIG } from '../config/display.js';

export class NotificationManager {
  private container: HTMLElement;

  constructor(containerId: string = 'achievements-popup-container') {
    this.container = document.getElementById(containerId)!;
  }

  public showAchievementPopup(ach: Achievement): void {
    const popup = document.createElement('div');
    popup.className = 'ach-popup-square';

    const iconHtml = DISPLAY_CONFIG.showEmojisAndSymbols
      ? `<div class="ach-popup-icon">${ach.icon}</div>`
      : '';

    popup.innerHTML = `
      <div class="ach-popup-timer-bar"></div>
      <span class="ach-popup-badge">✦ CONQUISTA DESBLOQUEADA ✦</span>
      ${iconHtml}
      <div class="ach-popup-title">${ach.name}</div>
      <div class="ach-popup-desc">${ach.desc}</div>
    `;

    popup.addEventListener('click', () => {
      popup.classList.add('closing');
      setTimeout(() => {
        if (popup.parentElement) popup.remove();
      }, 400);
    });

    this.container.appendChild(popup);

    // 5 seconds duration: start slide-out at 4.6s, remove at 5.0s
    setTimeout(() => {
      if (popup.parentElement) {
        popup.classList.add('closing');
        setTimeout(() => {
          if (popup.parentElement) popup.remove();
        }, 400);
      }
    }, 4600);
  }

  public showCustomPopup(title: string, desc: string, icon: string = '🏺', badge: string = '✦ NOVA MECÂNICA ✦'): void {
    const popup = document.createElement('div');
    popup.className = 'ach-popup-square';

    const iconHtml = DISPLAY_CONFIG.showEmojisAndSymbols
      ? `<div class="ach-popup-icon">${icon}</div>`
      : '';

    popup.innerHTML = `
      <div class="ach-popup-timer-bar" style="background: var(--gold-accent);"></div>
      <span class="ach-popup-badge" style="color: var(--gold-accent); border-color: rgba(234, 179, 8, 0.4);">${badge}</span>
      ${iconHtml}
      <div class="ach-popup-title">${title}</div>
      <div class="ach-popup-desc">${desc}</div>
    `;

    popup.addEventListener('click', () => {
      popup.classList.add('closing');
      setTimeout(() => {
        if (popup.parentElement) popup.remove();
      }, 400);
    });

    this.container.appendChild(popup);

    setTimeout(() => {
      if (popup.parentElement) {
        popup.classList.add('closing');
        setTimeout(() => {
          if (popup.parentElement) popup.remove();
        }, 400);
      }
    }, 4600);
  }
}
