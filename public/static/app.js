// AI-based Local Regulation Impact Analysis System - Frontend

const API_BASE = '/api/v1';

// Utility Functions
function showLoading() {
  document.getElementById('loading')?.classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading')?.classList.add('hidden');
}

function showError(message) {
  alert(`오류: ${message}`);
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR');
}

function formatConfidence(score) {
  return (parseFloat(score) * 100).toFixed(1) + '%';
}

// API Calls
async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'API 요청 실패');
    }
    return data.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Dashboard Functions
async function loadDashboard() {
  showLoading();
  try {
    const stats = await fetchAPI('/stats/dashboard');
    renderDashboard(stats);
  } catch (error) {
    showError('대시보드를 불러오는데 실패했습니다.');
  } finally {
    hideLoading();
  }
}

function renderDashboard(stats) {
  // Overview Stats
  document.getElementById('total-laws').textContent = stats.overview.total_laws.toLocaleString();
  document.getElementById('total-regulations').textContent = stats.overview.total_regulations.toLocaleString();
  document.getElementById('total-links').textContent = stats.overview.total_links.toLocaleString();
  document.getElementById('linkage-rate').textContent = stats.coverage.linkage_rate;
  
  // Top Laws
  const topLawsHTML = stats.top_laws.map((law, i) => `
    <div class="flex items-center justify-between py-3 border-b border-gray-100">
      <div class="flex-1">
        <div class="flex items-center">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold mr-3">
            ${i + 1}
          </span>
          <span class="text-sm font-medium text-gray-900">${law.law_name}</span>
        </div>
      </div>
      <div class="flex items-center space-x-4">
        <span class="text-sm text-gray-500">${law.regulation_count}건</span>
        <span class="text-xs text-gray-400">${formatConfidence(law.avg_confidence)}</span>
      </div>
    </div>
  `).join('');
  document.getElementById('top-laws-list').innerHTML = topLawsHTML;
  
  // Regulations by Type
  const byTypeHTML = stats.regulations_by_type.map(item => `
    <div class="flex items-center justify-between py-2">
      <span class="text-sm text-gray-600">${item.type}</span>
      <span class="text-sm font-medium text-gray-900">${item.count.toLocaleString()}건</span>
    </div>
  `).join('');
  document.getElementById('regs-by-type').innerHTML = byTypeHTML;
  
  // Top Departments
  const deptHTML = stats.top_departments.slice(0, 5).map((dept, i) => `
    <div class="flex items-center justify-between py-2">
      <span class="text-sm text-gray-600">${dept.department}</span>
      <span class="text-sm font-medium text-gray-900">${dept.count}건</span>
    </div>
  `).join('');
  document.getElementById('top-departments').innerHTML = deptHTML;
}

// Regulations List Functions
async function loadRegulations(page = 1, search = '', type = '') {
  showLoading();
  try {
    let endpoint = `/regulations?page=${page}&limit=20`;
    if (search) endpoint += `&search=${encodeURIComponent(search)}`;
    if (type) endpoint += `&type=${encodeURIComponent(type)}`;
    
    const data = await fetchAPI(endpoint);
    renderRegulationsList(data.regulations);
    renderPagination(data.pagination, 'loadRegulations');
  } catch (error) {
    showError('자치법규 목록을 불러오는데 실패했습니다.');
  } finally {
    hideLoading();
  }
}

function renderRegulationsList(regulations) {
  const html = regulations.map(reg => `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
         onclick="viewRegulation('${reg.regulation_id}')">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">${reg.regulation_name}</h3>
          <div class="flex items-center space-x-4 text-sm text-gray-500">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium">
              ${reg.regulation_type}
            </span>
            <span><i class="fas fa-building mr-1"></i>${reg.department || '-'}</span>
            <span><i class="fas fa-calendar mr-1"></i>${formatDate(reg.enactment_date)}</span>
          </div>
        </div>
        <i class="fas fa-chevron-right text-gray-400"></i>
      </div>
    </div>
  `).join('');
  document.getElementById('regulations-list').innerHTML = html || '<p class="text-gray-500 text-center py-8">검색 결과가 없습니다.</p>';
}

// Regulation Detail Functions
async function viewRegulation(regulationId) {
  window.location.href = `/regulation.html?id=${regulationId}`;
}

