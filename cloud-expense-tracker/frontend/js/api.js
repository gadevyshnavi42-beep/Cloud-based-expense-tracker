// ===== Shared helpers used by every page =====
// After deploying the backend to Render, put its URL below (keep the /api at the end).
const PRODUCTION_API = 'https://YOUR-BACKEND-NAME.onrender.com/api';
const API_URL = ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:5000/api' : PRODUCTION_API;

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Education', 'Healthcare', 'Entertainment', 'Salary', 'Freelance', 'Other'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Net Banking', 'Other'];
const $ = (id) => document.getElementById(id);

const getToken = () => localStorage.getItem('token');
const getUser = () => JSON.parse(localStorage.getItem('user') || 'null');
function saveSession(token, user) { if (token) localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user)); }
function logout() { localStorage.removeItem('token'); localStorage.removeItem('user'); location.href = 'login.html'; }
function requireAuth() { if (!getToken()) { location.href = 'login.html'; } }

// Escape text before putting it inside innerHTML (prevents XSS)
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let loadingCount = 0;
function setLoading(on) {
  loadingCount = Math.max(0, loadingCount + (on ? 1 : -1));
  const el = $('loader');
  if (el) el.classList.toggle('show', loadingCount > 0);
}

// Calls the backend. Returns json.data or throws Error(message).
async function api(path, { method = 'GET', body } = {}) {
  setLoading(true);
  try {
    const res = await fetch(API_URL + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401 && getToken()) { logout(); throw new Error('Session expired. Please log in again.'); }
    if (!res.ok) throw new Error(json.message || 'Request failed');
    return json.data || {};
  } catch (err) {
    if (err instanceof TypeError) throw new Error('Cannot reach the server. Is the backend running?');
    throw err;
  } finally {
    setLoading(false);
  }
}

async function downloadCsv(query) {
  setLoading(true);
  try {
    const res = await fetch(`${API_URL}/reports/export-csv?${query}`, { headers: { Authorization: 'Bearer ' + getToken() } });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Export failed');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob());
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  } finally { setLoading(false); }
}

function toast(message, type = 'success') {
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = `alert alert-${type === 'error' ? 'danger' : type} shadow-sm py-2 px-3 mb-2`;
  el.setAttribute('role', 'alert');
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function money(n) {
  const u = getUser();
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: (u && u.currency) || 'INR' }).format(n || 0);
}
// date is "YYYY-MM-DD" or an ISO string
function fmtDate(d) {
  const [y, m, day] = String(d).slice(0, 10).split('-');
  const u = getUser();
  const f = (u && u.dateFormat) || 'DD/MM/YYYY';
  return f === 'MM/DD/YYYY' ? `${m}/${day}/${y}` : f === 'YYYY-MM-DD' ? `${y}-${m}-${day}` : `${day}/${m}/${y}`;
}
function today() { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function thisMonth() { return today().slice(0, 7); }
function fillSelect(id, list, firstLabel) {
  const el = $(id);
  if (!el) return;
  el.innerHTML = (firstLabel !== undefined ? `<option value="">${esc(firstLabel)}</option>` : '') + list.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}
function emptyState(icon, text) { return `<div class="empty-state"><i class="bi ${icon}"></i>${esc(text)}</div>`; }
function iconFor(type) { return type === 'income' ? 'bi-arrow-down-circle-fill text-income' : 'bi-arrow-up-circle-fill text-expense'; }

function renderNav(active) {
  const links = [['dashboard', 'Dashboard', 'bi-speedometer2'], ['transactions', 'Transactions', 'bi-list-ul'], ['add-transaction', 'Add', 'bi-plus-circle'],
    ['budgets', 'Budgets', 'bi-piggy-bank'], ['reports', 'Reports', 'bi-bar-chart'], ['profile', 'Profile', 'bi-person'], ['settings', 'Settings', 'bi-gear']];
  const u = getUser();
  $('nav').innerHTML = `
  <nav class="navbar navbar-expand-lg navbar-dark">
    <div class="container">
      <a class="navbar-brand" href="dashboard.html"><i class="bi bi-wallet2"></i> Expense Tracker</a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu" aria-controls="menu" aria-expanded="false" aria-label="Toggle navigation"><span class="navbar-toggler-icon"></span></button>
      <div class="collapse navbar-collapse" id="menu">
        <ul class="navbar-nav me-auto">${links.map(([p, t, i]) => `<li class="nav-item"><a class="nav-link ${p === active ? 'active' : ''}" href="${p}.html"><i class="bi ${i}"></i> ${t}</a></li>`).join('')}</ul>
        <span class="text-white me-3 small">${esc(u ? u.name : '')}</span>
        <button class="btn btn-sm btn-light" id="logoutBtn">Logout</button>
      </div>
    </div>
  </nav>`;
  $('logoutBtn').addEventListener('click', logout);
}

// call at the top of every private page
function initPrivatePage(active) { requireAuth(); renderNav(active); }
