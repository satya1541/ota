import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import logger from "./logger";
import { storage } from "./storage";

interface ClientSubscription {
  ws: WebSocket;
  subscribedDevices: Set<string>; // MAC addresses
  subscribedToAll: boolean;
  subscribedToConsole: Set<string>; // MAC addresses for remote console
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientSubscription> = new Map();

  constructor(httpServer: Server) {
    this.wss = new WebSocketServer({ server: httpServer, path: "/ws" });
    this.setupConnections();
  }

  private setupConnections() {
    this.wss.on("connection", (ws: WebSocket) => {
      // Initialize client subscription
      this.clients.set(ws, {
        ws,
        subscribedDevices: new Set(),
        subscribedToAll: false,
        subscribedToConsole: new Set(),
      });

      // Handle incoming messages
      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          logger.error("Failed to parse WebSocket message", { error: error instanceof Error ? error.message : 'Unknown' });
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
      });

      ws.on("error", (error) => {
        logger.error("WebSocket error", { error: error.message });
        this.clients.delete(ws);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: any) {
    const subscription = this.clients.get(ws);
    if (!subscription) return;

    switch (message.type) {
      case "subscribe-logs":
        if (message.deviceId === "all") {
          subscription.subscribedToAll = true;
          logger.info("Client subscribed to all device logs");
        } else if (message.deviceId) {
          const mac = message.deviceId.replace(/[:-]/g, "").toUpperCase();
          subscription.subscribedDevices.add(mac);
          logger.info("Client subscribed to device logs", { mac });
        }
        // Send confirmation
        ws.send(JSON.stringify({ type: "subscribed", deviceId: message.deviceId }));
        break;

      case "unsubscribe-logs":
        if (message.deviceId === "all") {
          subscription.subscribedToAll = false;
        } else if (message.deviceId) {
          const mac = message.deviceId.replace(/[:-]/g, "").toUpperCase();
          subscription.subscribedDevices.delete(mac);
        }
        break;

      case "subscribe-console":
        if (message.deviceId) {
          const mac = message.deviceId.replace(/[:-]/g, "").toUpperCase();
          subscription.subscribedToConsole.add(mac);
          logger.info("Client subscribed to remote console", { mac });
          ws.send(JSON.stringify({ type: "console-subscribed", deviceId: mac }));
        }
        break;

      case "unsubscribe-console":
        if (message.deviceId) {
          const mac = message.deviceId.replace(/[:-]/g, "").toUpperCase();
          subscription.subscribedToConsole.delete(mac);
        }
        break;

      case "send-command":
        // Handle remote console command
        if (message.deviceId && message.command) {
          await this.handleRemoteCommand(ws, message.deviceId, message.command, message.payload);
        }
        break;

      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;
    }
  }

  // Handle remote console command from client
  private async handleRemoteCommand(ws: WebSocket, deviceId: string, command: string, payload?: string) {
    const mac = deviceId.replace(/[:-]/g, "").toUpperCase();
    
    try {
      // Store command in database
      const cmd = await storage.createDeviceCommand({
        macAddress: mac,
        command,
        payload: payload || null,
        status: "pending",
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
      });

      // Broadcast to device if online (device would listen via different mechanism)
      this.broadcastToDevice(mac, {
        type: "command",
        commandId: cmd.id,
        command: cmd.command,
        payload: cmd.payload,
      });

      ws.send(JSON.stringify({
        type: "command-queued",
        commandId: cmd.id,
        command,
        status: "pending",
      }));

      logger.info("Remote command queued", { mac, command });
    } catch (error) {
      ws.send(JSON.stringify({
        type: "command-error",
        error: error instanceof Error ? error.message : "Failed to queue command",
      }));
    }
  }

  // Broadcast message to a specific device's subscribers
  private broadcastToDevice(mac: string, message: any) {
    const msgString = JSON.stringify(message);
    this.clients.forEach((subscription) => {
      if (subscription.ws.readyState === WebSocket.OPEN) {
        if (subscription.subscribedToConsole.has(mac)) {
          subscription.ws.send(msgString);
        }
      }
    });
  }

  // Broadcast device log to subscribed clients
  broadcastDeviceLog(log: {
    mac: string;
    level: "info" | "warn" | "error" | "debug";
    message: string;
    source?: string;
    timestamp?: Date;
  }) {
    const normalizedMac = log.mac.replace(/[:-]/g, "").toUpperCase();
    const message = JSON.stringify({
      type: "device-log",
      mac: normalizedMac,
      level: log.level,
      message: log.message,
      source: log.source || normalizedMac,
      timestamp: (log.timestamp || new Date()).toISOString(),
    });

    this.clients.forEach((subscription) => {
      if (subscription.ws.readyState === WebSocket.OPEN) {
        if (subscription.subscribedToAll || subscription.subscribedDevices.has(normalizedMac)) {
          subscription.ws.send(message);
        }
      }
    });
  }

  // Broadcast serial output from device
  broadcastSerial(mac: string, data: string) {
    const normalizedMac = mac.replace(/[:-]/g, "").toUpperCase();
    
    // Parse log level from message content
    let level: "info" | "warn" | "error" | "debug" = "info";
    if (data.includes("[ERROR]") || data.includes("Error:")) level = "error";
    else if (data.includes("[WARN]") || data.includes("Warning:")) level = "warn";
    else if (data.includes("[DEBUG]")) level = "debug";

    this.broadcastDeviceLog({
      mac: normalizedMac,
      level,
      message: data,
      source: "serial",
    });
  }

  broadcastDeviceUpdate(device: any) {
    const message = JSON.stringify({
      type: "device-update",
      data: device,
    });

    this.clients.forEach((subscription) => {
      if (subscription.ws.readyState === WebSocket.OPEN) {
        subscription.ws.send(message);
      }
    });
  }

  broadcastDevices(devices: any[]) {
    const message = JSON.stringify({
      type: "devices-list",
      data: devices,
    });

    this.clients.forEach((subscription) => {
      if (subscription.ws.readyState === WebSocket.OPEN) {
        subscription.ws.send(message);
      }
    });
  }

  broadcastProgress(progress: {
    macAddress: string;
    deviceId: string;
    progress: number;
    bytesReceived?: number;
    totalBytes?: number;
  }) {
    const message = JSON.stringify({
      type: "update-progress",
      data: progress,
    });

    this.clients.forEach((subscription) => {
      if (subscription.ws.readyState === WebSocket.OPEN) {
        subscription.ws.send(message);
      }
    });

    // Also broadcast as device log for serial monitor
    this.broadcastDeviceLog({
      mac: progress.macAddress,
      level: "info",
      message: `OTA Progress: ${progress.progress}%${progress.bytesReceived ? ` (${progress.bytesReceived}/${progress.totalBytes} bytes)` : ''}`,
      source: "ota",
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  // Broadcast at-risk device alert
  broadcastAtRiskAlert(data: { count: number; devices: Array<{ macAddress: string; name: string; expectedCheckinBy: Date | null }> }) {
    const message = JSON.stringify({
      type: "at-risk-alert",
      data,
    });

    this.clients.forEach((subscription) => {
      if (subscription.ws.readyState === WebSocket.OPEN) {
        subscription.ws.send(message);
      }
    });
  }

  // Broadcast console output from device
  broadcastConsoleOutput(mac: string, output: { type: "stdout" | "stderr" | "info"; message: string; timestamp?: Date }) {
    const normalizedMac = mac.replace(/[:-]/g, "").toUpperCase();
    const message = JSON.stringify({
      type: "console-output",
      mac: normalizedMac,
      output: {
        ...output,
        timestamp: (output.timestamp || new Date()).toISOString(),
      },
    });

    this.clients.forEach((subscription) => {
      if (subscription.ws.readyState === WebSocket.OPEN) {
        if (subscription.subscribedToConsole.has(normalizedMac)) {
          subscription.ws.send(message);
        }
      }
    });
  }

  // Broadcast command acknowledgment
  broadcastCommandAck(mac: string, commandId: number, status: string, response?: string) {
    const normalizedMac = mac.replace(/[:-]/g, "").toUpperCase();
    const message = JSON.stringify({
      type: "command-ack",
      mac: normalizedMac,
      commandId,
      status,
      response,
    });

    this.clients.forEach((subscription) => {
      if (subscription.ws.readyState === WebSocket.OPEN) {
        if (subscription.subscribedToConsole.has(normalizedMac)) {
          subscription.ws.send(message);
        }
      }
    });
  }
}

let wsManager: WebSocketManager | null = null;

export function initializeWebSocketManager(httpServer: Server): WebSocketManager {
  wsManager = new WebSocketManager(httpServer);
  return wsManager;
}

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    throw new Error("WebSocket manager not initialized");
  }
  return wsManager;
}
