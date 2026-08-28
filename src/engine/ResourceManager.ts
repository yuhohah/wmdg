import { ResourceId, ResourceState } from './types';
import { EventEmitter } from './EventEmitter';
import { GameEventMap } from './types';

export class ResourceManager {
  private resources: Map<ResourceId, ResourceState> = new Map();
  private events: EventEmitter<GameEventMap>;

  constructor(events: EventEmitter<GameEventMap>, initialResources?: Record<ResourceId, ResourceState>) {
    this.events = events;

    if (initialResources) {
      Object.values(initialResources).forEach(res => {
        this.resources.set(res.id, { ...res });
      });
    }

    // Ensure 'faith' always exists
    if (!this.resources.has('faith')) {
      this.registerResource('faith', 0);
    }
  }

  public registerResource(id: ResourceId, startingAmount: number = 0): void {
    if (!this.resources.has(id)) {
      this.resources.set(id, {
        id,
        amount: startingAmount,
        totalEarned: startingAmount,
        peakAmount: startingAmount,
      });
    }
  }

  public getResource(id: ResourceId): ResourceState {
    const res = this.resources.get(id);
    if (!res) {
      return { id, amount: 0, totalEarned: 0, peakAmount: 0 };
    }
    return { ...res };
  }

  public getAllResources(): Record<ResourceId, ResourceState> {
    const output: Record<ResourceId, ResourceState> = {};
    this.resources.forEach((val, key) => {
      output[key] = { ...val };
    });
    return output;
  }

  public hasAmount(id: ResourceId, amount: number): boolean {
    const res = this.resources.get(id);
    return !!res && res.amount >= amount;
  }

  public add(id: ResourceId, amount: number, isManual: boolean = false): void {
    if (amount <= 0) return;
    let res = this.resources.get(id);
    if (!res) {
      this.registerResource(id, amount);
      res = this.resources.get(id)!;
    }

    res.amount += amount;
    res.totalEarned += amount;
    if (res.amount > res.peakAmount) {
      res.peakAmount = res.amount;
    }

    this.events.emit('resource:changed', {
      id,
      amount: res.amount,
      delta: amount,
      isManual
    });
  }

  public spend(id: ResourceId, amount: number): boolean {
    if (amount < 0) return false;
    const res = this.resources.get(id);
    if (!res || res.amount < amount) {
      return false;
    }

    res.amount -= amount;
    this.events.emit('resource:changed', {
      id,
      amount: res.amount,
      delta: -amount,
      isManual: false
    });
    return true;
  }

  public set(id: ResourceId, amount: number): void {
    const res = this.resources.get(id);
    if (res) {
      const delta = amount - res.amount;
      res.amount = Math.max(0, amount);
      if (res.amount > res.peakAmount) res.peakAmount = res.amount;
      this.events.emit('resource:changed', {
        id,
        amount: res.amount,
        delta,
        isManual: false
      });
    }
  }
}
