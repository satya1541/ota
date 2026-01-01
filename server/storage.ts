import { type User, type InsertUser } from "@shared/schema";
import { 
  type Device, type InsertDevice, 
  type Firmware, type InsertFirmware, 
  type DeviceLog, type InsertDeviceLog,
} from "@shared/schema";
import { DbStorage } from "./db-storage";

// Simplified storage interface - only 3 tables: devices, firmware, device_logs
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
}

// Use database storage
export const storage: IStorage = new DbStorage("");
