-- =============================================
-- Migration: Add is_cleared column to device_logs
-- =============================================

-- Add is_cleared column if it doesn't exist
ALTER TABLE device_logs ADD COLUMN is_cleared INT NOT NULL DEFAULT 0 AFTER message;

-- Add index for is_cleared if it doesn't exist  
ALTER TABLE device_logs ADD INDEX idx_is_cleared (is_cleared);
