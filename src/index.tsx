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
import lawsRoutes from './routes/laws';
import analysisRoutes from './routes/analysis';

// API v1 Routes
const apiV1 = new Hono<HonoEnv>();

// Mount sub-routes
apiV1.route('/laws', lawsRoutes);
apiV1.route('/analysis', analysisRoutes);

// Regulations (placeholder)
apiV1.get('/regulations', (c) => {
  return c.json({ message: 'Regulations endpoint - Coming soon' });
});

apiV1.get('/regulations/:regulationId', (c) => {
  const regulationId = c.req.param('regulationId');
  return c.json({ message: `Regulation details for ${regulationId}` });
});

// Notifications (placeholder)
apiV1.get('/notifications', (c) => {
  return c.json({ message: 'Notifications endpoint - Coming soon' });
});

// Search (placeholder)
apiV1.post('/search/laws', async (c) => {
  return c.json({ message: 'Law search - Coming soon' });
});

apiV1.post('/search/regulations', async (c) => {
  return c.json({ message: 'Regulation search - Coming soon' });
});

apiV1.post('/search/semantic', async (c) => {
  return c.json({ message: 'Semantic search - Coming soon' });
});

// Mount API v1
app.route('/api/v1', apiV1);

// ============================================================
// Frontend Routes
// ============================================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI 기반 자치법규 영향 분석 시스템</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <link href="/static/style.css" rel="stylesheet">
    </head>
    <body class="bg-gray-50">
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
                        <button class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                            <i class="fas fa-bell mr-2"></i>알림
                        </button>
                        <button class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">
                            <i class="fas fa-user mr-2"></i>로그인
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">검토 대기</p>
                            <p class="text-3xl font-bold text-gray-900 mt-2">0</p>
                        </div>
                        <div class="bg-orange-100 rounded-full p-3">
                            <i class="fas fa-clock text-orange-600 text-xl"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">긴급 알림</p>
                            <p class="text-3xl font-bold text-gray-900 mt-2">0</p>
                        </div>
                        <div class="bg-red-100 rounded-full p-3">
                            <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">이번 달 개정</p>
                            <p class="text-3xl font-bold text-gray-900 mt-2">0</p>
                        </div>
                        <div class="bg-blue-100 rounded-full p-3">
                            <i class="fas fa-file-alt text-blue-600 text-xl"></i>
                        </div>
                    </div>
                </div>

                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-600">완료율</p>
                            <p class="text-3xl font-bold text-gray-900 mt-2">0%</p>
                        </div>
                        <div class="bg-green-100 rounded-full p-3">
                            <i class="fas fa-check-circle text-green-600 text-xl"></i>
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
            // Check API health on load
            window.addEventListener('DOMContentLoaded', async () => {
                try {
                    const response = await axios.get('/api/health');
                    console.log('API Status:', response.data);
                } catch (error) {
                    console.error('API Health Check Failed:', error);
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
