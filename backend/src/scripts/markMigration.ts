/**
 * Mark a migration as applied without running it
 * Usage: npx ts-node src/scripts/markMigration.ts <migration_name>
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/seekers_saas';

async function markMigration(migrationName: string) {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    
    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Mark migration as applied
    await client.query(
      'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [migrationName]
    );

    console.log(`✅ Marked ${migrationName} as applied`);
    client.release();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const migrationName = process.argv[2];
if (!migrationName) {
  console.error('Usage: npx ts-node src/scripts/markMigration.ts <migration_name>');
  process.exit(1);
}

markMigration(migrationName);
