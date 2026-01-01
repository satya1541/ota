# Universal OTA - ESP32 Firmware Update System

## Overview

This is a production-ready Over-The-Air (OTA) firmware update system for ESP32 devices. The application provides a web-based dashboard for managing IoT devices, uploading firmware versions, and deploying updates to multiple devices simultaneously. It features real-time device status tracking, batch deployments with queue management, rollback capabilities, and comprehensive logging.

## Recent Changes
- Migrated project to Replit environment (Dec 2025)
- Configured Node.js 20 environment and deployment settings
- Implemented racing car animation for OTA status in fleet management
- Cleaned up header by removing global search bar
- Fixed hook order issues and simplified status rendering in Devices page

## User Preferences

- Clean, futuristic UI with glassmorphism and dark themes
- Detailed logging for system transparency
- High-quality icons from Lucide React
- Smooth animations via Framer Motion
- Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables
- **Build Tool**: Vite with custom plugins for Replit deployment

The frontend follows a page-based architecture with shared layout components (Sidebar, Header). Pages include Dashboard, Devices, Firmware, Deployments, Logs, and Settings.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints under `/api/` for management, `/ota/` for device communication
- **File Uploads**: Multer for firmware binary uploads (max 16MB, .bin/.hex files)
- **Validation**: Zod schemas for all API input validation
- **Rate Limiting**: express-rate-limit for API protection
- **Logging**: Winston with file rotation (ota.log, error.log)

### Data Storage
- **Database**: MySQL (configured via Drizzle ORM)
- **ORM**: Drizzle ORM with MySQL2 driver
- **Schema Location**: `shared/schema.ts` - defines users, devices, firmware, and device_logs tables
- **Migrations**: SQL files in `/migrations` directory, pushed via `drizzle-kit push`

### Key Design Patterns
- **Update Queue System**: p-queue limits concurrent OTA updates to 5 devices to prevent race conditions
- **MAC-based Device Identification**: Devices are identified by MAC address for ESP32 compatibility
- **SHA256 Checksums**: Automatic checksum calculation for firmware integrity verification
- **Transaction Rollback**: Devices track previous, current, and target firmware versions for rollback support

### API Structure
- `/api/devices` - Device CRUD operations
- `/api/firmware` - Firmware upload and management
- `/api/deploy` - Batch deployment to multiple devices
- `/api/logs` - OTA activity log retrieval
- `/ota/check` - ESP32 endpoint to check for pending updates
- `/ota/report` - ESP32 endpoint to report update status
- `/firmware/:filename` - Direct firmware binary download

## External Dependencies

### Database
- **MySQL**: Primary database (host, port, user, password configured via environment variables)
- **Connection**: mysql2 with connection pooling (10 connections)

### Third-Party Services
- None currently integrated (webhook URL placeholder in settings)

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `mysql2`: MySQL driver
- `multer`: File upload handling
- `winston`: Structured logging
- `p-queue`: Concurrent update queue management
- `express-rate-limit`: API rate limiting
- `zod`: Runtime type validation
- `@tanstack/react-query`: Frontend data fetching
- `recharts`: Dashboard charts and visualizations

### Environment Variables Required
- `DATABASE_URL`: MySQL connection string (for Drizzle)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Individual MySQL connection parameters
- `LOG_LEVEL`: Winston logging level (default: info)