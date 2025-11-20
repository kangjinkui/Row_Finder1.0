/**
 * Gemini AI Analysis Service
 * Uses Google Gemini to analyze impact of law revisions on local regulations
 */

import type { Article, RegulationArticle, ImpactLevel, ImpactType } from '../types/database';

export interface ImpactAnalysisResult {
  impact_level: ImpactLevel;
  impact_type: ImpactType;
  change_summary: string;
  ai_recommendation: string;
  confidence_score: number;
  reasoning: string;
}

export interface AnalysisRequest {
  lawName: string;
  revisionDate: string;
  oldArticle: Article | null;
  newArticle: Article;
  regulationName: string;
  regulationArticle: RegulationArticle;
}

const SYSTEM_PROMPT = `당신은 법령 분석 전문가입니다. 상위법령의 개정사항이 지방자치단체의 조례 및 규칙에 미치는 영향을 정확하게 분석하는 것이 목표입니다.

분석 시 다음 기준을 적용하세요:

**영향 수준 (impact_level):**
- HIGH: 상위법의 핵심 내용이 변경되어 자치법규의 즉각적 개정이 필요한 경우
- MEDIUM: 일부 조정이 필요하거나 검토가 필요한 경우
- LOW: 참고사항이거나 경미한 영향만 있는 경우

**조치 유형 (impact_type):**
- 필수개정: 법적 근거나 위임사항이 변경되어 반드시 개정이 필요
- 권고개정: 정합성 유지를 위해 개정이 권장됨
- 검토필요: 담당부서의 추가 검토가 필요
- 영향없음: 자치법규에 실질적 영향이 없음

JSON 형식으로 응답하되, 다음 필드를 포함해야 합니다:
{
  "impact_level": "HIGH" | "MEDIUM" | "LOW",
  "impact_type": "필수개정" | "권고개정" | "검토필요" | "영향없음",
  "change_summary": "변경 내용 요약 (200자 이내)",
  "ai_recommendation": "구체적인 권고사항 (500자 이내)",
  "confidence_score": 0.0 ~ 1.0 (분석 신뢰도),
  "reasoning": "분석 근거 및 이유"
}`;

/**
 * Analyze impact of law revision on regulation article using Gemini
 */
export async function analyzeGeminiImpact(
  request: AnalysisRequest,
  apiKey: string
): Promise<ImpactAnalysisResult | null> {
  try {
    const prompt = buildAnalysisPrompt(request);
    
    // Gemini API endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: SYSTEM_PROMPT + '\n\n' + prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[GeminiAnalysis] API error:', errorData);
      return null;
    }

    const data = await response.json();
    
    // Extract text from Gemini response
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      console.error('[GeminiAnalysis] No content in response');
      return null;
    }

    // Parse JSON response
    const result = JSON.parse(content);

    return {
      impact_level: result.impact_level as ImpactLevel,
      impact_type: result.impact_type as ImpactType,
      change_summary: result.change_summary,
      ai_recommendation: result.ai_recommendation,
      confidence_score: result.confidence_score,
      reasoning: result.reasoning
    };

  } catch (error) {
    console.error('[GeminiAnalysis] Error analyzing impact:', error);
    return null;
  }
}

/**
 * Batch analyze multiple regulation articles
 */
export async function batchAnalyzeGeminiImpacts(
  requests: AnalysisRequest[],
  apiKey: string,
  onProgress?: (completed: number, total: number) => void
): Promise<(ImpactAnalysisResult | null)[]> {
  const results: (ImpactAnalysisResult | null)[] = [];

  for (let i = 0; i < requests.length; i++) {
    const result = await analyzeGeminiImpact(requests[i], apiKey);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, requests.length);
    }

    // Rate limiting: wait 1 second between requests (Gemini free tier)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Build analysis prompt for Gemini
 */
function buildAnalysisPrompt(request: AnalysisRequest): string {
  const { lawName, revisionDate, oldArticle, newArticle, regulationName, regulationArticle } = request;

  let prompt = `법령 개정 영향 분석을 수행해주세요.\n\n`;

  prompt += `**상위법령 정보:**\n`;
  prompt += `- 법령명: ${lawName}\n`;
  prompt += `- 개정일: ${revisionDate}\n\n`;

  if (oldArticle) {
    prompt += `**개정 전 조문 (제${oldArticle.article_number}조):**\n`;
    prompt += `제목: ${oldArticle.article_title || '(제목 없음)'}\n`;
    prompt += `내용:\n${oldArticle.article_content}\n\n`;
  } else {
    prompt += `**개정 전 조문:** 신규 조문입니다.\n\n`;
  }

  prompt += `**개정 후 조문 (제${newArticle.article_number}조):**\n`;
  prompt += `제목: ${newArticle.article_title || '(제목 없음)'}\n`;
  prompt += `내용:\n${newArticle.article_content}\n\n`;

  prompt += `**관련 자치법규 정보:**\n`;
  prompt += `- 법규명: ${regulationName}\n\n`;

  prompt += `**자치법규 조문 (제${regulationArticle.article_number}조):**\n`;
  prompt += `제목: ${regulationArticle.article_title || '(제목 없음)'}\n`;
  prompt += `내용:\n${regulationArticle.article_content}\n\n`;

  prompt += `위 정보를 바탕으로 다음을 분석해주세요:\n`;
  prompt += `1. 상위법 개정사항이 자치법규 조문에 미치는 영향\n`;
  prompt += `2. 영향 수준 (HIGH/MEDIUM/LOW)\n`;
  prompt += `3. 필요한 조치 (필수개정/권고개정/검토필요/영향없음)\n`;
  prompt += `4. 구체적인 권고사항\n\n`;

  prompt += `JSON 형식으로 응답해주세요.`;

  return prompt;
}

/**
 * Heuristic pre-filtering to reduce API costs
 * Returns true if articles are likely related and need AI analysis
 */
export function shouldAnalyze(
  lawArticle: Article,
  regulationArticle: RegulationArticle
): boolean {
  // Basic similarity check
  const lawText = (lawArticle.article_title + ' ' + lawArticle.article_content).toLowerCase();
  const regText = (regulationArticle.article_title + ' ' + regulationArticle.article_content).toLowerCase();
  
  // Extract key terms (simple keyword matching)
  const keywords = ['시행', '규정', '기준', '절차', '방법', '의무', '금지', '허가', '승인', '신고'];
  
  let matchCount = 0;
  for (const keyword of keywords) {
    if (lawText.includes(keyword) && regText.includes(keyword)) {
      matchCount++;
    }
  }
  
  // If at least 2 keywords match, likely related
  return matchCount >= 2;
}

/**
 * Calculate analysis priority score
 * Higher score = should be analyzed first
 */
export function calculatePriority(
  lawArticle: Article,
  regulationArticle: RegulationArticle,
  revisionType: string
): number {
  let priority = 50; // Base priority
  
  // Revision type impact
  if (revisionType === '전부개정') priority += 30;
  else if (revisionType === '일부개정') priority += 15;
  else if (revisionType === '신규') priority += 10;
  
  // Article type impact
  if (lawArticle.article_type === '본문') priority += 10;
  
  // Content length (longer = more important)
  const lawLength = lawArticle.article_content.length;
  if (lawLength > 1000) priority += 15;
  else if (lawLength > 500) priority += 10;
  else if (lawLength > 200) priority += 5;
  
  return Math.min(priority, 100);
}
