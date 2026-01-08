import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { 
  type User, type InsertUser, users,
  type Device, type InsertDevice, devices,
  type Firmware, type InsertFirmware, firmware,
  type DeviceLog, type InsertDeviceLog, deviceLogs,
  type StagedRollout, stagedRollouts,
  type DeploymentAnalytics, deploymentAnalytics,
  type DeviceHeartbeat, deviceHeartbeats,
  type AuditLog, type InsertAuditLog, auditLogs,
  type Webhook, type InsertWebhook, webhooks,
  type DeviceConfig, type InsertDeviceConfig, deviceConfigs,
  type DeviceConfigAssignment, deviceConfigAssignments,
  type DeviceCommand, type InsertDeviceCommand, deviceCommands,
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte, lt } from "drizzle-orm";
import type { IStorage, InsertStagedRollout, InsertDeviceHeartbeat, InsertAuditLogData } from "./storage";
import logger from "./logger";

// Environment configuration
const DB_HOST = process.env.DB_HOST || "15.206.156.197";
const DB_PORT = parseInt(process.env.DB_PORT || "3306");
const DB_USER = process.env.DB_USER || "satya";
const DB_PASSWORD = process.env.DB_PASSWORD || "satya123";
const DB_NAME = process.env.DB_NAME || "ota_db";

export class DbStorage implements IStorage {
  private db;

  constructor(_connectionString: string) {
    const connection = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    this.db = drizzle(connection);
  }

