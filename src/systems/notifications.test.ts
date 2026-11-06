import { afterEach, describe, it, expect, vi } from "vitest";
import { NotificationManager, notificationDurationMs } from "./notifications.js";
import type { Achievement } from "../types.js";

describe("notification timing", () => {
  afterEach(() => vi.useRealTimers());

  function showPopup(text: string) {
    vi.useFakeTimers();
    const listeners: Record<string, () => void> = {};
    const bar = { style: { animationDuration: "" } };
    const closing = vi.fn();
    (globalThis as any).document = {
      getElementById: () => ({ appendChild: () => {} }),
      createElement: () => ({
        addEventListener: (type: string, fn: () => void) => { listeners[type] = fn; },
        querySelector: (selector: string) => selector === ".ach-popup-timer-bar" ? bar : null,
        classList: { add: closing },
      }),
    };
    new NotificationManager().showCustomPopup("", text, "bell", "");
    return { listeners, bar, closing };
  }

  it.each([
    [10, 4000],
    [60, 4700],
    [100, 6500],
    [500, 8000],
  ])("gives %i characters %i ms", (length, expected) => {
    expect(notificationDurationMs("x".repeat(length))).toBe(expected);
  });

  it("keeps the timer bar and the auto close on the same duration", () => {
    const { bar, closing } = showPopup("x".repeat(60));
    expect(bar.style.animationDuration).toBe("4700ms");
    vi.advanceTimersByTime(4699);
    expect(closing).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(closing).toHaveBeenCalledWith("closing");
  });

  it("pauses the auto close while hovered and resumes the remaining time", () => {
    const { listeners, closing } = showPopup("x".repeat(60));
    vi.advanceTimersByTime(1000);
    listeners.mouseenter();
    vi.advanceTimersByTime(60000);
    expect(closing).not.toHaveBeenCalled();
    listeners.mouseleave();
    vi.advanceTimersByTime(3699);
    expect(closing).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(closing).toHaveBeenCalledWith("closing");
  });
});

describe("NotificationManager deduplication logic", () => {
  it("normalizes and dedupes custom notification keys", () => {
    const notifs = new NotificationManager("fake");

    const key1 = notifs.getNotificationKey("MECÂNICA DESBLOQUEADA", "Você rompeu o Selo do Fervor", "DESBLOQUEIO");
    const key2 = notifs.getNotificationKey("  MECÂNICA DESBLOQUEADA  ", "Você rompeu o Selo do Fervor  ", "  DESBLOQUEIO  ");
    expect(key1).toBe(key2);

    // Dynamic numbers normalize to same key
    const trans1 = notifs.getNotificationKey("TRANSMUTAÇÃO", "Sua Fé virou +50 Fragmentos de deuses caídos.", "TRANSMUTAÇÃO");
    const trans2 = notifs.getNotificationKey("TRANSMUTAÇÃO", "Sua Fé virou +1500 Fragmentos de deuses caídos.", "TRANSMUTAÇÃO");
    expect(trans1).toBe(trans2);
  });

  it("omits the badge from a custom popup when none is given", () => {
    const appended: any[] = [];
    (globalThis as any).document = {
      getElementById: () => ({ appendChild: (el: any) => appended.push(el) }),
      createElement: () => ({ addEventListener: () => {}, querySelector: () => null }),
    };
    const notifs = new NotificationManager();
    notifs.showCustomPopup("COM ETIQUETA", "Texto", "bell", "AVISO");
    notifs.showCustomPopup("SEM ETIQUETA", "Texto", "bell", "");
    expect(appended[0].innerHTML).toContain("ach-popup-badge");
    expect(appended[1].innerHTML).not.toContain("ach-popup-badge");
    expect(appended[1].innerHTML).toContain("SEM ETIQUETA");
  });

  it("blocks duplicate notifications from appearing more than once", () => {
    const appended: any[] = [];
    const mockContainer = {
      appendChild: (el: any) => appended.push(el)
    } as any;

    // Minimal global document mock
    (globalThis as any).document = {
      getElementById: () => mockContainer,
      createElement: () => ({
        className: "",
        innerHTML: "",
        querySelector: () => null,
        addEventListener: () => {},
        classList: { add: () => {} }
      })
    };

    const notifs = new NotificationManager("fake");
    (notifs as any).container = mockContainer;

    const ach = {
      id: "ach_single_test",
      name: "Teste",
      desc: "Desc",
      lore: "",
      icon: "",
      unlocked: true,
      buffText: "",
      buffType: "click_power" as const,
      buffVal: 1,
      check: () => true,
      getProgress: () => ({ current: 1, target: 1, percent: 100, formattedCurrent: "1", formattedTarget: "1" })
    } as unknown as Achievement;

    // First appearance
    notifs.showAchievementPopup(ach);
    expect(appended.length).toBe(1);

    // Second appearance blocked
    notifs.showAchievementPopup(ach);
    expect(appended.length).toBe(1);

    // Custom notification first appearance
    notifs.showCustomPopup("TESTE", "Notificacao 1", "", "BADGE");
    expect(appended.length).toBe(2);

    // Custom notification second appearance blocked
    notifs.showCustomPopup("TESTE", "Notificacao 1", "", "BADGE");
    expect(appended.length).toBe(2);

    // After resetHistory or when cleared, it can be displayed again
    notifs.resetHistory();
    notifs.showCustomPopup("TESTE", "Notificacao 1", "", "BADGE");
    expect(appended.length).toBe(3);
  });
});
