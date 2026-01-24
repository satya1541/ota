-- Migration: Add advanced analytics tables
-- Date: 2026-01-05

-- Staged Rollouts table for phased deployments
CREATE TABLE IF NOT EXISTS staged_rollouts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  version VARCHAR(50) NOT NULL,
  current_stage INT DEFAULT 1,
  stage_percentages VARCHAR(100) DEFAULT '[5, 25, 50, 100]',
  status VARCHAR(20) DEFAULT 'active',
  total_devices INT DEFAULT 0,
  updated_devices INT DEFAULT 0,
  failed_devices INT DEFAULT 0,
  auto_expand TINYINT DEFAULT 1,
  expand_after_minutes INT DEFAULT 30,
  failure_threshold INT DEFAULT 10,
  last_expanded TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_version (version),
  INDEX idx_status (status)
);

-- Deployment Analytics table for metrics
CREATE TABLE IF NOT EXISTS deployment_analytics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  version VARCHAR(50) NOT NULL,
  total_attempts INT DEFAULT 0,
  success_count INT DEFAULT 0,
  failure_count INT DEFAULT 0,
  avg_update_time_ms INT NULL,
  min_update_time_ms INT NULL,
  max_update_time_ms INT NULL,
  avg_download_bytes INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_version (version)
);

-- Device Heartbeats table for health history
CREATE TABLE IF NOT EXISTS device_heartbeats (
  id INT PRIMARY KEY AUTO_INCREMENT,
  mac_address VARCHAR(12) NOT NULL,
  signal_strength INT NULL,
  free_heap INT NULL,
  uptime INT NULL,
  cpu_temp INT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mac (mac_address),
  INDEX idx_created (created_at)
);

-- Add new columns to devices table (ignore errors if columns already exist)
-- Run each ALTER separately so one failure doesn't stop the rest

SET @dbname = DATABASE();

-- Add latitude column
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'latitude') = 0,
  'ALTER TABLE devices ADD COLUMN latitude VARCHAR(20) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add longitude column
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'longitude') = 0,
  'ALTER TABLE devices ADD COLUMN longitude VARCHAR(20) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add location column
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'location') = 0,
  'ALTER TABLE devices ADD COLUMN location VARCHAR(255) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add health_score column
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'health_score') = 0,
  'ALTER TABLE devices ADD COLUMN health_score INT DEFAULT 100',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add signal_strength column
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'signal_strength') = 0,
  'ALTER TABLE devices ADD COLUMN signal_strength INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add free_heap column
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'free_heap') = 0,
  'ALTER TABLE devices ADD COLUMN free_heap INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add uptime column
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'uptime') = 0,
  'ALTER TABLE devices ADD COLUMN uptime INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add last_heartbeat column
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'last_heartbeat') = 0,
  'ALTER TABLE devices ADD COLUMN last_heartbeat TIMESTAMP NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add consecutive_failures column
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'consecutive_failures') = 0,
  'ALTER TABLE devices ADD COLUMN consecutive_failures INT DEFAULT 0',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add test_group column
SET @sql = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'devices' AND COLUMN_NAME = 'test_group') = 0,
  'ALTER TABLE devices ADD COLUMN test_group VARCHAR(10) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
