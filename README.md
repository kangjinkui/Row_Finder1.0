# AI 기반 자치법규 영향 분석 시스템

법령 개정 자동 탐지 및 AI 기반 자치법규 영향 분석 시스템

## 📋 프로젝트 개요

이 시스템은 **법제처 Open API**를 통해 자치법규와 상위법령 데이터를 수집하고, **Google Gemini AI**를 활용한 벡터 임베딩 기술로 자치법규와 상위법령 간의 연관성을 자동으로 분석합니다.

### 🎯 주요 목적

- 자치법규와 상위법령 간의 연계 관계 자동 분석
- AI 기반 유사도 계산을 통한 정확한 법령 매칭
- 법무팀의 법규 검토 시간 단축
- 법령 개정 시 영향받는 자치법규 즉시 파악

---

## 🌐 배포 URL

**개발 환경**: https://3000-it659h5af9cwbnqduu3yt-2e77fc33.sandbox.novita.ai

**GitHub 저장소**: https://github.com/kangjinkui/Row_Finder1.0

---

## ✨ 주요 기능

### 1. 자치법규 검색 및 조회
- **513개** 서울시 강남구 자치법규 (조례 398개, 규칙 115개)
- 법규명, 소관부서로 검색
- 조례/규칙 필터링
- 페이지네이션 (20개씩)

### 2. 상위법령 검색 및 조회
- **9개** 지방자치 관련 상위법령
- 법령명 검색
- 법령별 연계 자치법규 확인

### 3. AI 기반 연계 분석
- **2,555개** 자치법규-법령 연계 관계
- **99.61%** 연계율 (511/513)
- **벡터 유사도** 기반 자동 매칭
- 유사도 점수 **0.65 이상** 항목만 표시

### 4. 실시간 통계 대시보드
- 전체 자치법규/법령 수
- 연계 관계 통계
- 상위 참조 법령 Top 5
- 소관부서별 법규 현황

---

## 🛠️ 기술 스택

### Backend
- **Hono** - Lightweight web framework
- **Cloudflare Workers** - Edge runtime
- **Neon PostgreSQL** - Serverless database
- **pgvector** - Vector similarity search
- **TypeScript** - Type-safe development

### AI/ML
- **Google Gemini API** - text-embedding-004 model
- **Vector Dimension**: 1536
- **Similarity**: Cosine similarity (pgvector)

### Frontend
- **Vanilla JavaScript** - No framework overhead
- **Tailwind CSS** - Utility-first styling
- **Font Awesome** - Icon library
- **Axios** - HTTP client

### DevOps
- **Vite** - Build tool
- **PM2** - Process manager
- **Wrangler** - Cloudflare CLI
- **Git** - Version control

---

## 📊 데이터 현황

### 자치법규
- **총 513개**
  - 조례: 398개
  - 규칙: 115개
- **지역**: 서울시 강남구
- **소관부서**: 22개 주요 부서

### 상위법령 (9개)
1. 지방자치단체를 당사자로 하는 계약에 관한 법률 (511개 연계)
2. 지방교부세법 (511개 연계)
3. 지방자치단체 출자·출연 기관의 운영에 관한 법률 (508개 연계)
4. 지방공무원법 (502개 연계)
5. 지방공기업법 (14개 연계)
6. 지방재정법
7. 지방교육자치에 관한 법률
8. 공유재산 및 물품 관리법
9. 주민소환에 관한 법률

### 벡터 임베딩
- **자치법규**: 513개 (100%)
- **법령 조문**: 87개 (활성 조문)
- **총 임베딩**: 600개
- **성공률**: 100%

### 연계 분석 결과
- **총 연계 수**: 2,555개
- **연계율**: 99.61% (511/513)
- **평균 유사도**: 0.78~0.86
- **자치법규당 평균 연계**: 5개

---

## 🎯 사용 방법

### 1. 자치법규 검색
1. 메인 페이지에서 **[자치법규 검색]** 클릭
2. 검색창에 법규명 입력 (예: "1인가구", "복지", "환경")
3. 필터에서 조례/규칙 선택 (선택사항)
4. 검색 결과에서 원하는 법규 클릭

### 2. 상위법령 확인
1. 자치법규 상세 페이지에서 **연계된 상위법령** 섹션 확인
2. 법령명, 조문 번호, 유사도 점수 표시됨
3. 연계 유형: 근거법령, 준용, 참조

### 3. 법령 검색
1. 메인 페이지에서 **[법령 검색]** 클릭
2. 법령명으로 검색
3. 법령별 연계된 자치법규 수 확인

---

## 🚀 로컬 개발 환경 설정

### 필수 요구사항
- Node.js 18+
- npm or yarn
- PostgreSQL (Neon 권장)
- Gemini API Key

### 설치 방법

```bash
# 저장소 클론
git clone https://github.com/kangjinkui/Row_Finder1.0.git
cd Row_Finder1.0

# 의존성 설치
npm install

# 환경 변수 설정
cp .dev.vars.example .dev.vars
# .dev.vars 파일에 다음 변수 설정:
# DATABASE_URL=your_neon_database_url
# GEMINI_API_KEY=your_gemini_api_key

# 데이터베이스 마이그레이션 (필요시)
npm run db:migrate:local

# 개발 서버 시작
npm run build
npm run dev:sandbox

# 또는 PM2로 시작
pm2 start ecosystem.config.cjs
```

### 개발 서버
- **개발 URL**: http://localhost:3000
- **API Health**: http://localhost:3000/api/health
- **대시보드**: http://localhost:3000/api/v1/stats/dashboard

