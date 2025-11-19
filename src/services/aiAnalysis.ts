/**
 * AI Analysis Service
 * Uses LLM to analyze impact of law revisions on local regulations
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

/**
 * Analyze impact of law revision on regulation article
 */
export async function analyzeLawImpact(
  request: AnalysisRequest,
  apiKey: string
): Promise<ImpactAnalysisResult | null> {
  try {
    const prompt = buildAnalysisPrompt(request);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Cost-effective for production
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Lower temperature for consistent analysis
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[AI Analysis] OpenAI API error:', errorData);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

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
    console.error('[AI Analysis] Error analyzing impact:', error);
    return null;
  }
}

/**
 * Batch analyze multiple regulation articles
 */
export async function batchAnalyzeImpacts(
  requests: AnalysisRequest[],
  apiKey: string,
  onProgress?: (completed: number, total: number) => void
): Promise<(ImpactAnalysisResult | null)[]> {
  const results: (ImpactAnalysisResult | null)[] = [];

  for (let i = 0; i < requests.length; i++) {
    const result = await analyzeLawImpact(requests[i], apiKey);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, requests.length);
    }

    // Rate limiting: wait 200ms between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
}

/**
 * Build analysis prompt for LLM
 */
function buildAnalysisPrompt(request: AnalysisRequest): string {
  const { lawName, revisionDate, oldArticle, newArticle, regulationName, regulationArticle } = request;

  let prompt = `법령 개정 영향 분석을 수행해주세요.\n\n`;

  prompt += `**상위법령 정보:**\n`;
  prompt += `- 법령명: ${lawName}\n`;
  prompt += `- 개정일: ${revisionDate}\n\n`;

  if (oldArticle) {
    prompt += `**개정 전 조문 (제${oldArticle.article_number}조):**\n`;
    prompt += `제목: ${oldArticle.article_title}\n`;
    prompt += `내용:\n${oldArticle.article_content}\n\n`;
  }

  prompt += `**개정 후 조문 (제${newArticle.article_number}조):**\n`;
  prompt += `제목: ${newArticle.article_title}\n`;
  prompt += `내용:\n${newArticle.article_content}\n\n`;

  prompt += `**관련 자치법규 정보:**\n`;
  prompt += `- 법규명: ${regulationName}\n\n`;

  prompt += `**자치법규 조문 (제${regulationArticle.article_number}조):**\n`;
  prompt += `제목: ${regulationArticle.article_title}\n`;
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
 * System prompt for AI analysis
 */
const SYSTEM_PROMPT = `당신은 법령 분석 전문가입니다. 
상위법령 개정사항이 지방자치단체의 조례·규칙에 미치는 영향을 분석하는 것이 당신의 역할입니다.

분석 시 다음을 고려하세요:
1. **법적 일관성**: 상위법과 자치법규 간 내용 불일치 여부
2. **의무사항 변경**: 법적 의무나 권한의 추가·변경·삭제
3. **절차 변경**: 행정 절차나 기한의 변경
4. **금액·범위 변경**: 벌금, 범위, 기준 등의 구체적 수치 변경
5. **용어 변경**: 법률 용어의 개정

영향 수준 판단 기준:
- **HIGH**: 상위법과 불일치로 즉시 개정 필요, 법적 문제 발생 가능
- **MEDIUM**: 권고사항이나 선택적 개정 필요, 일관성 유지 권장
- **LOW**: 경미한 영향, 검토는 필요하나 개정 우선순위 낮음

조치 유형:
- **필수개정**: 상위법 불일치로 법적 문제 발생, 즉시 개정 필요
- **권고개정**: 일관성 유지 위해 개정 권장
- **검토필요**: 해당 부서 검토 후 판단 필요
- **영향없음**: 개정사항이 자치법규와 무관

다음 JSON 형식으로 응답하세요:
{
  "impact_level": "HIGH" | "MEDIUM" | "LOW",
  "impact_type": "필수개정" | "권고개정" | "검토필요" | "영향없음",
  "change_summary": "개정사항 요약 (2-3문장)",
  "ai_recommendation": "구체적 조치 권고사항 (3-4문장)",
  "confidence_score": 0.0-1.0,
  "reasoning": "판단 근거 (2-3문장)"
}`;

/**
 * Quick heuristic analysis (without LLM) for filtering
 * Used to pre-filter articles before expensive LLM analysis
 */
export function quickHeuristicAnalysis(
  oldArticle: Article | null,
  newArticle: Article,
  regulationArticle: RegulationArticle
): {
  shouldAnalyze: boolean;
  reason: string;
} {
  // If no old article, it's a new article - likely needs analysis
  if (!oldArticle) {
    return {
      shouldAnalyze: true,
      reason: 'New article added'
    };
  }

  // Check if article content changed significantly
  const contentChanged = oldArticle.article_content !== newArticle.article_content;

  if (!contentChanged) {
    return {
      shouldAnalyze: false,
      reason: 'No content change'
    };
  }

  // Check for keywords that indicate important changes
  const importantKeywords = [
    '의무', '금지', '벌칙', '과태료', '처벌', '벌금',
    '기한', '절차', '승인', '허가', '신고',
    '범위', '대상', '제외', '포함'
  ];

  const oldContent = oldArticle.article_content;
  const newContent = newArticle.article_content;
  const regContent = regulationArticle.article_content;

  // Check if regulation references this article
  const articleRef = `제${newArticle.article_number}조`;
  const hasReference = regContent.includes(articleRef);

  if (!hasReference) {
    // Check for shared important keywords
    const hasSharedKeywords = importantKeywords.some(keyword => 
      (oldContent.includes(keyword) || newContent.includes(keyword)) && 
      regContent.includes(keyword)
    );

    if (!hasSharedKeywords) {
      return {
        shouldAnalyze: false,
        reason: 'No direct reference or shared keywords'
      };
    }
  }

  return {
    shouldAnalyze: true,
    reason: contentChanged ? 'Significant content change detected' : 'Direct reference found'
  };
}

/**
 * Calculate text similarity ratio (simple comparison)
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  // Simple Levenshtein distance-based similarity
  const maxLen = Math.max(text1.length, text2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(text1, text2);
  return 1 - (distance / maxLen);
}

/**
 * Levenshtein distance calculation
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
