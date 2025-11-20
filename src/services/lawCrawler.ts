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
  page?: number;
  display?: number;
}): Promise<LawAPIResponse> {
  try {
    console.log('[LawCrawler] Fetching law list...', params);
    
    // Build API URL - 법령목록검색 API
    const url = new URL(`${LAW_API_BASE_URL}/lawSearch.do`);
    url.searchParams.set('OC', apiKey);
    url.searchParams.set('target', 'law'); // 법령
    url.searchParams.set('type', 'XML'); // XML 형식 (기본)
    
    if (params?.display) {
      url.searchParams.set('display', params.display.toString());
    }
    
    if (params?.page) {
      url.searchParams.set('page', params.page.toString());
    }
    
    console.log('[LawCrawler] API URL:', url.toString());
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    // Parse XML response
    const laws = parseXMLLawList(xmlText);
    
    return {
      success: true,
      data: {
        total: laws.length,
        laws
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
export async function fetchLawDetails(apiKey: string, lawId: string, enforcementDate?: string): Promise<LawAPIResponse> {
  try {
    console.log('[LawCrawler] Fetching law details for:', lawId);
    
    // Build API URL - 법령 상세 조회 API
    const url = new URL(`${LAW_API_BASE_URL}/lawService.do`);
    url.searchParams.set('OC', apiKey);
    url.searchParams.set('target', 'law'); // 법령 상세
    url.searchParams.set('type', 'XML');
    url.searchParams.set('MST', lawId); // 법령일련번호
    
    if (enforcementDate) {
      url.searchParams.set('efYd', enforcementDate); // 시행일자 (YYYYMMDD)
    }
    
    console.log('[LawCrawler] API URL:', url.toString());
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    // Parse XML response
    const lawDetails = parseXMLLawDetails(xmlText);
    
    return {
      success: true,
      data: lawDetails
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
    
    // Build API URL - 법령 개정이력 조회 API
    const url = new URL(`${LAW_API_BASE_URL}/lawService.do`);
    url.searchParams.set('OC', apiKey);
    url.searchParams.set('target', 'lawRvsn'); // 개정이력
    url.searchParams.set('type', 'XML');
    url.searchParams.set('MST', lawId); // 법령일련번호
    
    console.log('[LawCrawler] API URL:', url.toString());
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    
    // Parse XML response
    const revisions = parseXMLRevisions(xmlText);
    
    return {
      success: true,
      data: {
        revisions: fromDate ? revisions.filter(r => r.revision_date >= fromDate) : revisions
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
 * Parse XML law list response
 */
function parseXMLLawList(xmlText: string): any[] {
  // 간단한 XML 파싱 (실제로는 DOMParser를 사용하거나 xml2js 라이브러리 사용)
  const laws: any[] = [];
  
  try {
    // Extract law items from XML
    // 법제처 API XML 형식: <LawSearch><law> ... </law></LawSearch>
    const lawMatches = xmlText.matchAll(/<법령>(.*?)<\/법령>/gs);
    
    for (const match of lawMatches) {
      const lawXML = match[1];
      
      // Extract fields
      const lawId = extractXMLField(lawXML, '법령일련번호');
      const lawName = extractXMLField(lawXML, '법령명한글');
      const lawNumber = extractXMLField(lawXML, '법령번호');
      const lawType = extractXMLField(lawXML, '법령구분명'); // 법률, 대통령령, 부령 등
      const enactmentDate = extractXMLField(lawXML, '제정개정구분명');
      const ministry = extractXMLField(lawXML, '소관부처명');
      
      if (lawId && lawName) {
        laws.push({
          law_id: lawId,
          law_name: lawName,
          law_number: lawNumber || '',
          law_type: mapLawType(lawType),
          enactment_date: parseDate(enactmentDate),
          ministry: ministry || ''
        });
      }
    }
  } catch (error) {
    console.error('[LawCrawler] Error parsing XML:', error);
  }
  
  return laws;
}

/**
 * Parse XML law details response
 */
function parseXMLLawDetails(xmlText: string): any {
  try {
    // Extract law basic info
    const lawId = extractXMLField(xmlText, '법령일련번호');
    const lawName = extractXMLField(xmlText, '법령명한글');
    const lawNumber = extractXMLField(xmlText, '법령번호');
    const lawType = extractXMLField(xmlText, '법령구분명');
    const enactmentDate = extractXMLField(xmlText, '제정일자');
    const enforcementDate = extractXMLField(xmlText, '시행일자');
    const ministry = extractXMLField(xmlText, '소관부처명');
    
    // Extract articles
    const articles: any[] = [];
    const articleMatches = xmlText.matchAll(/<조문>(.*?)<\/조문>/gs);
    
    for (const match of articleMatches) {
      const articleXML = match[1];
      const articleNumber = extractXMLField(articleXML, '조문번호');
      const articleTitle = extractXMLField(articleXML, '조문제목');
      const articleContent = extractXMLField(articleXML, '조문내용');
      
      if (articleNumber && articleContent) {
        articles.push({
          article_number: articleNumber,
          article_title: articleTitle || '',
          article_content: articleContent
        });
      }
    }
    
    return {
      law_id: lawId,
      law_name: lawName,
      law_number: lawNumber,
      law_type: mapLawType(lawType),
      enactment_date: parseDate(enactmentDate),
      enforcement_date: parseDate(enforcementDate),
      ministry: ministry,
      articles
    };
  } catch (error) {
    console.error('[LawCrawler] Error parsing law details:', error);
    return null;
  }
}

/**
 * Parse XML revisions response
 */
function parseXMLRevisions(xmlText: string): any[] {
  const revisions: any[] = [];
  
  try {
    const revisionMatches = xmlText.matchAll(/<개정연혁>(.*?)<\/개정연혁>/gs);
    
    for (const match of revisionMatches) {
      const revXML = match[1];
      const revisionDate = extractXMLField(revXML, '개정일자');
      const revisionType = extractXMLField(revXML, '개정구분');
      const revisionNumber = extractXMLField(revXML, '개정법령번호');
      const revisionReason = extractXMLField(revXML, '개정이유');
      
      if (revisionDate) {
        revisions.push({
          revision_date: parseDate(revisionDate),
          revision_type: mapRevisionType(revisionType),
          revision_number: revisionNumber || '',
          revision_reason: revisionReason || ''
        });
      }
    }
  } catch (error) {
    console.error('[LawCrawler] Error parsing revisions:', error);
  }
  
  return revisions;
}

/**
 * Extract field value from XML string
 */
function extractXMLField(xml: string, fieldName: string): string {
  const regex = new RegExp(`<${fieldName}>(.*?)<\/${fieldName}>`, 's');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Map law type from API to database enum
 */
function mapLawType(apiType: string): '법률' | '시행령' | '시행규칙' {
  if (apiType.includes('법률')) return '법률';
  if (apiType.includes('대통령령') || apiType.includes('시행령')) return '시행령';
  if (apiType.includes('부령') || apiType.includes('시행규칙')) return '시행규칙';
  return '법률'; // default
}

/**
 * Map revision type from API to database enum
 */
function mapRevisionType(apiType: string): '신규' | '일부개정' | '전부개정' | '폐지' {
  if (apiType.includes('제정')) return '신규';
  if (apiType.includes('전부개정')) return '전부개정';
  if (apiType.includes('일부개정') || apiType.includes('개정')) return '일부개정';
  if (apiType.includes('폐지')) return '폐지';
  return '일부개정'; // default
}

/**
 * Parse date string from API (YYYYMMDD) to Date object
 */
function parseDate(dateStr: string): Date {
  if (!dateStr || dateStr.length < 8) {
    return new Date();
  }
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  return new Date(year, month, day);
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
