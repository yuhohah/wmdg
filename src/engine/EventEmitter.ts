export type Listener<T> = (data: T) => void;

export class EventEmitter<TEvents extends Record<string, any>> {
  private listeners: { [K in keyof TEvents]?: Array<Listener<TEvents[K]>> } = {};

  public on<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);

    // Return unbind function
    return () => this.off(event, listener);
  }

  public off<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): void {
    const list = this.listeners[event];
    if (!list) return;
    const index = list.indexOf(listener);
    if (index !== -1) {
      list.splice(index, 1);
    }
  }

  public emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const list = this.listeners[event];
    if (!list) return;
    // Iterate shallow copy to prevent mutations during execution
    const copy = [...list];
    for (let i = 0; i < copy.length; i++) {
      copy[i](data);
    }
  }

  public clear(): void {
    this.listeners = {};
  }
}
