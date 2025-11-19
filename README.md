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

### 🚧 Phase 1: MVP Development (진행 중)
- [ ] 법령 크롤러 서비스 (국가법령정보센터 API 연동)
- [ ] 자치법규 크롤러 서비스
- [ ] 법령-조례 연계 알고리즘
- [ ] Vector Embedding 파이프라인
- [ ] AI 영향 분석 엔진 (LLM 통합)
- [ ] 알림 시스템

---

## 🔌 API 엔드포인트

### Health Check
```http
GET /api/health
```

### Laws Management
```http
GET    /api/v1/laws
GET    /api/v1/laws/:lawId
```

### Regulations Management
```http
GET    /api/v1/regulations
```

### Impact Analysis
```http
GET    /api/v1/analysis
POST   /api/v1/analysis/trigger
```

### Notifications
```http
GET    /api/v1/notifications
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
| API Server | ✅ 운영 중 | Hono 기반 REST API |
| Database Schema | ✅ 완료 | PostgreSQL + pgvector |
| Frontend Dashboard | ✅ 완료 | 기본 대시보드 UI |
| Law Crawler | 🚧 개발 예정 | 국가법령정보 API 연동 |
| Regulation Crawler | 🚧 개발 예정 | 자치법규정보 API 연동 |
| AI Analysis Engine | 🚧 개발 예정 | LLM 기반 영향 분석 |
| Notification System | 🚧 개발 예정 | 이메일/시스템 알림 |

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
**버전**: 1.0.0 (Phase 0 완료)
