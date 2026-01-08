# Copilot Instructions for AI Coding Agents

## Architecture Overview
ESP32 OTA firmware update system with React frontend + Node.js/Express backend + MySQL (Drizzle ORM).

**Data Flow**: ESP32 → HTTP/WebSocket → `server/routes.ts` → `storage.ts`/`updateQueue.ts` → MySQL → WebSocket broadcast → React Query cache

**Core Tables** (defined in `shared/schema.ts`):
- `devices`: MAC, versions (previous/current/target), OTA status (idle/pending/updating/updated/failed), health metrics
- `firmware`: Version catalog with SHA256 checksums, stored in `server/firmware/`
- `device_logs`: OTA activity audit trail
- `staged_rollouts`: Phased deployment tracking (5%→25%→50%→100%)
- `audit_logs`: Admin action history with severity levels

## Commands
```bash
npm run dev          # Start dev server (tsx server/index.ts)
npm run build        # Production build via script/build.ts
npm run db:push      # Push schema to MySQL (drizzle-kit)
pm2 start ecosystem.config.cjs  # Production cluster mode (port 6025)
npm run check        # TypeScript type check
```

## Key Patterns

### API Validation
All endpoints use Zod schemas from `server/validation.ts`. Always use validation middleware:
```typescript
app.post("/api/devices", validateBody(createDeviceSchema), async (req, res) => {
  const data = req.validatedBody;  // Type-safe, validated
});
```

### Device Identification
MAC addresses are **12-char uppercase hex** (no colons). Use `macAddressSchema` for auto-normalization:
```typescript
macAddressSchema.parse("AA:BB:CC:DD:EE:FF")  // → "AABBCCDDEEFF"
```

### Firmware Version Format
Versions must match `vX.Y.Z` pattern. Use `firmwareVersionSchema` to auto-prefix:
```typescript
firmwareVersionSchema.parse("1.2.3")  // → "v1.2.3"
```

### Real-time Updates
WebSocket broadcasts device changes to all connected clients. After any device mutation:
```typescript
const wsManager = getWebSocketManager();
wsManager.broadcastDeviceUpdate(updatedDevice);  // Single device
wsManager.broadcastDevices(allDevices);          // Full refresh
```

Frontend auto-syncs via `useDeviceUpdates()` hook which updates React Query cache.

### Update Queue
Use `updateQueue.queueUpdate()` for deployments—handles concurrency (max 5), duplicate prevention, and rollback:
```typescript
await updateQueue.queueUpdate({ deviceId, macAddress, version, priority: 0 });
```

### Audit Logging
Create audit logs for admin actions using the helper in `routes.ts`:
```typescript
await createAuditLog("deploy", "deployment", version, `Deploy v${version}`, 
  { deviceCount, results }, req, "info");  // severity: "info" | "warning" | "critical"
```

### Webhook Events
Trigger webhooks for external integrations via `webhook-service.ts`:
```typescript
import { webhookEvents } from "./webhook-service";
webhookEvents.updateSuccess(macAddress, version);
webhookEvents.deviceAtRisk(macAddress, expectedCheckinBy);
```

### Logging
Use structured `otaLogger` for OTA events, `logger` for general:
```typescript
import logger, { otaLogger } from "./logger";
otaLogger.check(mac, currentVersion, targetVersion, updateAvailable);
logger.error("Error message", { context: value });
```

### Frontend State
- React Query for server state: `queryClient.setQueryData(["devices"], ...)`
- Use `client/src/lib/api.ts` functions, never raw fetch in components
- Routing via `wouter` (not react-router)

## Adding Features

**New API endpoint**: Add route in `server/routes.ts`, create Zod schema in `validation.ts`

**New DB field**: 
1. Add to table in `shared/schema.ts`
2. Create migration in `migrations/00X_*.sql`
3. Run `npm run db:push`

**New page**: Add to `client/src/pages/`, register route in `App.tsx`, update `routeTitles` map

## File Locations
- Schema & shared types: `shared/schema.ts` (import as `@shared/schema`)
- Firmware binaries: `server/firmware/`
- Logs: `server/logs/` (ota.log, error.log, combined.log)
- UI components: `client/src/components/ui/` (shadcn-style)
- ESP32 example: `examples/ESP32_OTA_Client/`
