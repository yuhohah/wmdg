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
}
