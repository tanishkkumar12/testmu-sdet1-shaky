import http from 'http';
import url from 'url';

export interface TestRun {
  id: string;
  name: string;
  suite: string;
  environment: string;
  status: 'passed' | 'failed' | 'running';
  durationSec: number;
  author: string;
  createdAt: string;
}

// In-memory state for reproducible test runs
const failedLoginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const validTokens = new Set<string>(['valid-token-admin', 'valid-token-viewer']);
const apiRateLimitMap = new Map<string, { count: number; resetAt: number }>();

const INITIAL_TEST_RUNS: TestRun[] = [
  { id: 'TR-101', name: 'Smoke Test Suite v2.4', suite: 'Smoke', environment: 'staging', status: 'passed', durationSec: 42, author: 'admin@testmu.ai', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'TR-102', name: 'Regression Core Billing', suite: 'Billing', environment: 'staging', status: 'failed', durationSec: 184, author: 'engineer@testmu.ai', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'TR-103', name: 'API Security Regression', suite: 'Security', environment: 'production', status: 'passed', durationSec: 95, author: 'admin@testmu.ai', createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 'TR-104', name: 'UI Dashboard E2E', suite: 'Frontend', environment: 'staging', status: 'running', durationSec: 61, author: 'engineer@testmu.ai', createdAt: new Date(Date.now() - 1800000).toISOString() },
];

let testRuns: TestRun[] = JSON.parse(JSON.stringify(INITIAL_TEST_RUNS));

export function resetMockState() {
  failedLoginAttempts.clear();
  testRuns = JSON.parse(JSON.stringify(INITIAL_TEST_RUNS));
  apiRateLimitMap.clear();
}

