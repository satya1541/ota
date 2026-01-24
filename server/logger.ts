import winston from "winston";
import path from "path";
import fs from "fs";

// Create logs directory if it doesn't exist
const LOGS_DIR = path.join(process.cwd(), "server", "logs");
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}] ${message}${metaStr}`;
  })
);

// JSON format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.json()
);

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: { service: "ota-server" },
  transports: [
    // Console transport (always enabled)
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // OTA activity log file
    new winston.transports.File({
      filename: path.join(LOGS_DIR, "ota.log"),
      level: "info",
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Error log file
    new winston.transports.File({
      filename: path.join(LOGS_DIR, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(LOGS_DIR, "combined.log"),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 3,
    }),
  ],
});

// Helper functions for structured logging
export const otaLogger = {
  // Device check for update
  check: (mac: string, currentVersion: string, targetVersion: string | null, updateAvailable: boolean) => {
    logger.info("OTA Check", {
      event: "ota_check",
      mac,
      currentVersion,
      targetVersion,
      updateAvailable,
    });
  },

  // Firmware download started
  downloadStart: (mac: string, version: string, fileSize: number) => {
    logger.info("Firmware download started", {
      event: "download_start",
      mac,
      version,
      fileSize,
    });
  },

  // Firmware download completed
  downloadComplete: (mac: string, version: string) => {
    logger.info("Firmware download completed", {
      event: "download_complete",
      mac,
      version,
    });
  },

  // Firmware download failed
  downloadFailed: (mac: string, version: string, error: string) => {
    logger.error("Firmware download failed", {
      event: "download_failed",
      mac,
      version,
      error,
    });
  },

  // Deployment scheduled
  deploy: (deviceIds: string[], version: string, scheduledBy: string = "admin") => {
    logger.info("Deployment scheduled", {
      event: "deploy",
      deviceIds,
      deviceCount: deviceIds.length,
      version,
      scheduledBy,
    });
  },

  // Update reported by device
  report: (mac: string, success: boolean, version: string, message?: string) => {
    const level = success ? "info" : "error";
    logger[level]("Update report received", {
      event: "update_report",
      mac,
      success,
      version,
      message,
    });
  },

  // Rollback initiated
  rollback: (mac: string, fromVersion: string, toVersion: string) => {
    logger.info("Rollback scheduled", {
      event: "rollback",
      mac,
      fromVersion,
      toVersion,
    });
  },

  // Device registered
  register: (deviceId: string, mac: string, name: string) => {
    logger.info("Device registered", {
      event: "device_register",
      deviceId,
      mac,
      name,
    });
  },

  // Firmware uploaded
  firmwareUpload: (version: string, filename: string, size: number, checksum: string) => {
    logger.info("Firmware uploaded", {
      event: "firmware_upload",
      version,
      filename,
      size,
      checksum: checksum.substring(0, 16) + "...",
    });
  },

  // Firmware deleted
  firmwareDelete: (version: string) => {
    logger.info("Firmware deleted", {
      event: "firmware_delete",
      version,
    });
  },

  // Reset OTA state
  reset: (deviceIds: string[]) => {
    logger.info("OTA state reset", {
      event: "ota_reset",
      deviceIds,
      deviceCount: deviceIds.length,
    });
  },

  // API error
  apiError: (endpoint: string, method: string, error: string, details?: any) => {
    logger.error("API error", {
      event: "api_error",
      endpoint,
      method,
      error,
      details,
    });
  },

  // Rate limit exceeded
  rateLimitExceeded: (mac: string, ip: string) => {
    logger.warn("Rate limit exceeded", {
      event: "rate_limit",
      mac,
      ip,
    });
  },
};

// Export paths for log file access
export const LOG_PATHS = {
  ota: path.join(LOGS_DIR, "ota.log"),
  error: path.join(LOGS_DIR, "error.log"),
  combined: path.join(LOGS_DIR, "combined.log"),
};

export default logger;
