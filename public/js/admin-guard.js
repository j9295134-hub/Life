// Admin shared utilities
function buildAdminSidebar(pendingDep, pendingWit) {
  return `
    <div class="sidebar-brand" style="background:#0f1f14;">
      <svg viewBox="0 0 40 40" fill="none">
        <ellipse cx="20" cy="22" rx="7" ry="12" fill="#52b788" transform="rotate(-15,20,22)"/>
        <path d="M20 30 Q14 22 18 10" stroke="#c8971a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <circle cx="16" cy="10" r="2.5" fill="#c8971a"/>
      </svg>
      Agric<span>Life</span> <span style="font-size:10px;background:var(--accent);padding:2px 8px;border-radius:50px;margin-left:4px;">ADMIN</span>
    </div>
    <nav class="sidebar-nav" style="margin-top:8px;">
      <div class="nav-group-label">Dashboard</div>
      <a class="sidebar-link" id="nav-adash" href="/admin/index.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        Overview
      </a>
      <div class="nav-group-label">Investments</div>
      <a class="sidebar-link" id="nav-astocks" href="/admin/stocks.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg>
        Manage Stocks
      </a>
      <div class="nav-group-label">Finance</div>
      <a class="sidebar-link" id="nav-adeposits" href="/admin/deposits.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
        Deposits ${pendingDep ? `<span class="badge-count">${pendingDep}</span>` : ''}
      </a>
      <a class="sidebar-link" id="nav-awithdrawals" href="/admin/withdrawals.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>
        Withdrawals ${pendingWit ? `<span class="badge-count">${pendingWit}</span>` : ''}
      </a>
      <div class="nav-group-label">Management</div>
      <a class="sidebar-link" id="nav-ausers" href="/admin/users.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
        Users
      </a>
      <a class="sidebar-link" id="nav-asettings" href="/admin/settings.html">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        Settings
      </a>
      <div class="nav-group-label">Site</div>
      <a class="sidebar-link" href="/" target="_blank">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        View Site
      </a>
      <a class="sidebar-link" onclick="logout()" style="cursor:pointer;color:rgba(255,100,100,0.85);margin-top:20px;">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      </a>
    </nav>`;
}
