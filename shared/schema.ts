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
  macAddress: varchar("mac_address", { length: 17 }).notNull().unique(),
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
  macAddress: varchar("mac_address", { length: 17 }), // Device MAC for quick reference
  action: varchar("action", { length: 50 }).notNull(), // check, download, deploy, report, rollback, register, reset
  status: varchar("status", { length: 20 }).notNull(), // success, failed, pending
  fromVersion: varchar("from_version", { length: 50 }),
  toVersion: varchar("to_version", { length: 50 }),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeviceLogSchema = createInsertSchema(deviceLogs).omit({
  id: true,
  createdAt: true,
});

export const selectDeviceLogSchema = createSelectSchema(deviceLogs);

export type InsertDeviceLog = z.infer<typeof insertDeviceLogSchema>;
export type DeviceLog = typeof deviceLogs.$inferSelect;
