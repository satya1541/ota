-- Migration: Add authentication columns to users table
-- This adds email, PIN, password reset, and last login columns

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN email VARCHAR(255) NOT NULL UNIQUE AFTER id,
ADD COLUMN pin VARCHAR(4) NULL AFTER password,
ADD COLUMN reset_token VARCHAR(64) NULL AFTER pin,
ADD COLUMN reset_token_expiry TIMESTAMP NULL AFTER reset_token,
ADD COLUMN last_login TIMESTAMP NULL AFTER reset_token_expiry;

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Create index on reset_token for password reset lookups
CREATE INDEX idx_users_reset_token ON users(reset_token);
