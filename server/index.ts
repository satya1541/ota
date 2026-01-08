import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import logger, { otaLogger } from "./logger";
import { initializeWebSocketManager } from "./ws-manager";

function redactSensitive(value: unknown): unknown {
  const SENSITIVE_KEY_RE = /(secret|password|token|api[_-]?key|authorization)/i;

  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map(redactSensitive);
  }

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEY_RE.test(key)) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = redactSensitive(val);
    }
  }
  return out;
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Enable gzip compression for all responses
app.use(compression());

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  // Only log API requests (not static files)
  if (req.path.startsWith("/api/") || req.path.startsWith("/ota/") || req.path.startsWith("/firmware/")) {
    logger.debug("API Request", {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    });
  }
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  // Use proper logger instead of console.log
  logger.info(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  initializeWebSocketManager(httpServer);
  await registerRoutes(httpServer, app);

  // Global error handler with logging
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error
    otaLogger.apiError(req.path, req.method, message, {
      status,
      stack: err.stack,
      body: redactSensitive(req.body),
      query: req.query,
    });

    res.status(status).json({ 
      error: message,
      timestamp: new Date().toISOString(),
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      logger.info(`OTA Server started`, { port, environment: process.env.NODE_ENV || "development" });
    },
  );
})();
