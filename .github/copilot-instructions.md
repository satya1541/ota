# Copilot Instructions for AI Coding Agents

## Project Overview
This project is an OTA (Over-The-Air) firmware update system for ESP32 devices, featuring a full-stack architecture:
- **Frontend**: React (TypeScript) app in `client/src/` for dashboard, device management, firmware deployment, and logs.
- **Backend**: Node.js server in `server/` handling API routes, device update queue, storage, and websocket management.
- **Shared**: Common schema definitions in `shared/schema.ts`.
- **Firmware**: Example ESP32 client in `examples/ESP32_OTA_Client/` and server-side firmware assets in `server/firmware/` and `client/public/firmware/`.

## Key Architectural Patterns
- **API Layer**: RESTful endpoints in `server/routes.ts`, with business logic in `server/updateQueue.ts`, `server/storage.ts`, and validation in `server/validation.ts`.
- **WebSocket Communication**: Real-time device updates managed in `server/ws-manager.ts`.
- **Database**: SQL migrations in `migrations/` and storage logic in `server/db-storage.ts`.
- **Frontend State**: Uses React Query (`client/src/lib/queryClient.ts`) and custom hooks (e.g., `useDeviceUpdates.ts`).
- **Component Structure**: UI components in `client/src/components/ui/`, layout in `client/src/components/layout/`, and pages in `client/src/pages/`.

## Developer Workflows
- **Build**: Use Vite (`vite.config.ts`) for frontend builds. Run scripts in `script/build.ts` for custom build steps.
- **Migrations**: Apply SQL migrations from `migrations/` before starting the backend.
- **Run/Debug**: Start backend via `server/index.ts` (see `ecosystem.config.cjs` for process management). Frontend entry is `client/src/main.tsx`.
- **Firmware Deployment**: Place new firmware in `client/public/firmware/` and update references in the dashboard.

## Project-Specific Conventions
- **TypeScript Everywhere**: All client and server code is TypeScript.
- **Shared Types**: Use `shared/schema.ts` for data contracts between frontend and backend.
- **Custom Hooks**: Prefer hooks in `client/src/hooks/` for device and toast logic.
- **UI Patterns**: Use components from `client/src/components/ui/` for consistent design.
- **Logging**: Use `server/logger.ts` for backend logging.

## Integration Points
- **External Devices**: ESP32 clients connect via HTTP and WebSocket for OTA updates.
- **Assets**: Images and manifests in `attached_assets/` and `client/public/`.
- **Meta Images**: Managed via `vite-plugin-meta-images.ts`.

## Examples
- To add a new device type, update SQL schema in `migrations/`, backend logic in `server/updateQueue.ts`, and frontend UI in `client/src/pages/devices.tsx`.
- For new firmware, add binary to `client/public/firmware/` and update dashboard logic in `client/src/pages/firmware.tsx`.

## References
- **Frontend**: `client/src/App.tsx`, `client/src/pages/`
- **Backend**: `server/routes.ts`, `server/updateQueue.ts`, `server/ws-manager.ts`
- **Shared Types**: `shared/schema.ts`
- **Migrations**: `migrations/`
- **Firmware Example**: `examples/ESP32_OTA_Client/ESP32_OTA_Client.ino`

---
For questions or unclear conventions, review referenced files or ask for clarification.
