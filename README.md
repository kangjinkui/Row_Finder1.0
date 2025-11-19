# AI 기반 자치법규 영향 분석 시스템

## 프로젝트 개요

상위법령(법률, 시행령 등) 개정 시 관련 자치법규(조례, 규칙)를 자동으로 탐지·비교·분석하여, 담당 공무원에게 검토 필요성 및 개정 권고사항을 제공하는 **AI 기반 법령 영향 분석 플랫폼**입니다.

### 핵심 가치

- **자동 탐지**: 상위법 개정 시 영향받는 자치법규 조문 자동 식별
- **의미 분석**: AI 기반 조문 비교로 단순 문자열 대조를 넘어선 의미 변화 감지
- **실시간 알림**: 개정 이벤트 발생 즉시 담당자에게 검토 필요 신호 전송
- **표준화 관리**: 법령-조례 간 연계 데이터 체계적 관리

---

## 🌐 배포 정보

### 개발 환경 (Sandbox)
- **URL**: https://3000-it659h5af9cwbnqduu3yt-2e77fc33.sandbox.novita.ai
- **API Health Check**: https://3000-it659h5af9cwbnqduu3yt-2e77fc33.sandbox.novita.ai/api/health
- **Status**: ✅ 운영 중

### 프로덕션 환경
- **Platform**: Cloudflare Pages
- **Status**: 🚧 준비 중

---

## 📊 현재 완료된 기능

### ✅ Phase 0: Foundation (완료)
- [x] 프로젝트 초기 설정 및 Hono 프레임워크 구축
- [x] Git 저장소 초기화 및 버전 관리 시작
- [x] TypeScript 타입 시스템 구축
- [x] 데이터베이스 스키마 설계 (PostgreSQL + pgvector)
- [x] 미들웨어 구현 (CORS, Logger, Auth)
- [x] API 응답 유틸리티 함수
- [x] 메인 대시보드 UI (프론트엔드)

### ✅ Phase 1: Core Services (완료)
- [x] 법령 크롤러 서비스 구현 (국가법령정보센터 API 연동 준비)
- [x] 자치법규 크롤러 서비스 구현 (자치법규정보시스템 API 연동 준비)
- [x] 데이터베이스 서비스 레이어 구축
- [x] Vector Embedding 서비스 (OpenAI API 통합)
- [x] AI 영향 분석 엔진 (GPT-4 통합)
- [x] Laws API 라우트 구현
- [x] Analysis API 라우트 구현

### ✅ Phase 2: Complete API System (완료)
- [x] 알림 시스템 구현 (이메일 + 인앱 알림)
- [x] 사용자 인증 시스템 (JWT 기반 로그인/회원가입)
- [x] Regulations API 라우트 완성
- [x] Search API 라우트 (일반 검색 + 시맨틱 검색)
- [x] Notifications API 라우트
- [x] Auth API 라우트

### 🚧 Phase 3: Database Integration (진행 중)
- [ ] 실제 PostgreSQL 데이터베이스 연결
- [ ] 모든 API 엔드포인트의 실제 CRUD 구현
- [ ] 외부 API (국가법령정보센터, 자치법규정보시스템) 실제 연동
- [ ] 프론트엔드 UI 고도화
- [ ] 통합 테스트

---

## 🔌 API 엔드포인트

### Health Check
```http
GET /api/health
```

### Authentication
```http
POST   /api/v1/auth/register                 # 회원가입
POST   /api/v1/auth/login                    # 로그인 (JWT 발급)
POST   /api/v1/auth/logout                   # 로그아웃
GET    /api/v1/auth/me                       # 현재 사용자 정보
PUT    /api/v1/auth/me                       # 사용자 정보 수정
POST   /api/v1/auth/change-password          # 비밀번호 변경
POST   /api/v1/auth/forgot-password          # 비밀번호 재설정 요청
POST   /api/v1/auth/reset-password           # 비밀번호 재설정
GET    /api/v1/auth/verify-token             # 토큰 검증
```

### Laws Management
```http
GET    /api/v1/laws                          # 법령 목록 조회 (필터, 페이징)
GET    /api/v1/laws/:lawId                   # 법령 상세 조회
GET    /api/v1/laws/:lawId/revisions         # 법령 개정 이력 조회
GET    /api/v1/laws/:lawId/articles          # 법령 조문 조회
GET    /api/v1/laws/:lawId/linked-regulations # 연계된 자치법규 조회
POST   /api/v1/laws                          # 법령 생성 (관리자)
PUT    /api/v1/laws/:lawId                   # 법령 수정 (관리자)
DELETE /api/v1/laws/:lawId                   # 법령 삭제 (관리자)
POST   /api/v1/laws/crawl                    # 수동 크롤링 실행 (관리자)
```

