/**
 * Database Service Implementation
 * Real PostgreSQL CRUD operations using Neon serverless driver
 */

import type { QueryResult } from '../utils/db';
import type {
  Law,
  LawRevision,
  Article,
  LocalRegulation,
  RegulationArticle,
  ImpactAnalysis,
  User,
  Notification
} from '../types/database';

export class DatabaseService {
  constructor(private db: any) {}

  // ============================================================
  // Laws
  // ============================================================

  async createLaw(law: Omit<Law, 'created_at' | 'updated_at'>): Promise<Law> {
    const result = await this.db.queryOne<Law>(
      `INSERT INTO laws (
        law_id, law_type, law_name, law_number, enactment_date,
        current_version, status, ministry, category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        law.law_id,
        law.law_type,
        law.law_name,
        law.law_number,
        law.enactment_date,
        law.current_version,
        law.status,
        law.ministry,
        law.category
      ]
    );
    
    if (!result) {
      throw new Error('Failed to create law');
    }
    
    return result;
  }

  async getLawById(lawId: string): Promise<Law | null> {
    return this.db.queryOne<Law>(
      'SELECT * FROM laws WHERE law_id = $1',
      [lawId]
    );
  }

  async getLaws(filters?: {
    law_type?: string;
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ laws: Law[]; total: number }> {
    let query = 'SELECT * FROM laws WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.law_type) {
      query += ` AND law_type = $${paramIndex++}`;
      params.push(filters.law_type);
    }

    if (filters?.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }

    if (filters?.category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(filters.category);
    }

    // Count total
    const countResult = await this.db.queryOne<{ count: string }>(
      query.replace('SELECT *', 'SELECT COUNT(*) as count'),
      params
    );
    const total = parseInt(countResult?.count || '0');

    // Add pagination
    query += ' ORDER BY created_at DESC';
    
    if (filters?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await this.db.query<Law>(query, params);

    return {
      laws: result.rows,
      total
    };
  }

  async updateLaw(lawId: string, updates: Partial<Law>): Promise<Law | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'law_id' && key !== 'created_at') {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      return this.getLawById(lawId);
    }

    values.push(lawId);

    return this.db.queryOne<Law>(
      `UPDATE laws SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE law_id = $${paramIndex}
       RETURNING *`,
      values
    );
  }

  async deleteLaw(lawId: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM laws WHERE law_id = $1',
      [lawId]
    );
    return result.rowCount > 0;
  }

  // ============================================================
  // Law Revisions
  // ============================================================

  async createRevision(revision: Omit<LawRevision, 'created_at'>): Promise<LawRevision> {
    const result = await this.db.queryOne<LawRevision>(
      `INSERT INTO law_revisions (
        revision_id, law_id, revision_type, revision_date, enforcement_date,
        revision_reason, previous_version, new_version, changed_articles
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        revision.revision_id,
        revision.law_id,
        revision.revision_type,
        revision.revision_date,
        revision.enforcement_date,
        revision.revision_reason,
        revision.previous_version,
        revision.new_version,
        JSON.stringify(revision.changed_articles)
      ]
    );

    if (!result) {
      throw new Error('Failed to create revision');
    }

    return result;
  }

  async getRevisionsByLawId(lawId: string): Promise<LawRevision[]> {
    const result = await this.db.query<LawRevision>(
      'SELECT * FROM law_revisions WHERE law_id = $1 ORDER BY revision_date DESC',
      [lawId]
    );
    return result.rows;
  }

  async getRecentRevisions(days: number = 7): Promise<LawRevision[]> {
    const result = await this.db.query<LawRevision>(
      `SELECT * FROM law_revisions 
       WHERE revision_date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY revision_date DESC`,
      []
    );
    return result.rows;
  }

  // ============================================================
  // Articles
  // ============================================================

