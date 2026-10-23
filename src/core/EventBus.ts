type EventCallback<T = any> = (payload: T) => void;

export class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  public on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off<T = any>(event: string, callback: EventCallback<T>): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  public emit<T = any>(event: string, payload?: T): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error in EventBus listener for "${event}":`, err);
        }
      });
    }
  }
}

export const events = new EventBus();

export const GameEvents = {
  FAITH_CHANGED: 'faith:changed',
  UNLOCK_BOUGHT: 'unlock:bought',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  MIRACLE_GRANTED: 'miracle:granted',
  STATE_CHANGED: 'state:changed',
  GAME_TICK: 'game:tick'
} as const;
