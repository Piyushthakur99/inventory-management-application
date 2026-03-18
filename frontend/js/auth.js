// ── auth.js ─ JWT storage, login, logout, page guard ──────────────

const TOKEN_KEY = 'vf_token';
const USER_KEY  = 'vf_user';
const API_BASE  = 'http://localhost:8080';

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
function isLoggedIn() { return !!getToken(); }
function isAdmin() {
  const u = getUser();
  return u && u.roles && u.roles.includes('ROLE_ADMIN');
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
  if (roleEl)     roleEl.textContent     = isAdmin() ? 'Admin' : 'Staff';
  if (headerEl)   headerEl.textContent   = user.fullName || user.username;

  // Hide admin-only buttons for staff
  if (!isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }
}

/* ── Run on page load (except login page) ─────────────────────── */
if (!window.location.pathname.endsWith('index.html') &&
    !window.location.pathname.endsWith('/')) {
  requireAuth();
  document.addEventListener('DOMContentLoaded', populateUserInfo);
}
