import type { DeadZone } from './types.js';
import { formatDuration } from './reporters.js';

type Phase = DeadZone['phase'];
const THRESHOLDS: Record<Phase, number> = { early: 300, mid: 1200, late: 7200 };

/** Scheduled absences count toward elapsed wait, but not forced idle while present. */
export class ProgressTracker {
  public maxWaitSec = 0;
  public maxPresentIdleSec = 0;
  public deadZones: DeadZone[] = [];
  private elapsed = 0;
  private present = 0;
  private startSec = 0;
  private phase: Phase = 'early';

  public advance(deltaSec: number, isPresent: boolean): void {
    this.elapsed += deltaSec;
    if (isPresent) this.present += deltaSec;
    this.maxWaitSec = Math.max(this.maxWaitSec, this.elapsed);
    this.maxPresentIdleSec = Math.max(this.maxPresentIdleSec, this.present);
  }

  public progress(nowSec: number, nextPhase: Phase): void {
    this.record();
    this.elapsed = 0;
    this.present = 0;
    this.startSec = nowSec;
    this.phase = nextPhase;
  }

  public finish(): void { this.record(); }

  private record(): void {
    if (this.present > THRESHOLDS[this.phase]) {
      this.deadZones.push({
        phase: this.phase, startTimeSec: this.startSec, durationSec: this.present,
        formattedDuration: formatDuration(this.present), targetAction: 'Próxima mudança de progressão',
        reason: 'Tempo presente sem compra, desbloqueio, prestígio ou evolução automática; ausências programadas excluídas.',
      });
    }
  }
}
