-- Advanced Features Migration
-- Adds: Webhooks, Device Configs, Rollback Protection fields

-- ==================== WEBHOOKS TABLE ====================
-- Stores webhook configurations for event notifications
CREATE TABLE IF NOT EXISTS webhooks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    secret VARCHAR(255), -- HMAC secret for signature verification
    events VARCHAR(500) NOT NULL DEFAULT '[]', -- JSON array of event types
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_triggered_at TIMESTAMP NULL,
    last_status_code INT NULL,
    failure_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==================== DEVICE CONFIGS TABLE ====================
-- Stores device configuration with versioning
CREATE TABLE IF NOT EXISTS device_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL, -- Config set name (e.g., "production", "testing")
    config_data TEXT NOT NULL, -- JSON configuration
    version INT NOT NULL DEFAULT 1,
    is_default TINYINT(1) NOT NULL DEFAULT 0, -- Default config for new devices
    target_group VARCHAR(100), -- Apply to specific group, NULL = all
    target_devices TEXT, -- JSON array of specific MAC addresses
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ==================== DEVICE CONFIG ASSIGNMENTS TABLE ====================
-- Tracks which config version each device has
CREATE TABLE IF NOT EXISTS device_config_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mac_address VARCHAR(12) NOT NULL,
    config_id INT NOT NULL,
    config_version INT NOT NULL,
    applied_at TIMESTAMP NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, applied, failed
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_device_config (mac_address),
    FOREIGN KEY (config_id) REFERENCES device_configs(id) ON DELETE CASCADE
);

-- ==================== ROLLBACK PROTECTION FIELDS ====================
-- Add update tracking fields to devices table
ALTER TABLE devices 
    ADD COLUMN IF NOT EXISTS update_started_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS expected_checkin_by TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS update_attempts INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_at_risk TINYINT(1) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS config_version INT DEFAULT 0;

-- ==================== REMOTE CONSOLE COMMANDS TABLE ====================
-- Stores pending commands for devices
CREATE TABLE IF NOT EXISTS device_commands (
    id INT PRIMARY KEY AUTO_INCREMENT,
    mac_address VARCHAR(12) NOT NULL,
    command VARCHAR(50) NOT NULL, -- reboot, factory_reset, config_reload, custom
    payload TEXT, -- Optional command payload
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, acknowledged, failed, expired
    expires_at TIMESTAMP NULL,
    sent_at TIMESTAMP NULL,
    acknowledged_at TIMESTAMP NULL,
    response TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick command lookup
CREATE INDEX IF NOT EXISTS idx_device_commands_mac_status ON device_commands(mac_address, status);
CREATE INDEX IF NOT EXISTS idx_devices_at_risk ON devices(is_at_risk);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active);