const HTML_LOGIN_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TestMu AI - Login</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; padding: 2.5rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); width: 100%; max-width: 400px; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #38bdf8; }
    p.subtitle { color: #94a3b8; font-size: 0.875rem; margin-bottom: 1.5rem; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; font-size: 0.85rem; margin-bottom: 0.4rem; color: #cbd5e1; }
    input { width: 100%; padding: 0.65rem 0.75rem; border: 1px solid #334155; border-radius: 6px; background: #0f172a; color: #f8fafc; box-sizing: border-box; }
    input:focus { outline: 2px solid #38bdf8; border-color: transparent; }
    button { width: 100%; padding: 0.75rem; border: none; border-radius: 6px; background: #0284c7; color: white; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #0369a1; }
    .alert-error { background: #7f1d1d; border: 1px solid #b91c1c; color: #fca5a5; padding: 0.65rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 1rem; display: none; }
    .alert-success { background: #14532d; border: 1px solid #16a34a; color: #86efac; padding: 0.65rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 1rem; display: none; }
    .links { margin-top: 1rem; text-align: center; font-size: 0.85rem; }
    .links a { color: #38bdf8; text-decoration: none; cursor: pointer; }
    .links a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>TestMu AI</h1>
    <p class="subtitle">Continuous Quality & Test Intelligence</p>
    <div id="alert-error" class="alert-error" role="alert"></div>
    <div id="alert-success" class="alert-success" role="status"></div>
    <form id="login-form">
      <div class="form-group">
        <label for="email">Work Email</label>
        <input id="email" name="email" type="email" required autocomplete="email" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" required autocomplete="current-password" />
      </div>
      <button type="submit" id="btn-login">Sign In</button>
    </form>
    <div class="links">
      <a id="btn-forgot-password" href="/forgot-password">Forgot password?</a>
    </div>
  </div>
  <script>
    const form = document.getElementById('login-form');
    const alertError = document.getElementById('alert-error');
    const alertSuccess = document.getElementById('alert-success');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertError.style.display = 'none';
      alertSuccess.style.display = 'none';
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('user_role', data.user.role);
          localStorage.setItem('user_email', data.user.email);
          window.location.href = '/dashboard';
        } else {
          alertError.textContent = data.message || 'Login failed';
          alertError.style.display = 'block';
        }
      } catch (err) {
        alertError.textContent = 'Network error occurred';
        alertError.style.display = 'block';
      }
    });
  </script>
</body>
</html>`;

const HTML_FORGOT_PASSWORD_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>TestMu AI - Forgot Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #1e293b; padding: 2.5rem; border-radius: 12px; width: 100%; max-width: 400px; }
    h1 { font-size: 1.3rem; margin-bottom: 0.5rem; color: #38bdf8; }
    label { display: block; font-size: 0.85rem; margin-bottom: 0.4rem; color: #cbd5e1; }
    input { width: 100%; padding: 0.65rem 0.75rem; border: 1px solid #334155; border-radius: 6px; background: #0f172a; color: #f8fafc; box-sizing: border-box; margin-bottom: 1.25rem; }
    button { width: 100%; padding: 0.75rem; border: none; border-radius: 6px; background: #0284c7; color: white; font-weight: 600; cursor: pointer; }
    .alert-success { background: #14532d; border: 1px solid #16a34a; color: #86efac; padding: 0.65rem; border-radius: 6px; font-size: 0.85rem; margin-bottom: 1rem; display: none; }
    a { color: #38bdf8; text-decoration: none; display: inline-block; margin-top: 1rem; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Reset Password</h1>
    <p style="color:#94a3b8; font-size:0.85rem;">Enter your email to receive recovery instructions.</p>
    <div id="alert-success" class="alert-success" role="status"></div>
    <form id="forgot-form">
      <label for="reset-email">Work Email</label>
      <input id="reset-email" type="email" required />
      <button type="submit" id="btn-submit-reset">Send Reset Link</button>
    </form>
    <a href="/login">&larr; Back to Login</a>
  </div>
  <script>
    document.getElementById('forgot-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('reset-email').value;
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      const alert = document.getElementById('alert-success');
      alert.textContent = data.message;
      alert.style.display = 'block';
    });
  </script>
</body>
</html>`;

const HTML_DASHBOARD_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TestMu AI - Quality Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; display: flex; flex-direction: column; min-height: 100vh; }
    header { background: #1e293b; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
    .brand { font-size: 1.25rem; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 0.5rem; }
    .user-info { display: flex; align-items: center; gap: 1rem; }
    .role-badge { padding: 0.25rem 0.6rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .role-admin { background: #0369a1; color: #e0f2fe; }
    .role-viewer { background: #334155; color: #cbd5e1; }
    .btn-logout { background: transparent; border: 1px solid #475569; color: #cbd5e1; padding: 0.35rem 0.75rem; border-radius: 6px; cursor: pointer; }
    .btn-logout:hover { background: #334155; }
    
    .layout { display: flex; flex: 1; }
    .sidebar { width: 220px; background: #1e293b; padding: 1.5rem 1rem; border-right: 1px solid #334155; transition: transform 0.3s ease; }
    .sidebar.collapsed { transform: translateX(-100%); display: none; }
    .nav-item { display: block; padding: 0.65rem 1rem; color: #94a3b8; text-decoration: none; border-radius: 6px; margin-bottom: 0.5rem; }
    .nav-item.active { background: #0284c7; color: white; font-weight: 600; }
    
    main { flex: 1; padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%; box-sizing: border-box; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: #1e293b; padding: 1.25rem; border-radius: 10px; border: 1px solid #334155; }
    .stat-title { font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
    .stat-value { font-size: 1.75rem; font-weight: 700; margin-top: 0.4rem; color: #f8fafc; }
    
    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem; }
    .filters { display: flex; gap: 0.75rem; align-items: center; }
    select, input[type="text"] { background: #1e293b; border: 1px solid #334155; color: #f8fafc; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.85rem; }
    .btn-primary { background: #0284c7; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; }
    .btn-primary:hover { background: #0369a1; }
    .btn-danger { background: #991b1b; color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.75rem; cursor: pointer; }
    
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; border: 1px solid #334155; }
    th, td { padding: 0.85rem 1rem; text-align: left; font-size: 0.85rem; border-bottom: 1px solid #334155; }
    th { background: #0f172a; color: #94a3b8; font-weight: 600; cursor: pointer; user-select: none; }
    th:hover { color: #38bdf8; }
    .badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; }
    .badge-passed { background: #14532d; color: #86efac; }
    .badge-failed { background: #7f1d1d; color: #fca5a5; }
    .badge-running { background: #854d0e; color: #fef08a; }
    
    .hamburger-btn { display: none; background: transparent; border: none; color: #f8fafc; font-size: 1.5rem; cursor: pointer; }
    
    @media (max-width: 768px) {
      .hamburger-btn { display: block; }
      .sidebar { position: fixed; top: 60px; left: 0; bottom: 0; z-index: 100; box-shadow: 5px 0 15px rgba(0,0,0,0.5); }
      .sidebar:not(.open) { display: none; }
      main { padding: 1rem; }
    }
  </style>
</head>
<body>
  <header>
    <div style="display:flex; align-items:center; gap:1rem;">
      <button id="hamburger-toggle" class="hamburger-btn" aria-label="Toggle navigation">&#9776;</button>
      <div class="brand">TestMu AI <span>Quality Suite</span></div>
    </div>
    <div class="user-info">
      <span id="user-display-email" style="font-size:0.85rem; color:#cbd5e1;"></span>
      <span id="user-role-badge" class="role-badge"></span>
      <button id="btn-logout" class="btn-logout">Logout</button>
    </div>
  </header>
  
  <div class="layout">
    <aside id="sidebar-nav" class="sidebar">
      <a href="/dashboard" class="nav-item active" id="nav-dashboard">Overview</a>
      <a href="#test-runs" class="nav-item" id="nav-runs">Test Runs</a>
      <a href="#metrics" class="nav-item" id="nav-metrics">Analytics</a>
      <a href="#settings" class="nav-item" id="nav-settings">Settings</a>
    </aside>
    
    <main>
      <div class="stats-grid">
        <div class="stat-card" data-testid="widget-total-runs">
          <div class="stat-title">Total Test Runs</div>
          <div class="stat-value" id="val-total-runs">0</div>
        </div>
        <div class="stat-card" data-testid="widget-pass-rate">
          <div class="stat-title">Passing Rate</div>
          <div class="stat-value" id="val-pass-rate">0%</div>
        </div>
        <div class="stat-card" data-testid="widget-flaky-tests">
          <div class="stat-title">Flaky Tests Detected</div>
          <div class="stat-value" id="val-flaky-tests">12</div>
        </div>
        <div class="stat-card" data-testid="widget-avg-duration">
          <div class="stat-title">Avg Duration</div>
          <div class="stat-value" id="val-avg-duration">0s</div>
        </div>
      </div>
      
      <div class="toolbar">
        <div class="filters">
          <label for="filter-status" style="font-size:0.85rem; color:#94a3b8;">Status:</label>
          <select id="filter-status" data-testid="filter-status">
            <option value="all">All Statuses</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>
          <input type="text" id="search-input" data-testid="search-input" placeholder="Search test runs..." />
        </div>
        <div id="admin-actions">
          <button id="btn-create-run" class="btn-primary" data-testid="btn-create-run" style="display:none;">+ New Test Run</button>
        </div>
      </div>
      
      <table id="test-runs-table" data-testid="test-runs-table">
        <thead>
          <tr>
            <th data-sort="id">Run ID</th>
            <th data-sort="name">Suite Name</th>
            <th data-sort="status">Status</th>
            <th data-sort="durationSec">Duration (s)</th>
            <th data-sort="author">Author</th>
            <th id="actions-header" style="display:none;">Actions</th>
          </tr>
        </thead>
        <tbody id="runs-table-body"></tbody>
      </table>
    </main>
  </div>
  
  <script>
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('user_role') || 'viewer';
    const email = localStorage.getItem('user_email') || 'user@testmu.ai';
    
    // Auth redirect
    if (!token && !window.location.search.includes('bypass_auth=true')) {
      window.location.href = '/login';
    }
    
    document.getElementById('user-display-email').textContent = email;
    const badge = document.getElementById('user-role-badge');
    badge.textContent = role;
    badge.className = 'role-badge ' + (role === 'admin' ? 'role-admin' : 'role-viewer');
    
    // Role based visibility
    if (role === 'admin') {
      document.getElementById('btn-create-run').style.display = 'inline-block';
      document.getElementById('actions-header').style.display = 'table-cell';
    }
    
    // Sidebar responsive toggle
    const hamburger = document.getElementById('hamburger-toggle');
    const sidebar = document.getElementById('sidebar-nav');
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
    
    document.getElementById('btn-logout').addEventListener('click', () => {
      localStorage.clear();
      window.location.href = '/login';
    });
    
    let allRuns = [];
    let currentSort = { column: 'id', order: 'asc' };
    
    async function fetchRuns() {
      const res = await fetch('/api/v1/test-runs', {
        headers: { 'Authorization': 'Bearer ' + (token || 'valid-token-admin') }
      });
      if (res.ok) {
        allRuns = await res.json();
        updateStats();
        renderTable();
      }
    }
    
    function updateStats() {
      const total = allRuns.length;
      const passed = allRuns.filter(r => r.status === 'passed').length;
      const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;
      const avgDuration = total > 0 ? Math.round(allRuns.reduce((acc, r) => acc + r.durationSec, 0) / total) : 0;
      
      document.getElementById('val-total-runs').textContent = total;
      document.getElementById('val-pass-rate').textContent = passRate + '%';
      document.getElementById('val-avg-duration').textContent = avgDuration + 's';
    }
    
    function renderTable() {
      const tbody = document.getElementById('runs-table-body');
      tbody.innerHTML = '';
      
      const filter = document.getElementById('filter-status').value;
      const search = document.getElementById('search-input').value.toLowerCase();
      
      let filtered = allRuns.filter(r => {
        const matchesStatus = filter === 'all' || r.status === filter;
        const matchesSearch = r.name.toLowerCase().includes(search) || r.id.toLowerCase().includes(search) || r.author.toLowerCase().includes(search);
        return matchesStatus && matchesSearch;
      });
      
      filtered.sort((a, b) => {
        let valA = a[currentSort.column];
        let valB = b[currentSort.column];
        if (typeof valA === 'string') return currentSort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        return currentSort.order === 'asc' ? valA - valB : valB - valA;
      });
      
      filtered.forEach(r => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-run-id', r.id);
        tr.innerHTML = \`
          <td><strong>\${r.id}</strong></td>
          <td>\${r.name}</td>
          <td><span class="badge badge-\${r.status}">\${r.status}</span></td>
          <td>\${r.durationSec}s</td>
          <td>\${r.author}</td>
          \${role === 'admin' ? \`<td><button class="btn-danger btn-delete-run" data-id="\${r.id}">Delete</button></td>\` : ''}
        \`;
        tbody.appendChild(tr);
      });
      
      if (role === 'admin') {
        document.querySelectorAll('.btn-delete-run').forEach(b => {
          b.addEventListener('click', async (e) => {
            const id = e.target.getAttribute('data-id');
            await fetch('/api/v1/test-runs/' + id, {
              method: 'DELETE',
              headers: { 'Authorization': 'Bearer ' + (token || 'valid-token-admin') }
            });
            await fetchRuns();
          });
        });
      }
    }
    
    document.getElementById('filter-status').addEventListener('change', renderTable);
    document.getElementById('search-input').addEventListener('input', renderTable);
    
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (currentSort.column === col) {
          currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.column = col;
          currentSort.order = 'asc';
        }
        renderTable();
      });
    });
    
    document.getElementById('btn-create-run').addEventListener('click', async () => {
      const name = prompt('Enter test run name:', 'Automated Regression ' + (allRuns.length + 1));
      if (!name) return;
      await fetch('/api/v1/test-runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (token || 'valid-token-admin')
        },
        body: JSON.stringify({ name, suite: 'E2E', environment: 'staging' })
      });
      await fetchRuns();
    });
    
    fetchRuns();
  </script>
</body>
</html>`;

export function createTestMuServer() {
  return http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url || '/', true);
    const pathname = parsedUrl.pathname || '/';
    const method = req.method || 'GET';

    // CORS & Common Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Health check
    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }

    // Reset state endpoint for test isolation
    if (pathname === '/api/test/reset' && method === 'POST') {
      resetMockState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'State reset successfully' }));
      return;
    }

    // Static Web Pages
    if (pathname === '/' || pathname === '/login') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML_LOGIN_PAGE);
      return;
    }

    if (pathname === '/forgot-password') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML_FORGOT_PASSWORD_PAGE);
      return;
    }

    if (pathname === '/dashboard') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML_DASHBOARD_PAGE);
      return;
    }

    // Helper to read JSON request body
    const readBody = (): Promise<any> => {
      return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            resolve(null);
          }
        });
      });
    };

    // REST API Endpoints
    // 1. Auth Login
    if (pathname === '/api/v1/auth/login' && method === 'POST') {
      const body = await readBody();
      if (!body || !body.email || !body.password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Request', message: 'Email and password are required' }));
        return;
      }

      const email = body.email.toLowerCase();
      const attempt = failedLoginAttempts.get(email) || { count: 0, lockedUntil: 0 };

      // Check lockout
      if (attempt.lockedUntil > Date.now()) {
        const remainingMinutes = Math.ceil((attempt.lockedUntil - Date.now()) / 60000);
        res.writeHead(429, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Too Many Requests',
          message: `Account is temporarily locked due to multiple failed login attempts. Try again in ${remainingMinutes} minutes.`
        }));
        return;
      }

      // Valid Credentials Check
      if (email === 'admin@testmu.ai' && body.password === 'AdminPass123!') {
        failedLoginAttempts.delete(email);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          token: 'valid-token-admin',
          user: { email, role: 'admin', name: 'TestMu Admin' }
        }));
        return;
      }

      if (email === 'engineer@testmu.ai' && body.password === 'EngineerPass123!') {
        failedLoginAttempts.delete(email);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          token: 'valid-token-viewer',
          user: { email, role: 'viewer', name: 'TestMu Engineer' }
        }));
        return;
      }

      // Invalid credentials
      attempt.count += 1;
      if (attempt.count >= 5) {
        attempt.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 mins lock
      }
      failedLoginAttempts.set(email, attempt);

      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Unauthorized',
        message: attempt.count >= 5
          ? 'Account is temporarily locked due to multiple failed login attempts. Try again in 15 minutes.'
          : 'Invalid email or password'
      }));
      return;
    }

    // 2. Forgot Password
    if (pathname === '/api/v1/auth/forgot-password' && method === 'POST') {
      const body = await readBody();
      if (!body || !body.email) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad Request', message: 'Email address is required' }));
        return;
      }
      // Standard security practice: return success regardless of email existence to prevent user enumeration
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'If an account exists with this email, password recovery instructions have been sent.' }));
      return;
    }

    // 3. Rate limiting for API routes
    const clientIp = req.socket.remoteAddress || '127.0.0.1';
    const rateWindow = apiRateLimitMap.get(clientIp) || { count: 0, resetAt: Date.now() + 60000 };
    if (Date.now() > rateWindow.resetAt) {
      rateWindow.count = 0;
      rateWindow.resetAt = Date.now() + 60000;
    }
    rateWindow.count++;
    apiRateLimitMap.set(clientIp, rateWindow);

    // Endpoint to test rate limiting directly
    if (pathname === '/api/v1/rate-limit-test') {
      if (rateWindow.count > 20) {
        res.writeHead(429, {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60'
        });
        res.end(JSON.stringify({
          type: 'https://testmu.ai/errors/rate-limit',
          title: 'Too Many Requests',
          status: 429,
          detail: 'API rate limit exceeded. Maximum 20 requests per minute.'
        }));
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': '20',
        'X-RateLimit-Remaining': (20 - rateWindow.count).toString()
      });
      res.end(JSON.stringify({ message: 'Request within rate limit' }));
      return;
    }

    // 4. Token Auth Guard for Protected API Endpoints
    if (pathname.startsWith('/api/v1/test-runs')) {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          type: 'https://testmu.ai/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Missing or malformed Authorization header. Expected Bearer token.'
        }));
        return;
      }

      const tokenVal = authHeader.replace('Bearer ', '').trim();
      if (!validTokens.has(tokenVal)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          type: 'https://testmu.ai/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Invalid, malformed, or expired authentication token.'
        }));
        return;
      }

      const isAdmin = tokenVal === 'valid-token-admin';

      // GET /api/v1/test-runs
      if (pathname === '/api/v1/test-runs' && method === 'GET') {
        let results = [...testRuns];
        if (parsedUrl.query.status) {
          results = results.filter(r => r.status === parsedUrl.query.status);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(results));
        return;
      }

      // POST /api/v1/test-runs (Create)
      if (pathname === '/api/v1/test-runs' && method === 'POST') {
        const body = await readBody();
        // Schema validation
        const missingFields: string[] = [];
        if (!body || typeof body !== 'object') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            type: 'https://testmu.ai/errors/validation-error',
            title: 'Schema Validation Error',
            status: 400,
            detail: 'Payload must be a valid JSON object'
          }));
          return;
        }

        if (!body.name) missingFields.push('name');
        if (!body.suite) missingFields.push('suite');
        if (!body.environment) missingFields.push('environment');

        if (missingFields.length > 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            type: 'https://testmu.ai/errors/validation-error',
            title: 'Schema Validation Error',
            status: 400,
            detail: `Missing mandatory schema fields: ${missingFields.join(', ')}`,
            invalidParams: missingFields.map(f => ({ field: f, reason: 'Field is required' }))
          }));
          return;
        }

        const newRun: TestRun = {
          id: `TR-${100 + testRuns.length + 1}`,
          name: body.name,
          suite: body.suite,
          environment: body.environment,
          status: 'running',
          durationSec: 0,
          author: isAdmin ? 'admin@testmu.ai' : 'engineer@testmu.ai',
          createdAt: new Date().toISOString()
        };
        testRuns.push(newRun);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newRun));
        return;
      }

      // Single item regex match /api/v1/test-runs/:id
      const idMatch = pathname.match(/^\/api\/v1\/test-runs\/([a-zA-Z0-9-]+)$/);
      if (idMatch) {
        const runId = idMatch[1];
        const existingIndex = testRuns.findIndex(r => r.id === runId);

        if (existingIndex === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            type: 'https://testmu.ai/errors/not-found',
            title: 'Resource Not Found',
            status: 404,
            detail: `Test Run with ID '${runId}' does not exist.`
          }));
          return;
        }

        if (method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(testRuns[existingIndex]));
          return;
        }

        if (method === 'PUT') {
          const body = await readBody();
          if (!body || typeof body !== 'object') {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ title: 'Invalid JSON payload' }));
            return;
          }
          testRuns[existingIndex] = { ...testRuns[existingIndex], ...body, id: runId };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(testRuns[existingIndex]));
          return;
        }

        if (method === 'DELETE') {
          if (!isAdmin) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              type: 'https://testmu.ai/errors/forbidden',
              title: 'Forbidden',
              status: 403,
              detail: 'Only users with the Admin role are authorized to delete test runs.'
            }));
            return;
          }
          testRuns.splice(existingIndex, 1);
          res.writeHead(204);
          res.end();
          return;
        }
      }
    }

    // 5. Simulated 500 Chaos Endpoint for Testing
    if (pathname === '/api/v1/chaos/server-error') {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        type: 'https://testmu.ai/errors/internal-server-error',
        title: 'Internal Server Error',
        status: 500,
        detail: 'Simulated unhandled database pool timeout during transaction commit.'
      }));
      return;
    }

    // 404 Fallback
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ title: 'Route Not Found', path: pathname }));
  });
}

// Standalone execution check
if (require.main === module) {
  const PORT = parseInt(process.env.TESTMU_PORT || '4321', 10);
  const server = createTestMuServer();
  server.listen(PORT, () => {
    console.log(`[TestMu Mock Server] running at http://localhost:${PORT}`);
  });
}
