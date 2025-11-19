# AI 기반 자치법규 영향 분석 시스템 - 프로젝트 요약

## 🎯 프로젝트 개요

상위법령 개정 시 자치법규에 미치는 영향을 AI 기반으로 자동 분석하여 담당 공무원의 업무 부담을 획기적으로 줄이는 혁신적인 법령 영향 분석 플랫폼입니다.

## 📊 현재 진행 상황

### Phase 0: Foundation ✅ (완료)
- Hono 프레임워크 기반 프로젝트 구조 완성
- TypeScript 타입 시스템 구축
- PostgreSQL + pgvector 데이터베이스 스키마 설계
- 미들웨어 (CORS, Logger, Auth) 구현
- 기본 대시보드 UI 개발

### Phase 1: Core Services ✅ (완료)
- **법령 크롤러**: 국가법령정보센터 API 연동 로직 구현
- **자치법규 크롤러**: 자치법규정보시스템 API 연동 로직 구현
- **데이터베이스 서비스**: 전체 CRUD 인터페이스 및 Vector Search 준비
- **Embedding 서비스**: OpenAI text-embedding-3-small 통합
- **AI 분석 엔진**: GPT-4 기반 영향 분석 로직 구현
- **API 라우트**: Laws 및 Analysis 엔드포인트 구현

## 🏗 기술 아키텍처

```
┌─────────────────────────────────────────────┐
│         Frontend (React + TailwindCSS)      │
└─────────────────────────────────────────────┘
                    ↓ HTTPS
┌─────────────────────────────────────────────┐
│    API Layer (Hono on Cloudflare Workers)   │
│  - Laws Routes                              │
│  - Analysis Routes                          │
│  - Auth Middleware                          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         Services Layer                      │
│  - Law Crawler                              │
│  - Regulation Crawler                       │
│  - Database Service                         │
│  - Embedding Service (OpenAI)               │
│  - AI Analysis Service (GPT-4)              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│    Data Layer (PostgreSQL + pgvector)       │
│  - 10개 핵심 테이블                          │
│  - Vector Embeddings (1536차원)             │
│  - 인덱스 최적화                             │
└─────────────────────────────────────────────┘
```

## 📁 주요 구성 요소

### 데이터베이스 스키마 (10개 테이블)

1. **laws** - 상위법령 정보
2. **law_revisions** - 법령 개정 이력
3. **articles** - 법령 조문 (벡터 임베딩 포함)
4. **local_regulations** - 자치법규 정보
5. **regulation_articles** - 자치법규 조문 (벡터 임베딩 포함)
6. **law_regulation_links** - 법령-조례 연계 관계
7. **impact_analyses** - AI 영향 분석 결과
8. **users** - 사용자 (법무담당, 실무부서)
9. **notifications** - 알림
10. **review_history** - 검토 이력

### 서비스 레이어

#### 1. Law Crawler Service (`src/services/lawCrawler.ts`)
- 국가법령정보센터 API 연동
- 법령 목록/상세/개정이력 조회
- 조문 파싱 및 추출
- 변경사항 비교 (diff)
- 일일 크롤링 스케줄러

#### 2. Regulation Crawler Service (`src/services/regulationCrawler.ts`)
- 자치법규정보시스템 API 연동
- 지자체별 조례/규칙 조회
- 근거법령 참조 추출
- 조문 파싱
- 전국 지자체 크롤링

#### 3. Database Service (`src/services/database.ts`)
- 전체 엔티티 CRUD 인터페이스
- Vector Similarity Search
- 복잡한 필터링 및 페이징
- 트랜잭션 관리

#### 4. Embedding Service (`src/services/embedding.ts`)
- OpenAI Embeddings API 통합
- 단일/배치 임베딩 생성
- 코사인 유사도 계산
- 텍스트 전처리 및 청킹
- 임베딩 평균화

#### 5. AI Analysis Service (`src/services/aiAnalysis.ts`)
- GPT-4 기반 영향 분석
- 조문 비교 및 의미 분석
- 영향도 점수 계산 (HIGH/MEDIUM/LOW)
- 개정 필요성 판단 (필수개정/권고개정/검토필요/영향없음)
- 배치 분석 지원
- 휴리스틱 사전 필터링

### API 라우트

#### Laws API (`src/routes/laws.ts`)
```typescript
GET    /api/v1/laws                          // 법령 목록
GET    /api/v1/laws/:lawId                   // 법령 상세
GET    /api/v1/laws/:lawId/revisions         // 개정 이력
GET    /api/v1/laws/:lawId/articles          // 조문 목록
GET    /api/v1/laws/:lawId/linked-regulations // 연계 자치법규
POST   /api/v1/laws                          // 법령 생성 (관리자)
PUT    /api/v1/laws/:lawId                   // 법령 수정
DELETE /api/v1/laws/:lawId                   // 법령 삭제
POST   /api/v1/laws/crawl                    // 수동 크롤링
```

#### Analysis API (`src/routes/analysis.ts`)
```typescript
GET    /api/v1/analysis                      // 분석 목록
GET    /api/v1/analysis/:analysisId          // 분석 상세
POST   /api/v1/analysis/trigger              // 분석 실행
PUT    /api/v1/analysis/:analysisId/review   // 검토 제출
GET    /api/v1/analysis/stats                // 통계
GET    /api/v1/analysis/:analysisId/history  // 검토 이력
POST   /api/v1/analysis/batch-review         // 일괄 검토
```

## 🔑 핵심 기능

### 1. 자동 법령 모니터링
- 국가법령정보센터 API 일일 크롤링
- 신규/개정/폐지 법령 자동 탐지
- 개정 조문 파싱 및 변경사항 추출