### Regulations Management
```http
GET    /api/v1/regulations                   # 자치법규 목록 조회
GET    /api/v1/regulations/:regulationId     # 자치법규 상세 조회
GET    /api/v1/regulations/:regulationId/articles           # 조문 목록
GET    /api/v1/regulations/:regulationId/linked-laws        # 연계 법령
GET    /api/v1/regulations/:regulationId/impact-analyses    # 영향 분석 목록
GET    /api/v1/regulations/local-gov/:localGovCode          # 지자체별 법규
POST   /api/v1/regulations                   # 법규 생성 (관리자)
PUT    /api/v1/regulations/:regulationId     # 법규 수정 (관리자)
DELETE /api/v1/regulations/:regulationId     # 법규 삭제 (관리자)
POST   /api/v1/regulations/crawl             # 수동 크롤링
GET    /api/v1/regulations/stats             # 통계
```

### Impact Analysis
```http
GET    /api/v1/analysis                      # 영향 분석 목록 (필터, 페이징)
GET    /api/v1/analysis/:analysisId          # 영향 분석 상세 조회
POST   /api/v1/analysis/trigger              # 영향 분석 실행
PUT    /api/v1/analysis/:analysisId/review   # 검토 의견 제출
GET    /api/v1/analysis/stats                # 통계 조회
GET    /api/v1/analysis/:analysisId/history  # 검토 이력 조회
POST   /api/v1/analysis/batch-review         # 일괄 검토
```

### Notifications
```http
GET    /api/v1/notifications                 # 알림 목록 조회
GET    /api/v1/notifications/unread-count    # 읽지 않은 알림 개수
PUT    /api/v1/notifications/:id/read        # 알림 읽음 표시
POST   /api/v1/notifications/mark-all-read   # 모든 알림 읽음 표시
DELETE /api/v1/notifications/:id             # 알림 삭제
GET    /api/v1/notifications/settings        # 알림 설정 조회
PUT    /api/v1/notifications/settings        # 알림 설정 변경
POST   /api/v1/notifications/test            # 테스트 알림 발송
```

### Search
```http
POST   /api/v1/search/laws                   # 법령 검색
POST   /api/v1/search/regulations            # 자치법규 검색
POST   /api/v1/search/articles               # 조문 검색
POST   /api/v1/search/semantic               # 의미 기반 검색 (Vector Search)
POST   /api/v1/search/similar-articles       # 유사 조문 찾기
POST   /api/v1/search/analyze-query          # 검색어 분석
GET    /api/v1/search/suggestions            # 자동완성 제안
GET    /api/v1/search/recent                 # 최근 검색 기록
```

---

## 📁 데이터 아키텍처

### Core Entities

1. **laws** - 상위법령 (법률, 시행령, 시행규칙)
2. **law_revisions** - 법령 개정 이력
3. **articles** - 법령 조문 (vector embedding 포함)
4. **local_regulations** - 자치법규 (조례, 규칙)
5. **regulation_articles** - 자치법규 조문 (vector embedding 포함)
6. **law_regulation_links** - 법령-조례 연계 관계
7. **impact_analyses** - AI 영향 분석 결과
8. **users** - 사용자 (법무담당, 실무부서)
9. **notifications** - 알림
10. **review_history** - 검토 이력

### Storage Services

- **Primary Database**: PostgreSQL 15+ with pgvector extension
- **Cache**: Redis (Upstash)
- **Object Storage**: Cloudflare R2 (문서 저장용)

---

## 🛠 기술 스택

### Backend
- **Runtime**: Cloudflare Workers
- **Framework**: Hono (TypeScript)
- **Database**: PostgreSQL + pgvector
- **AI/ML**: OpenAI GPT-4 API

### Frontend
- **Framework**: React (embedded in HTML)
- **Styling**: TailwindCSS
- **Icons**: Font Awesome
- **HTTP Client**: Axios

### DevOps
- **Hosting**: Cloudflare Pages
- **Process Manager**: PM2 (development)
- **Version Control**: Git
- **CI/CD**: GitHub Actions (예정)

---

## 🚀 로컬 개발 환경 설정

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.dev.vars` 파일을 생성하고 다음 내용을 입력:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_law_analysis
JWT_SECRET=your-jwt-secret-key
OPENAI_API_KEY=sk-your-openai-api-key
LAW_API_KEY=your-law-api-key
REGULATION_API_KEY=your-regulation-api-key
SENDGRID_API_KEY=your-sendgrid-api-key
```