  async createArticle(article: Omit<Article, 'created_at'>): Promise<Article> {
    const result = await this.db.queryOne<Article>(
      `INSERT INTO articles (
        article_id, law_id, revision_id, article_number, article_title,
        article_content, article_type, parent_article_id, vector_embedding
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        article.article_id,
        article.law_id,
        article.revision_id,
        article.article_number,
        article.article_title,
        article.article_content,
        article.article_type,
        article.parent_article_id || null,
        article.vector_embedding ? JSON.stringify(article.vector_embedding) : null
      ]
    );

    if (!result) {
      throw new Error('Failed to create article');
    }

    return result;
  }

  async createArticles(articles: Omit<Article, 'created_at'>[]): Promise<Article[]> {
    const results: Article[] = [];
    
    for (const article of articles) {
      const created = await this.createArticle(article);
      results.push(created);
    }
    
    return results;
  }

  async getArticlesByLawId(lawId: string): Promise<Article[]> {
    const result = await this.db.query<Article>(
      'SELECT * FROM articles WHERE law_id = $1 ORDER BY article_number',
      [lawId]
    );
    return result.rows;
  }

  async updateArticleEmbedding(articleId: string, embedding: number[]): Promise<void> {
    await this.db.query(
      'UPDATE articles SET vector_embedding = $1 WHERE article_id = $2',
      [JSON.stringify(embedding), articleId]
    );
  }

  // ============================================================
  // Users
  // ============================================================

  async getUserByEmail(email: string): Promise<User | null> {
    return this.db.queryOne<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.db.queryOne<User>(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );
  }

  async createUser(user: Omit<User, 'created_at'>): Promise<User> {
    const result = await this.db.queryOne<User>(
      `INSERT INTO users (
        user_id, username, email, password_hash, local_gov, department,
        role, notification_settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        user.user_id,
        user.username,
        user.email,
        user.password_hash,
        user.local_gov,
        user.department,
        user.role,
        JSON.stringify(user.notification_settings)
      ]
    );

    if (!result) {
      throw new Error('Failed to create user');
    }

    return result;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && key !== 'user_id' && key !== 'created_at') {
        if (key === 'notification_settings') {
          fields.push(`${key} = $${paramIndex++}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }
    });

    if (fields.length === 0) {
      return this.getUserById(userId);
    }

    values.push(userId);

    return this.db.queryOne<User>(
      `UPDATE users SET ${fields.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING *`,
      values
    );
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1',
      [userId]
    );
  }

  // ============================================================
  // Notifications
  // ============================================================

  async createNotification(notification: Omit<Notification, 'sent_at'>): Promise<Notification> {
    const result = await this.db.queryOne<Notification>(
      `INSERT INTO notifications (
        notification_id, user_id, analysis_id, notification_type,
        title, message, read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        notification.notification_id,
        notification.user_id,
        notification.analysis_id,
        notification.notification_type,
        notification.title,
        notification.message,
        notification.read
      ]
    );

    if (!result) {
      throw new Error('Failed to create notification');
    }

    return result;
  }

  async getNotificationsByUserId(
    userId: string,
    unreadOnly: boolean = false,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ notifications: Notification[]; total: number }> {
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params: any[] = [userId];

    if (unreadOnly) {
      query += ' AND read = false';
    }

    // Count total
    const countResult = await this.db.queryOne<{ count: string }>(
      query.replace('SELECT *', 'SELECT COUNT(*) as count'),
      params
    );
    const total = parseInt(countResult?.count || '0');

    // Add pagination
    query += ' ORDER BY sent_at DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);

    const result = await this.db.query<Notification>(query, params);

    return {
      notifications: result.rows,
      total
    };
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await this.db.queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );
    return parseInt(result?.count || '0');
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.db.query(
      'UPDATE notifications SET read = true, read_at = CURRENT_TIMESTAMP WHERE notification_id = $1',
      [notificationId]
    );
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await this.db.query(
      'UPDATE notifications SET read = true, read_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND read = false',
      [userId]
    );
    return result.rowCount;
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM notifications WHERE notification_id = $1',
      [notificationId]
    );
    return result.rowCount > 0;
  }

  // ============================================================
  // Vector Search
  // ============================================================

  async findSimilarArticles(
    embedding: number[],
    limit: number = 10,
    threshold: number = 0.8
  ): Promise<Article[]> {
    // Using pgvector's cosine similarity operator
    const result = await this.db.query<Article>(
      `SELECT *, 1 - (vector_embedding <=> $1::vector) as similarity
       FROM articles
       WHERE 1 - (vector_embedding <=> $1::vector) > $2
       ORDER BY vector_embedding <=> $1::vector
       LIMIT $3`,
      [JSON.stringify(embedding), threshold, limit]
    );
    return result.rows;
  }
}

/**
 * Create database service instance
 */
export function createDatabaseService(db: any): DatabaseService {
  return new DatabaseService(db);
}
