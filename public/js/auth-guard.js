// Auth guard & shared utilities for dashboard and admin pages
const API = 'https://life-ktxw.onrender.com';

function getToken() { return localStorage.getItem('token'); }
function getUser()  { return JSON.parse(localStorage.getItem('user') || 'null'); }

// ─────────────────────────────────────────────
//  API CACHE
//  Stores GET responses in localStorage with TTL.
//  Mutations (POST/PUT/DELETE) auto-invalidate
//  related cache keys so fresh data follows every action.
// ─────────────────────────────────────────────
const Cache = (() => {
  const PREFIX = 'agric_cache_';

  // TTL map (milliseconds) — how long each endpoint stays fresh
  const TTL = {
    '/api/user/dashboard-stats':  2 * 60 * 1000,   // 2 min
    '/api/wallet/transactions':   2 * 60 * 1000,
    '/api/investments':           3 * 60 * 1000,
    '/api/stocks':               10 * 60 * 1000,   // 10 min — rarely changes
    '/api/wallet/deposit-accounts': 10 * 60 * 1000,
    '/api/user/profile':          5 * 60 * 1000,
    '/api/referral':              5 * 60 * 1000,
  };

  // After a mutation, which cache keys to wipe
  const INVALIDATION_MAP = {
    '/api/wallet/deposit':   ['/api/user/dashboard-stats', '/api/wallet/transactions'],
    '/api/wallet/withdraw':  ['/api/user/dashboard-stats', '/api/wallet/transactions'],
    '/api/investments':      ['/api/user/dashboard-stats', '/api/investments'],
    '/api/user/profile':     ['/api/user/profile'],
    '/api/stocks':           ['/api/stocks'],
  };

  function key(url) { return PREFIX + url; }

  function get(url) {
    try {
      const raw = localStorage.getItem(key(url));
      if (!raw) return null;
      const { data, expires } = JSON.parse(raw);
      if (Date.now() > expires) { localStorage.removeItem(key(url)); return null; }
      return data;
    } catch { return null; }
  }

  function set(url, data) {
    const ttl = Object.entries(TTL).find(([k]) => url.startsWith(k))?.[1];
    if (!ttl) return; // don't cache unknown endpoints
    try {
      localStorage.setItem(key(url), JSON.stringify({ data, expires: Date.now() + ttl }));
    } catch { /* storage full — skip */ }
  }

  function invalidate(mutationUrl) {
    const targets = Object.entries(INVALIDATION_MAP).find(([k]) => mutationUrl.includes(k))?.[1] || [];
    targets.forEach(t => localStorage.removeItem(key(t)));
    // Also wipe any parameterised version of the key
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX) && targets.some(t => k.includes(t.replace(PREFIX,'')))) {
        localStorage.removeItem(k); i--;
      }
    }
  }

  function flush() {
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  }

  return { get, set, invalidate, flush };
})();

// ─────────────────────────────────────────────
//  apiFetch  — cache-aware fetch wrapper
//  GET  → return cached data instantly if fresh,
//         then re-fetch in background and update UI
//  POST/PUT/DELETE → skip cache, invalidate related keys after success
// ─────────────────────────────────────────────
async function apiFetch(url, options = {}) {
  const token = getToken();
  const method = (options.method || 'GET').toUpperCase();
  const isRead = method === 'GET';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  // ── GET: serve from cache, refresh in background ──
  if (isRead) {
    const cached = Cache.get(url);
    if (cached) {
      // Return cached immediately, then silently refresh
      (async () => {
        try {
          const res = await fetch(API + url, { ...options, headers });
          if (res.ok) {
            const fresh = await res.json();
            Cache.set(url, fresh);
          }
        } catch { /* network unavailable — keep showing cached */ }
      })();
      return cached;
    }
  }

  // ── Actual network request ──
  try {
    const res = await fetch(API + url, { ...options, headers });
    if (res.status === 401) { logout(); return null; }
    const data = await res.json();

    if (isRead && res.ok) {
      Cache.set(url, data);
    } else if (!isRead && res.ok) {
      Cache.invalidate(url);
    }

    return data;
  } catch (err) {
    // Network error on a read — fall back to stale cache if available
    if (isRead) {
      const stale = Cache.get(url);
      if (stale) return stale;
    }
    throw err;
  }
}

