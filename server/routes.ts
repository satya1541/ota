import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import logger, { otaLogger, LOG_PATHS } from "./logger";
import rateLimit from "express-rate-limit";
import { 
  validateBody, 
  validateQuery,
  createDeviceSchema,
  deviceIdSchema,
  updateDeviceSchema,
  updateDeviceLocationSchema,
  deleteDeviceSchema,
  deploySchema,
  resetSchema,
  otaCheckSchema,
  otaReportSchema,
  otaProgressSchema,
  loginSchema,
  registerSchema,
  uploadFirmwareSchema,
  firmwareDiffQuerySchema,
  macAddressSchema,
  firmwareVersionSchema
} from "./validation";
import { updateQueue } from "./updateQueue";
import { getWebSocketManager } from "./ws-manager";
import { webhookEvents, testWebhook } from "./webhook-service";
import { rollbackWatchdog } from "./rollback-watchdog";

// Firmware storage directory
const FIRMWARE_DIR = path.join(process.cwd(), "server", "firmware");

// Ensure firmware directory exists
if (!fs.existsSync(FIRMWARE_DIR)) {
  fs.mkdirSync(FIRMWARE_DIR, { recursive: true });
}

// Multer configuration for firmware uploads
const firmwareStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, FIRMWARE_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `temp-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: firmwareStorage,
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.bin' || ext === '.hex') {
      cb(null, true);
    } else {
      cb(new Error('Only .bin and .hex files are allowed'));
    }
  }
});

// Rate limiter for OTA endpoints
const otaCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => (req.query.deviceId as string) || 'unknown',
  handler: (req, res) => {
    const deviceId = req.query.deviceId as string;
    otaLogger.rateLimitExceeded(deviceId || 'unknown', req.ip || 'unknown');
    res.status(429).json({ updateAvailable: false, error: "Too many requests" });
  },
  validate: { xForwardedForHeader: false },
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  handler: (_req, res) => {
    res.status(429).json({ error: "Too many download requests" });
  },
  validate: { xForwardedForHeader: false },
});

// Calculate SHA256 checksum
function calculateChecksum(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Get base URL for firmware downloads
function getBaseUrl(req: Request): string {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}`;
}

