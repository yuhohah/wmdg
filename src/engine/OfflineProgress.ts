import { OfflineEarningsReport, ResourceId } from './types';
import { UpgradeManager } from './UpgradeManager';

export class OfflineProgressCalculator {
  // Max offline progress capped to 24 hours (86,400 seconds)
  public static readonly MAX_OFFLINE_SECONDS = 86400;

  // Minimum threshold to show modal (10 seconds)
  public static readonly MIN_OFFLINE_SECONDS = 10;

  public static calculate(
    lastSaveTimestamp: number,
    upgradeManager: UpgradeManager,
    efficiency: number = 1.0
  ): OfflineEarningsReport | null {
    if (!lastSaveTimestamp || lastSaveTimestamp <= 0) {
      return null;
    }

    const now = Date.now();
    const elapsedSeconds = Math.max(0, (now - lastSaveTimestamp) / 1000);

    if (elapsedSeconds < this.MIN_OFFLINE_SECONDS) {
      return null;
    }

    const effectiveSeconds = Math.min(elapsedSeconds, this.MAX_OFFLINE_SECONDS);
    const gains: Record<ResourceId, number> = {};

    // Sacerdotes generate Fiéis offline
    const sacerdotes = upgradeManager.getSacerdotesCount();
    if (sacerdotes > 0) {
      upgradeManager.addSacerdoteFies(effectiveSeconds * efficiency);
    }

    const faithPerSec = upgradeManager.getTotalProductionPerSecond('faith');
    if (faithPerSec > 0) {
      gains['faith'] = Math.floor(faithPerSec * effectiveSeconds * efficiency);
    }

    return {
      elapsedSeconds: effectiveSeconds,
      gains
    };
  }
}
