import { createPool } from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Environment configuration
const DB_HOST = process.env.DB_HOST || "15.206.156.197";
const DB_PORT = parseInt(process.env.DB_PORT || "3306");
const DB_USER = process.env.DB_USER || "satya";
const DB_PASSWORD = process.env.DB_PASSWORD || "satya123";
const DB_NAME = process.env.DB_NAME || "ota_db";

const pool = createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  multipleStatements: true
});

async function runMigration() {
  const migrationsDir = path.join(process.cwd(), "migrations");
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  const conn = await pool.getConnection();
  
  try {
    for (const file of migrationFiles) {
      console.log(`\n📄 Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      
      try {
        await conn.query(sql);
        console.log(`✅ Migration ${file} completed`);
      } catch (error: any) {
        if (error.code === "ER_TABLE_EXISTS_ERROR") {
          console.log(`⏭️  Table already exists, skipping...`);
        } else if (error.code === "ER_DUP_ENTRY") {
          console.log(`⏭️  Duplicate entry, skipping...`);
        } else {
          console.error(`❌ Migration ${file} failed:`, error.message);
        }
      }
    }
    console.log('\n🎉 All migrations completed!');
  } finally {
    conn.release();
    await pool.end();
  }
}

runMigration();