// Audit logging helper
async function createAuditLog(
  action: string,
  entityType: string,
  entityId: string | null,
  entityName: string | null,
  details: Record<string, unknown> | null,
  req: Request,
  severity: "info" | "warning" | "critical" = "info"
) {
  try {
    await storage.createAuditLog({
      userId: null, // TODO: Add user auth
      userName: "System",
      action,
      entityType,
      entityId,
      entityName,
      details: details ? JSON.stringify(details) : null,
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.get('user-agent') || null,
      severity,
    });
  } catch (error) {
    logger.error('Failed to create audit log', { action, entityType, error: error instanceof Error ? error.message : 'Unknown' });
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  
  // ==================== HEALTH CHECK ====================
  
  app.get("/health", (_req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get("/api/status", async (_req, res) => {
    try {
      const devices = await storage.getDevices();
      const firmwares = await storage.getFirmwares();
      const logs = await storage.getDeviceLogs();
      
      res.json({
        totalDevices: devices.length,
        onlineDevices: devices.filter(d => d.status === "online" || d.otaStatus === "updated").length,
        pendingUpdates: devices.filter(d => d.otaStatus === "pending").length,
        failedUpdates: devices.filter(d => d.otaStatus === "failed").length,
        totalFirmwares: firmwares.length,
        latestFirmware: firmwares[0]?.version || null,
        recentLogs: logs.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  // ==================== AUTHENTICATION ====================
  
  app.post("/api/auth/login", validateBody(loginSchema), async (req, res) => {
    try {
      const { username, password } = req.validatedBody as { username: string; password: string };
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        logger.warn('Failed login attempt', { username, ip: req.ip });
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      logger.info('User logged in', { userId: user.id, username });
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      logger.error('Login error', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/register", validateBody(registerSchema), async (req, res) => {
    try {
      const { username, password } = req.validatedBody as { username: string; password: string };
      const existingUser = await storage.getUserByUsername(username);
      
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const user = await storage.createUser({ username, password });
      logger.info('New user registered', { userId: user.id, username });
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      logger.error('Registration error', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // ==================== DEVICE ROUTES (Admin) ====================
  
  // GET all devices
  app.get("/api/devices", async (_req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });

  // GET single device
  app.get("/api/devices/:id", async (req, res) => {
    try {
      const device = await storage.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch device" });
    }
  });

  // POST create device
  app.post("/api/devices", validateBody(createDeviceSchema), async (req, res) => {
    try {
      const { name, macAddress, group, currentVersion, latitude, longitude, location } = req.validatedBody as { 
        name: string; 
        macAddress: string; 
        group: string;
        currentVersion?: string;
        latitude?: string;
        longitude?: string;
        location?: string;
      };

      const existingDevice = await storage.getDeviceByMac(macAddress);
      if (existingDevice) {
        return res.status(400).json({ error: "MAC address already registered" });
      }

      const device = await storage.createDevice({
        name,
        macAddress,
        group,
        currentVersion: currentVersion || "",
        previousVersion: "",
        targetVersion: "",
        otaStatus: "idle",
        status: "offline",
        latitude: latitude || null,
        longitude: longitude || null,
        location: location || null,
      });

      await storage.createDeviceLog({
        deviceId: device.id,
        macAddress: device.macAddress,
        action: "register",
        status: "success",
        message: `Device registered: ${name} (${macAddress})`,
      });

      // Audit log for device creation
      await createAuditLog("create", "device", device.id, name, { macAddress, group }, req, "info");

      otaLogger.register(device.id, macAddress, name);
      logger.info('Device created', { deviceId: device.id, macAddress, name });
      res.status(201).json(device);
    } catch (error) {
      logger.error('Device creation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Failed to register device" });
    }
  });

  // PUT update device
  app.put("/api/devices/:id", validateBody(updateDeviceSchema), async (req, res) => {
    try {
      const device = await storage.updateDevice(req.params.id, req.validatedBody);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      logger.info('Device updated', { deviceId: req.params.id });
      getWebSocketManager().broadcastDeviceUpdate(device);
      res.json(device);
    } catch (error) {
      logger.error('Device update failed', { error: error instanceof Error ? error.message : 'Unknown error', deviceId: req.params.id });
      res.status(500).json({ error: "Failed to update device" });
    }
  });

  // PUT update device location (convenience endpoint)
  app.put("/api/devices/:id/location", validateBody(updateDeviceLocationSchema), async (req, res) => {
    try {
      const idValidation = deviceIdSchema.safeParse(req.params.id);
      if (!idValidation.success) {
        return res.status(400).json({ error: "Invalid device ID format" });
      }

      const { latitude, longitude, location } = req.validatedBody as {
        latitude?: string;
        longitude?: string;
        location?: string;
      };

      const updates: any = {};
      if (latitude !== undefined) updates.latitude = latitude;
      if (longitude !== undefined) updates.longitude = longitude;
      if (location !== undefined) updates.location = location;
      const device = await storage.updateDevice(idValidation.data, updates);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      logger.info('Device location updated', { deviceId: idValidation.data, latitude, longitude, location });
      getWebSocketManager().broadcastDeviceUpdate(device);
      res.json(device);
    } catch (error) {
      logger.error('Device location update failed', { error: error instanceof Error ? error.message : 'Unknown error', deviceId: req.params.id });
      res.status(500).json({ error: "Failed to update device location" });
    }
  });

  // DELETE device (requires reason)
  app.delete("/api/devices/:id", validateBody(deleteDeviceSchema), async (req, res) => {
    try {
      const idValidation = deviceIdSchema.safeParse(req.params.id);
      if (!idValidation.success) {
        return res.status(400).json({ error: "Invalid device ID format" });
      }

      const { reason } = req.validatedBody as { reason: string };
      
      const device = await storage.getDevice(idValidation.data);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      
      await storage.deleteDevice(idValidation.data);
      
      // Create device log for deletion
      await storage.createDeviceLog({
        deviceId: idValidation.data,
        macAddress: device.macAddress,
        action: "delete",
        status: "success",
        fromVersion: device.currentVersion || null,
        toVersion: null,
        message: `Device deleted. Reason: ${reason}`,
      });
      
      // Audit log for device deletion with reason
      await createAuditLog(
        "delete", 
        "device", 
        idValidation.data, 
        device.name, 
        { 
          macAddress: device.macAddress,
          reason,
          deletedBy: "Admin",
          deviceGroup: device.group,
          lastVersion: device.currentVersion,
        }, 
        req, 
        "warning"
      );
      
      logger.info(`Device deleted: ${device.name} (${device.macAddress}). Reason: ${reason}`);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Failed to delete device', { deviceId: req.params.id, error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to delete device" });
    }
  });

  // ==================== FIRMWARE ROUTES (Admin) ====================
  
  // GET all firmware versions
  app.get("/api/firmware", async (_req, res) => {
    try {
      const firmwares = await storage.getFirmwares();
      res.json(firmwares);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch firmware" });
    }
  });

  // GET compare two firmware versions (must be before :version route)
  app.get("/api/firmware/diff", validateQuery(firmwareDiffQuerySchema), async (req, res) => {
    try {
      const { a: versionA, b: versionB } = req.validatedQuery as { a: string; b: string };

      const fwA = await storage.getFirmware(versionA);
      const fwB = await storage.getFirmware(versionB);

      if (!fwA || !fwB) {
        return res.status(404).json({ error: "One or both firmware versions not found" });
      }

      const filePathA = path.join(FIRMWARE_DIR, fwA.filename);
      const filePathB = path.join(FIRMWARE_DIR, fwB.filename);

      const resolvedA = path.resolve(filePathA);
      const resolvedB = path.resolve(filePathB);
      const firmwareRoot = path.resolve(FIRMWARE_DIR);
      if (!resolvedA.startsWith(firmwareRoot) || !resolvedB.startsWith(firmwareRoot)) {
        return res.status(400).json({ error: "Invalid firmware path" });
      }

      if (!fs.existsSync(filePathA) || !fs.existsSync(filePathB)) {
        return res.status(404).json({ error: "Firmware files not found on disk" });
      }

      const bufferA = fs.readFileSync(filePathA);
      const bufferB = fs.readFileSync(filePathB);

      const sizeDiff = bufferB.length - bufferA.length;
      
      // Simple byte-level diff analysis
      const changedRegions: Array<{ offset: number; length: number; type: 'added' | 'removed' | 'changed' }> = [];
      const minLen = Math.min(bufferA.length, bufferB.length);
      
      let inChange = false;
      let changeStart = 0;
      
      for (let i = 0; i < minLen; i++) {
        if (bufferA[i] !== bufferB[i]) {
          if (!inChange) {
            inChange = true;
            changeStart = i;
          }
        } else {
          if (inChange) {
            changedRegions.push({
              offset: changeStart,
              length: i - changeStart,
              type: 'changed'
            });
            inChange = false;
          }
        }
      }

      // Handle remaining change at end
      if (inChange) {
        changedRegions.push({
          offset: changeStart,
          length: minLen - changeStart,
          type: 'changed'
        });
      }

      // Handle size difference
      if (bufferB.length > bufferA.length) {
        changedRegions.push({
          offset: bufferA.length,
          length: bufferB.length - bufferA.length,
          type: 'added'
        });
      } else if (bufferA.length > bufferB.length) {
        changedRegions.push({
          offset: bufferB.length,
          length: bufferA.length - bufferB.length,
          type: 'removed'
        });
      }

      // Calculate added/removed bytes
      const addedBytes = changedRegions
        .filter(r => r.type === 'added')
        .reduce((sum, r) => sum + r.length, 0);
      const removedBytes = changedRegions
        .filter(r => r.type === 'removed')
        .reduce((sum, r) => sum + r.length, 0);

      logger.info('Firmware diff comparison', { versionA, versionB, sizeDiff, changedRegions: changedRegions.length });

      res.json({
        versionA,
        versionB,
        sizeDiff,
        addedBytes,
        removedBytes,
        changedRegions: changedRegions.slice(0, 100), // Limit to first 100 regions
      });
    } catch (error) {
      logger.error('Firmware diff failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Failed to compare firmware versions" });
    }
  });

  // GET single firmware
  app.get("/api/firmware/:version", async (req, res) => {
    try {
      const versionValidation = firmwareVersionSchema.safeParse(req.params.version);
      if (!versionValidation.success) {
        return res.status(400).json({ error: "Invalid version format" });
      }
      const fw = await storage.getFirmware(versionValidation.data);
      if (!fw) {
        return res.status(404).json({ error: "Firmware not found" });
      }
      res.json(fw);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch firmware" });
    }
  });

  // POST upload firmware
  app.post("/api/firmware/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Validate the body using Zod
      const validationResult = uploadFirmwareSchema.safeParse(req.body);
      if (!validationResult.success) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }

      const { version, description } = validationResult.data;

      const existingFw = await storage.getFirmware(version);
      if (existingFw) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Firmware version already exists" });
      }

      const checksum = calculateChecksum(req.file.path);
      const versionedFilename = `default_${version}.ino.bin`;
      const finalPath = path.join(FIRMWARE_DIR, versionedFilename);

      fs.renameSync(req.file.path, finalPath);

      const firmware = await storage.createFirmware({
        version,
        fileUrl: `/firmware/${versionedFilename}`,
        filename: versionedFilename,
        size: req.file.size,
        checksum,
        description: description || "",
      });

      // Audit log for firmware upload
      await createAuditLog("upload", "firmware", version, versionedFilename, { size: req.file.size, checksum }, req, "info");

      otaLogger.firmwareUpload(version, versionedFilename, req.file.size, checksum);
      logger.info('Firmware uploaded', { version, filename: versionedFilename, size: req.file.size });
      res.status(201).json(firmware);
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          logger.error('Failed to clean up temp file', { error: unlinkError instanceof Error ? unlinkError.message : 'Unknown error' });
        }
      }
      logger.error('Firmware upload failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Failed to upload firmware" });
    }
  });

  // DELETE firmware
  app.delete("/api/firmware/:version", async (req, res) => {
    try {
      const versionValidation = firmwareVersionSchema.safeParse(req.params.version);
      if (!versionValidation.success) {
        return res.status(400).json({ error: "Invalid version format" });
      }

      const version = versionValidation.data;
      const fw = await storage.getFirmware(version);
      if (fw) {
        const filePath = path.join(FIRMWARE_DIR, fw.filename);
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(path.resolve(FIRMWARE_DIR))) {
          return res.status(400).json({ error: "Invalid firmware path" });
        }

        if (fs.existsSync(resolvedPath)) fs.unlinkSync(resolvedPath);
        otaLogger.firmwareDelete(version);
        
        // Audit log for firmware deletion
        await createAuditLog("delete", "firmware", version, fw.filename, { size: fw.size }, req, "warning");
      }
      await storage.deleteFirmware(version);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete firmware" });
    }
  });

  // ==================== DEPLOYMENT ROUTES (Admin) ====================
  
  // POST deploy firmware to devices - uses update queue to prevent concurrent updates
  app.post("/api/deploy", validateBody(deploySchema), async (req, res) => {
    try {
      const { deviceIds, version } = req.validatedBody as { deviceIds: string[]; version: string };

      const firmware = await storage.getFirmware(version);
      if (!firmware) {
        return res.status(404).json({ error: "Firmware version not found" });
      }

      const results: { deviceId: string; mac: string; status: string; message: string }[] = [];

      for (const macAddress of deviceIds) {
        try {
          const device = await storage.getDeviceByMac(macAddress);
          
          if (!device) {
            results.push({ deviceId: "", mac: macAddress, status: "failed", message: "Device not found" });
            continue;
          }

          // Check if device is already being updated
          if (updateQueue.isDeviceUpdating(macAddress)) {
            results.push({ 
              deviceId: device.id, 
              mac: macAddress, 
              status: "failed", 
              message: "Device is already being updated" 
            });
            continue;
          }

          // Queue the update with transaction rollback support
          await updateQueue.queueUpdate({
            deviceId: device.id,
            macAddress,
            version
          });

          results.push({ 
            deviceId: device.id, 
            mac: macAddress, 
            status: "queued", 
            message: `Update to ${version} queued successfully` 
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Failed to queue update', { macAddress, version, error: errorMessage });
          results.push({ 
            deviceId: "", 
            mac: macAddress, 
            status: "failed", 
            message: errorMessage 
          });
        }
      }

      otaLogger.deploy(deviceIds, version);
      logger.info('Deployment initiated', { deviceCount: deviceIds.length, version, queueStatus: updateQueue.getQueueStatus() });
      
      // Audit log for deployment
      const successCount = results.filter(r => r.status === "queued").length;
      await createAuditLog("deploy", "deployment", version, `Deploy v${version}`, 
        { deviceCount: deviceIds.length, successCount, version }, req, "info");
      
      res.json({ 
        success: true, 
        results,
        queueStatus: updateQueue.getQueueStatus()
      });
    } catch (error) {
      logger.error('Deployment failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Failed to create deployment" });
    }
  });

  // POST reset OTA state for devices
  app.post("/api/reset", validateBody(resetSchema), async (req, res) => {
    try {
      const { deviceIds } = req.validatedBody as { deviceIds: string[] };

      const results: { mac: string; status: string; message: string }[] = [];

      for (const macAddress of deviceIds) {
        try {
          const device = await storage.getDeviceByMac(macAddress);
          if (!device) {
            results.push({ mac: macAddress, status: "failed", message: "Device not found" });
            continue;
          }

          // Atomic update with proper error handling
          await storage.updateDeviceByMac(macAddress, {
            targetVersion: "",
            otaStatus: "idle",
            lastOtaCheck: new Date(),
          });

          await storage.createDeviceLog({
            deviceId: device.id,
            macAddress: device.macAddress,
            action: "reset",
            status: "success",
            message: "OTA state reset",
          });

          results.push({ mac: macAddress, status: "reset", message: "OTA state reset" });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.error('Reset failed', { macAddress, error: errorMessage });
          results.push({ mac: macAddress, status: "failed", message: errorMessage });
        }
      }

      otaLogger.reset(deviceIds);
      logger.info('OTA state reset', { deviceCount: deviceIds.length });
      res.json({ success: true, results });
    } catch (error) {
      logger.error('Reset operation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Failed to reset OTA state" });
    }
  });

  // POST rollback device to previous version
  app.post("/api/rollback/:macAddress", async (req, res) => {
    try {
      const validationResult = macAddressSchema.safeParse(req.params.macAddress);
      if (!validationResult.success) {
        return res.status(400).json({ error: "Invalid MAC address format" });
      }
      
      const macAddress = validationResult.data;
      const device = await storage.getDeviceByMac(macAddress);

      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }

      if (!device.previousVersion || device.previousVersion === device.currentVersion) {
        return res.status(400).json({ error: "No different previous version available for rollback" });
      }

      // Atomic update for rollback
      await storage.updateDeviceByMac(macAddress, {
        targetVersion: device.previousVersion,
        otaStatus: "pending",
      });

      await storage.createDeviceLog({
        deviceId: device.id,
        macAddress: device.macAddress,
        action: "rollback",
        status: "pending",
        fromVersion: device.currentVersion || undefined,
        toVersion: device.previousVersion,
        message: `Rollback scheduled: ${device.currentVersion} → ${device.previousVersion}`,
      });

      otaLogger.rollback(macAddress, device.currentVersion || "", device.previousVersion);
      logger.info('Rollback scheduled', { macAddress, from: device.currentVersion, to: device.previousVersion });
      res.json({ success: true, message: `Rollback to ${device.previousVersion} scheduled` });
    } catch (error) {
      logger.error('Rollback failed', { error: error instanceof Error ? error.message : 'Unknown error', macAddress: req.params.macAddress });
      res.status(500).json({ error: "Failed to schedule rollback" });
    }
  });

  // GET queue status
  app.get("/api/queue/status", (_req, res) => {
    try {
      const status = updateQueue.getQueueStatus();
      res.json(status);
    } catch (error) {
      logger.error('Failed to get queue status', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Failed to get queue status" });
    }
  });

  // ==================== OTA DEVICE ENDPOINTS (ESP32 calls these) ====================
  
  // GET /ota/check - Device checks for updates (uses MAC as deviceId)
  app.get("/ota/check", otaCheckLimiter, validateQuery(otaCheckSchema), async (req: Request, res: Response) => {
    try {
      const { deviceId, version } = req.validatedQuery as { deviceId: string; version?: string };

      const device = await storage.getDeviceByMac(deviceId);
      if (!device) {
        logger.warn('Unregistered device check', { deviceId, ip: req.ip });
        return res.status(404).json({ updateAvailable: false, error: "Device not registered" });
      }

      // Update current version and last check timestamp
      const updateData: any = { 
        lastOtaCheck: new Date(),
        status: "online"
      };
      
      if (version) {
        updateData.currentVersion = version;
      }

      await storage.updateDeviceByMac(deviceId, updateData);

      // Refresh device object after update
      const updatedDevice = await storage.getDeviceByMac(deviceId);
      if (!updatedDevice) return res.status(404).json({ updateAvailable: false, error: "Device not found" });
      
      getWebSocketManager().broadcastDeviceUpdate(updatedDevice);

      // Check if update is available
      const hasUpdate = updatedDevice.targetVersion && 
                        updatedDevice.targetVersion !== "" && 
                        updatedDevice.targetVersion !== updatedDevice.currentVersion;

      if (!hasUpdate) {
        await storage.createDeviceLog({
          deviceId: updatedDevice.id,
          macAddress: updatedDevice.macAddress,
          action: "report",
          status: "updated",
          message: "Device already updated",
        });

        // Also update the device's otaStatus to 'updated' since they are on the same version
        const updatedDeviceAlready = await storage.updateDeviceByMac(deviceId, { otaStatus: "updated" });
        if (updatedDeviceAlready) getWebSocketManager().broadcastDeviceUpdate(updatedDeviceAlready);

        otaLogger.check(deviceId, updatedDevice.currentVersion || "", updatedDevice.targetVersion || null, false);
        return res.json({ updateAvailable: false, currentVersion: updatedDevice.currentVersion || "" });
      }

      const fw = await storage.getFirmware(updatedDevice.targetVersion!);
      if (!fw) {
        logger.error('Target firmware not found', { deviceId, targetVersion: updatedDevice.targetVersion });
        return res.json({ updateAvailable: false, error: "Target firmware not found" });
      }

      // Atomic update to "updating" status
      const updatingDevice = await storage.updateDeviceByMac(deviceId, { otaStatus: "updating" });
      if (updatingDevice) getWebSocketManager().broadcastDeviceUpdate(updatingDevice);

      await storage.createDeviceLog({
        deviceId: updatedDevice.id,
        macAddress: updatedDevice.macAddress,
        action: "check",
        status: "success",
        fromVersion: updatedDevice.currentVersion || undefined,
        toVersion: updatedDevice.targetVersion!,
        message: `Update available: ${updatedDevice.currentVersion || 'none'} → ${updatedDevice.targetVersion}`,
      });

      otaLogger.check(deviceId, updatedDevice.currentVersion || "", updatedDevice.targetVersion!, true);

      const baseUrl = getBaseUrl(req);
      const downloadUrl = `${baseUrl}/api/firmware/${fw.id}/download`;

      // Log the check before redirecting
      otaLogger.check(deviceId, updatedDevice.currentVersion || "", updatedDevice.targetVersion!, true);

      return res.redirect(downloadUrl);
    } catch (error) {
      logger.error('OTA check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ updateAvailable: false, error: "Internal server error" });
    }
  });

  // POST /ota/report - Device reports update result
  app.post("/ota/report", validateBody(otaReportSchema), async (req: Request, res: Response) => {
    try {
      const { deviceId, status, version, message } = req.validatedBody as { 
        deviceId: string; 
        status: "success" | "failed" | "updated"; 
        version?: string;
        message?: string;
      };

      const device = await storage.getDeviceByMac(deviceId);
      if (!device) {
        logger.warn('Report from unregistered device', { deviceId, ip: req.ip });
        return res.status(404).json({ error: "Device not registered" });
      }

      const isSuccess = status === "success" || status === "updated";
      const finalVersion = version || device.targetVersion;

      if (isSuccess && finalVersion) {
        // Atomic update - success case
        const successDevice = await storage.updateDeviceByMac(deviceId, {
          currentVersion: finalVersion,
          otaStatus: "updated",
          lastOtaCheck: new Date(),
          status: "online"
        });
        if (successDevice) getWebSocketManager().broadcastDeviceUpdate(successDevice);

        await storage.createDeviceLog({
          deviceId: device.id,
          macAddress: device.macAddress,
          action: "report",
          status: "success",
          fromVersion: device.currentVersion || undefined,
          toVersion: finalVersion,
          message: message || `Updated to ${finalVersion}`,
        });

        otaLogger.report(deviceId, true, finalVersion, message);
        logger.info('Device update successful', { deviceId, version: finalVersion });
      } else {
        // Atomic update - failure case
        const failedDevice = await storage.updateDeviceByMac(deviceId, {
          otaStatus: "failed",
          lastOtaCheck: new Date(),
          status: "online"
        });
        if (failedDevice) getWebSocketManager().broadcastDeviceUpdate(failedDevice);

        await storage.createDeviceLog({
          deviceId: device.id,
          macAddress: device.macAddress,
          action: "report",
          status: "failed",
          fromVersion: device.currentVersion || undefined,
          toVersion: device.targetVersion || undefined,
          message: message || "Update failed",
        });

        otaLogger.report(deviceId, false, device.targetVersion || "", message);
        logger.warn('Device update failed', { deviceId, targetVersion: device.targetVersion, message });
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('OTA report processing failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Failed to process report" });
    }
  });

  // POST /ota/progress - Device reports download/install progress
  app.post("/ota/progress", validateBody(otaProgressSchema), async (req: Request, res: Response) => {
    try {
      const { deviceId, progress, bytesReceived, totalBytes } = req.validatedBody as {
        deviceId: string;
        progress: number;
        bytesReceived?: number;
        totalBytes?: number;
      };

      const device = await storage.getDeviceByMac(deviceId);
      if (!device) {
        return res.status(404).json({ error: "Device not registered" });
      }

      // Broadcast progress to all connected WebSocket clients
      const wsManager = getWebSocketManager();
      wsManager.broadcastProgress({
        macAddress: deviceId,
        deviceId: device.id,
        progress,
        bytesReceived,
        totalBytes,
      });

      logger.debug('OTA progress update', { deviceId, progress, bytesReceived, totalBytes });
      res.json({ success: true });
    } catch (error) {
      logger.error('OTA progress update failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Failed to process progress update" });
    }
  });

  // GET /ota/update - One-step OTA: check + stream firmware
  app.get("/ota/update", otaCheckLimiter, async (req: Request, res: Response) => {
    try {
      const { deviceId, version: currentVersion } = req.query;

      if (!deviceId || typeof deviceId !== 'string') {
        return res.status(400).json({ error: "deviceId is required" });
      }

      // Validate MAC address format
      const macValidation = macAddressSchema.safeParse(deviceId);
      if (!macValidation.success) {
        return res.status(400).json({ error: "Invalid deviceId format" });
      }

      const device = await storage.getDeviceByMac(macValidation.data);
      if (!device) {
        logger.warn('Unregistered device OTA update request', { deviceId, ip: req.ip });
        return res.status(404).json({ error: "Device not registered" });
      }

      // Atomic update with version and timestamp
      if (currentVersion && typeof currentVersion === 'string') {
        await storage.updateDeviceByMac(macValidation.data, { 
          currentVersion,
          lastOtaCheck: new Date(),
          status: "online"
        });
      } else {
        await storage.updateDeviceByMac(macValidation.data, { 
          lastOtaCheck: new Date(),
          status: "online"
        });
      }

      const deviceCurrentVersion = (currentVersion as string) || device.currentVersion || "";
      const hasUpdate = device.targetVersion && 
                        device.targetVersion !== "" && 
                        device.targetVersion !== deviceCurrentVersion;

      if (!hasUpdate) {
        otaLogger.check(macValidation.data, deviceCurrentVersion, device.targetVersion || null, false);
        return res.status(304).send();
      }

      const fw = await storage.getFirmware(device.targetVersion!);
      if (!fw) {
        logger.error('Target firmware not found for streaming', { deviceId, targetVersion: device.targetVersion });
        return res.status(404).json({ error: "Target firmware not found" });
      }

      const filePath = path.join(FIRMWARE_DIR, fw.filename);
      if (!fs.existsSync(filePath)) {
        logger.error('Firmware file missing for streaming', { filename: fw.filename });
        return res.status(404).json({ error: "Firmware file not found" });
      }

      // Atomic update to "updating" status
      await storage.updateDeviceByMac(macValidation.data, { otaStatus: "updating" });

      otaLogger.downloadStart(macValidation.data, device.targetVersion!, fw.size);
      
      await storage.createDeviceLog({
        deviceId: device.id,
        macAddress: device.macAddress,
        action: "download",
        status: "pending",
        fromVersion: deviceCurrentVersion || undefined,
        toVersion: device.targetVersion!,
        message: `Streaming firmware: ${deviceCurrentVersion || 'none'} → ${device.targetVersion}`,
      });

      await storage.incrementFirmwareDownloadCount(fw.filename);

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fw.filename}"`);
      res.setHeader('Content-Length', fw.size.toString());
      res.setHeader('X-Firmware-Version', device.targetVersion!);
      res.setHeader('X-Checksum', fw.checksum);

      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on('end', async () => {
        otaLogger.downloadComplete(macValidation.data, device.targetVersion!);
        logger.info('Firmware streaming completed', { deviceId: macValidation.data, version: device.targetVersion });
        try {
          await storage.createDeviceLog({
            deviceId: device.id,
            macAddress: device.macAddress,
            action: "download",
            status: "success",
            toVersion: device.targetVersion!,
            message: "Firmware streamed successfully",
          });
        } catch (logError) {
          logger.error('Failed to log download success', { error: logError instanceof Error ? logError.message : 'Unknown error' });
        }
      });

      fileStream.on('error', async (error) => {
        otaLogger.downloadFailed(macValidation.data, device.targetVersion!, error.message);
        logger.error('Firmware streaming failed', { deviceId: macValidation.data, error: error.message });
        try {
          await storage.createDeviceLog({
            deviceId: device.id,
            macAddress: device.macAddress,
            action: "download",
            status: "failed",
            toVersion: device.targetVersion!,
            message: `Download failed: ${error.message}`,
          });
        } catch (logError) {
          logger.error('Failed to log download error', { error: logError instanceof Error ? logError.message : 'Unknown error' });
        }
      });

      fileStream.pipe(res);
    } catch (error) {
      logger.error('OTA update endpoint error', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== DEVICE LOGS ROUTES ====================
  
  // GET all activity logs
  app.get("/api/logs", async (req, res) => {
    try {
      const { deviceId } = req.query;
      const logs = await storage.getDeviceLogs(deviceId as string | undefined);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // POST clear all logs
  app.post("/api/logs/clear", async (_req, res) => {
    try {
      await storage.clearAllLogs();
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to clear logs', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Failed to clear logs" });
    }
  });

  // ==================== SYSTEM LOG FILE ROUTES ====================
  
  app.get("/api/logs/:type/view", (req, res) => {
    try {
      const { type } = req.params;
      const validTypes = ["ota", "error", "combined"];
      
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: "Invalid log type" });
      }

      const logPath = LOG_PATHS[type as keyof typeof LOG_PATHS];
      
      if (!fs.existsSync(logPath)) {
        return res.json({ content: "", message: "Log file is empty" });
      }

      const content = fs.readFileSync(logPath, "utf-8");
      const lines = content.split("\n").filter(Boolean);
      
      const formattedLogs = lines.map(line => {
        try { return JSON.parse(line); } 
        catch { return { raw: line }; }
      });

      res.json({ type, count: formattedLogs.length, logs: formattedLogs.slice(-500) });
    } catch (error) {
      res.status(500).json({ error: "Failed to read log file" });
    }
  });

  app.get("/api/logs/:type/download", (req, res) => {
    try {
      const { type } = req.params;
      const validTypes = ["ota", "error", "combined"];
      
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: "Invalid log type" });
      }

      const logPath = LOG_PATHS[type as keyof typeof LOG_PATHS];
      
      if (!fs.existsSync(logPath)) {
        return res.status(404).json({ error: "Log file not found" });
      }

      res.download(logPath, `${type}-${new Date().toISOString().split("T")[0]}.log`);
    } catch (error) {
      res.status(500).json({ error: "Failed to download log file" });
    }
  });

  app.delete("/api/logs/:type", (req, res) => {
    try {
      const { type } = req.params;
      const validTypes = ["ota", "error", "combined"];
      
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: "Invalid log type" });
      }

      const logPath = LOG_PATHS[type as keyof typeof LOG_PATHS];
      fs.writeFileSync(logPath, "");
      
      logger.info(`Log file cleared: ${type}`);
      res.json({ success: true, message: `${type} log cleared` });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear log file" });
    }
  });

  app.get("/api/logs/stats", (_req, res) => {
    try {
      const stats: { [key: string]: { size: number; lines: number; modified: Date | null } } = {};
      
      for (const [type, logPath] of Object.entries(LOG_PATHS)) {
        if (fs.existsSync(logPath)) {
          const fileStat = fs.statSync(logPath);
          const content = fs.readFileSync(logPath, "utf-8");
          const lines = content.split("\n").filter(Boolean).length;
          stats[type] = { size: fileStat.size, lines, modified: fileStat.mtime };
        } else {
          stats[type] = { size: 0, lines: 0, modified: null };
        }
      }
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get log stats" });
    }
  });

  // ==================== FIRMWARE FILE DOWNLOAD ====================

  // Download by firmware ID (for admin/Postman testing)
  app.get("/api/firmware/:id/download", downloadLimiter, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid firmware ID" });
      }

      const fw = await storage.getFirmwareById(id);
      if (!fw) {
        return res.status(404).json({ error: "Firmware not found" });
      }

      const filePath = path.join(FIRMWARE_DIR, fw.filename);
      if (!fs.existsSync(filePath)) {
        logger.error('Firmware file missing', { firmwareId: id, filename: fw.filename });
        return res.status(404).json({ error: "Firmware file not found on disk" });
      }

      await storage.incrementFirmwareDownloadCount(fw.filename);
      logger.info('Firmware download', { firmwareId: id, version: fw.version, filename: fw.filename });

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fw.filename}"`);
      res.setHeader('Content-Length', fw.size.toString());
      res.setHeader('X-Firmware-Version', fw.version);
      res.setHeader('X-Checksum', fw.checksum);
      res.download(filePath);
    } catch (error) {
      logger.error('Firmware download failed', { error: error instanceof Error ? error.message : 'Unknown error', firmwareId: req.params.id });
      res.status(500).json({ error: "Failed to download firmware" });
    }
  });

  // Download by filename (for ESP32 devices)
  app.get("/firmware/:filename", downloadLimiter, async (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(FIRMWARE_DIR, filename);

      // Security: prevent directory traversal
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(path.resolve(FIRMWARE_DIR))) {
        logger.warn('Directory traversal attempt', { filename, ip: req.ip });
        return res.status(403).json({ error: "Forbidden" });
      }

      if (!fs.existsSync(filePath)) {
        logger.warn('Firmware file not found', { filename });
        return res.status(404).json({ error: "Firmware file not found" });
      }

      await storage.incrementFirmwareDownloadCount(filename);
      logger.info('Firmware file download', { filename, ip: req.ip });

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.download(filePath);
    } catch (error) {
      logger.error('Firmware file download failed', { error: error instanceof Error ? error.message : 'Unknown error', filename: req.params.filename });
      res.status(500).json({ error: "Failed to download firmware" });
    }
  });

  // ==================== STAGED ROLLOUTS ====================

  // GET all staged rollouts
  app.get("/api/rollouts", async (_req, res) => {
    try {
      const rollouts = await storage.getStagedRollouts();
      res.json(rollouts);
    } catch (error) {
      logger.error('Failed to fetch rollouts', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to fetch rollouts" });
    }
  });

  // POST create staged rollout
  app.post("/api/rollouts", async (req, res) => {
    try {
      const { version, stagePercentages, autoExpand, expandAfterMinutes, failureThreshold } = req.body;
      
      const fw = await storage.getFirmware(version);
      if (!fw) {
        return res.status(404).json({ error: "Firmware version not found" });
      }

      const devices = await storage.getDevices();
      const totalDevices = devices.length;

      // Create rollout in database
      const rollout = await storage.createStagedRollout({
        version,
        currentStage: 1,
        stagePercentages: JSON.stringify(stagePercentages || [5, 25, 50, 100]),
        status: "active",
        totalDevices,
        updatedDevices: 0,
        failedDevices: 0,
        autoExpand: autoExpand ? 1 : 0,
        expandAfterMinutes: expandAfterMinutes || 30,
        failureThreshold: failureThreshold || 10,
        lastExpanded: new Date(),
      });

      // Deploy to first stage (5% of devices)
      const stages = stagePercentages || [5, 25, 50, 100];
      const firstStagePercent = stages[0] || 5;
      const devicesToUpdate = Math.max(1, Math.ceil((totalDevices * firstStagePercent) / 100));
      const selectedDevices = devices.slice(0, devicesToUpdate);

      for (const device of selectedDevices) {
        try {
          await updateQueue.queueUpdate({
            deviceId: device.id,
            macAddress: device.macAddress,
            version,
          });
        } catch (err) {
          // Continue with other devices
        }
      }

      logger.info('Staged rollout created', { version, totalDevices, firstStageDevices: devicesToUpdate });
      res.status(201).json(rollout);
    } catch (error) {
      logger.error('Staged rollout creation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Failed to create staged rollout" });
    }
  });

  // POST advance rollout to next stage
  app.post("/api/rollouts/:id/advance", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const rollout = await storage.getStagedRollout(id);
      
      if (!rollout) {
        return res.status(404).json({ error: "Rollout not found" });
      }

      const stages = JSON.parse(rollout.stagePercentages || "[5, 25, 50, 100]");
      const nextStage = (rollout.currentStage || 1) + 1;

      if (nextStage > stages.length) {
        return res.status(400).json({ error: "Rollout already at final stage" });
      }

      // Update rollout stage
      const updated = await storage.updateStagedRollout(id, {
        currentStage: nextStage,
        lastExpanded: new Date(),
        status: nextStage === stages.length ? "completing" : "active",
      });

      // Deploy to additional devices
      const devices = await storage.getDevices();
      const prevPercent = stages[nextStage - 2] || 0;
      const newPercent = stages[nextStage - 1] || 100;
      const prevCount = Math.ceil((devices.length * prevPercent) / 100);
      const newCount = Math.ceil((devices.length * newPercent) / 100);
      const additionalDevices = devices.slice(prevCount, newCount);

      for (const device of additionalDevices) {
        try {
          await updateQueue.queueUpdate({
            deviceId: device.id,
            macAddress: device.macAddress,
            version: rollout.version,
          });
        } catch (err) {
          // Continue
        }
      }

      logger.info('Rollout advanced', { id, stage: nextStage, additionalDevices: additionalDevices.length });
      res.json(updated);
    } catch (error) {
      logger.error('Failed to advance rollout', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to advance rollout" });
    }
  });

  // POST pause rollout
  app.post("/api/rollouts/:id/pause", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateStagedRollout(id, { status: "paused" });
      if (!updated) {
        return res.status(404).json({ error: "Rollout not found" });
      }
      logger.info('Rollout paused', { id });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to pause rollout" });
    }
  });

  // POST resume rollout
  app.post("/api/rollouts/:id/resume", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateStagedRollout(id, { status: "active" });
      if (!updated) {
        return res.status(404).json({ error: "Rollout not found" });
      }
      logger.info('Rollout resumed', { id });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to resume rollout" });
    }
  });

  // DELETE cancel rollout
  app.delete("/api/rollouts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStagedRollout(id);
      logger.info('Rollout cancelled', { id });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel rollout" });
    }
  });

  // ==================== ANALYTICS ====================

  // GET deployment analytics
  app.get("/api/analytics/deployments", async (req, res) => {
    try {
      const logs = await storage.getDeviceLogs();
      const version = req.query.version as string | undefined;

      const deployLogs = logs.filter(l => 
        (l.action === "deploy" || l.action === "report") &&
        (!version || l.toVersion === version)
      );

      const successCount = deployLogs.filter(l => 
        l.status === "success" || l.status === "updated" || l.status === "completed"
      ).length;
      const failureCount = deployLogs.filter(l => l.status === "failed").length;

      const analytics = [{
        id: 1,
        version: version || "all",
        totalAttempts: deployLogs.length,
        successCount,
        failureCount,
        avgUpdateTimeMs: null,
        minUpdateTimeMs: null,
        maxUpdateTimeMs: null,
        avgDownloadBytes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }];

      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deployment analytics" });
    }
  });

  // GET device health overview
  app.get("/api/analytics/health", async (_req, res) => {
    try {
      const devices = await storage.getDevices();
      
      const devicesWithHealth = devices.map(d => ({
        ...d,
        healthScore: d.healthScore ?? 100,
      }));

      const avgHealthScore = devicesWithHealth.reduce((sum, d) => sum + (d.healthScore || 0), 0) / devices.length || 0;
      const criticalCount = devicesWithHealth.filter(d => (d.healthScore || 0) < 30).length;

      res.json({
        devices: devicesWithHealth,
        avgHealthScore: Math.round(avgHealthScore),
        criticalCount,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch device health" });
    }
  });

  // GET fleet overview
  app.get("/api/analytics/fleet", async (_req, res) => {
    try {
      const devices = await storage.getDevices();
      const logs = await storage.getDeviceLogs();

      const onlineDevices = devices.filter(d => d.status === "online" || d.otaStatus === "updated").length;
      const avgHealthScore = devices.reduce((sum, d) => sum + (d.healthScore || 100), 0) / devices.length || 0;
      const avgSignalStrength = devices.reduce((sum, d) => sum + (d.signalStrength || -70), 0) / devices.length || -70;

      // Group by group field
      const devicesByGroup: Record<string, number> = {};
      devices.forEach(d => {
        const group = d.group || "default";
        devicesByGroup[group] = (devicesByGroup[group] || 0) + 1;
      });

      // Group by status
      const devicesByStatus: Record<string, number> = {};
      devices.forEach(d => {
        const status = d.otaStatus || "idle";
        devicesByStatus[status] = (devicesByStatus[status] || 0) + 1;
      });

      // Recent failures (last 24 hours)
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentFailures = logs.filter(l => 
        l.status === "failed" && new Date(l.createdAt).getTime() > oneDayAgo
      ).length;

      res.json({
        totalDevices: devices.length,
        onlineDevices,
        avgHealthScore: Math.round(avgHealthScore),
        avgSignalStrength: Math.round(avgSignalStrength),
        devicesByGroup,
        devicesByStatus,
        recentFailures,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fleet overview" });
    }
  });

  // GET heartbeat history for a device
  app.get("/api/analytics/heartbeats/:macAddress", async (req, res) => {
    try {
      const macAddress = req.params.macAddress;
      const hours = parseInt(req.query.hours as string) || 24;
      const heartbeats = await storage.getDeviceHeartbeats(macAddress, hours);
      res.json(heartbeats);
    } catch (error) {
      logger.error('Failed to fetch heartbeat history', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to fetch heartbeat history" });
    }
  });

  // ==================== AUDIT TRAIL & COMPLIANCE ====================

  // GET audit logs with filters
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const filters: { action?: string; entityType?: string; startDate?: Date; endDate?: Date; limit?: number } = {};
      
      if (req.query.action) filters.action = req.query.action as string;
      if (req.query.entityType) filters.entityType = req.query.entityType as string;
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      if (req.query.limit) filters.limit = parseInt(req.query.limit as string);
      
      const logs = await storage.getAuditLogs(filters);
      res.json(logs);
    } catch (error) {
      logger.error('Failed to fetch audit logs', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  });

  // GET audit log statistics
  app.get("/api/audit-logs/stats", async (_req, res) => {
    try {
      const stats = await storage.getAuditLogStats();
      res.json(stats);
    } catch (error) {
      logger.error('Failed to fetch audit log stats', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to fetch audit log stats" });
    }
  });

  // Export audit logs as CSV
  app.get("/api/audit-logs/export/csv", async (req, res) => {
    try {
      const filters: { startDate?: Date; endDate?: Date; limit?: number } = {};
      if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
      if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
      filters.limit = 10000; // Max export limit
      
      const logs = await storage.getAuditLogs(filters);
      
      // Generate CSV
      const headers = ['ID', 'Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Entity Name', 'Severity', 'Details', 'IP Address'];
      const csvRows = [headers.join(',')];
      
      logs.forEach(log => {
        const row = [
          log.id,
          log.createdAt ? new Date(log.createdAt).toISOString() : '',
          log.userName || 'System',
          log.action,
          log.entityType,
          log.entityId || '',
          (log.entityName || '').replace(/,/g, ';'),
          log.severity || 'info',
          (log.details || '').replace(/,/g, ';').replace(/\n/g, ' '),
          log.ipAddress || ''
        ];
        csvRows.push(row.join(','));
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csvRows.join('\n'));
    } catch (error) {
      logger.error('Failed to export audit logs', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to export audit logs" });
    }
  });

  // ==================== DEVICE HEARTBEAT ====================

  // POST device heartbeat (from ESP32)
  app.post("/ota/heartbeat", async (req, res) => {
    try {
      const { mac, signalStrength, freeHeap, uptime, cpuTemp } = req.body;

      if (!mac) {
        return res.status(400).json({ error: "MAC address required" });
      }

      const normalizedMac = mac.replace(/[:-]/g, "").toUpperCase();
      const device = await storage.getDeviceByMac(normalizedMac);

      // Store heartbeat in history table
      try {
        await storage.createDeviceHeartbeat({
          macAddress: normalizedMac,
          signalStrength: signalStrength ?? null,
          freeHeap: freeHeap ?? null,
          uptime: uptime ?? null,
          cpuTemp: cpuTemp ?? null,
        });
      } catch (err) {
        // Log but don't fail the request
        logger.warn('Failed to store heartbeat history', { mac: normalizedMac, error: err instanceof Error ? err.message : 'Unknown' });
      }

      if (device) {
        // Calculate health score based on metrics
        let healthScore = 100;
        
        // Signal strength impact (-30 to -90 dBm typical)
        if (signalStrength) {
          if (signalStrength < -80) healthScore -= 30;
          else if (signalStrength < -70) healthScore -= 15;
          else if (signalStrength < -60) healthScore -= 5;
        }

        // Free heap impact (< 10KB is critical)
        if (freeHeap) {
          if (freeHeap < 10000) healthScore -= 40;
          else if (freeHeap < 20000) healthScore -= 20;
          else if (freeHeap < 30000) healthScore -= 10;
        }

        // Update device with health metrics
        await storage.updateDevice(device.id, {
          status: "online",
          lastSeen: new Date(),
          lastHeartbeat: new Date(),
          signalStrength,
          freeHeap,
          uptime,
          healthScore: Math.max(0, healthScore),
          consecutiveFailures: 0, // Reset on successful heartbeat
        });

        // Broadcast update
        const wsManager = getWebSocketManager();
        const updatedDevice = await storage.getDevice(device.id);
        if (updatedDevice) {
          wsManager.broadcastDeviceUpdate(updatedDevice);
          // Also broadcast as serial log
          wsManager.broadcastDeviceLog({
            mac: normalizedMac,
            level: "info",
            message: `Heartbeat: RSSI=${signalStrength}dBm, Heap=${freeHeap}B, Uptime=${uptime}s`,
            source: "heartbeat",
          });
        }
      }

      res.json({ success: true });
    } catch (error) {
      logger.error('Heartbeat processing failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      res.status(500).json({ error: "Failed to process heartbeat" });
    }
  });

  // ==================== WEBHOOKS API ====================

  // GET all webhooks
  app.get("/api/webhooks", async (_req, res) => {
    try {
      const hooks = await storage.getWebhooks();
      res.json(hooks);
    } catch (error) {
      logger.error('Failed to get webhooks', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to fetch webhooks" });
    }
  });

  // GET single webhook
  app.get("/api/webhooks/:id", async (req, res) => {
    try {
      const webhook = await storage.getWebhook(parseInt(req.params.id));
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }
      res.json(webhook);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch webhook" });
    }
  });

  // POST create webhook
  app.post("/api/webhooks", async (req, res) => {
    try {
      const { name, url, secret, events, isActive } = req.body;
      
      if (!name || !url) {
        return res.status(400).json({ error: "Name and URL are required" });
      }

      const webhook = await storage.createWebhook({
        name,
        url,
        secret: secret || null,
        events: JSON.stringify(events || ["*"]),
        isActive: isActive !== false ? 1 : 0,
      });

      await createAuditLog("create", "webhook", String(webhook.id), name, { url, events }, req, "info");
      res.status(201).json(webhook);
    } catch (error) {
      logger.error('Failed to create webhook', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to create webhook" });
    }
  });

  // PUT update webhook
  app.put("/api/webhooks/:id", async (req, res) => {
    try {
      const { name, url, secret, events, isActive } = req.body;
      const updates: any = {};

      if (name !== undefined) updates.name = name;
      if (url !== undefined) updates.url = url;
      if (secret !== undefined) updates.secret = secret;
      if (events !== undefined) updates.events = JSON.stringify(events);
      if (isActive !== undefined) updates.isActive = isActive ? 1 : 0;

      const webhook = await storage.updateWebhook(parseInt(req.params.id), updates);
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      await createAuditLog("update", "webhook", req.params.id, webhook.name, updates, req, "info");
      res.json(webhook);
    } catch (error) {
      res.status(500).json({ error: "Failed to update webhook" });
    }
  });

  // DELETE webhook
  app.delete("/api/webhooks/:id", async (req, res) => {
    try {
      const webhook = await storage.getWebhook(parseInt(req.params.id));
      if (!webhook) {
        return res.status(404).json({ error: "Webhook not found" });
      }

      await storage.deleteWebhook(parseInt(req.params.id));
      await createAuditLog("delete", "webhook", req.params.id, webhook.name, null, req, "warning");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete webhook" });
    }
  });

  // POST test webhook
  app.post("/api/webhooks/:id/test", async (req, res) => {
    try {
      const result = await testWebhook(parseInt(req.params.id));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to test webhook" });
    }
  });

  // ==================== DEVICE CONFIG API ====================

  // GET all configs with assignment stats
  app.get("/api/configs", async (_req, res) => {
    try {
      const configs = await storage.getDeviceConfigs();
      const assignmentStats = await storage.getConfigAssignmentStats();
      
      // Merge stats into configs
      const configsWithStats = configs.map(config => {
        const stats = assignmentStats.find(s => s.configId === config.id);
        return {
          ...config,
          assignedDevices: stats?.total || 0,
          pendingDevices: stats?.pending || 0,
          appliedDevices: stats?.applied || 0,
        };
      });
      
      res.json(configsWithStats);
    } catch (error) {
      logger.error('Failed to get configs', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to fetch configs" });
    }
  });

  // GET single config
  app.get("/api/configs/:id", async (req, res) => {
    try {
      const config = await storage.getDeviceConfig(parseInt(req.params.id));
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch config" });
    }
  });

  // POST create config
  app.post("/api/configs", async (req, res) => {
    try {
      const { name, configData, isDefault, targetGroup, targetDevices } = req.body;
      
      if (!name || !configData) {
        return res.status(400).json({ error: "Name and configData are required" });
      }

      // Validate JSON
      try {
        if (typeof configData === "string") {
          JSON.parse(configData);
        }
      } catch {
        return res.status(400).json({ error: "Invalid JSON in configData" });
      }

      const config = await storage.createDeviceConfig({
        name,
        configData: typeof configData === "string" ? configData : JSON.stringify(configData),
        isDefault: isDefault ? 1 : 0,
        targetGroup: targetGroup || null,
        targetDevices: targetDevices ? JSON.stringify(targetDevices) : null,
      });

      await createAuditLog("create", "config", String(config.id), name, { targetGroup }, req, "info");
      res.status(201).json(config);
    } catch (error) {
      logger.error('Failed to create config', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to create config" });
    }
  });

  // PUT update config
  app.put("/api/configs/:id", async (req, res) => {
    try {
      const { name, configData, isDefault, targetGroup, targetDevices } = req.body;
      const updates: any = {};

      if (name !== undefined) updates.name = name;
      if (configData !== undefined) {
        updates.configData = typeof configData === "string" ? configData : JSON.stringify(configData);
      }
      if (isDefault !== undefined) updates.isDefault = isDefault ? 1 : 0;
      if (targetGroup !== undefined) updates.targetGroup = targetGroup;
      if (targetDevices !== undefined) updates.targetDevices = JSON.stringify(targetDevices);

      const config = await storage.updateDeviceConfig(parseInt(req.params.id), updates);
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }

      await createAuditLog("update", "config", req.params.id, config.name, { version: config.version }, req, "info");
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to update config" });
    }
  });

  // DELETE config
  app.delete("/api/configs/:id", async (req, res) => {
    try {
      const config = await storage.getDeviceConfig(parseInt(req.params.id));
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }

      await storage.deleteDeviceConfig(parseInt(req.params.id));
      await createAuditLog("delete", "config", req.params.id, config.name, null, req, "warning");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete config" });
    }
  });

  // POST push config to devices
  app.post("/api/configs/:id/push", async (req, res) => {
    try {
      const config = await storage.getDeviceConfig(parseInt(req.params.id));
      if (!config) {
        return res.status(404).json({ error: "Config not found" });
      }

      const { macAddresses } = req.body; // Optional: specific devices
      let targetMacs: string[] = [];

      if (macAddresses && Array.isArray(macAddresses)) {
        targetMacs = macAddresses.map((m: string) => m.replace(/[:-]/g, "").toUpperCase());
      } else if (config.targetDevices) {
        try {
          targetMacs = JSON.parse(config.targetDevices);
        } catch {}
      } else if (config.targetGroup) {
        const devices = await storage.getDevices();
        targetMacs = devices
          .filter(d => d.group === config.targetGroup)
          .map(d => d.macAddress);
      } else {
        // All devices
        const devices = await storage.getDevices();
        targetMacs = devices.map(d => d.macAddress);
      }

      // Assign config to each device
      let assignedCount = 0;
      for (const mac of targetMacs) {
        await storage.assignDeviceConfig(mac, config.id, config.version);
        webhookEvents.configPushed(mac, config.name, config.version);
        assignedCount++;
      }

      await createAuditLog("push", "config", String(config.id), config.name, { deviceCount: assignedCount }, req, "info");

      res.json({ 
        success: true, 
        message: `Config pushed to ${assignedCount} devices`,
        assignedCount,
      });
    } catch (error) {
      logger.error('Failed to push config', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to push config" });
    }
  });

  // GET config for a specific device (for ESP32 to fetch)
  app.get("/ota/config", async (req, res) => {
    try {
      const { mac } = req.query;
      if (!mac || typeof mac !== "string") {
        return res.status(400).json({ error: "MAC address required" });
      }

      const normalizedMac = mac.replace(/[:-]/g, "").toUpperCase();
      const assignment = await storage.getDeviceConfigAssignment(normalizedMac);

      if (!assignment || assignment.status === "applied") {
        // No pending config
        return res.json({ hasConfig: false });
      }

      const config = await storage.getDeviceConfig(assignment.configId);
      if (!config) {
        return res.json({ hasConfig: false });
      }

      res.json({
        hasConfig: true,
        configId: config.id,
        configVersion: config.version,
        configData: JSON.parse(config.configData),
      });
    } catch (error) {
      logger.error('Failed to get device config', { error: error instanceof Error ? error.message : 'Unknown' });
      res.status(500).json({ error: "Failed to get config" });
    }
  });

  // POST acknowledge config applied (from ESP32)
  app.post("/ota/config/ack", async (req, res) => {
    try {
      const { mac, configVersion } = req.body;
      if (!mac) {
        return res.status(400).json({ error: "MAC address required" });
      }

      const normalizedMac = mac.replace(/[:-]/g, "").toUpperCase();
      
      await storage.updateDeviceConfigAssignment(normalizedMac, {
        status: "applied",
        appliedAt: new Date(),
      });

      // Update device config version
      await storage.updateDeviceByMac(normalizedMac, {
        configVersion: configVersion,
      });

      logger.info('Config acknowledged by device', { mac: normalizedMac, configVersion });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to acknowledge config" });
    }
  });

  // ==================== REMOTE CONSOLE API ====================

  // GET pending commands for a device (for ESP32 to poll)
  app.get("/ota/commands", async (req, res) => {
    try {
      const { mac } = req.query;
      if (!mac || typeof mac !== "string") {
        return res.status(400).json({ error: "MAC address required" });
      }

      const normalizedMac = mac.replace(/[:-]/g, "").toUpperCase();
      const commands = await storage.getPendingCommands(normalizedMac);

      // Mark as sent
      for (const cmd of commands) {
        await storage.updateDeviceCommand(cmd.id, {
          status: "sent",
          sentAt: new Date(),
        });
      }

      res.json({
        commands: commands.map(c => ({
          id: c.id,
          command: c.command,
          payload: c.payload,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get commands" });
    }
  });

  // POST command response (from ESP32)
  app.post("/ota/commands/:id/ack", async (req, res) => {
    try {
      const commandId = parseInt(req.params.id);
      const { status, response } = req.body;

      const command = await storage.updateDeviceCommand(commandId, {
        status: status || "acknowledged",
        acknowledgedAt: new Date(),
        response: response || null,
      });

      if (command) {
        const wsManager = getWebSocketManager();
        wsManager.broadcastCommandAck(command.macAddress, commandId, status, response);
        webhookEvents.commandAcknowledged(command.macAddress, command.command, response);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to acknowledge command" });
    }
  });

  // POST send console output (from ESP32)
  app.post("/ota/console", async (req, res) => {
    try {
      const { mac, output, type } = req.body;
      if (!mac || !output) {
        return res.status(400).json({ error: "MAC and output required" });
      }

      const normalizedMac = mac.replace(/[:-]/g, "").toUpperCase();
      const wsManager = getWebSocketManager();
      wsManager.broadcastConsoleOutput(normalizedMac, {
        type: type || "stdout",
        message: output,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to send console output" });
    }
  });

  // GET command history for device
  app.get("/api/devices/:mac/commands", async (req, res) => {
    try {
      const normalizedMac = req.params.mac.replace(/[:-]/g, "").toUpperCase();
      const commands = await storage.getDeviceCommands(normalizedMac);
      res.json(commands);
    } catch (error) {
      res.status(500).json({ error: "Failed to get command history" });
    }
  });

  // POST send command to device
  app.post("/api/devices/:mac/commands", async (req, res) => {
    try {
      const normalizedMac = req.params.mac.replace(/[:-]/g, "").toUpperCase();
      const { command, payload } = req.body;

      if (!command) {
        return res.status(400).json({ error: "Command is required" });
      }

      const cmd = await storage.createDeviceCommand({
        macAddress: normalizedMac,
        command,
        payload: payload || null,
        status: "pending",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      webhookEvents.commandSent(normalizedMac, command);
      await createAuditLog("send_command", "device", normalizedMac, command, { payload }, req, "info");

      res.status(201).json(cmd);
    } catch (error) {
      res.status(500).json({ error: "Failed to send command" });
    }
  });

  // ==================== ROLLBACK PROTECTION API ====================

  // GET at-risk devices
  app.get("/api/at-risk", async (_req, res) => {
    try {
      const devices = await rollbackWatchdog.getAtRiskDevices();
      res.json({
        count: devices.length,
        devices,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get at-risk devices" });
    }
  });

  // POST clear at-risk flag for device
  app.post("/api/at-risk/:mac/clear", async (req, res) => {
    try {
      const normalizedMac = req.params.mac.replace(/[:-]/g, "").toUpperCase();
      await rollbackWatchdog.clearAtRiskFlag(normalizedMac);
      await createAuditLog("clear_at_risk", "device", normalizedMac, null, null, req, "info");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear at-risk flag" });
    }
  });

  // POST force rollback for at-risk device
  app.post("/api/at-risk/:mac/rollback", async (req, res) => {
    try {
      const normalizedMac = req.params.mac.replace(/[:-]/g, "").toUpperCase();
      const success = await rollbackWatchdog.forceRollback(normalizedMac);
      
      if (!success) {
        return res.status(400).json({ error: "Cannot rollback - no previous version available" });
      }

      await createAuditLog("force_rollback", "device", normalizedMac, null, null, req, "warning");
      res.json({ success: true, message: "Rollback scheduled" });
    } catch (error) {
      res.status(500).json({ error: "Failed to schedule rollback" });
    }
  });

  // Start the rollback protection watchdog
  rollbackWatchdog.start();

  return httpServer;
}
