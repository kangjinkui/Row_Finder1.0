/**
 * Database Type Definitions for AI Law Impact Analysis System
 */

// Enums
export enum LawType {
  LAW = '법률',
  ENFORCEMENT_DECREE = '시행령',
  ENFORCEMENT_RULE = '시행규칙'
}

export enum LawStatus {
  ACTIVE = '시행',
  ABOLISHED = '폐지'
}

export enum RevisionType {
  NEW = '신규',
  PARTIAL = '일부개정',
  FULL = '전부개정',
  ABOLISH = '폐지'
}

export enum ArticleType {
  MAIN = '본문',
  ADDENDUM = '부칙',
  APPENDIX = '별표'
}

export enum RegulationType {
  ORDINANCE = '조례',
  RULE = '규칙'
}

export enum LinkType {
  BASIS = '근거법령',
  APPLY = '준용',
  REFERENCE = '참조'
}

export enum ImpactLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum ImpactType {
  REQUIRED = '필수개정',
  RECOMMENDED = '권고개정',
  REVIEW_NEEDED = '검토필요',
  NO_IMPACT = '영향없음'
}

export enum UserRole {
  ADMIN = 'admin',
  LAW_OFFICER = 'law_officer',
  DEPT_OFFICER = 'dept_officer',
  VIEWER = 'viewer'
}

export enum NotificationType {
  URGENT = 'urgent',
  NORMAL = 'normal',
  INFO = 'info'
}

export enum ReviewAction {
  START = '검토시작',
  COMMENT = '의견입력',
  APPROVE = '개정결정',
  REJECT = '개정불요',
  HOLD = '보류'
}

// Core Entities

export interface Law {
  law_id: string;
  law_type: LawType;
  law_name: string;
  law_number: string;
  enactment_date: Date;
  current_version: string;
  status: LawStatus;
  ministry: string;
  category: string;
  created_at: Date;
  updated_at: Date;
}

export interface LawRevision {
  revision_id: string;
  law_id: string;
  revision_type: RevisionType;
  revision_date: Date;
  enforcement_date: Date;
  revision_reason: string;
  previous_version: string;
  new_version: string;
  changed_articles: ChangedArticle[];
  created_at: Date;
}

export interface ChangedArticle {
  article_number: string;
  change_type: 'added' | 'modified' | 'deleted';
  old_content?: string;
  new_content?: string;
}

export interface Article {
  article_id: string;
  law_id: string;
  revision_id: string;
  article_number: string;
  article_title: string;
  article_content: string;
  article_type: ArticleType;
  parent_article_id?: string;
  vector_embedding?: number[];
  created_at: Date;
}

export interface LocalRegulation {
  regulation_id: string;
  regulation_type: RegulationType;
  regulation_name: string;
  local_gov: string;
  local_gov_code: string;
  enactment_date: Date;
  current_version: string;
  department: string;
  status: LawStatus;
  created_at: Date;
  updated_at: Date;
}

export interface RegulationArticle {
  reg_article_id: string;
  regulation_id: string;
  article_number: string;
  article_title: string;
  article_content: string;
  article_type: ArticleType;
  parent_article_id?: string;
  vector_embedding?: number[];
  created_at: Date;
}

export interface LawRegulationLink {
  link_id: string;
  law_id: string;
  regulation_id: string;
  article_id?: string;
  reg_article_id?: string;
  link_type: LinkType;
  confidence_score: number;
  verified: boolean;
  verified_by?: string;
  verified_at?: Date;
  created_at: Date;
}

export interface ImpactAnalysis {
  analysis_id: string;
  revision_id: string;
  regulation_id: string;
  article_id: string;
  reg_article_id: string;
  impact_level: ImpactLevel;
  impact_type: ImpactType;
  change_summary: string;
  ai_recommendation: string;
  confidence_score: number;
  reviewed: boolean;
  reviewer_id?: string;
  reviewed_at?: Date;
  created_at: Date;
}

export interface User {
  user_id: string;
  username: string;
  email: string;
  password_hash: string;
  local_gov: string;
  department: string;
  role: UserRole;
  notification_settings: NotificationSettings;
  created_at: Date;
  last_login?: Date;
}

export interface NotificationSettings {
  email_enabled: boolean;
  push_enabled: boolean;
  impact_levels: ImpactLevel[];
  departments: string[];
}

export interface Notification {
  notification_id: string;
  user_id: string;
  analysis_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  sent_at: Date;
  read_at?: Date;
}

export interface ReviewHistory {
  history_id: string;
  analysis_id: string;
  user_id: string;
  action: ReviewAction;
  comment: string;
  created_at: Date;
}

// API Request/Response Types

export interface CreateLawRequest {
  law_type: LawType;
  law_name: string;
  law_number: string;
  enactment_date: string;
  ministry: string;
  category: string;
}

export interface CreateRevisionRequest {
  law_id: string;
  revision_type: RevisionType;
  revision_date: string;
  enforcement_date: string;
  revision_reason: string;
  changed_articles: ChangedArticle[];
}

export interface TriggerAnalysisRequest {
  revision_id: string;
  target_local_gov?: string;
}

export interface ReviewAnalysisRequest {
  action: ReviewAction;
  comment: string;
}

export interface SearchRequest {
  query: string;
  type?: LawType | RegulationType;
  filters?: Record<string, any>;
}

export interface SemanticSearchRequest {
  query: string;
  threshold?: number;
  limit?: number;
}

export interface AnalysisListQuery {
  status?: 'pending' | 'reviewed';
  level?: ImpactLevel;
  local_gov?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface NotificationListQuery {
  read?: boolean;
  user_id: string;
  page?: number;
  limit?: number;
}

export interface AnalysisStatsQuery {
  from: string;
  to: string;
  group_by?: 'day' | 'week' | 'month';
  local_gov?: string;
}

// API Response Types

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AnalysisDetailResponse extends ImpactAnalysis {
  law: Law;
  law_revision: LawRevision;
  regulation: LocalRegulation;
  article: Article;
  reg_article: RegulationArticle;
  review_history: ReviewHistory[];
}

export interface AnalysisStatsResponse {
  total_analyses: number;
  pending_reviews: number;
  completed_reviews: number;
  by_impact_level: {
    high: number;
    medium: number;
    low: number;
  };
  by_local_gov: Array<{
    local_gov: string;
    count: number;
  }>;
  timeline: Array<{
    date: string;
    count: number;
  }>;
}

export interface DashboardStats {
  pending_reviews: number;
  urgent_notifications: number;
  this_month_revisions: number;
  completion_rate: number;
}
