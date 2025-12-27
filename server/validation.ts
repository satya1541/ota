import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

// Extend Express Request type to include validated data
declare global {
  namespace Express {
    interface Request {
      validatedBody?: any;
      validatedQuery?: any;
    }
  }
}

// Device validation schemas
export const deviceIdSchema = z.string().uuid("Invalid device ID format");

export const macAddressSchema = z.string()
  .regex(/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/i, "Invalid MAC address format")
  .transform(val => val.toUpperCase());

export const createDeviceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  macAddress: macAddressSchema,
  group: z.string().min(1, "Group is required").max(50, "Group name too long"),
  currentVersion: z.string().max(50).optional(),
});

export const updateDeviceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  group: z.string().min(1).max(50).optional(),
  currentVersion: z.string().max(50).optional(),
  targetVersion: z.string().max(50).optional(),
  otaStatus: z.enum(["idle", "pending", "updating", "updated", "failed"]).optional(),
  status: z.enum(["online", "offline"]).optional(),
  ipAddress: z.string().ip().optional(),
});

// Firmware validation schemas
export const firmwareVersionSchema = z.string()
  .regex(/^v?\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/, "Invalid version format (use x.y.z or vx.y.z)")
  .transform(val => val.startsWith('v') ? val : `v${val}`);

export const uploadFirmwareSchema = z.object({
  version: firmwareVersionSchema,
  description: z.string().max(500).optional(),
});

// Deployment validation schemas
export const deploySchema = z.object({
  deviceIds: z.array(macAddressSchema).min(1, "At least one device required").max(100, "Too many devices"),
  version: firmwareVersionSchema,
});

export const resetSchema = z.object({
  deviceIds: z.array(macAddressSchema).min(1, "At least one device required").max(100, "Too many devices"),
});

// OTA endpoint validation schemas
export const otaCheckSchema = z.object({
  deviceId: macAddressSchema,
  version: z.string().max(50).optional(),
  rssi: z.number().int().optional(),
  freeHeap: z.number().int().optional(),
});

export const otaReportSchema = z.object({
  deviceId: macAddressSchema,
  status: z.enum(["success", "failed", "updated"]),
  version: z.string().max(50).optional(),
  message: z.string().max(500).optional(),
});

// Auth validation schemas
export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

// Validation middleware helper
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.validatedQuery = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
}
