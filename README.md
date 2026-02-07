# Universal OTA: Enterprise Firmware Management Platform

A robust, full-stack Over-The-Air (OTA) update solution designed for ESP32 IoT fleets. This platform handles device management, firmware versioning, staged rollouts, and real-time monitoring with a modern React dashboard and an Express.js backend.

---

## 🚀 Features

- **Fleet Management**: Real-time tracking of online/offline status, signal strength, and health metrics.
- **Firmware Versioning**: Upload and manage multiple firmware versions with SHA256 integrity checks.
- **Staged Rollouts**: Deploy updates incrementally (e.g., 5% -> 25% -> 100%) with auto-rollback on failure.
- **OTA Updates**: Supports both WebSocket-triggered (push) and HTTP polling (pull) update mechanisms.
- **Remote Console**: Send direct commands (reboot, reset) and view live serial logs via WebSocket.
- **Audit Logs**: Comprehensive tracking of all admin actions for compliance.
- **Security Check**: Role-based access, PIN authentication, and signed binary verification.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- **UI Library**: [Shadcn UI](https://ui.shadcn.com/) (Tailwind CSS)
- **State/Data**: [TanStack Query](https://tanstack.com/query/latest)
- **Routing**: [Wouter](https://github.com/molefrog/wouter)
- **Visualization**: Recharts (Analytics), Leaflet (Maps)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) (Express)
- **Language**: TypeScript throughout (Full-stack type safety)
- **Database**: MySQL (via [Drizzle ORM](https://orm.drizzle.team/))
- **Communication**: WebSocket (`ws`) for real-time events

---

## 📂 Project Structure

```
├── client/                 # Frontend React Application
│   ├── src/
│   │   ├── components/     # UI Components (Shadcn + Custom)
│   │   ├── hooks/          # React Hooks (useDeviceUpdates, etc.)
│   │   ├── pages/          # Application Routes (Dashboard, Devices, Logs)
│   │   └── lib/            # Utilities (API, Auth, Theme)
│
├── server/                 # Backend Application
│   ├── db-storage.ts       # Database Implementation (Drizzle)
│   ├── routes.ts           # REST API Endpoints
│   ├── ws-manager.ts       # WebSocket Server Logic
│   ├── updateQueue.ts      # Concurrency Management
│   └── firmware/           # Binary Storage Directory
│
└── shared/                 # Shared Code
    └── schema.ts           # Drizzle Schema & Zod Types (Single Source of Truth)
```

---

## ⚡ Getting Started

### Prerequisites
- Node.js v18+
- MySQL Server (Ensure `ota_db` exists)

### Installation

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Database Setup**
    The application defaults to the following credentials (edit `server/db-storage.ts` or set env vars):
    - Host: `40.192.42.60`
    - User: `testing`
    - Pass: `testing@2025`
    - DB: `ota_db`

    Run migrations (if applicable) or ensure the schema is synced:
    ```bash
    npm run db:push
    ```

3.  **Run Development Server**
    Starts both Client (Vite) and Server (Express):
    ```bash
    npm run dev
    ```
    Access the dashboard at `http://localhost:5000`.

---

## 🏗 System Architecture

The platform follows a classic three-tier architecture with a specialized IoT communication layer, optimized for high-contrast visibility and industrial-grade telemetry.

```mermaid
graph TD
    subgraph Client_Layer["Frontend (React)"]
        UI["Neo-Brutalist Dashboard"]
        CS["Card Stack Prefs Modal"]
        INDICATOR["Activity Indicators (Animations)"]
    end

    subgraph Server_Layer["Backend (Express/Node.js)"]
        API["REST API (Auth, OTA, Telemetry)"]
        WS_S["WebSocket Server (ws)"]
        UQ["Update Queue (Concurrency)"]
        WD["Rollback Watchdog"]
    end

    subgraph Storage_Layer["Database & FS"]
        DB[("MySQL (Drizzle ORM)")]
        FS["Firmware Storage (Binary Files)"]
    end

    subgraph Device_Layer["IoT Devices (ESP32)"]
        ESP["ESP32 Firmware (v0.0.1+)"]
        REP["Reporting Engine (Progress/Result)"]
        POLL["Fallback Polling Client"]
    end

    UI <--> API
    UI <--> WS_S
    CS --> API
    API <--> DB
    API <--> FS
    API <--> UQ
    UQ <--> WD
    WD <--> DB
    
    ESP -- POST /ota/heartbeat --> API
    ESP -- WS / Remote Commands --> WS_S
    ESP -- POST /ota/progress --> API
    ESP -- Binary Download --> API
    POLL -- GET /ota/commands --> API
```

### Component Breakdown

| Component | Responsibility |
| :--- | :--- |
| **Neo-Brutalist UI** | High-contrast admin administration, firmware management, and live activity animations. |
| **REST API** | Handles device registration, heartbeats (`/ota/heartbeat`), OTA checks (`/ota/check`), and progress tracking. |
| **WebSocket Server** | Real-time bi-directional channel for instant commands (Reboot, Reset) and live metrics. |
| **Update Queue** | Manages thousands of devices by queuing update requests to prevent server/network congestion. |
| **Rollback Watchdog** | Monitors devices after an update; initiates rollback if heartbeats fail to resume. |
| **Reporting Engine** | Firmware-side logic for real-time progress updates and success/failure outcome reporting. |

---

## 🔄 OTA Update Lifecycle

The following sequence illustrates the modernized flow including real-time progress and post-update reporting.

```mermaid
sequenceDiagram
    autonumber
    participant A as Admin
    participant S as Server
    participant DB as Database
    participant D as ESP32 Device

    Note over A, S: 1. Firmware Ingestion
    A->>S: Upload Firmware (version, .bin)
    S->>S: Calculate SHA256 Checksum
    S->>DB: Store Metadata
    S-->>A: Upload Confirmed

    Note over A, S: 2. Deployment Trigger
    A->>S: Initiate Deployment (Group/List, Version)
    S->>DB: Set targetVersion
    S->>S: Queue Updates (UpdateQueue)

    Note over S, D: 3. Discovery Phase
    alt WebSocket (Push)
        S->>D: { type: 'command', command: 'update' }
    else HTTP Polling (Pull)
        D->>S: GET /ota/check?deviceId=MAC&v=current
        S-->>D: { updateAvailable: true, url: ..., checksum: ... }
    end

    Note over D, S: 4. Flashing Phase
    D->>S: GET /firmware/binary.bin
    loop Streaming
        S-->>D: Binary Chunks
        D->>S: POST /ota/progress (percentage%)
    end
    D->>D: Verify Checksum
    D->>S: POST /ota/report (updated/success)
    D->>D: Reboot

    Note over D, S: 5. Final Verification
    D->>S: POST /ota/heartbeat (v=new)
    S->>DB: Update currentVersion, clear targetVersion
    S->>S: Clear rollback timer
```

### Reliability Mechanisms

1.  **Checksum Verification**: Every binary is hashed (SHA256). The device verifies this hash *after* downloading but *before* flashing to prevent bricking from corrupted transfers.
2.  **Staged Rollouts**: Deployments can be limited to target percentages (e.g., 5% first). If failure rates exceed a threshold, the server automatically pauses the rollout.
3.  **Atomic Updates**: ESP32 uses an A/B partition scheme. The new firmware is written to the "next" partition. If it fails, the bootloader automatically reverts to the "previous" partition.
4.  **Rollback Watchdog**: If a device reboots but doesn't send a heartbeat within 10 minutes, the server flags it for manual intervention or marks the version as unstable.

---

## 🔒 Security Model

- **Device Identity**: Devices are identified by hardware MAC addresses (normalized to uppercase, no colons).
- **Admin Access**: Protected by session-based authentication with PIN hashing (SHA256).
- **Communication Security**: 
    - All external webhooks can be signed with a shared secret.
    - Rate limiting is applied to OTA polling and download endpoints to prevent DDoS.
