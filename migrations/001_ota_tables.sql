-- =============================================
-- OTA System Database Migration
-- ESP32 Over-The-Air Firmware Update System
-- =============================================

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS ota_logs;
DROP TABLE IF EXISTS ota_devices;
DROP TABLE IF EXISTS ota_firmware;

-- =============================================
-- OTA Devices Table
-- Stores ESP32 device information
-- =============================================
CREATE TABLE ota_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique device identifier (e.g., XYZ123)',
    mac VARCHAR(17) NOT NULL UNIQUE COMMENT 'MAC address (e.g., AA:BB:CC:DD:EE:FF)',
    name VARCHAR(255) DEFAULT NULL COMMENT 'Friendly device name',
    current_version VARCHAR(50) DEFAULT '' COMMENT 'Currently installed firmware version',
    previous_version VARCHAR(50) DEFAULT '' COMMENT 'Previous firmware version (for rollback)',
    target_version VARCHAR(50) DEFAULT '' COMMENT 'Target firmware version to update to',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Last time device contacted server',
    status VARCHAR(20) NOT NULL DEFAULT 'registered' COMMENT 'Device status: registered, updating, updated, failed, online, offline',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_device_id (device_id),
    INDEX idx_mac (mac),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- OTA Firmware Table
-- Stores firmware versions and file information
-- =============================================
CREATE TABLE ota_firmware (
    id INT AUTO_INCREMENT PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE COMMENT 'Firmware version (e.g., v1.0.0)',
    file_url VARCHAR(500) NOT NULL COMMENT 'Path/URL to firmware file',
    filename VARCHAR(255) NOT NULL COMMENT 'Original filename',
    size INT NOT NULL DEFAULT 0 COMMENT 'File size in bytes',
    checksum VARCHAR(64) NOT NULL COMMENT 'SHA256 checksum of firmware file',
    description TEXT DEFAULT NULL COMMENT 'Changelog/description',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_version (version),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- OTA Logs Table
-- Tracks all OTA update events
-- =============================================
CREATE TABLE ota_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL COMMENT 'References ota_devices.device_id',
    action VARCHAR(50) NOT NULL COMMENT 'Action type: check, download, install, report, rollback, deploy',
    status VARCHAR(20) NOT NULL COMMENT 'Status: success, failed, pending',
    from_version VARCHAR(50) DEFAULT NULL COMMENT 'Source firmware version',
    to_version VARCHAR(50) DEFAULT NULL COMMENT 'Target firmware version',
    message TEXT DEFAULT NULL COMMENT 'Additional details/error message',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_device_id (device_id),
    INDEX idx_action (action),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Verify tables created
-- =============================================
SHOW TABLES LIKE 'ota_%';

-- NOTE: Sample data has been removed to prevent 
-- deleted records from reappearing after restart.
