// ── auth.js ─ JWT storage, login, logout, page guard ──────────────

const TOKEN_KEY = 'vf_token';
const USER_KEY  = 'vf_user';
function resolveApiBaseUrl() {
  const explicit = (window.__API_BASE_URL__ || '').toString().trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const { protocol, hostname, port, origin } = window.location;

  // Local dev convenience: when using Live Server or opening the file directly.
  if (protocol === 'file:') return 'http://localhost:8080';
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // If the page itself is served by the backend, use same-origin.
    if (!port || port === '8080') return origin;
    return 'http://localhost:8080';
  }

  // Deployed: assume backend serves the frontend (same origin).
  return origin;
}

const API_BASE = resolveApiBaseUrl();

/* ── Storage helpers ─────────────────────────────────────────── */
function saveAuth(data) {
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify({
    username: data.username,
    email:    data.email,
    fullName: data.fullName,
    roles:    data.roles,
  }));
}
function getToken()  { return localStorage.getItem(TOKEN_KEY); }
function getUser()   {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
function getRoles() {
  const u = getUser();
  return (u && Array.isArray(u.roles)) ? u.roles : [];
}
function isLoggedIn() { return !!getToken(); }
function isAdmin() {
  return getRoles().includes('ROLE_ADMIN');
}

function isViewer() {
  return getRoles().includes('ROLE_VIEWER');
}

function getRoleLabel() {
  const roles = getRoles();
  if (roles.includes('ROLE_ADMIN')) return 'Admin';
  if (roles.includes('ROLE_VIEWER')) return 'Viewer';
  if (roles.includes('ROLE_STAFF')) return 'Staff';
  return 'User';
}

function canUpdateStock() {
  const roles = getRoles();
  return roles.includes('ROLE_ADMIN') || roles.includes('ROLE_STAFF');
}

function canCreateOrder() {
  const roles = getRoles();
  return roles.includes('ROLE_ADMIN') || roles.includes('ROLE_STAFF');
}

/* ── Login ────────────────────────────────────────────────────── */
async function login(username, password) {
  const res = await fetch(API_BASE + '/api/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Login failed');
  }
  const data = await res.json();
  saveAuth(data);
  window.location.href = 'dashboard.html';
}

/* ── Logout ───────────────────────────────────────────────────── */
function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = 'index.html';
}

/* ── Guard: redirect to login if not authenticated ────────────── */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

/* ── Populate sidebar/header user info ────────────────────────── */
function populateUserInfo() {
  const user = getUser();
  if (!user) return;

  const usernameEl = document.getElementById('sidebarUsername');
  const roleEl     = document.getElementById('sidebarRole');
  const headerEl   = document.getElementById('headerUsername');

  if (usernameEl) usernameEl.textContent = user.fullName || user.username;
  if (roleEl)     roleEl.textContent     = getRoleLabel();
  if (headerEl)   headerEl.textContent   = user.fullName || user.username;

  // Hide admin-only buttons for staff (VIEWER should see admin UI but cannot perform actions).
  if (!isAdmin() && !isViewer()) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }
}

/* ── Run on page load (except login page) ─────────────────────── */
if (!window.location.pathname.endsWith('index.html') &&
    !window.location.pathname.endsWith('/')) {
  requireAuth();
  document.addEventListener('DOMContentLoaded', populateUserInfo);
}
