// Database Migration Script for Neon PostgreSQL
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🚀 Starting database migration...');
  console.log('📍 Database:', DATABASE_URL.split('@')[1].split('/')[0]);

  try {
    const sql = neon(DATABASE_URL, { 
      fullResults: true,
      arrayMode: false 
    });
    
    // Read migration file
    const migrationPath = join(__dirname, '..', 'migrations', '0001_initial_schema.sql');
    let migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Executing migration: 0001_initial_schema.sql');
    
    // Remove comments and split into statements
    migrationSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    let executed = 0;
    let skipped = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        // Use neon's tagged template syntax with template string
        const result = await (async () => sql`${statement}`)();
        executed++;
        if ((i + 1) % 10 === 0) {
          console.log(`   ✓ Executed ${executed} statements (${skipped} skipped)...`);
        }
      } catch (err) {
        // Ignore "already exists" errors
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          skipped++;
        } else {
          console.error(`⚠️  Statement ${i + 1} failed:`, err.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
          throw err;
        }
      }
    }
    
    console.log(`✅ Migration completed! (${executed} executed, ${skipped} skipped)`);
    console.log('\n📊 Database schema created:');
    console.log('   - pgvector extension enabled');
    console.log('   - 10 tables created');
    console.log('   - Indexes and constraints applied');
    console.log('   - Sample admin user inserted');
    console.log('\n👤 Default admin credentials:');
    console.log('   Email: admin@example.go.kr');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

runMigration();
