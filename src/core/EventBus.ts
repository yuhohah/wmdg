export type EventCallback<T = any> = (payload: T) => void;

export const GameEvents = {
  GAME_TICK: 'game:tick',
  STATE_CHANGED: 'state:changed',
  FAITH_CHANGED: 'faith:changed',
  ITEM_BOUGHT: 'item:bought',
  UNLOCK_BOUGHT: 'unlock:bought',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  TAB_CHANGED: 'tab:changed',
  SAVE_LOADED: 'save:loaded',
  MIRACLE_GRANTED: 'miracle:granted',
} as const;

export type GameEventName = typeof GameEvents[keyof typeof GameEvents] | string;

export class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  public on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
    return () => this.off(event, callback as EventCallback);
  }

  public off<T = any>(event: string, callback: EventCallback<T>): void {
    this.listeners.get(event)?.delete(callback as EventCallback);
  }

  public emit<T = any>(event: string, payload?: T): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error(`Erro no ouvinte do evento ${event}:`, err);
      }
    });
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const events = new EventBus();