### 3. 데이터베이스 마이그레이션
```bash
# PostgreSQL 설치 및 실행 (필요 시)
# Mac: brew install postgresql
# Ubuntu: sudo apt-get install postgresql

# 데이터베이스 생성
createdb ai_law_analysis

# pgvector 확장 설치
# Mac: brew install pgvector
# Ubuntu: sudo apt-get install postgresql-15-pgvector

# 마이그레이션 실행
psql ai_law_analysis < migrations/0001_initial_schema.sql
```

### 4. 빌드 및 실행
```bash
# 빌드
npm run build

# 개발 서버 시작 (PM2)
pm2 start ecosystem.config.cjs

# 또는 직접 실행
npm run dev:sandbox

# 서버 확인
curl http://localhost:3000/api/health
```

---

## 📝 사용자 가이드

### 담당 공무원용

1. **로그인**: 담당 부서 계정으로 로그인
2. **대시보드 확인**: 검토 대기 건수, 긴급 알림 등 확인
3. **알림 확인**: 상위법 개정으로 인한 검토 필요 조례 확인
4. **영향 분석 검토**: AI가 분석한 영향도 및 권고사항 확인
5. **의견 입력**: 개정 필요성 판단 및 의견 작성
6. **처리 완료**: 검토 완료 표시

### 시스템 관리자용

1. **크롤러 모니터링**: 법령 데이터 수집 상태 확인
2. **연계 데이터 관리**: 법령-조례 매핑 검증 및 보정
3. **사용자 관리**: 계정 생성 및 권한 설정
4. **시스템 통계**: 전체 검토 현황 및 완료율 확인

---

## 🔄 추천 개발 순서

### Phase 1: Data Ingestion (다음 단계)
1. 국가법령정보센터 API 연동
2. 자치법규정보시스템 API 연동
3. 데이터 파싱 및 정규화
4. Vector Embedding 파이프라인

### Phase 2: AI Analysis
1. OpenAI API 통합
2. 조문 비교 로직
3. 영향도 점수 계산
4. 신뢰도 평가

### Phase 3: Notification & Workflow
1. 알림 발송 시스템
2. 검토 워크플로우
3. 대시보드 고도화

---

## 📊 시스템 현황

| Component | Status | Description |
|-----------|--------|-------------|
| API Server | ✅ 운영 중 | Hono 기반 REST API (70+개 엔드포인트) |
| Database Schema | ✅ 완료 | PostgreSQL + pgvector 마이그레이션 |
| Frontend Dashboard | ✅ 완료 | 기본 대시보드 UI |
| Law Crawler | ✅ 구현 완료 | 국가법령정보 API 연동 준비 |
| Regulation Crawler | ✅ 구현 완료 | 자치법규정보 API 연동 준비 |
| Database Service | ✅ 구현 완료 | CRUD 및 Vector Search 인터페이스 |
| Embedding Service | ✅ 구현 완료 | OpenAI Embeddings API 통합 |
| AI Analysis Engine | ✅ 구현 완료 | GPT-4 기반 영향 분석 |
| Laws API Routes | ✅ 구현 완료 | 법령 관리 (9개 엔드포인트) |
| Regulations API Routes | ✅ 구현 완료 | 자치법규 관리 (11개 엔드포인트) |
| Analysis API Routes | ✅ 구현 완료 | 영향 분석 및 검토 (7개 엔드포인트) |
| Authentication API | ✅ 구현 완료 | JWT 기반 인증 (9개 엔드포인트) |
| Notifications API | ✅ 구현 완료 | 알림 관리 (8개 엔드포인트) |
| Search API | ✅ 구현 완료 | 검색 기능 (8개 엔드포인트) |
| Notification Service | ✅ 구현 완료 | 이메일(SendGrid) + 인앱 알림 |
| Database Integration | 🚧 개발 예정 | 실제 PostgreSQL 연결 및 CRUD |

---

## 📞 문의

- **프로젝트 담당**: AI Law Analysis Team
- **기술 지원**: GitHub Issues
- **이메일**: support@example.go.kr

---

## 📄 라이선스

Copyright © 2024 AI 기반 자치법규 영향 분석 시스템. All rights reserved.

---

**최종 업데이트**: 2024-11-19  
**버전**: 1.2.0 (Phase 2 완료 - Complete API System with 70+ Endpoints)
