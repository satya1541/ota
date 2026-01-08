import { storage } from "./storage";
import { getWebSocketManager } from "./ws-manager";
import { webhookEvents } from "./webhook-service";
import logger from "./logger";

// Watchdog check interval (1 minute)
const WATCHDOG_INTERVAL_MS = 60 * 1000;

// At-risk threshold - devices updating for more than this time are flagged
const AT_RISK_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

class RollbackProtectionWatchdog {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start(): void {
    if (this.isRunning) {
      logger.warn("Rollback watchdog already running");
      return;
    }

    this.isRunning = true;
    logger.info("Starting rollback protection watchdog", { intervalMs: WATCHDOG_INTERVAL_MS });

    // Run immediately, then on interval
    this.checkDevices();
    this.intervalId = setInterval(() => this.checkDevices(), WATCHDOG_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info("Rollback protection watchdog stopped");
  }

  private async checkDevices(): Promise<void> {
    try {
      const devices = await storage.getDevices();
      const now = new Date();
      let atRiskCount = 0;
      let newAtRiskDevices: typeof devices = [];

      for (const device of devices) {
        // Check for devices that are updating and haven't checked in
        if (device.otaStatus === "updating" && device.expectedCheckinBy) {
          const expectedTime = new Date(device.expectedCheckinBy);
          
          if (now > expectedTime && !device.isAtRisk) {
            // Mark device as at-risk
            await storage.updateDeviceByMac(device.macAddress, {
              isAtRisk: 1,
            });
            
            newAtRiskDevices.push(device);
            atRiskCount++;

            logger.warn("Device marked at-risk", {
              macAddress: device.macAddress,
              name: device.name,
              expectedCheckinBy: expectedTime.toISOString(),
              currentStatus: device.otaStatus,
            });

            // Trigger webhook
            webhookEvents.deviceAtRisk(device.macAddress, expectedTime);
          }
        }

        // Check for devices stuck in updating state for too long
        if (device.otaStatus === "updating" && device.updateStartedAt) {
          const updateStartTime = new Date(device.updateStartedAt);
          const elapsedMs = now.getTime() - updateStartTime.getTime();

          if (elapsedMs > AT_RISK_THRESHOLD_MS && !device.isAtRisk) {
            await storage.updateDeviceByMac(device.macAddress, {
              isAtRisk: 1,
            });
            
            if (!newAtRiskDevices.find(d => d.id === device.id)) {
              newAtRiskDevices.push(device);
              atRiskCount++;
            }

            logger.warn("Device stuck in updating state", {
              macAddress: device.macAddress,
              name: device.name,
              elapsedMinutes: Math.round(elapsedMs / 60000),
            });
          }
        }

        // Auto-clear at-risk flag for devices that are now online and not updating
        if (device.isAtRisk && device.status === "online" && device.otaStatus !== "updating") {
          await storage.updateDeviceByMac(device.macAddress, {
            isAtRisk: 0,
            updateStartedAt: null,
            expectedCheckinBy: null,
          });

          logger.info("At-risk device recovered", {
            macAddress: device.macAddress,
            name: device.name,
          });
        }
      }

      // Broadcast updates if any devices changed status
      if (newAtRiskDevices.length > 0) {
        try {
          const wsManager = getWebSocketManager();
          wsManager.broadcastDevices(await storage.getDevices());
          
          // Also broadcast a special at-risk alert
          wsManager.broadcastAtRiskAlert({
            count: atRiskCount,
            devices: newAtRiskDevices.map(d => ({
              macAddress: d.macAddress,
              name: d.name,
              expectedCheckinBy: d.expectedCheckinBy,
            })),
          });
        } catch (error) {
          // WebSocket manager might not be initialized during startup
        }
      }

    } catch (error) {
      logger.error("Rollback watchdog check failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Get current at-risk device count
  async getAtRiskCount(): Promise<number> {
    const devices = await storage.getAtRiskDevices();
    return devices.length;
  }

  // Get detailed at-risk device info
  async getAtRiskDevices(): Promise<Array<{
    macAddress: string;
    name: string;
    updateStartedAt: Date | null;
    expectedCheckinBy: Date | null;
    targetVersion: string | null;
    updateAttempts: number;
  }>> {
    const devices = await storage.getAtRiskDevices();
    return devices.map(d => ({
      macAddress: d.macAddress,
      name: d.name || "Unknown",
      updateStartedAt: d.updateStartedAt,
      expectedCheckinBy: d.expectedCheckinBy,
      targetVersion: d.targetVersion,
      updateAttempts: d.updateAttempts || 0,
    }));
  }

  // Manually clear at-risk flag for a device
  async clearAtRiskFlag(macAddress: string): Promise<void> {
    await storage.updateDeviceByMac(macAddress, {
      isAtRisk: 0,
      updateStartedAt: null,
      expectedCheckinBy: null,
    });
    
    logger.info("Manually cleared at-risk flag", { macAddress });
  }

  // Force rollback for an at-risk device
  async forceRollback(macAddress: string): Promise<boolean> {
    const device = await storage.getDeviceByMac(macAddress);
    if (!device) return false;

    if (!device.previousVersion || device.previousVersion === device.currentVersion) {
      logger.warn("Cannot rollback - no different previous version", { macAddress });
      return false;
    }

    await storage.updateDeviceByMac(macAddress, {
      targetVersion: device.previousVersion,
      otaStatus: "pending",
      isAtRisk: 0,
      updateStartedAt: null,
      expectedCheckinBy: null,
    });

    logger.info("Forced rollback for at-risk device", {
      macAddress,
      from: device.currentVersion,
      to: device.previousVersion,
    });

    return true;
  }
}

// Singleton instance
export const rollbackWatchdog = new RollbackProtectionWatchdog();
