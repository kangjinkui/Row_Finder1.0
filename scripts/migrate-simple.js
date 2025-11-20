// Simple Database Migration for Neon
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

console.log('🚀 Creating database schema...\n');

try {
  // 1. Enable extensions
  console.log('1️⃣ Enabling extensions...');
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  console.log('✓ Extensions enabled\n');

  // 2. Create laws table
  console.log('2️⃣ Creating laws table...');
  await sql`
    CREATE TABLE IF NOT EXISTS laws (
      law_id VARCHAR(100) PRIMARY KEY,
      law_type VARCHAR(50) NOT NULL CHECK (law_type IN ('법률', '시행령', '시행규칙')),
      law_name TEXT NOT NULL,
      law_number VARCHAR(100) NOT NULL,
      enactment_date DATE NOT NULL,
      current_version VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('시행', '폐지')),
      ministry VARCHAR(200),
      category VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_laws_type ON laws(law_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_laws_status ON laws(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_laws_category ON laws(category)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_laws_name ON laws(law_name)`;
  console.log('✓ Laws table created\n');

  // 3. Create law_revisions table
  console.log('3️⃣ Creating law_revisions table...');
  await sql`
    CREATE TABLE IF NOT EXISTS law_revisions (
      revision_id VARCHAR(100) PRIMARY KEY,
      law_id VARCHAR(100) NOT NULL REFERENCES laws(law_id) ON DELETE CASCADE,
      revision_type VARCHAR(50) NOT NULL CHECK (revision_type IN ('신규', '일부개정', '전부개정', '폐지')),
      revision_date DATE NOT NULL,
      enforcement_date DATE NOT NULL,
      revision_reason TEXT,
      previous_version VARCHAR(50),
      new_version VARCHAR(50) NOT NULL,
      changed_articles JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_law_revisions_law_id ON law_revisions(law_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_law_revisions_date ON law_revisions(revision_date DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_law_revisions_type ON law_revisions(revision_type)`;
  console.log('✓ Law revisions table created\n');

  // 4. Create articles table
  console.log('4️⃣ Creating articles table...');
  await sql`
    CREATE TABLE IF NOT EXISTS articles (
      article_id VARCHAR(100) PRIMARY KEY,
      law_id VARCHAR(100) NOT NULL REFERENCES laws(law_id) ON DELETE CASCADE,
      revision_id VARCHAR(100) NOT NULL REFERENCES law_revisions(revision_id) ON DELETE CASCADE,
      article_number VARCHAR(50) NOT NULL,
      article_title TEXT,
      article_content TEXT NOT NULL,
      article_type VARCHAR(20) NOT NULL CHECK (article_type IN ('본문', '부칙', '별표')),
      parent_article_id VARCHAR(100) REFERENCES articles(article_id),
      vector_embedding vector(1536),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_law_id ON articles(law_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_revision_id ON articles(revision_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_number ON articles(article_number)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_type ON articles(article_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_articles_embedding ON articles USING ivfflat (vector_embedding vector_cosine_ops) WITH (lists = 100)`;
  console.log('✓ Articles table created\n');

  // 5. Create local_regulations table
  console.log('5️⃣ Creating local_regulations table...');
  await sql`
    CREATE TABLE IF NOT EXISTS local_regulations (
      regulation_id VARCHAR(100) PRIMARY KEY,
      regulation_type VARCHAR(20) NOT NULL CHECK (regulation_type IN ('조례', '규칙')),
      regulation_name TEXT NOT NULL,
      local_gov VARCHAR(200) NOT NULL,
      local_gov_code VARCHAR(20) NOT NULL,
      enactment_date DATE NOT NULL,
      current_version VARCHAR(50) NOT NULL,
      department VARCHAR(200),
      status VARCHAR(20) NOT NULL CHECK (status IN ('시행', '폐지')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_regulations_type ON local_regulations(regulation_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_regulations_local_gov ON local_regulations(local_gov_code)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_regulations_department ON local_regulations(department)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_regulations_status ON local_regulations(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_regulations_name ON local_regulations(regulation_name)`;
  console.log('✓ Local regulations table created\n');

  // 6. Create regulation_articles table
  console.log('6️⃣ Creating regulation_articles table...');
  await sql`
    CREATE TABLE IF NOT EXISTS regulation_articles (
      reg_article_id VARCHAR(100) PRIMARY KEY,
      regulation_id VARCHAR(100) NOT NULL REFERENCES local_regulations(regulation_id) ON DELETE CASCADE,
      article_number VARCHAR(50) NOT NULL,
      article_title TEXT,
      article_content TEXT NOT NULL,
      article_type VARCHAR(20) NOT NULL CHECK (article_type IN ('본문', '부칙', '별표')),
      parent_article_id VARCHAR(100) REFERENCES regulation_articles(reg_article_id),
      vector_embedding vector(1536),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_reg_articles_regulation_id ON regulation_articles(regulation_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_reg_articles_number ON regulation_articles(article_number)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_reg_articles_type ON regulation_articles(article_type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_reg_articles_embedding ON regulation_articles USING ivfflat (vector_embedding vector_cosine_ops) WITH (lists = 100)`;
  console.log('✓ Regulation articles table created\n');

  // 7. Create users table
  console.log('7️⃣ Creating users table...');
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(100) PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      local_gov VARCHAR(200) NOT NULL,
      department VARCHAR(200),
      role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'law_officer', 'dept_officer', 'viewer')),
      notification_settings JSONB DEFAULT '{"email_enabled": true, "push_enabled": true, "impact_levels": ["HIGH", "MEDIUM"], "departments": []}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_local_gov ON users(local_gov)`;
  console.log('✓ Users table created\n');

  // 8. Create law_regulation_links table
  console.log('8️⃣ Creating law_regulation_links table...');
  await sql`
    CREATE TABLE IF NOT EXISTS law_regulation_links (
      link_id VARCHAR(100) PRIMARY KEY,
      law_id VARCHAR(100) NOT NULL REFERENCES laws(law_id) ON DELETE CASCADE,
      regulation_id VARCHAR(100) NOT NULL REFERENCES local_regulations(regulation_id) ON DELETE CASCADE,
      article_id VARCHAR(100) REFERENCES articles(article_id),
      reg_article_id VARCHAR(100) REFERENCES regulation_articles(reg_article_id),
      link_type VARCHAR(20) NOT NULL CHECK (link_type IN ('근거법령', '준용', '참조')),
      confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
      verified BOOLEAN DEFAULT FALSE,
      verified_by VARCHAR(100),
      verified_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_links_law_id ON law_regulation_links(law_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_links_regulation_id ON law_regulation_links(regulation_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_links_verified ON law_regulation_links(verified)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_links_type ON law_regulation_links(link_type)`;
  console.log('✓ Law regulation links table created\n');

  // 9. Create impact_analyses table
  console.log('9️⃣ Creating impact_analyses table...');
  await sql`
    CREATE TABLE IF NOT EXISTS impact_analyses (
      analysis_id VARCHAR(100) PRIMARY KEY,
      revision_id VARCHAR(100) NOT NULL REFERENCES law_revisions(revision_id) ON DELETE CASCADE,
      regulation_id VARCHAR(100) NOT NULL REFERENCES local_regulations(regulation_id) ON DELETE CASCADE,
      article_id VARCHAR(100) NOT NULL REFERENCES articles(article_id),
      reg_article_id VARCHAR(100) NOT NULL REFERENCES regulation_articles(reg_article_id),
      impact_level VARCHAR(20) NOT NULL CHECK (impact_level IN ('HIGH', 'MEDIUM', 'LOW')),
      impact_type VARCHAR(20) NOT NULL CHECK (impact_type IN ('필수개정', '권고개정', '검토필요', '영향없음')),
      change_summary TEXT NOT NULL,
      ai_recommendation TEXT NOT NULL,
      confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
      reviewed BOOLEAN DEFAULT FALSE,
      reviewer_id VARCHAR(100) REFERENCES users(user_id),
      reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_analyses_revision_id ON impact_analyses(revision_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_analyses_regulation_id ON impact_analyses(regulation_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_analyses_impact_level ON impact_analyses(impact_level)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_analyses_reviewed ON impact_analyses(reviewed)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON impact_analyses(created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_analyses_composite ON impact_analyses(impact_level, reviewed, created_at DESC)`;
  console.log('✓ Impact analyses table created\n');

  // 10. Create notifications table
  console.log('🔟 Creating notifications table...');
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id VARCHAR(100) PRIMARY KEY,
      user_id VARCHAR(100) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      analysis_id VARCHAR(100) NOT NULL REFERENCES impact_analyses(analysis_id) ON DELETE CASCADE,
      notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('urgent', 'normal', 'info')),
      title VARCHAR(500) NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notifications_composite ON notifications(user_id, read, sent_at DESC)`;
  console.log('✓ Notifications table created\n');

  // 11. Create review_history table
  console.log('1️⃣1️⃣ Creating review_history table...');
  await sql`
    CREATE TABLE IF NOT EXISTS review_history (
      history_id VARCHAR(100) PRIMARY KEY,
      analysis_id VARCHAR(100) NOT NULL REFERENCES impact_analyses(analysis_id) ON DELETE CASCADE,
      user_id VARCHAR(100) NOT NULL REFERENCES users(user_id),
      action VARCHAR(20) NOT NULL CHECK (action IN ('검토시작', '의견입력', '개정결정', '개정불요', '보류')),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_review_history_analysis_id ON review_history(analysis_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_review_history_user_id ON review_history(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_review_history_created_at ON review_history(created_at DESC)`;
  console.log('✓ Review history table created\n');

  // 12. Create triggers
  console.log('1️⃣2️⃣ Creating triggers...');
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql'
  `;
  try {
    await sql`DROP TRIGGER IF EXISTS update_laws_updated_at ON laws`;
    await sql`
      CREATE TRIGGER update_laws_updated_at 
      BEFORE UPDATE ON laws
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `;
  } catch (e) {
    // Trigger may already exist
  }
  
  try {
    await sql`DROP TRIGGER IF EXISTS update_local_regulations_updated_at ON local_regulations`;
    await sql`
      CREATE TRIGGER update_local_regulations_updated_at 
      BEFORE UPDATE ON local_regulations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `;
  } catch (e) {
    // Trigger may already exist
  }
  console.log('✓ Triggers created\n');

  // 13. Insert sample admin user
  console.log('1️⃣3️⃣ Creating admin user...');
  await sql`
    INSERT INTO users (user_id, username, email, password_hash, local_gov, department, role)
    VALUES (
      'user_admin_001',
      'admin',
      'admin@example.go.kr',
      '$2a$10$rBV2TfAWRlk3U8xGPQXSJeK3HqM1CvqXcf2mP8WdHq3Yj2HXOxqty',
      '서울특별시',
      '법무과',
      'admin'
    )
    ON CONFLICT (user_id) DO NOTHING
  `;
  console.log('✓ Admin user created\n');

  console.log('✅ Migration completed successfully!\n');
  console.log('📊 Database schema:');
  console.log('   - 2 extensions (uuid-ossp, pgvector)');
  console.log('   - 10 tables with indexes');
  console.log('   - Triggers for updated_at');
  console.log('   - Sample admin user\n');
  console.log('👤 Admin credentials:');
  console.log('   Email: admin@example.go.kr');
  console.log('   Password: admin123');

} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  if (error.detail) {
    console.error('Detail:', error.detail);
  }
  process.exit(1);
}
