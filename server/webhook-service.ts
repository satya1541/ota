import crypto from "crypto";
import { storage } from "./storage";
import type { Webhook } from "@shared/schema";
import logger from "./logger";

// Webhook event types
export type WebhookEventType =
  | "update.started"
  | "update.success"
  | "update.failed"
  | "device.online"
  | "device.offline"
  | "device.at_risk"
  | "rollout.started"
  | "rollout.complete"
  | "rollout.paused"
  | "config.pushed"
  | "command.sent"
  | "command.acknowledged";

interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, any>;
}

// Generate HMAC signature for webhook payload
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

// Send webhook to a single endpoint
async function sendWebhook(webhook: Webhook, payload: WebhookPayload): Promise<boolean> {
  const payloadString = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": payload.event,
    "X-Webhook-Timestamp": payload.timestamp,
  };

  // Add HMAC signature if secret is configured
  if (webhook.secret) {
    headers["X-Webhook-Signature"] = `sha256=${generateSignature(payloadString, webhook.secret)}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    // Update webhook status
    await storage.updateWebhook(webhook.id, {
      lastTriggeredAt: new Date(),
      lastStatusCode: response.status,
      failureCount: response.ok ? 0 : (webhook.failureCount || 0) + 1,
    });

    if (!response.ok) {
      logger.warn("Webhook delivery failed", {
        webhookId: webhook.id,
        name: webhook.name,
        statusCode: response.status,
        event: payload.event,
      });
      return false;
    }

    logger.info("Webhook delivered successfully", {
      webhookId: webhook.id,
      name: webhook.name,
      event: payload.event,
    });

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Webhook delivery error", {
      webhookId: webhook.id,
      name: webhook.name,
      event: payload.event,
      error: message,
    });

    await storage.updateWebhook(webhook.id, {
      lastTriggeredAt: new Date(),
      lastStatusCode: 0,
      failureCount: (webhook.failureCount || 0) + 1,
    });

    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Trigger webhooks for an event
export async function triggerWebhook(
  event: WebhookEventType,
  data: Record<string, any>
): Promise<void> {
  try {
    const webhooks = await storage.getWebhooks();
    const activeWebhooks = webhooks.filter((w) => {
      if (!w.isActive) return false;
      
      // Parse events array
      let events: string[] = [];
      try {
        events = JSON.parse(w.events || "[]");
      } catch {
        events = [];
      }
      
      // Check if this webhook subscribes to this event
      return events.includes(event) || events.includes("*");
    });

    if (activeWebhooks.length === 0) {
      return; // No webhooks configured for this event
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Send to all matching webhooks in parallel
    await Promise.allSettled(
      activeWebhooks.map((webhook) => sendWebhook(webhook, payload))
    );
  } catch (error) {
    logger.error("Failed to trigger webhooks", {
      event,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Test a webhook by sending a test event
export async function testWebhook(webhookId: number): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const webhook = await storage.getWebhook(webhookId);
  if (!webhook) {
    return { success: false, error: "Webhook not found" };
  }

  const payload: WebhookPayload = {
    event: "update.success", // Use a safe test event
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: "This is a test webhook from Universal OTA",
      webhookName: webhook.name,
    },
  };

  const payloadString = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Webhook-Event": payload.event,
    "X-Webhook-Timestamp": payload.timestamp,
    "X-Webhook-Test": "true",
  };

  if (webhook.secret) {
    headers["X-Webhook-Signature"] = `sha256=${generateSignature(payloadString, webhook.secret)}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: payloadString,
      signal: controller.signal,
    });

    return {
      success: response.ok,
      statusCode: response.status,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper functions for common events
export const webhookEvents = {
  updateStarted: (macAddress: string, version: string) =>
    triggerWebhook("update.started", { macAddress, targetVersion: version }),
  
  updateSuccess: (macAddress: string, fromVersion: string, toVersion: string, durationMs?: number) =>
    triggerWebhook("update.success", { macAddress, fromVersion, toVersion, durationMs }),
  
  updateFailed: (macAddress: string, version: string, error: string) =>
    triggerWebhook("update.failed", { macAddress, targetVersion: version, error }),
  
  deviceOnline: (macAddress: string, ipAddress?: string) =>
    triggerWebhook("device.online", { macAddress, ipAddress }),
  
  deviceOffline: (macAddress: string, lastSeen: Date) =>
    triggerWebhook("device.offline", { macAddress, lastSeen: lastSeen.toISOString() }),
  
  deviceAtRisk: (macAddress: string, expectedCheckinBy: Date) =>
    triggerWebhook("device.at_risk", { macAddress, expectedCheckinBy: expectedCheckinBy.toISOString() }),
  
  rolloutStarted: (rolloutId: number, version: string, totalDevices: number) =>
    triggerWebhook("rollout.started", { rolloutId, version, totalDevices }),
  
  rolloutComplete: (rolloutId: number, version: string, successCount: number, failedCount: number) =>
    triggerWebhook("rollout.complete", { rolloutId, version, successCount, failedCount }),
  
  configPushed: (macAddress: string, configName: string, configVersion: number) =>
    triggerWebhook("config.pushed", { macAddress, configName, configVersion }),
  
  commandSent: (macAddress: string, command: string) =>
    triggerWebhook("command.sent", { macAddress, command }),
  
  commandAcknowledged: (macAddress: string, command: string, response?: string) =>
    triggerWebhook("command.acknowledged", { macAddress, command, response }),
};
