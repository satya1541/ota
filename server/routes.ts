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
  updateDeviceSchema,
  deploySchema,
  resetSchema,
  otaCheckSchema,
  otaReportSchema,
  loginSchema,
  registerSchema,
  uploadFirmwareSchema,
  macAddressSchema,
  firmwareVersionSchema
} from "./validation";
import { updateQueue } from "./updateQueue";
import { getWebSocketManager } from "./ws-manager";

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
      const { name, macAddress, group, currentVersion } = req.validatedBody as { 
        name: string; 
        macAddress: string; 
        group: string;
        currentVersion?: string;
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
      });

      await storage.createDeviceLog({
        deviceId: device.id,
        macAddress: device.macAddress,
        action: "register",
        status: "success",
        message: `Device registered: ${name} (${macAddress})`,
      });

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

  // DELETE device
  app.delete("/api/devices/:id", async (req, res) => {
    try {
      await storage.deleteDevice(req.params.id);
      res.status(204).send();
    } catch (error) {
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

  // GET single firmware
  app.get("/api/firmware/:version", async (req, res) => {
    try {
      const fw = await storage.getFirmware(req.params.version);
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
      const fw = await storage.getFirmware(req.params.version);
      if (fw) {
        const filePath = path.join(FIRMWARE_DIR, fw.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        otaLogger.firmwareDelete(req.params.version);
      }
      await storage.deleteFirmware(req.params.version);
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

      if (!device.previousVersion) {
        return res.status(400).json({ error: "No previous version available for rollback" });
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

  return httpServer;
}
