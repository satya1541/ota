import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import logger from "./logger";

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(httpServer: Server) {
    this.wss = new WebSocketServer({ server: httpServer, path: "/ws" });
    this.setupConnections();
  }

  private setupConnections() {
    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);

      ws.on("close", () => {
        this.clients.delete(ws);
      });

      ws.on("error", (error) => {
        logger.error("WebSocket error", { error: error.message });
      });
    });
  }

  broadcastDeviceUpdate(device: any) {
    const message = JSON.stringify({
      type: "device-update",
      data: device,
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  broadcastDevices(devices: any[]) {
    const message = JSON.stringify({
      type: "devices-list",
      data: devices,
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
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
