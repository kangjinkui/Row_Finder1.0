// Test Neon connection directly
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

console.log('Testing Neon connection...\n');

const sql = neon(DATABASE_URL);

try {
  // Test 1: Simple query with template
  console.log('Test 1: Simple SELECT with template literal');
  const result1 = await sql`SELECT COUNT(*) as count FROM users`;
  console.log('✅ Result:', result1);
  
  // Test 2: Query with parameter
  console.log('\nTest 2: SELECT with parameter');
  const email = 'admin@example.go.kr';
  const result2 = await sql`SELECT * FROM users WHERE email = ${email}`;
  console.log('✅ Result:', result2);
  
  if (result2.length > 0) {
    console.log('\n✅ User found:', result2[0].username);
  } else {
    console.log('\n❌ No user found');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
