import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { 
  type User, type InsertUser, users,
  type Device, type InsertDevice, devices,
  type Firmware, type InsertFirmware, firmware,
  type DeviceLog, type InsertDeviceLog, deviceLogs,
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { IStorage } from "./storage";
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
}
