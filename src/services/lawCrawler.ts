/**
 * Law Crawler Service
 * Fetches law data from 국가법령정보센터 API
 */

import type { Law, LawRevision, Article, ChangedArticle } from '../types/database';

// 국가법령정보센터 API Configuration
const LAW_API_BASE_URL = 'https://www.law.go.kr/DRF';

export interface LawAPIParams {
  OC?: string; // API Key
  target?: string; // law, lawRvsn (법령, 개정이력)
  type?: string; // XML, JSON
  MST?: string; // 법령ID
  efYd?: string; // 시행일자 (YYYYMMDD)
}

export interface LawAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Fetch list of laws from API
 */
export async function fetchLawList(apiKey: string, params?: {
  category?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<LawAPIResponse> {
  try {
    // TODO: Implement actual API call to 국가법령정보센터
    // For now, return mock data
    
    console.log('[LawCrawler] Fetching law list...', params);
    
    // Mock response
    return {
      success: true,
      data: {
        total: 0,
        laws: []
      }
    };
  } catch (error) {
    console.error('[LawCrawler] Error fetching law list:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch law details by ID
 */
export async function fetchLawDetails(apiKey: string, lawId: string): Promise<LawAPIResponse> {
  try {
    console.log('[LawCrawler] Fetching law details for:', lawId);
    
    // TODO: Implement actual API call
    // Mock response
    return {
      success: true,
      data: null
    };
  } catch (error) {
    console.error('[LawCrawler] Error fetching law details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch law revisions
 */
export async function fetchLawRevisions(apiKey: string, lawId: string, fromDate?: string): Promise<LawAPIResponse> {
  try {
    console.log('[LawCrawler] Fetching revisions for law:', lawId);
    
    // TODO: Implement actual API call
    // Mock response
    return {
      success: true,
      data: {
        revisions: []
      }
    };
  } catch (error) {
    console.error('[LawCrawler] Error fetching revisions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Parse law XML/JSON to structured data
 */
export function parseLawData(rawData: any): Law | null {
  try {
    // TODO: Implement parser for actual API response format
    
    return null;
  } catch (error) {
    console.error('[LawCrawler] Error parsing law data:', error);
    return null;
  }
}

/**
 * Parse revision data
 */
export function parseRevisionData(rawData: any): LawRevision | null {
  try {
    // TODO: Implement parser
    
    return null;
  } catch (error) {
    console.error('[LawCrawler] Error parsing revision data:', error);
    return null;
  }
}

/**
 * Extract articles from law content
 */
export function extractArticles(lawContent: string, lawId: string, revisionId: string): Article[] {
  try {
    // TODO: Implement article extraction logic
    // This will parse the law text and extract individual articles
    
    const articles: Article[] = [];
    
    // Simple regex-based extraction (placeholder)
    // In production, this needs sophisticated parsing
    const articlePattern = /제(\d+)조\s*\(([^)]+)\)\s*([^제]+)/g;
    
    let match;
    while ((match = articlePattern.exec(lawContent)) !== null) {
      const article: Article = {
        article_id: `${lawId}_art_${match[1]}`,
        law_id: lawId,
        revision_id: revisionId,
        article_number: match[1],
        article_title: match[2],
        article_content: match[3].trim(),
        article_type: '본문',
        created_at: new Date()
      };
      
      articles.push(article);
    }
    
    return articles;
  } catch (error) {
    console.error('[LawCrawler] Error extracting articles:', error);
    return [];
  }
}

/**
 * Compare two versions of articles to find changes
 */
export function compareArticles(oldArticles: Article[], newArticles: Article[]): ChangedArticle[] {
  const changes: ChangedArticle[] = [];
  
  // Create maps for easier lookup
  const oldMap = new Map(oldArticles.map(a => [a.article_number, a]));
  const newMap = new Map(newArticles.map(a => [a.article_number, a]));
  
  // Find modified and added articles
  for (const [number, newArticle] of newMap) {
    const oldArticle = oldMap.get(number);
    
    if (!oldArticle) {
      // New article
      changes.push({
        article_number: number,
        change_type: 'added',
        new_content: newArticle.article_content
      });
    } else if (oldArticle.article_content !== newArticle.article_content) {
      // Modified article
      changes.push({
        article_number: number,
        change_type: 'modified',
        old_content: oldArticle.article_content,
        new_content: newArticle.article_content
      });
    }
  }
  
  // Find deleted articles
  for (const [number, oldArticle] of oldMap) {
    if (!newMap.has(number)) {
      changes.push({
        article_number: number,
        change_type: 'deleted',
        old_content: oldArticle.article_content
      });
    }
  }
  
  return changes;
}

/**
 * Daily crawler job - fetches new/updated laws
 */
export async function runDailyCrawl(apiKey: string): Promise<{
  success: boolean;
  stats: {
    newLaws: number;
    updatedLaws: number;
    newRevisions: number;
    errors: number;
  }
}> {
  console.log('[LawCrawler] Starting daily crawl job...');
  
  const stats = {
    newLaws: 0,
    updatedLaws: 0,
    newRevisions: 0,
    errors: 0
  };
  
  try {
    // Step 1: Fetch recent law updates (last 7 days)
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromDate = weekAgo.toISOString().split('T')[0].replace(/-/g, '');
    
    const listResponse = await fetchLawList(apiKey, {
      fromDate
    });
    
    if (!listResponse.success || !listResponse.data) {
      console.error('[LawCrawler] Failed to fetch law list');
      stats.errors++;
      return { success: false, stats };
    }
    
    // Step 2: Process each law
    const laws = listResponse.data.laws || [];
    
    for (const lawData of laws) {
      try {
        // Fetch detailed law information
        const detailsResponse = await fetchLawDetails(apiKey, lawData.id);
        
        if (detailsResponse.success && detailsResponse.data) {
          // TODO: Save to database
          stats.newLaws++;
        }
        
        // Fetch revisions
        const revisionsResponse = await fetchLawRevisions(apiKey, lawData.id, fromDate);
        
        if (revisionsResponse.success && revisionsResponse.data) {
          const revisions = revisionsResponse.data.revisions || [];
          stats.newRevisions += revisions.length;
          
          // TODO: Save revisions to database
        }
        
      } catch (error) {
        console.error('[LawCrawler] Error processing law:', lawData.id, error);
        stats.errors++;
      }
    }
    
    console.log('[LawCrawler] Daily crawl completed:', stats);
    
    return {
      success: true,
      stats
    };
    
  } catch (error) {
    console.error('[LawCrawler] Daily crawl failed:', error);
    stats.errors++;
    return {
      success: false,
      stats
    };
  }
}
