-- OTA Device Configuration Table
-- Links to products table via MAC address to store OTA-specific data
-- This allows tracking firmware versions without modifying the products table

CREATE TABLE IF NOT EXISTS ota_device_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mac_id VARCHAR(100) NOT NULL UNIQUE,
  current_version VARCHAR(50) DEFAULT '',
  previous_version VARCHAR(50) DEFAULT '',
  target_version VARCHAR(50) DEFAULT '',
  ota_status VARCHAR(20) DEFAULT 'idle',  -- idle, pending, updating, updated, failed
  last_ota_check TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mac_id (mac_id),
  INDEX idx_ota_status (ota_status)
);

-- Migrate any existing ota_devices to ota_device_config
INSERT IGNORE INTO ota_device_config (mac_id, current_version, previous_version, target_version, ota_status)
SELECT mac, current_version, previous_version, target_version, 
  CASE 
    WHEN status = 'pending' THEN 'pending'
    WHEN status = 'updating' THEN 'updating'
    WHEN status = 'updated' THEN 'updated'
    WHEN status = 'failed' THEN 'failed'
    ELSE 'idle'
  END
FROM ota_devices;
