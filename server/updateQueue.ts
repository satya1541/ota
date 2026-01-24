import { storage } from './storage';
import logger from './logger';
import * as PQueueImport from 'p-queue';

// Support both ESM and CommonJS consumers of p-queue by resolving
// the actual constructor at runtime. Some build setups expose the
// constructor as the default export, others as a named `PQueue`.
// Some bundlers (or the __toESM wrapper) can produce a nested `default` shape
// where `PQueueImport.default` is the CJS exports object which itself has a
// `default` property that is the constructor function. Handle that shape too.
const ResolvedPQueue: any = (PQueueImport as any).default?.default ?? (PQueueImport as any).default ?? (PQueueImport as any).PQueue ?? PQueueImport;

interface UpdateTask {
  deviceId: string;
  macAddress: string;
  version: string;
  priority?: number;
}

class UpdateQueueManager {
  private queue: any;
  private activeUpdates: Map<string, boolean>;
  private updateHistory: Map<string, { version: string; timestamp: number }>;

  constructor() {
    try {
      this.queue = new ResolvedPQueue({ 
        concurrency: 5,
        timeout: 300000
      });
    } catch (err) {
      logger.error('Failed to initialize p-queue', { error: err instanceof Error ? err.message : String(err) });
      throw new Error('Failed to initialize update queue');
    }
    
    this.activeUpdates = new Map();
    this.updateHistory = new Map();
  }

  /**
   * Check if a device is currently being updated
   */
  isDeviceUpdating(macAddress: string): boolean {
    return this.activeUpdates.get(macAddress) === true;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      size: this.queue.size,
      pending: this.queue.pending,
      activeUpdates: Array.from(this.activeUpdates.entries())
        .filter(([_, isActive]) => isActive)
        .map(([mac]) => mac)
    };
  }

  /**
   * Add an update task to the queue
   */
  async queueUpdate(task: UpdateTask): Promise<void> {
    const { deviceId, macAddress, version } = task;

    // Check if device is already being updated
    if (this.isDeviceUpdating(macAddress)) {
      logger.warn(`Device ${macAddress} is already being updated`, {
        service: 'update-queue',
        deviceId,
        macAddress
      });
      throw new Error('Device is already being updated');
    }

    // Check if same version was recently deployed (within 5 minutes)
    const lastUpdate = this.updateHistory.get(macAddress);
    if (lastUpdate && lastUpdate.version === version) {
      const timeSinceLastUpdate = Date.now() - lastUpdate.timestamp;
      if (timeSinceLastUpdate < 300000) { // 5 minutes
        logger.warn(`Duplicate update attempt for ${macAddress} to version ${version}`, {
          service: 'update-queue',
          timeSinceLastUpdate
        });
        throw new Error('Same version was recently deployed to this device');
      }
    }

    // Add to queue with transaction support
    await this.queue.add(async () => {
      return this.executeUpdate(deviceId, macAddress, version);
    }, { priority: task.priority || 0 });
  }

  /**
   * Execute the actual update with transaction rollback support
   */
  private async executeUpdate(deviceId: string, macAddress: string, version: string): Promise<void> {
    this.activeUpdates.set(macAddress, true);
    
    let device;
    let previousState: any = null;

    try {
      logger.info(`Starting update for device ${macAddress} to version ${version}`, {
        service: 'update-queue',
        deviceId,
        macAddress,
        version
      });

      // Get current device state for rollback
      device = await storage.getDeviceByMac(macAddress);
      if (!device) {
        throw new Error('Device not found');
      }

      // Save previous state
      previousState = {
        previousVersion: device.previousVersion,
        currentVersion: device.currentVersion,
        targetVersion: device.targetVersion,
        otaStatus: device.otaStatus
      };

      // Update device with new target version (atomic operation)
      await storage.updateDeviceByMac(macAddress, {
        previousVersion: device.currentVersion || "",
        targetVersion: version,
        otaStatus: "pending",
      });

      // Log deployment
      await storage.createDeviceLog({
        deviceId: device.id,
        macAddress: device.macAddress,
        action: "deploy",
        status: "pending",
        fromVersion: device.currentVersion || undefined,
        toVersion: version,
        message: `Deploy scheduled: ${device.currentVersion || 'none'} → ${version}`,
      });

      // Record successful deployment in history
      this.updateHistory.set(macAddress, {
        version,
        timestamp: Date.now()
      });

      logger.info(`Successfully queued update for device ${macAddress}`, {
        service: 'update-queue',
        deviceId,
        macAddress,
        version
      });

    } catch (error) {
      logger.error(`Update failed for device ${macAddress}`, {
        service: 'update-queue',
        error: error instanceof Error ? error.message : 'Unknown error',
        deviceId,
        macAddress,
        version
      });

      // Rollback on failure
      if (device && previousState) {
        try {
          await storage.updateDeviceByMac(macAddress, {
            previousVersion: previousState.previousVersion,
            currentVersion: previousState.currentVersion,
            targetVersion: previousState.targetVersion,
            otaStatus: "failed",
          });

          await storage.createDeviceLog({
            deviceId: device.id,
            macAddress: device.macAddress,
            action: "deploy",
            status: "failed",
            fromVersion: previousState.currentVersion,
            toVersion: version,
            message: `Update failed and rolled back: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });

          logger.info(`Rolled back device ${macAddress} to previous state`, {
            service: 'update-queue',
            deviceId,
            macAddress
          });
        } catch (rollbackError) {
          logger.error(`Rollback failed for device ${macAddress}`, {
            service: 'update-queue',
            error: rollbackError instanceof Error ? rollbackError.message : 'Unknown error',
            deviceId,
            macAddress
          });
        }
      }

      throw error;
    } finally {
      // Always remove from active updates
      this.activeUpdates.delete(macAddress);
      
      // Clean up old history entries (older than 1 hour)
      const oneHourAgo = Date.now() - 3600000;
      Array.from(this.updateHistory.entries()).forEach(([mac, update]) => {
        if (update.timestamp < oneHourAgo) {
          this.updateHistory.delete(mac);
        }
      });
    }
  }

  /**
   * Cancel pending updates for a device
   */
  async cancelDeviceUpdates(macAddress: string): Promise<void> {
    // Note: p-queue doesn't support cancellation of queued items
    // We can only prevent new updates and mark as cancelled
    if (this.isDeviceUpdating(macAddress)) {
      logger.warn(`Cannot cancel active update for ${macAddress}`, {
        service: 'update-queue',
        macAddress
      });
      throw new Error('Cannot cancel active update');
    }
  }

  /**
   * Clear the entire queue (emergency stop)
   */
  async clearQueue(): Promise<void> {
    await this.queue.clear();
    logger.warn('Update queue cleared', {
      service: 'update-queue'
    });
  }

  /**
   * Wait for all pending updates to complete
   */
  async waitForCompletion(): Promise<void> {
    await this.queue.onIdle();
  }
}

// Export singleton instance
export const updateQueue = new UpdateQueueManager();

