import { type User, type InsertUser } from "@shared/schema";
import { 
  type Device, type InsertDevice, 
  type Firmware, type InsertFirmware, 
  type DeviceLog, type InsertDeviceLog,
  type StagedRollout,
  type DeploymentAnalytics,
  type DeviceHeartbeat,
  type AuditLog, type InsertAuditLog,
  type Webhook, type InsertWebhook,
  type DeviceConfig, type InsertDeviceConfig,
  type DeviceConfigAssignment,
  type DeviceCommand, type InsertDeviceCommand,
} from "@shared/schema";
import { DbStorage } from "./db-storage";

// Insert types for new tables
export interface InsertStagedRollout {
  version: string;
  currentStage?: number;
  stagePercentages?: string;
  status?: string;
  totalDevices?: number;
  updatedDevices?: number;
  failedDevices?: number;
  autoExpand?: number;
  expandAfterMinutes?: number;
  failureThreshold?: number;
  lastExpanded?: Date | null;
}

export interface InsertDeviceHeartbeat {
  macAddress: string;
  signalStrength?: number | null;
  freeHeap?: number | null;
  uptime?: number | null;
  cpuTemp?: number | null;
}

// Full storage interface with all tables
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Device operations (includes firmware version tracking)
  getDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  getDeviceByMac(macAddress: string): Promise<Device | undefined>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, updates: Partial<InsertDevice>): Promise<Device | undefined>;
  updateDeviceByMac(macAddress: string, updates: Partial<InsertDevice>): Promise<Device | undefined>;
  deleteDevice(id: string): Promise<void>;
  
  // Firmware operations (for rollback and version management)
  getFirmwares(): Promise<Firmware[]>;
  getFirmware(version: string): Promise<Firmware | undefined>;
  getFirmwareById(id: number): Promise<Firmware | undefined>;
  createFirmware(firmware: InsertFirmware): Promise<Firmware>;
  deleteFirmware(version: string): Promise<void>;
  incrementFirmwareDownloadCount(filename: string): Promise<void>;
  
  // Device Log operations (all OTA activity logs)
  getDeviceLogs(deviceId?: string): Promise<DeviceLog[]>;
  createDeviceLog(log: InsertDeviceLog): Promise<DeviceLog>;
  clearAllLogs(): Promise<void>;
  
  // Staged Rollout operations
  getStagedRollouts(): Promise<StagedRollout[]>;
  getStagedRollout(id: number): Promise<StagedRollout | undefined>;
  createStagedRollout(rollout: InsertStagedRollout): Promise<StagedRollout>;
  updateStagedRollout(id: number, updates: Partial<InsertStagedRollout>): Promise<StagedRollout | undefined>;
  deleteStagedRollout(id: number): Promise<void>;
  
  // Device Heartbeat operations
  getDeviceHeartbeats(macAddress: string, hours?: number): Promise<DeviceHeartbeat[]>;
  createDeviceHeartbeat(heartbeat: InsertDeviceHeartbeat): Promise<DeviceHeartbeat>;
  
  // Deployment Analytics operations
  getDeploymentAnalytics(version?: string): Promise<DeploymentAnalytics[]>;
  upsertDeploymentAnalytics(version: string, success: boolean, updateTimeMs?: number): Promise<void>;
  
  // Audit Log operations
  getAuditLogs(filters?: { action?: string; entityType?: string; startDate?: Date; endDate?: Date; limit?: number }): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogStats(): Promise<{ totalLogs: number; byAction: Record<string, number>; byEntityType: Record<string, number>; bySeverity: Record<string, number> }>;
  
  // Webhook operations
  getWebhooks(): Promise<Webhook[]>;
  getWebhook(id: number): Promise<Webhook | undefined>;
  createWebhook(webhook: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: number, updates: Partial<InsertWebhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: number): Promise<void>;
  
  // Device Config operations
  getDeviceConfigs(): Promise<DeviceConfig[]>;
  getDeviceConfig(id: number): Promise<DeviceConfig | undefined>;
  createDeviceConfig(config: InsertDeviceConfig): Promise<DeviceConfig>;
  updateDeviceConfig(id: number, updates: Partial<InsertDeviceConfig>): Promise<DeviceConfig | undefined>;
  deleteDeviceConfig(id: number): Promise<void>;
  getDeviceConfigAssignment(macAddress: string): Promise<DeviceConfigAssignment | undefined>;
  getConfigAssignmentStats(): Promise<{ configId: number; total: number; pending: number; applied: number }[]>;
  assignDeviceConfig(macAddress: string, configId: number, configVersion: number): Promise<DeviceConfigAssignment>;
  updateDeviceConfigAssignment(macAddress: string, updates: Partial<{ status: string; appliedAt: Date }>): Promise<void>;
  
  // Device Command operations (Remote Console)
  getDeviceCommands(macAddress: string, status?: string): Promise<DeviceCommand[]>;
  getPendingCommands(macAddress: string): Promise<DeviceCommand[]>;
  createDeviceCommand(command: InsertDeviceCommand): Promise<DeviceCommand>;
  updateDeviceCommand(id: number, updates: Partial<InsertDeviceCommand>): Promise<DeviceCommand | undefined>;
  
  // Rollback Protection operations
  getAtRiskDevices(): Promise<Device[]>;
  markDeviceUpdateStarted(macAddress: string, expectedMinutes?: number): Promise<void>;
  markDeviceCheckedIn(macAddress: string): Promise<void>;
}

// Helper type for InsertAuditLog
export interface InsertAuditLogData {
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  severity?: string | null;
}

// Use database storage
export const storage: IStorage = new DbStorage("");