---

## 📡 API 엔드포인트

### 자치법규 API

```bash
# 자치법규 목록
GET /api/v1/regulations
Query: ?page=1&limit=20&search=검색어&type=조례

# 자치법규 상세
GET /api/v1/regulations/:id

# 자치법규 연계 정보
GET /api/v1/regulations/:id/links

# 유사 자치법규 검색 (벡터 유사도)
POST /api/v1/regulations/similar
Body: { "query": "검색 텍스트" }

# 자치법규 통계
GET /api/v1/regulations/stats/summary
```

### 법령 API

```bash
# 법령 목록
GET /api/v1/laws
Query: ?page=1&limit=20&search=검색어

# 법령 상세
GET /api/v1/laws/:id

# 법령 조문 목록
GET /api/v1/laws/:id/articles

# 법령 연계 자치법규
GET /api/v1/laws/:id/linked-regulations

# 법령 통계
GET /api/v1/laws/stats/summary
```

### 통계 API

```bash
# 대시보드 통계
GET /api/v1/stats/dashboard

# 연계 관계 통계
GET /api/v1/stats/linkage
```

---

## 🗄️ 데이터베이스 스키마

### 주요 테이블

**laws** - 상위법령
- law_id (PK)
- law_name
- law_type
- enactment_date
- status

**articles** - 법령 조문
- article_id (PK)
- law_id (FK)
- article_number
- article_content
- vector_embedding (vector(1536))

**local_regulations** - 자치법규
- regulation_id (PK)
- regulation_name
- regulation_type
- local_gov
- department
- vector_embedding (vector(1536))

**law_regulation_links** - 연계 관계
- link_id (PK)
- law_id (FK)
- regulation_id (FK)
- article_id (FK)
- confidence_score
- link_type

---

## 🎨 프로젝트 구조

```
webapp/
├── src/
│   ├── index.tsx              # Main application entry
│   ├── routes/                # API route handlers
│   │   ├── regulations.ts     # Regulations API
│   │   ├── laws.ts            # Laws API
│   │   ├── stats.ts           # Statistics API
│   │   └── ...
│   ├── utils/
│   │   └── neonDb.ts          # Database connection
│   └── types/
│       └── bindings.ts        # TypeScript types
├── public/
│   ├── static/
│   │   ├── app.js             # Frontend JavaScript
│   │   └── style.css          # Custom styles
│   ├── regulations.html       # Regulations list page
│   ├── regulation.html        # Regulation detail page
│   └── laws.html              # Laws list page
├── scripts/
│   ├── crawl-local-regulations.js
│   ├── crawl-laws.js
│   ├── generate-embeddings.js
│   └── link-regulations-to-laws.js
├── wrangler.jsonc             # Cloudflare config
├── package.json
├── ecosystem.config.cjs       # PM2 config
└── README.md
```

---

## 🔧 스크립트 명령어

```bash
# 개발
npm run dev              # Vite dev server
npm run dev:sandbox      # Wrangler dev server (sandbox)
npm run build            # Build for production

# 데이터베이스
npm run db:migrate:local # Apply migrations (local)
npm run db:migrate:prod  # Apply migrations (production)
npm run db:seed          # Seed test data
npm run db:reset         # Reset local database

# 배포
npm run deploy           # Deploy to Cloudflare Pages
npm run deploy:prod      # Deploy to production

# Git
npm run git:init         # Initialize git repository
npm run git:commit       # Add and commit changes
npm run git:status       # Check git status
npm run git:log          # View commit history

# 유틸리티
npm run clean-port       # Kill process on port 3000
npm run test             # Test health endpoint
```

---

## 📈 성능 지표

### 처리 속도
- **벡터 임베딩 생성**: ~35분 (513개 자치법규)
- **연계 분석**: ~10분 (44,631번 유사도 계산)
- **API 응답 시간**:
  - 목록 조회: ~500ms
  - 상세 조회: ~300ms
  - 연계 조회: ~800ms

### 정확도
- **임베딩 성공률**: 100%
- **연계율**: 99.61%
- **평균 유사도**: 0.78~0.86

---

## 🔮 향후 개발 계획

### Phase 1: 법령 개정 모니터링 (진행 예정)
- [ ] 법제처 API 자동 크롤링
- [ ] 법령 개정 이력 추적
- [ ] 개정 시 영향 자치법규 자동 분석
- [ ] 이메일/SMS 알림 시스템

### Phase 2: 고도화 (계획 중)
- [ ] 사용자별 즐겨찾기 기능
- [ ] 법규 비교 기능
- [ ] 엑셀 내보내기
- [ ] PDF 리포트 생성
- [ ] 검토 이력 관리

### Phase 3: 확장 (장기)
- [ ] 다른 지자체 데이터 추가
- [ ] 법령 전문 표시
- [ ] 챗봇 인터페이스
- [ ] 모바일 앱 개발

---

## 🤝 기여 방법

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다.

---

## 📞 문의

프로젝트 관련 문의사항이나 버그 리포트는 [GitHub Issues](https://github.com/kangjinkui/Row_Finder1.0/issues)에 등록해주세요.

---

## 📚 참고 자료

- [법제처 Open API](https://www.law.go.kr/LSW/openApi.do)
- [Google Gemini API](https://ai.google.dev/)
- [Hono Framework](https://hono.dev/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Neon Serverless Postgres](https://neon.tech/)
- [pgvector](https://github.com/pgvector/pgvector)

---

**© 2024 AI 기반 자치법규 영향 분석 시스템. All rights reserved.**
