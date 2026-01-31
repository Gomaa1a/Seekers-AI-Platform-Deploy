/**
 * Seekers AI Platform - Database Migration Script
 * Run with: npm run migrate
 * 
 * This script runs all migrations in order, tracking which have been applied
 * in a migrations table to avoid re-running them.
 */

import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/seekers_saas';

async function migrate() {
  console.log('🚀 Starting database migration...\n');
  
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Test connection
    console.log('📡 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL\n');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort to ensure order: 001, 002, 003, etc.

    console.log(`📁 Found ${migrationFiles.length} migration file(s)\n`);

    // Get already applied migrations
    const appliedResult = await client.query('SELECT name FROM _migrations');
    const appliedMigrations = new Set(appliedResult.rows.map(r => r.name));

    let migrationsRun = 0;

    for (const file of migrationFiles) {
      if (appliedMigrations.has(file)) {
        console.log(`⏭️  Skipping ${file} (already applied)`);
        continue;
      }

      const migrationPath = path.join(migrationsDir, file);
      console.log(`\n📄 Running migration: ${file}`);
      
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await client.query('BEGIN');
        await client.query(migrationSQL);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ ${file} applied successfully`);
        migrationsRun++;
      } catch (error: any) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${error.message}`);
      }
    }

    if (migrationsRun === 0) {
      console.log('\n✅ All migrations are already applied!');
    } else {
      console.log(`\n✅ Applied ${migrationsRun} migration(s) successfully!`);
    }

    // Verify tables created
    console.log('\n🔍 Current tables:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name NOT LIKE '_%'
      ORDER BY table_name;
    `);

    tablesResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    client.release();
    console.log('\n✨ Database migration complete!');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure PostgreSQL is running:');
      console.error('   - Check if Docker container is up: docker ps');
      console.error('   - Or start PostgreSQL service locally');
    } else if (error.code === '3D000') {
      console.error('\n💡 Database does not exist. Create it first:');
      console.error('   psql -U postgres -c "CREATE DATABASE seekers_saas;"');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
migrate();