  // ==================== USER OPERATIONS ====================
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await this.db.insert(users).values(insertUser);
    const newUser = await this.getUserByUsername(insertUser.username);
    if (!newUser) throw new Error("Failed to create user");
    return newUser;
  }

  // ==================== DEVICE OPERATIONS ====================
  async getDevices(): Promise<Device[]> {
    const allDevices = await this.db.select().from(devices).orderBy(desc(devices.createdAt));
    
    // Auto-update status based on last seen time (5 minute threshold)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return allDevices.map(device => {
      const isActuallyOnline = device.lastSeen && new Date(device.lastSeen) > fiveMinutesAgo;
      const currentStatus = isActuallyOnline ? "online" : "offline";
      // Clean MAC address from colons for frontend display and ensure consistency
      const cleanMac = device.macAddress.replace(/[: -]/g, '').toUpperCase();
      
      // If the MAC in DB still has colons, update it asynchronously to fix the data
      if (device.macAddress !== cleanMac) {
        this.db.update(devices)
          .set({ macAddress: cleanMac })
          .where(eq(devices.id, device.id))
          .then(() => logger.info('Migrated MAC address format in DB', { id: device.id, from: device.macAddress, to: cleanMac }))
          .catch(err => logger.error('Failed to migrate MAC address in DB', { id: device.id, error: err.message }));
      }
      
      return { ...device, macAddress: cleanMac, status: currentStatus };
    });
  }

  async getDevice(id: string): Promise<Device | undefined> {
    const result = await this.db.select().from(devices).where(eq(devices.id, id));
    if (result[0]) {
      result[0].macAddress = result[0].macAddress.replace(/[: -]/g, '').toUpperCase();
    }
    return result[0];
  }

  async getDeviceByMac(macAddress: string): Promise<Device | undefined> {
    const normalizedMac = macAddress.replace(/[: -]/g, '').toUpperCase();
    const result = await this.db.select().from(devices).where(eq(devices.macAddress, normalizedMac));
    if (result[0]) {
      result[0].macAddress = result[0].macAddress.replace(/[: -]/g, '').toUpperCase();
    }
    return result[0];
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const normalizedDevice = {
      ...insertDevice,
      macAddress: insertDevice.macAddress.replace(/[: -]/g, '').toUpperCase()
    };
    await this.db.insert(devices).values(normalizedDevice);
    const result = await this.getDeviceByMac(normalizedDevice.macAddress);
    if (!result) throw new Error("Failed to create device");
    return result;
  }

  async updateDevice(id: string, updates: Partial<InsertDevice>): Promise<Device | undefined> {
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.macAddress) {
      normalizedUpdates.macAddress = normalizedUpdates.macAddress.replace(/[: -]/g, '').toUpperCase();
    }
    await this.db.update(devices).set(normalizedUpdates).where(eq(devices.id, id));
    return this.getDevice(id);
  }

  async updateDeviceByMac(macAddress: string, updates: Partial<InsertDevice>): Promise<Device | undefined> {
    const normalizedMac = macAddress.replace(/[: -]/g, '').toUpperCase();
    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.macAddress) {
      normalizedUpdates.macAddress = normalizedUpdates.macAddress.replace(/[: -]/g, '').toUpperCase();
    }
    await this.db.update(devices).set(normalizedUpdates).where(eq(devices.macAddress, normalizedMac));
    return this.getDeviceByMac(normalizedMac);
  }

  async deleteDevice(id: string): Promise<void> {
    await this.db.delete(devices).where(eq(devices.id, id));
  }

  // ==================== FIRMWARE OPERATIONS ====================
  async getFirmwares(): Promise<Firmware[]> {
    return this.db.select().from(firmware).orderBy(desc(firmware.createdAt));
  }

  async getFirmware(version: string): Promise<Firmware | undefined> {
    const result = await this.db.select().from(firmware).where(eq(firmware.version, version));
    return result[0];
  }

  async getFirmwareById(id: number): Promise<Firmware | undefined> {
    const result = await this.db.select().from(firmware).where(eq(firmware.id, id));
    return result[0];
  }

  async createFirmware(fw: InsertFirmware): Promise<Firmware> {
    await this.db.insert(firmware).values(fw);
    const newFw = await this.getFirmware(fw.version);
    if (!newFw) throw new Error("Failed to create firmware");
    return newFw;
  }

  async deleteFirmware(version: string): Promise<void> {
    await this.db.delete(firmware).where(eq(firmware.version, version));
  }

  async incrementFirmwareDownloadCount(filename: string): Promise<void> {
    await this.db.update(firmware)
      .set({ downloadCount: sql`${firmware.downloadCount} + 1` })
      .where(eq(firmware.filename, filename));
  }

  // ==================== DEVICE LOG OPERATIONS ====================
  async getDeviceLogs(deviceId?: string): Promise<DeviceLog[]> {
    let logs;
    if (deviceId) {
      logs = await this.db.select().from(deviceLogs)
        .where(sql`${deviceLogs.deviceId} = ${deviceId} AND (${deviceLogs.isCleared} IS NULL OR ${deviceLogs.isCleared} = 0)`)
        .orderBy(desc(deviceLogs.createdAt));
    } else {
      logs = await this.db.select().from(deviceLogs)
        .where(sql`${deviceLogs.isCleared} IS NULL OR ${deviceLogs.isCleared} = 0`)
        .orderBy(desc(deviceLogs.createdAt));
    }
    
    return logs.map(log => ({
      ...log,
      macAddress: log.macAddress ? log.macAddress.replace(/[: -]/g, '').toUpperCase() : log.macAddress
    }));
  }

  async createDeviceLog(log: InsertDeviceLog): Promise<DeviceLog> {
    await this.db.insert(deviceLogs).values({ ...log, isCleared: 0 });
    const logs = await this.getDeviceLogs();
    return logs[0];
  }

  async clearAllLogs(): Promise<void> {
    await this.db.update(deviceLogs)
      .set({ isCleared: 1 })
      .where(sql`${deviceLogs.isCleared} IS NULL OR ${deviceLogs.isCleared} = 0`);
  }

  // ==================== STAGED ROLLOUT OPERATIONS ====================
  async getStagedRollouts(): Promise<StagedRollout[]> {
    return this.db.select().from(stagedRollouts).orderBy(desc(stagedRollouts.createdAt));
  }

  async getStagedRollout(id: number): Promise<StagedRollout | undefined> {
    const result = await this.db.select().from(stagedRollouts).where(eq(stagedRollouts.id, id));
    return result[0];
  }

  async createStagedRollout(rollout: InsertStagedRollout): Promise<StagedRollout> {
    await this.db.insert(stagedRollouts).values(rollout);
    const rollouts = await this.getStagedRollouts();
    return rollouts[0];
  }

  async updateStagedRollout(id: number, updates: Partial<InsertStagedRollout>): Promise<StagedRollout | undefined> {
    await this.db.update(stagedRollouts).set(updates).where(eq(stagedRollouts.id, id));
    return this.getStagedRollout(id);
  }

  async deleteStagedRollout(id: number): Promise<void> {
    await this.db.delete(stagedRollouts).where(eq(stagedRollouts.id, id));
  }

  // ==================== DEVICE HEARTBEAT OPERATIONS ====================
  async getDeviceHeartbeats(macAddress: string, hours: number = 24): Promise<DeviceHeartbeat[]> {
    const normalizedMac = macAddress.replace(/[: -]/g, '').toUpperCase();
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.db.select().from(deviceHeartbeats)
      .where(and(
        eq(deviceHeartbeats.macAddress, normalizedMac),
        gte(deviceHeartbeats.createdAt, since)
      ))
      .orderBy(desc(deviceHeartbeats.createdAt));
  }

  async createDeviceHeartbeat(heartbeat: InsertDeviceHeartbeat): Promise<DeviceHeartbeat> {
    const normalizedHeartbeat = {
      ...heartbeat,
      macAddress: heartbeat.macAddress.replace(/[: -]/g, '').toUpperCase()
    };
    await this.db.insert(deviceHeartbeats).values(normalizedHeartbeat);
    const heartbeats = await this.getDeviceHeartbeats(normalizedHeartbeat.macAddress, 1);
    return heartbeats[0];
  }

  // ==================== DEPLOYMENT ANALYTICS OPERATIONS ====================
  async getDeploymentAnalytics(version?: string): Promise<DeploymentAnalytics[]> {
    if (version) {
      return this.db.select().from(deploymentAnalytics).where(eq(deploymentAnalytics.version, version));
    }
    return this.db.select().from(deploymentAnalytics).orderBy(desc(deploymentAnalytics.createdAt));
  }

  async upsertDeploymentAnalytics(version: string, success: boolean, updateTimeMs?: number): Promise<void> {
    const existing = await this.db.select().from(deploymentAnalytics).where(eq(deploymentAnalytics.version, version));
    
    if (existing.length > 0) {
      const current = existing[0];
      const updates: Partial<DeploymentAnalytics> = {
        totalAttempts: (current.totalAttempts || 0) + 1,
        successCount: success ? (current.successCount || 0) + 1 : current.successCount,
        failureCount: !success ? (current.failureCount || 0) + 1 : current.failureCount,
      };
      
      if (updateTimeMs && success) {
        const totalSuccessTime = (current.avgUpdateTimeMs || 0) * (current.successCount || 0);
        updates.avgUpdateTimeMs = Math.round((totalSuccessTime + updateTimeMs) / (updates.successCount || 1));
        updates.minUpdateTimeMs = Math.min(current.minUpdateTimeMs || updateTimeMs, updateTimeMs);
        updates.maxUpdateTimeMs = Math.max(current.maxUpdateTimeMs || updateTimeMs, updateTimeMs);
      }
      
      await this.db.update(deploymentAnalytics).set(updates).where(eq(deploymentAnalytics.id, current.id));
    } else {
      await this.db.insert(deploymentAnalytics).values({
        version,
        totalAttempts: 1,
        successCount: success ? 1 : 0,
        failureCount: success ? 0 : 1,
        avgUpdateTimeMs: updateTimeMs || null,
        minUpdateTimeMs: updateTimeMs || null,
        maxUpdateTimeMs: updateTimeMs || null,
      });
    }
  }

  // ==================== AUDIT LOG OPERATIONS ====================
  async getAuditLogs(filters?: { action?: string; entityType?: string; startDate?: Date; endDate?: Date; limit?: number }): Promise<AuditLog[]> {
    let query = this.db.select().from(auditLogs);
    const conditions: any[] = [];
    
    if (filters?.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters?.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters?.startDate) {
      conditions.push(gte(auditLogs.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(auditLogs.createdAt, filters.endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const results = await query.orderBy(desc(auditLogs.createdAt)).limit(filters?.limit || 100);
    return results;
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    await this.db.insert(auditLogs).values(log);
    const logs = await this.getAuditLogs({ limit: 1 });
    return logs[0];
  }

  async getAuditLogStats(): Promise<{ totalLogs: number; byAction: Record<string, number>; byEntityType: Record<string, number>; bySeverity: Record<string, number> }> {
    const allLogs = await this.db.select().from(auditLogs);
    
    const byAction: Record<string, number> = {};
    const byEntityType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    
    allLogs.forEach(log => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      byEntityType[log.entityType] = (byEntityType[log.entityType] || 0) + 1;
      const severity = log.severity || 'info';
      bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    });
    
    return {
      totalLogs: allLogs.length,
      byAction,
      byEntityType,
      bySeverity,
    };
  }

  // ==================== WEBHOOK OPERATIONS ====================
  async getWebhooks(): Promise<Webhook[]> {
    return this.db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
  }

  async getWebhook(id: number): Promise<Webhook | undefined> {
    const result = await this.db.select().from(webhooks).where(eq(webhooks.id, id));
    return result[0];
  }

  async createWebhook(webhook: InsertWebhook): Promise<Webhook> {
    await this.db.insert(webhooks).values(webhook);
    const allWebhooks = await this.getWebhooks();
    return allWebhooks[0];
  }

  async updateWebhook(id: number, updates: Partial<InsertWebhook>): Promise<Webhook | undefined> {
    await this.db.update(webhooks).set(updates).where(eq(webhooks.id, id));
    return this.getWebhook(id);
  }

  async deleteWebhook(id: number): Promise<void> {
    await this.db.delete(webhooks).where(eq(webhooks.id, id));
  }

  // ==================== DEVICE CONFIG OPERATIONS ====================
  async getDeviceConfigs(): Promise<DeviceConfig[]> {
    return this.db.select().from(deviceConfigs).orderBy(desc(deviceConfigs.createdAt));
  }

  async getDeviceConfig(id: number): Promise<DeviceConfig | undefined> {
    const result = await this.db.select().from(deviceConfigs).where(eq(deviceConfigs.id, id));
    return result[0];
  }

  async createDeviceConfig(config: InsertDeviceConfig): Promise<DeviceConfig> {
    await this.db.insert(deviceConfigs).values(config);
    const configs = await this.getDeviceConfigs();
    return configs[0];
  }

  async updateDeviceConfig(id: number, updates: Partial<InsertDeviceConfig>): Promise<DeviceConfig | undefined> {
    // Auto-increment version on any update
    const existing = await this.getDeviceConfig(id);
    if (!existing) return undefined;
    
    const newVersion = existing.version + 1;
    await this.db.update(deviceConfigs)
      .set({ ...updates, version: newVersion })
      .where(eq(deviceConfigs.id, id));
    return this.getDeviceConfig(id);
  }

  async deleteDeviceConfig(id: number): Promise<void> {
    // Also delete any assignments
    await this.db.delete(deviceConfigAssignments).where(eq(deviceConfigAssignments.configId, id));
    await this.db.delete(deviceConfigs).where(eq(deviceConfigs.id, id));
  }

  async getDeviceConfigAssignment(macAddress: string): Promise<DeviceConfigAssignment | undefined> {
    const normalizedMac = macAddress.replace(/[: -]/g, '').toUpperCase();
    const result = await this.db.select().from(deviceConfigAssignments).where(eq(deviceConfigAssignments.macAddress, normalizedMac));
    return result[0];
  }

  async getConfigAssignmentStats(): Promise<{ configId: number; total: number; pending: number; applied: number }[]> {
    const assignments = await this.db.select().from(deviceConfigAssignments);
    
    // Group by configId
    const statsMap = new Map<number, { total: number; pending: number; applied: number }>();
    
    for (const a of assignments) {
      const stats = statsMap.get(a.configId) || { total: 0, pending: 0, applied: 0 };
      stats.total++;
      if (a.status === 'pending') stats.pending++;
      else if (a.status === 'applied') stats.applied++;
      statsMap.set(a.configId, stats);
    }
    
    return Array.from(statsMap.entries()).map(([configId, stats]) => ({
      configId,
      ...stats,
    }));
  }

  async assignDeviceConfig(macAddress: string, configId: number, configVersion: number): Promise<DeviceConfigAssignment> {
    const normalizedMac = macAddress.replace(/[: -]/g, '').toUpperCase();
    const existing = await this.getDeviceConfigAssignment(normalizedMac);
    
    if (existing) {
      await this.db.update(deviceConfigAssignments)
        .set({ configId, configVersion, status: 'pending', appliedAt: null })
        .where(eq(deviceConfigAssignments.macAddress, normalizedMac));
    } else {
      await this.db.insert(deviceConfigAssignments).values({
        macAddress: normalizedMac,
        configId,
        configVersion,
        status: 'pending',
      });
    }
    
    return (await this.getDeviceConfigAssignment(normalizedMac))!;
  }

  async updateDeviceConfigAssignment(macAddress: string, updates: Partial<{ status: string; appliedAt: Date }>): Promise<void> {
    const normalizedMac = macAddress.replace(/[: -]/g, '').toUpperCase();
    await this.db.update(deviceConfigAssignments).set(updates).where(eq(deviceConfigAssignments.macAddress, normalizedMac));
  }

  // ==================== DEVICE COMMAND OPERATIONS (Remote Console) ====================
  async getDeviceCommands(macAddress: string, status?: string): Promise<DeviceCommand[]> {
    const normalizedMac = macAddress.replace(/[: -]/g, '').toUpperCase();
    if (status) {
      return this.db.select().from(deviceCommands)
        .where(and(eq(deviceCommands.macAddress, normalizedMac), eq(deviceCommands.status, status)))
        .orderBy(desc(deviceCommands.createdAt));
    }
    return this.db.select().from(deviceCommands)
      .where(eq(deviceCommands.macAddress, normalizedMac))
      .orderBy(desc(deviceCommands.createdAt));
  }

  async getPendingCommands(macAddress: string): Promise<DeviceCommand[]> {
    const normalizedMac = macAddress.replace(/[: -]/g, '').toUpperCase();
    const now = new Date();
    
    // Get pending commands that haven't expired
    const commands = await this.db.select().from(deviceCommands)
      .where(and(
        eq(deviceCommands.macAddress, normalizedMac),
        eq(deviceCommands.status, 'pending')
      ))
      .orderBy(deviceCommands.createdAt);
    
    // Filter out expired commands and mark them as expired
    const validCommands: DeviceCommand[] = [];
    for (const cmd of commands) {
      if (cmd.expiresAt && new Date(cmd.expiresAt) < now) {
        await this.updateDeviceCommand(cmd.id, { status: 'expired' });
      } else {
        validCommands.push(cmd);
      }
    }
    
    return validCommands;
  }

  async createDeviceCommand(command: InsertDeviceCommand): Promise<DeviceCommand> {
    const normalizedCommand = {
      ...command,
      macAddress: command.macAddress.replace(/[: -]/g, '').toUpperCase(),
      // Set default expiration to 5 minutes if not provided
      expiresAt: command.expiresAt || new Date(Date.now() + 5 * 60 * 1000),
    };
    await this.db.insert(deviceCommands).values(normalizedCommand);
    const commands = await this.getDeviceCommands(normalizedCommand.macAddress);
    return commands[0];
  }

  async updateDeviceCommand(id: number, updates: Partial<InsertDeviceCommand>): Promise<DeviceCommand | undefined> {
    await this.db.update(deviceCommands).set(updates).where(eq(deviceCommands.id, id));
    const result = await this.db.select().from(deviceCommands).where(eq(deviceCommands.id, id));
    return result[0];
  }

  // ==================== ROLLBACK PROTECTION OPERATIONS ====================
  async getAtRiskDevices(): Promise<Device[]> {
    const result = await this.db.select().from(devices).where(eq(devices.isAtRisk, 1));
    return result.map(device => ({
      ...device,
      macAddress: device.macAddress.replace(/[: -]/g, '').toUpperCase()
    }));
  }

  async markDeviceUpdateStarted(macAddress: string, expectedMinutes: number = 10): Promise<void> {
    const normalizedMac = macAddress.replace(/[: -]/g, '').toUpperCase();
    const now = new Date();
    const expectedCheckinBy = new Date(now.getTime() + expectedMinutes * 60 * 1000);
    
    await this.db.update(devices).set({
      updateStartedAt: now,
      expectedCheckinBy,
      isAtRisk: 0, // Reset at-risk flag when update starts
    }).where(eq(devices.macAddress, normalizedMac));
  }

  async markDeviceCheckedIn(macAddress: string): Promise<void> {
    const normalizedMac = macAddress.replace(/[: -]/g, '').toUpperCase();
    
    await this.db.update(devices).set({
      updateStartedAt: null,
      expectedCheckinBy: null,
      isAtRisk: 0,
    }).where(eq(devices.macAddress, normalizedMac));
  }
}