### 2. AI 기반 영향 분석
- OpenAI Embeddings로 벡터화
- 의미 기반 유사 조문 탐색
- GPT-4로 개정 영향 분석
- 자동 영향도 점수 및 권고사항 생성

### 3. 법령-조례 연계 매핑
- 근거법령 자동 추출
- 조문 단위 연계 관계 구축
- 신뢰도 점수 계산
- 검증 워크플로우

### 4. 검토 워크플로우
- 부서별 필터링
- 우선순위 자동 정렬
- 검토 의견 입력
- 처리 현황 추적

## 🚀 핵심 알고리즘

### 영향 분석 워크플로우

```
1. 법령 개정 탐지
   ↓
2. 연계된 자치법규 조회 (DB)
   ↓
3. 관련 조문 추출
   ↓
4. 휴리스틱 사전 필터링
   - 키워드 매칭
   - 참조 조문 확인
   ↓
5. Vector Similarity Search
   - OpenAI Embeddings
   - 코사인 유사도 > 0.8
   ↓
6. GPT-4 심층 분석
   - 의미 변화 탐지
   - 영향도 판단
   - 권고사항 생성
   ↓
7. 분석 결과 저장
   ↓
8. 담당자 알림 발송
```

### Vector Embedding 전략

1. **텍스트 전처리**
   - 공백 정규화
   - 문단 구분 유지

2. **청킹 (Chunking)**
   - 최대 8000 토큰 단위
   - 문단 우선 분할
   - 문장 단위 보조 분할

3. **배치 임베딩**
   - 100개씩 배치 처리
   - Rate limiting (200ms 간격)
   - 에러 핸들링

4. **임베딩 평균화**
   - 여러 청크의 평균 벡터
   - 차원 보존 (1536)

## 📊 성능 최적화

### 데이터베이스 인덱스

```sql
-- 자주 사용되는 쿼리 최적화
CREATE INDEX idx_law_revisions_date ON law_revisions(revision_date DESC);
CREATE INDEX idx_analyses_composite ON impact_analyses(impact_level, reviewed, created_at DESC);
CREATE INDEX idx_notifications_composite ON notifications(user_id, read, sent_at DESC);

-- Vector Search 최적화 (IVFFlat)
CREATE INDEX idx_articles_embedding ON articles 
  USING ivfflat (vector_embedding vector_cosine_ops) WITH (lists = 100);
```

### 비용 최적화

- **OpenAI API**:
  - text-embedding-3-small ($0.00002/1K tokens)
  - gpt-4o-mini ($0.00015/1K tokens)
  - 배치 처리 및 캐싱

- **크롤링 최적화**:
  - 증분 크롤링 (변경분만)
  - Rate limiting
  - 오류 재시도 로직

## 🔐 보안 고려사항

1. **인증/인가**
   - JWT 기반 인증
   - 역할 기반 접근 제어 (RBAC)
   - 민감한 API 키는 환경 변수

2. **데이터 보호**
   - 비밀번호 해싱 (bcrypt)
   - HTTPS 전용
   - Rate Limiting

3. **감사 로그**
   - 모든 검토 활동 기록
   - 사용자 행동 추적
   - 변경 이력 보존

## 🎯 다음 단계 (Phase 2)

### 우선순위 높음
1. **데이터베이스 연결**
   - PostgreSQL 연결 풀 구현
   - 실제 CRUD 로직 완성
   - 트랜잭션 관리

2. **외부 API 연동 완성**
   - 국가법령정보센터 실제 API 테스트
   - 자치법규정보시스템 실제 API 테스트
   - 에러 핸들링 강화

3. **알림 시스템**
   - SendGrid 이메일 통합
   - 인앱 알림 구현
   - WebSocket 실시간 업데이트

### 우선순위 중간
4. **사용자 인증 완성**
   - 회원가입/로그인 UI
   - 비밀번호 재설정
   - OAuth 통합 (선택)

5. **대시보드 고도화**
   - 실시간 통계 차트
   - 검토 워크플로우 UI
   - 필터링 및 검색 개선

6. **테스트 작성**
   - 단위 테스트 (Jest)
   - 통합 테스트
   - E2E 테스트 (Playwright)

### 우선순위 낮음
7. **성능 모니터링**
   - Sentry 에러 추적
   - 성능 메트릭 수집
   - 로그 분석

8. **CI/CD 파이프라인**
   - GitHub Actions
   - 자동 테스트
   - Cloudflare Pages 자동 배포

## 📈 예상 효과

### 정량적 효과
- **검토 시간 단축**: 수작업 대비 60% 이상 감소
- **정확도 향상**: AI 분석으로 누락 방지 95% 이상
- **비용 절감**: 전국 지자체 중복 작업 제거

### 정성적 효과
- **행정 일관성 확보**: 상위법-조례 간 불일치 최소화
- **신속한 대응**: 법령 개정 즉시 자동 탐지 및 알림
- **전문성 향상**: AI 권고사항으로 검토 품질 향상

## 🛠 개발 환경

### 필수 도구
- Node.js 18+
- PostgreSQL 15+ (pgvector 확장)
- npm 또는 yarn

### 환경 변수 (.dev.vars)
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
OPENAI_API_KEY=sk-...
LAW_API_KEY=...
REGULATION_API_KEY=...
SENDGRID_API_KEY=...
```

## 📞 프로젝트 정보

- **GitHub**: (준비 중)
- **문서**: `/home/user/ai_law_impact_analysis_system.md` (PRD)
- **라이선스**: All rights reserved
- **버전**: 1.1.0
- **최종 업데이트**: 2024-11-19

---

**개발 완료 시점**: Phase 1 완료 (Core Services Implemented)  
**다음 마일스톤**: Phase 2 - Integration & Testing  
**예상 MVP 완성일**: 2024-12 중순
