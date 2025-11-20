/**
 * AI Law Impact Analysis System - Main Application
 */

import { Hono } from 'hono';
import { serveStatic } from 'hono/cloudflare-workers';
import type { HonoEnv } from './types/bindings';
import { cors } from './middleware/cors';
import { logger } from './middleware/logger';

// Initialize Hono app
const app = new Hono<HonoEnv>();

// ============================================================
// Global Middleware
// ============================================================
app.use('*', logger());
app.use('/api/*', cors());

// ============================================================
// Static Files
// ============================================================
app.use('/static/*', serveStatic({ root: './public' }));
app.use('/*.html', serveStatic({ root: './public' }));

// ============================================================
// API Routes
// ============================================================

// Health Check
app.get('/api/health', (c) => {
  return c.json({
    success: true,
    service: 'AI Law Impact Analysis System',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Import route modules
import authRoutes from './routes/auth';
import lawsRoutes from './routes/laws';
import analysisRoutes from './routes/analysis';
import regulationsRoutes from './routes/regulations';
import notificationsRoutes from './routes/notifications';
import searchRoutes from './routes/search';
import statsRoutes from './routes/stats';

// API v1 Routes
const apiV1 = new Hono<HonoEnv>();

// Mount sub-routes
apiV1.route('/auth', authRoutes);
apiV1.route('/laws', lawsRoutes);
apiV1.route('/analysis', analysisRoutes);
apiV1.route('/regulations', regulationsRoutes);
apiV1.route('/notifications', notificationsRoutes);
apiV1.route('/search', searchRoutes);
apiV1.route('/stats', statsRoutes);

// Mount API v1
app.route('/api/v1', apiV1);

// ============================================================
// Frontend Routes
// ============================================================

// Import HTML files as raw strings
import regulationsHTML from '../public/regulations.html?raw';
import lawsHTML from '../public/laws.html?raw';
import regulationHTML from '../public/regulation.html?raw';
import lawHTML from '../public/law.html?raw';

app.get('/regulations', (c) => {
  return c.html(regulationsHTML);
});

app.get('/laws', (c) => {
  return c.html(lawsHTML);
});

app.get('/regulation', (c) => {
  return c.html(regulationHTML);
});

app.get('/law', (c) => {
  return c.html(lawHTML);
});

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI 자치법규 영향 분석 시스템</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
        <!-- Loading Overlay -->
        <div id="loading" class="loading-overlay hidden">
            <div class="spinner"></div>
        </div>
        <!-- Header -->
        <header class="bg-white shadow-sm border-b border-gray-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <div class="bg-blue-600 text-white rounded-lg p-2">
                            <i class="fas fa-balance-scale text-2xl"></i>
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold text-gray-900">AI 자치법규 영향 분석</h1>
                            <p class="text-sm text-gray-500">법령 개정 자동 탐지 및 조례 검토 지원 시스템</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <a href="/regulations" class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                            <i class="fas fa-file-alt mr-2"></i>자치법규
                        </a>
                        <a href="/laws" class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                            <i class="fas fa-gavel mr-2"></i>법령
                        </a>
                        <a href="/" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
                            <i class="fas fa-home mr-2"></i>대시보드
                        </a>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Quick Access -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <a href="/regulations" class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-center space-x-4">
                        <div class="bg-blue-100 rounded-full p-4">
                            <i class="fas fa-file-alt text-blue-600 text-3xl"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-semibold text-gray-900">자치법규 검색</h3>
                            <p class="text-gray-600 mt-1">조례 및 규칙 검색 및 상위법령 확인</p>
                        </div>
                    </div>
                </a>
                <a href="/laws" class="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                    <div class="flex items-center space-x-4">
                        <div class="bg-purple-100 rounded-full p-4">
                            <i class="fas fa-gavel text-purple-600 text-3xl"></i>
                        </div>
                        <div>
                            <h3 class="text-xl font-semibold text-gray-900">법령 검색</h3>
                            <p class="text-gray-600 mt-1">상위법령 및 연계 자치법규 확인</p>
                        </div>
                    </div>
                </a>
            </div>

            <!-- Stats Cards -->
            <div id="stats-cards" class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">자치법규</p>
                            <p class="text-3xl font-bold text-gray-900 mt-2" id="stat-regulations">-</p>
                        </div>
                        <div class="bg-blue-100 rounded-full p-3">
                            <i class="fas fa-file-alt text-blue-600 text-xl"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">상위법령</p>
                            <p class="text-3xl font-bold text-gray-900 mt-2" id="stat-laws">-</p>
                        </div>
                        <div class="bg-purple-100 rounded-full p-3">
                            <i class="fas fa-gavel text-purple-600 text-xl"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">연계 관계</p>
                            <p class="text-3xl font-bold text-gray-900 mt-2" id="stat-links">-</p>
                        </div>
                        <div class="bg-green-100 rounded-full p-3">
                            <i class="fas fa-link text-green-600 text-xl"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">연계율</p>
                            <p class="text-3xl font-bold text-gray-900 mt-2" id="stat-coverage">-</p>
                        </div>
                        <div class="bg-orange-100 rounded-full p-3">
                            <i class="fas fa-percentage text-orange-600 text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- System Features -->
            <div class="bg-white rounded-lg shadow mb-8">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h2 class="text-lg font-semibold text-gray-900">시스템 주요 기능</h2>
                </div>
                <div class="p-6">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="border border-gray-200 rounded-lg p-6">
                            <div class="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                                <i class="fas fa-sync-alt text-blue-600 text-xl"></i>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">실시간 모니터링</h3>
                            <p class="text-gray-600 text-sm">
                                국가법령정보센터와 연동하여 상위법 개정사항을 자동으로 탐지합니다.
                            </p>
                        </div>

                        <div class="border border-gray-200 rounded-lg p-6">
                            <div class="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                                <i class="fas fa-brain text-purple-600 text-xl"></i>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">AI 영향 분석</h3>
                            <p class="text-gray-600 text-sm">
                                LLM 기반 의미 분석으로 개정 조문이 자치법규에 미치는 영향을 자동 판단합니다.
                            </p>
                        </div>

                        <div class="border border-gray-200 rounded-lg p-6">
                            <div class="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                                <i class="fas fa-bell text-green-600 text-xl"></i>
                            </div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">스마트 알림</h3>
                            <p class="text-gray-600 text-sm">
                                담당 부서에 맞춤형 검토 알림을 발송하고 처리 현황을 추적합니다.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- API Status -->
            <div class="bg-white rounded-lg shadow">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h2 class="text-lg font-semibold text-gray-900">시스템 상태</h2>
                </div>
                <div class="p-6">
                    <div class="space-y-4">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span class="text-gray-700">API Server</span>
                            </div>
                            <span class="text-sm text-green-600 font-medium">정상 운영</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <span class="text-gray-700">법령 크롤러</span>
                            </div>
                            <span class="text-sm text-yellow-600 font-medium">구축 중</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <span class="text-gray-700">AI 분석 엔진</span>
                            </div>
                            <span class="text-sm text-yellow-600 font-medium">구축 중</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <span class="text-gray-700">알림 시스템</span>
                            </div>
                            <span class="text-sm text-yellow-600 font-medium">구축 중</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="bg-white border-t border-gray-200 mt-12">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div class="text-center text-sm text-gray-500">
                    <p>© 2024 AI 기반 자치법규 영향 분석 시스템. All rights reserved.</p>
                    <p class="mt-2">
                        <a href="/api/health" class="text-blue-600 hover:text-blue-800">API Health Check</a>
                        <span class="mx-2">|</span>
                        <a href="https://github.com" class="text-blue-600 hover:text-blue-800">GitHub</a>
                    </p>
                </div>
            </div>
        </footer>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script>
            // Load dashboard stats
            window.addEventListener('DOMContentLoaded', async () => {
                try {
                    const response = await axios.get('/api/v1/stats/dashboard');
                    const data = response.data.data;
                    
                    // Update stats
                    document.getElementById('stat-regulations').textContent = data.overview.total_regulations || '-';
                    document.getElementById('stat-laws').textContent = data.overview.total_laws || '-';
                    document.getElementById('stat-links').textContent = data.overview.total_links || '-';
                    document.getElementById('stat-coverage').textContent = data.coverage.linkage_rate || '-';
                    
                    console.log('Dashboard loaded:', data);
                } catch (error) {
                    console.error('Failed to load dashboard:', error);
                }
            });
        </script>
    </body>
    </html>
  `);
});

// 404 Handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource was not found'
  }, 404);
});

// Error Handler
app.onError((err, c) => {
  console.error('Server Error:', err);
  return c.json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  }, 500);
});

export default app;