async function loadRegulationDetail(regulationId) {
  showLoading();
  try {
    const [regulation, links] = await Promise.all([
      fetchAPI(`/regulations/${regulationId}`),
      fetchAPI(`/regulations/${regulationId}/links`)
    ]);
    renderRegulationDetail(regulation, links);
  } catch (error) {
    showError('자치법규 상세 정보를 불러오는데 실패했습니다.');
  } finally {
    hideLoading();
  }
}

function renderRegulationDetail(regulation, linksData) {
  document.getElementById('reg-name').textContent = regulation.regulation_name;
  document.getElementById('reg-type').textContent = regulation.regulation_type;
  document.getElementById('reg-local-gov').textContent = regulation.local_gov;
  document.getElementById('reg-department').textContent = regulation.department || '-';
  document.getElementById('reg-enactment-date').textContent = formatDate(regulation.enactment_date);
  document.getElementById('reg-status').textContent = regulation.status || '시행';
  
  // Linked Laws
  const linksHTML = linksData.links.map(link => `
    <div class="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 transition-colors">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h4 class="text-base font-semibold text-gray-900 mb-1">${link.law_name}</h4>
          <p class="text-sm text-gray-600 mb-2">제${link.article_number}조 ${link.article_title || ''}</p>
          <div class="flex items-center space-x-3 text-xs">
            <span class="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
              유사도: ${formatConfidence(link.confidence_score)}
            </span>
            <span class="text-gray-500">${link.link_type}</span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
  document.getElementById('linked-laws').innerHTML = linksHTML || '<p class="text-gray-500 text-center py-4">연계된 법령이 없습니다.</p>';
  document.getElementById('total-links').textContent = linksData.total_links;
}

// Laws List Functions
async function loadLaws(page = 1, search = '') {
  showLoading();
  try {
    let endpoint = `/laws?page=${page}&limit=20`;
    if (search) endpoint += `&search=${encodeURIComponent(search)}`;
    
    const data = await fetchAPI(endpoint);
    renderLawsList(data.laws);
    renderPagination(data.pagination, 'loadLaws');
  } catch (error) {
    showError('법령 목록을 불러오는데 실패했습니다.');
  } finally {
    hideLoading();
  }
}

function renderLawsList(laws) {
  const html = laws.map(law => `
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
         onclick="viewLaw('${law.law_id}')">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h3 class="text-lg font-semibold text-gray-900 mb-2">${law.law_name}</h3>
          <div class="flex items-center space-x-4 text-sm text-gray-500">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
              ${law.law_type}
            </span>
            <span><i class="fas fa-file-alt mr-1"></i>${law.law_number || '-'}</span>
            <span><i class="fas fa-calendar mr-1"></i>${formatDate(law.enactment_date)}</span>
          </div>
        </div>
        <i class="fas fa-chevron-right text-gray-400"></i>
      </div>
    </div>
  `).join('');
  document.getElementById('laws-list').innerHTML = html || '<p class="text-gray-500 text-center py-8">검색 결과가 없습니다.</p>';
}

async function viewLaw(lawId) {
  window.location.href = `/law.html?id=${lawId}`;
}

// Pagination
function renderPagination(pagination, loadFunction) {
  const { page, totalPages } = pagination;
  let html = '';
  
  // Previous button
  if (page > 1) {
    html += `<button onclick="${loadFunction}(${page - 1})" class="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">이전</button>`;
  }
  
  // Page numbers
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    const activeClass = i === page ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50';
    html += `<button onclick="${loadFunction}(${i})" class="px-3 py-2 rounded-lg ${activeClass}">${i}</button>`;
  }
  
  // Next button
  if (page < totalPages) {
    html += `<button onclick="${loadFunction}(${page + 1})" class="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">다음</button>`;
  }
  
  const paginationEl = document.getElementById('pagination');
  if (paginationEl) {
    paginationEl.innerHTML = html;
  }
}

// Search Functions
function handleSearch(event, loadFunction) {
  event.preventDefault();
  const search = document.getElementById('search-input').value;
  loadFunction(1, search);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check current page and load appropriate data
  const path = window.location.pathname;
  
  if (path === '/' || path === '/index.html') {
    loadDashboard();
  } else if (path === '/regulations.html') {
    loadRegulations();
  } else if (path === '/regulation.html') {
    const urlParams = new URLSearchParams(window.location.search);
    const regulationId = urlParams.get('id');
    if (regulationId) {
      loadRegulationDetail(regulationId);
    }
  } else if (path === '/laws.html') {
    loadLaws();
  }
});
