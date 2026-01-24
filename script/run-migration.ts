// Run this script with: npx tsx script/run-migration.ts

import mysql from "mysql2/promise";

const DB_HOST = process.env.DB_HOST || "40.192.42.60";
const DB_PORT = parseInt(process.env.DB_PORT || "3306");
const DB_USER = process.env.DB_USER || "testing";
const DB_PASSWORD = process.env.DB_PASSWORD || "testing@2025";
const DB_NAME = process.env.DB_NAME || "ota_db";

async function runMigration() {
    console.log("Connecting to database...");

    const connection = await mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        multipleStatements: true,
    });

    console.log("Connected! Running migration...\n");

    try {
        // Check if email column already exists
        const [columns] = await connection.query(
            "SHOW COLUMNS FROM users LIKE 'email'"
        );

        if (Array.isArray(columns) && columns.length > 0) {
            console.log("✅ Migration already applied - 'email' column exists");
            await connection.end();
            return;
        }

        // Run migration
        const migrationSQL = `
      ALTER TABLE users 
      ADD COLUMN email VARCHAR(255) NOT NULL DEFAULT '' AFTER id,
      ADD COLUMN pin VARCHAR(4) NULL AFTER password,
      ADD COLUMN reset_token VARCHAR(64) NULL AFTER pin,
      ADD COLUMN reset_token_expiry TIMESTAMP NULL AFTER reset_token,
      ADD COLUMN last_login TIMESTAMP NULL AFTER reset_token_expiry;
    `;

        await connection.query(migrationSQL);
        console.log("✅ Added columns: email, pin, reset_token, reset_token_expiry, last_login");

        // Create indexes
        try {
            await connection.query("CREATE INDEX idx_users_email ON users(email)");
            console.log("✅ Created index: idx_users_email");
        } catch (e: any) {
            if (e.code !== "ER_DUP_KEYNAME") throw e;
            console.log("⚠️  Index idx_users_email already exists");
        }

        try {
            await connection.query("CREATE INDEX idx_users_reset_token ON users(reset_token)");
            console.log("✅ Created index: idx_users_reset_token");
        } catch (e: any) {
            if (e.code !== "ER_DUP_KEYNAME") throw e;
            console.log("⚠️  Index idx_users_reset_token already exists");
        }

        console.log("\n🎉 Migration completed successfully!");

    } catch (error: any) {
        console.error("❌ Migration failed:", error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

runMigration().catch(() => process.exit(1));
