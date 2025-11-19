/**
 * Regulation Crawler Service
 * Fetches local regulation data from 자치법규정보시스템 API
 */

import type { LocalRegulation, RegulationArticle } from '../types/database';

// 자치법규정보시스템 API Configuration
const REGULATION_API_BASE_URL = 'https://www.elis.go.kr/api';

export interface RegulationAPIParams {
  apiKey?: string;
  localGovCode?: string; // 지자체 코드
  category?: string;
  fromDate?: string;
  toDate?: string;
}

export interface RegulationAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Fetch list of local regulations
 */
export async function fetchRegulationList(apiKey: string, params?: RegulationAPIParams): Promise<RegulationAPIResponse> {
  try {
    console.log('[RegulationCrawler] Fetching regulation list...', params);
    
    // TODO: Implement actual API call to 자치법규정보시스템
    // For now, return mock data
    
    return {
      success: true,
      data: {
        total: 0,
        regulations: []
      }
    };
  } catch (error) {
    console.error('[RegulationCrawler] Error fetching regulation list:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch regulation details by ID
 */
export async function fetchRegulationDetails(apiKey: string, regulationId: string): Promise<RegulationAPIResponse> {
  try {
    console.log('[RegulationCrawler] Fetching regulation details for:', regulationId);
    
    // TODO: Implement actual API call
    return {
      success: true,
      data: null
    };
  } catch (error) {
    console.error('[RegulationCrawler] Error fetching regulation details:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fetch regulations by local government
 */
export async function fetchRegulationsByLocalGov(
  apiKey: string,
  localGovCode: string,
  options?: {
    regulationType?: '조례' | '규칙';
    department?: string;
  }
): Promise<RegulationAPIResponse> {
  try {
    console.log('[RegulationCrawler] Fetching regulations for local gov:', localGovCode);
    
    // TODO: Implement actual API call
    return {
      success: true,
      data: {
        regulations: []
      }
    };
  } catch (error) {
    console.error('[RegulationCrawler] Error fetching regulations by local gov:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Parse regulation data
 */
export function parseRegulationData(rawData: any): LocalRegulation | null {
  try {
    // TODO: Implement parser for actual API response format
    
    return null;
  } catch (error) {
    console.error('[RegulationCrawler] Error parsing regulation data:', error);
    return null;
  }
}

/**
 * Extract articles from regulation content
 */
export function extractRegulationArticles(
  regulationContent: string,
  regulationId: string
): RegulationArticle[] {
  try {
    const articles: RegulationArticle[] = [];
    
    // Simple regex-based extraction (placeholder)
    const articlePattern = /제(\d+)조\s*\(([^)]+)\)\s*([^제]+)/g;
    
    let match;
    while ((match = articlePattern.exec(regulationContent)) !== null) {
      const article: RegulationArticle = {
        reg_article_id: `${regulationId}_art_${match[1]}`,
        regulation_id: regulationId,
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
    console.error('[RegulationCrawler] Error extracting articles:', error);
    return [];
  }
}

/**
 * Extract basis law references from regulation
 * Finds references to national laws in regulation text
 */
export function extractBasisLawReferences(regulationContent: string): Array<{
  lawName: string;
  articleNumber?: string;
  referenceType: '근거법령' | '준용' | '참조';
}> {
  const references: Array<{
    lawName: string;
    articleNumber?: string;
    referenceType: '근거법령' | '준용' | '참조';
  }> = [];
  
  try {
    // Pattern 1: "○○법 제X조에 따라" - 근거법령
    const basisPattern = /([가-힣\s]+법)\s+제(\d+)조[에|의|를]?\s*[따라|의거하여|규정한]/g;
    let match;
    
    while ((match = basisPattern.exec(regulationContent)) !== null) {
      references.push({
        lawName: match[1].trim(),
        articleNumber: match[2],
        referenceType: '근거법령'
      });
    }
    
    // Pattern 2: "○○법을 준용한다" - 준용
    const applyPattern = /([가-힣\s]+법)[을|를]?\s*준용/g;
    
    while ((match = applyPattern.exec(regulationContent)) !== null) {
      references.push({
        lawName: match[1].trim(),
        referenceType: '준용'
      });
    }
    
    // Pattern 3: "○○법 제X조 참조" - 참조
    const referencePattern = /([가-힣\s]+법)\s+제(\d+)조\s*참조/g;
    
    while ((match = referencePattern.exec(regulationContent)) !== null) {
      references.push({
        lawName: match[1].trim(),
        articleNumber: match[2],
        referenceType: '참조'
      });
    }
    
    return references;
  } catch (error) {
    console.error('[RegulationCrawler] Error extracting basis law references:', error);
    return references;
  }
}

/**
 * Crawl regulations for all major local governments
 */
export async function crawlAllLocalGovRegulations(apiKey: string): Promise<{
  success: boolean;
  stats: {
    processedGovs: number;
    newRegulations: number;
    updatedRegulations: number;
    errors: number;
  }
}> {
  console.log('[RegulationCrawler] Starting crawl for all local governments...');
  
  const stats = {
    processedGovs: 0,
    newRegulations: 0,
    updatedRegulations: 0,
    errors: 0
  };
  
  try {
    // Major local governments (example list)
    const localGovCodes = [
      '11', // 서울특별시
      '26', // 부산광역시
      '27', // 대구광역시
      '28', // 인천광역시
      '29', // 광주광역시
      '30', // 대전광역시
      '31', // 울산광역시
      '36', // 세종특별자치시
      '41', // 경기도
      '42', // 강원도
      '43', // 충청북도
      '44', // 충청남도
      '45', // 전라북도
      '46', // 전라남도
      '47', // 경상북도
      '48', // 경상남도
      '50', // 제주특별자치도
    ];
    
    for (const code of localGovCodes) {
      try {
        const response = await fetchRegulationsByLocalGov(apiKey, code);
        
        if (response.success && response.data) {
          const regulations = response.data.regulations || [];
          stats.newRegulations += regulations.length;
        }
        
        stats.processedGovs++;
        
        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error('[RegulationCrawler] Error processing local gov:', code, error);
        stats.errors++;
      }
    }
    
    console.log('[RegulationCrawler] Crawl completed:', stats);
    
    return {
      success: true,
      stats
    };
    
  } catch (error) {
    console.error('[RegulationCrawler] Crawl failed:', error);
    stats.errors++;
    return {
      success: false,
      stats
    };
  }
}

/**
 * Daily crawler job for regulations
 */
export async function runDailyRegulationCrawl(apiKey: string): Promise<{
  success: boolean;
  stats: {
    newRegulations: number;
    updatedRegulations: number;
    errors: number;
  }
}> {
  console.log('[RegulationCrawler] Starting daily regulation crawl...');
  
  const stats = {
    newRegulations: 0,
    updatedRegulations: 0,
    errors: 0
  };
  
  try {
    // Fetch regulations updated in the last 7 days
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromDate = weekAgo.toISOString().split('T')[0];
    
    const response = await fetchRegulationList(apiKey, {
      fromDate
    });
    
    if (!response.success || !response.data) {
      console.error('[RegulationCrawler] Failed to fetch regulation list');
      stats.errors++;
      return { success: false, stats };
    }
    
    const regulations = response.data.regulations || [];
    
    for (const regData of regulations) {
      try {
        // Fetch detailed regulation information
        const detailsResponse = await fetchRegulationDetails(apiKey, regData.id);
        
        if (detailsResponse.success && detailsResponse.data) {
          // TODO: Save to database
          stats.newRegulations++;
        }
        
      } catch (error) {
        console.error('[RegulationCrawler] Error processing regulation:', regData.id, error);
        stats.errors++;
      }
    }
    
    console.log('[RegulationCrawler] Daily crawl completed:', stats);
    
    return {
      success: true,
      stats
    };
    
  } catch (error) {
    console.error('[RegulationCrawler] Daily crawl failed:', error);
    stats.errors++;
    return {
      success: false,
      stats
    };
  }
}