// ─────────────────────────────────────────────
//  Balance sync — fetch live stats and update every
//  balance element on the current page
// ─────────────────────────────────────────────
async function syncBalance() {
  try {
    const data = await apiFetch('/api/user/dashboard-stats');
    if (!data?.success) return;
    const s = data.stats;

    const u = getUser() || {};
    u.walletBalance  = s.walletBalance;
    u.totalInvested  = s.totalInvested;
    u.totalEarnings  = s.totalEarnings;
    u.currencySymbol = s.currencySymbol;
    u.currency       = s.currency;
    localStorage.setItem('user', JSON.stringify(u));

    const display = fmt(s.walletBalance, s.currencySymbol);

    document.querySelectorAll('[data-balance]').forEach(el => el.textContent = display);
    const tb = document.getElementById('topBalance');   if (tb) tb.textContent = display;
    const wb = document.getElementById('walletBal');    if (wb) wb.textContent = display;

    return s;
  } catch(e) { /* silent */ }
}

// ─────────────────────────────────────────────
//  Auth helpers
// ─────────────────────────────────────────────
function requireAuth() {
  if (!getToken()) { window.location.href = '/login.html'; return false; }
  return true;
}
function requireAdmin() {
  const u = getUser();
  if (!getToken() || !u || u.role !== 'admin') { window.location.href = '/login.html'; return false; }
  return true;
}

function logout() {
  Cache.flush(); // wipe all cached data on logout
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

// ─────────────────────────────────────────────
//  Formatting helpers
// ─────────────────────────────────────────────
function fmt(amount, symbol) {
  if (amount === undefined || amount === null) return '—';
  return `${symbol || ''}${Number(amount).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(dateStr) {
  const d = new Date(dateStr), now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

function statusBadge(status) {
  const map = { active:'primary', completed:'success', pending:'warning', approved:'success', rejected:'danger', matured:'info', cancelled:'danger' };
  return `<span class="badge badge-${map[status]||'primary'}">${status.charAt(0).toUpperCase()+status.slice(1)}</span>`;
}

function showToast(msg, type = 'success') {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'toast';
  t.style.cssText = `position:fixed;bottom:28px;right:28px;z-index:9999;background:${type==='success'?'#1e6b3c':type==='error'?'#721c24':'#856404'};color:#fff;padding:14px 22px;border-radius:12px;font-weight:600;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,0.2);max-width:320px;animation:slideIn 0.3s ease;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ─────────────────────────────────────────────
//  Sidebar helpers
// ─────────────────────────────────────────────
function setSidebarActive(id) {
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function initSidebarToggle() {
  const ham = document.getElementById('hamburgerDash');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (ham) ham.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });
  if (overlay) overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
}

function buildSidebar(user) {
  const sym = user?.currencySymbol || 'GH₵';
  const bal = fmt(user?.walletBalance, sym);
  const initials = (user?.fullName || 'U').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  return `
    <div class="sidebar-brand">
      <svg viewBox="0 0 40 40" fill="none">
        <ellipse cx="20" cy="22" rx="7" ry="12" fill="#52b788" transform="rotate(-15,20,22)"/>
        <path d="M20 30 Q14 22 18 10" stroke="#c8971a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <circle cx="16" cy="10" r="2.5" fill="#c8971a"/>
      </svg>
      Agric<span>Life</span>
    </div>
    <div class="sidebar-user">
      <div class="user-avatar">${initials}</div>
      <div class="user-name">${user?.fullName || 'Investor'}</div>
      <div class="user-email">${user?.email || ''}</div>
    </div>
    <nav class="sidebar-nav">
      <div class="nav-group-label">Main</div>
      <a class="sidebar-link" id="nav-overview" href="/dashboard/index.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Overview
      </a>
      <a class="sidebar-link" id="nav-stocks" href="/dashboard/stocks.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg>
        Browse Stocks
      </a>
      <a class="sidebar-link" id="nav-investments" href="/dashboard/investments.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        My Investments
      </a>
      <div class="nav-group-label">Account</div>
      <a class="sidebar-link" id="nav-wallet" href="/dashboard/wallet.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>
        Wallet
      </a>
      <a class="sidebar-link" id="nav-profile" href="/dashboard/profile.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Profile
      </a>
      <a class="sidebar-link" id="nav-referral" href="/dashboard/referral.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        Referral Program
      </a>
      <div class="nav-group-label">Help</div>
      <a class="sidebar-link" id="nav-support" href="/dashboard/support.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Help & Support
      </a>
      <a class="sidebar-link" href="/terms.html" target="_blank">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Terms & Policy
      </a>
    </nav>
    <div class="sidebar-footer">
      <div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:12px;margin-bottom:12px;">
        <div style="font-size:11px;opacity:0.65;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Wallet Balance</div>
        <div style="font-size:1.2rem;font-weight:800;color:var(--accent-light);" data-balance>${bal}</div>
      </div>
      <a class="sidebar-link" onclick="logout()" style="cursor:pointer;color:rgba(255,100,100,0.85);">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      </a>
    </div>`;
}
