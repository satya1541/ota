import { mysqlTable, varchar, text, int, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (for authentication)
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ==================== DEVICES TABLE ====================
// Main devices table - stores all device info AND firmware version tracking
export const devices = mysqlTable("devices", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  macAddress: varchar("mac_address", { length: 12 }).notNull().unique(),
  group: text("group").notNull(),
  // Firmware version tracking (previously in ota_device_config)
  previousVersion: varchar("previous_version", { length: 50 }).default(""),
  currentVersion: varchar("current_version", { length: 50 }).default(""),
  targetVersion: varchar("target_version", { length: 50 }).default(""),
  // OTA status tracking
  otaStatus: varchar("ota_status", { length: 20 }).default("idle"), // idle, pending, updating, updated, failed
  status: varchar("status", { length: 20 }).notNull().default("offline"), // online, offline
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  lastOtaCheck: timestamp("last_ota_check"),
  // Additional device info
  ipAddress: varchar("ip_address", { length: 45 }),
  // Location fields for geographic map
  latitude: varchar("latitude", { length: 20 }),
  longitude: varchar("longitude", { length: 20 }),
  location: varchar("location", { length: 255 }), // Friendly location name
  // Health monitoring fields
  healthScore: int("health_score").default(100), // 0-100 health score
  signalStrength: int("signal_strength"), // WiFi RSSI
  freeHeap: int("free_heap"), // Free memory in bytes
  uptime: int("uptime"), // Uptime in seconds
  lastHeartbeat: timestamp("last_heartbeat"),
  consecutiveFailures: int("consecutive_failures").default(0),
  // A/B testing fields
  testGroup: varchar("test_group", { length: 10 }), // 'A', 'B', or null
  // Rollback protection fields
  updateStartedAt: timestamp("update_started_at"),
  expectedCheckinBy: timestamp("expected_checkin_by"),
  updateAttempts: int("update_attempts").default(0),
  isAtRisk: int("is_at_risk").default(0),
  // Config management
  configVersion: int("config_version").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectDeviceSchema = createSelectSchema(devices);

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

// ==================== FIRMWARE TABLE ====================
// Stores all firmware versions for deployment and rollback
export const firmware = mysqlTable("firmware", {
  id: int("id").primaryKey().autoincrement(),
  version: varchar("version", { length: 50 }).notNull().unique(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  size: int("size").notNull().default(0),
  checksum: varchar("checksum", { length: 64 }).notNull(),
  description: text("description"),
  downloadCount: int("download_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFirmwareSchema = createInsertSchema(firmware).omit({
  id: true,
  createdAt: true,
});

export const selectFirmwareSchema = createSelectSchema(firmware);

export type InsertFirmware = z.infer<typeof insertFirmwareSchema>;
export type Firmware = typeof firmware.$inferSelect;

// ==================== DEVICE LOGS TABLE ====================
// Stores all OTA activity logs (pass/fail status)
export const deviceLogs = mysqlTable("device_logs", {
  id: int("id").primaryKey().autoincrement(),
  deviceId: varchar("device_id", { length: 36 }).notNull(), // References devices.id or MAC address
  macAddress: varchar("mac_address", { length: 12 }), // Device MAC for quick reference
  action: varchar("action", { length: 50 }).notNull(), // check, download, deploy, report, rollback, register, reset
  status: varchar("status", { length: 20 }).notNull(), // success, failed, pending
  fromVersion: varchar("from_version", { length: 50 }),
  toVersion: varchar("to_version", { length: 50 }),
  message: text("message"),
  isCleared: int("is_cleared").notNull().default(0), // 0 for visible, 1 for cleared
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeviceLogSchema = createInsertSchema(deviceLogs).omit({
  id: true,
  createdAt: true,
});

export const selectDeviceLogSchema = createSelectSchema(deviceLogs);

export type InsertDeviceLog = z.infer<typeof insertDeviceLogSchema>;
export type DeviceLog = typeof deviceLogs.$inferSelect;

// ==================== STAGED ROLLOUTS TABLE ====================
// Tracks phased deployments with auto-expansion
export const stagedRollouts = mysqlTable("staged_rollouts", {
  id: int("id").primaryKey().autoincrement(),
  version: varchar("version", { length: 50 }).notNull(),
  currentStage: int("current_stage").default(1), // 1, 2, 3, 4 (5%, 25%, 50%, 100%)
  stagePercentages: varchar("stage_percentages", { length: 100 }).default("[5, 25, 50, 100]"),
  status: varchar("status", { length: 20 }).default("active"), // active, paused, completed, failed
  totalDevices: int("total_devices").default(0),
  updatedDevices: int("updated_devices").default(0),
  failedDevices: int("failed_devices").default(0),
  autoExpand: int("auto_expand").default(1), // 1 = auto-expand on success
  expandAfterMinutes: int("expand_after_minutes").default(30),
  failureThreshold: int("failure_threshold").default(10), // % failures to pause rollout
  lastExpanded: timestamp("last_expanded"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export type StagedRollout = typeof stagedRollouts.$inferSelect;

// ==================== DEPLOYMENT ANALYTICS TABLE ====================
// Tracks deployment metrics and performance
export const deploymentAnalytics = mysqlTable("deployment_analytics", {
  id: int("id").primaryKey().autoincrement(),
  version: varchar("version", { length: 50 }).notNull(),
  totalAttempts: int("total_attempts").default(0),
  successCount: int("success_count").default(0),
  failureCount: int("failure_count").default(0),
  avgUpdateTimeMs: int("avg_update_time_ms"),
  minUpdateTimeMs: int("min_update_time_ms"),
  maxUpdateTimeMs: int("max_update_time_ms"),
  avgDownloadBytes: int("avg_download_bytes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export type DeploymentAnalytics = typeof deploymentAnalytics.$inferSelect;

// ==================== DEVICE HEARTBEATS TABLE ====================
// Stores heartbeat history for health monitoring
export const deviceHeartbeats = mysqlTable("device_heartbeats", {
  id: int("id").primaryKey().autoincrement(),
  macAddress: varchar("mac_address", { length: 12 }).notNull(),
  signalStrength: int("signal_strength"),
  freeHeap: int("free_heap"),
  uptime: int("uptime"),
  cpuTemp: int("cpu_temp"), // Temperature in Celsius * 10
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DeviceHeartbeat = typeof deviceHeartbeats.$inferSelect;

// ==================== AUDIT LOGS TABLE ====================
// Tracks all user actions for compliance and auditing
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 36 }),
  userName: varchar("user_name", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(), // deploy, delete, update, rollback, etc.
  entityType: varchar("entity_type", { length: 50 }).notNull(), // device, firmware, rollout, config
  entityId: varchar("entity_id", { length: 100 }),
  entityName: varchar("entity_name", { length: 255 }),
  details: text("details"), // JSON with additional context
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  severity: varchar("severity", { length: 20 }).default("info"), // info, warning, critical
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ==================== WEBHOOKS TABLE ====================
// Stores webhook configurations for event notifications
export const webhooks = mysqlTable("webhooks", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  secret: varchar("secret", { length: 255 }), // HMAC secret for signature
  events: varchar("events", { length: 500 }).notNull().default("[]"), // JSON array
  isActive: int("is_active").notNull().default(1),
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastStatusCode: int("last_status_code"),
  failureCount: int("failure_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

// ==================== DEVICE CONFIGS TABLE ====================
// Stores device configuration with versioning
export const deviceConfigs = mysqlTable("device_configs", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  configData: text("config_data").notNull(), // JSON configuration
  version: int("version").notNull().default(1),
  isDefault: int("is_default").notNull().default(0),
  targetGroup: varchar("target_group", { length: 100 }), // Apply to specific group
  targetDevices: text("target_devices"), // JSON array of MAC addresses
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDeviceConfigSchema = createInsertSchema(deviceConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeviceConfig = z.infer<typeof insertDeviceConfigSchema>;
export type DeviceConfig = typeof deviceConfigs.$inferSelect;

// ==================== DEVICE CONFIG ASSIGNMENTS TABLE ====================
export const deviceConfigAssignments = mysqlTable("device_config_assignments", {
  id: int("id").primaryKey().autoincrement(),
  macAddress: varchar("mac_address", { length: 12 }).notNull().unique(),
  configId: int("config_id").notNull(),
  configVersion: int("config_version").notNull(),
  appliedAt: timestamp("applied_at"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, applied, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DeviceConfigAssignment = typeof deviceConfigAssignments.$inferSelect;

// ==================== DEVICE COMMANDS TABLE ====================
// Stores pending commands for remote console
export const deviceCommands = mysqlTable("device_commands", {
  id: int("id").primaryKey().autoincrement(),
  macAddress: varchar("mac_address", { length: 12 }).notNull(),
  command: varchar("command", { length: 50 }).notNull(), // reboot, factory_reset, config_reload, custom
  payload: text("payload"), // Optional command payload
  status: varchar("status", { length: 20 }).default("pending"), // pending, sent, acknowledged, failed, expired
  expiresAt: timestamp("expires_at"),
  sentAt: timestamp("sent_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  response: text("response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeviceCommandSchema = createInsertSchema(deviceCommands).omit({
  id: true,
  createdAt: true,
});

export type InsertDeviceCommand = z.infer<typeof insertDeviceCommandSchema>;
export type DeviceCommand = typeof deviceCommands.$inferSelect;
