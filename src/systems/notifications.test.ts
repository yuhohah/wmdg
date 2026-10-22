import { describe, it, expect } from "vitest";
import { NotificationManager } from "./notifications.js";
import type { Achievement } from "../types.js";

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
  });
});
