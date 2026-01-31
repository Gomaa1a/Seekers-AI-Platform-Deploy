/**
 * Seekers AI Platform - Database Seed Script
 * Run with: npm run seed
 * Creates sample data for testing
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/seekers_saas';

async function seed() {
  console.log('🌱 Starting database seeding...\n');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Create test client user
    console.log('👤 Creating test client user...');
    const clientPassword = await bcrypt.hash('Client@123', 12);
    const clientId = uuidv4();
    
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, phone, status, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (email) DO NOTHING;
    `, [clientId, 'client@test.com', clientPassword, 'Test', 'Client', '+201234567890', 'active', true]);

    // Create test organization
    console.log('🏢 Creating test organization...');
    const orgId = uuidv4();
    
    await client.query(`
      INSERT INTO organizations (id, owner_id, name, domain, status, plan_type, settings)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT DO NOTHING;
    `, [
      orgId, 
      clientId, 
      'Test Organization', 
      'test-org.com',
      'active',
      'professional',
      JSON.stringify({ language: 'en', notifications: true })
    ]);

    // Create sample knowledge base
    console.log('📚 Creating sample knowledge base...');
    const kbId = uuidv4();
    
    await client.query(`
      INSERT INTO knowledge_bases (id, organization_id, name, description, type, content, version, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT DO NOTHING;
    `, [
      kbId,
      orgId,
      'Customer Support FAQ',
      'Frequently asked questions for customer support chatbot',
      'chatbot',
      `# Customer Support Knowledge Base

## Business Hours
We are open Monday to Friday, 9 AM to 6 PM (Cairo Time).
Weekend support is available via email.

## Return Policy
- Returns are accepted within 14 days of purchase
- Items must be in original packaging
- Refunds processed within 5-7 business days

## Shipping Information
- Local delivery: 2-3 business days
- International: 7-14 business days
- Free shipping on orders over 500 EGP

## Contact Information
- Email: support@example.com
- Phone: +20 123 456 7890
- WhatsApp: +20 123 456 7890

## Common Questions

Q: How do I track my order?
A: You can track your order using the tracking link sent to your email.

Q: Do you offer gift wrapping?
A: Yes! Gift wrapping is available for 25 EGP per item.

Q: Can I change my shipping address?
A: You can change your address within 2 hours of placing the order.`,
      1,
      true,
      clientId
    ]);

    // Create sample workflow request
    console.log('📝 Creating sample workflow request...');
    const wrId = uuidv4();
    
    await client.query(`
      INSERT INTO workflow_requests (id, organization_id, request_type, title, description, platforms, status, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT DO NOTHING;
    `, [
      wrId,
      orgId,
      'chatbot',
      'Facebook Messenger Chatbot',
      'Need an AI chatbot for our Facebook page to handle customer inquiries about products and shipping.',
      JSON.stringify(['facebook']),
      'pending',
      'normal'
    ]);

    // Create sample notification for admin
    console.log('🔔 Creating sample notifications...');
    const adminResult = await client.query(`SELECT id FROM admin_users LIMIT 1;`);
    
    if (adminResult.rows.length > 0) {
      await client.query(`
        INSERT INTO notifications (user_id, user_type, type, title, message, metadata, priority)
        VALUES ($1, $2, $3, $4, $5, $6, $7);
      `, [
        adminResult.rows[0].id,
        'admin',
        'new_workflow_request',
        'New Workflow Request',
        'Test Organization has submitted a new workflow request for Facebook Messenger Chatbot.',
        JSON.stringify({ organization_id: orgId, workflow_request_id: wrId }),
        'normal'
      ]);
    }

    // Create client notification
    await client.query(`
      INSERT INTO notifications (user_id, user_type, type, title, message, priority)
      VALUES ($1, $2, $3, $4, $5, $6);
    `, [
      clientId,
      'client',
      'welcome',
      'Welcome to Seekers AI!',
      'Your account has been created successfully. Complete your onboarding to get started.',
      'normal'
    ]);

    client.release();

    console.log('\n✨ Seeding completed!\n');
    console.log('📋 Test Accounts:');
    console.log('─────────────────────────────────────────');
    console.log('Admin:');
    console.log('   Email: admin@seekers.ai');
    console.log('   Password: Admin@123');
    console.log('');
    console.log('Client:');
    console.log('   Email: client@test.com');
    console.log('   Password: Client@123');
    console.log('─────────────────────────────────────────');
    console.log('\n🚀 Ready to start: npm run dev');

  } catch (error: any) {
    console.error('\n❌ Seeding failed:', error.message);
    
    if (error.code === '23505') {
      console.log('\n💡 Some records already exist (duplicate key). This is OK.');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seed
seed();
