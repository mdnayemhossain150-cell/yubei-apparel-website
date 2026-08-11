'use strict';
/*
 * admin.js — Phase 0/1 front-end (READ-ONLY).
 * - Checks the session, shows login or the dashboard.
 * - Fetches the catalog from /api/admin/products and renders it.
 * - Performs NO writes. Future action buttons are shown disabled only.
 */
(function () {
  var PLACEHOLDER = 'xxxxx';
  var els = {
    loginView: document.getElementById('loginView'),
    dashView: document.getElementById('dashView'),
    loginForm: document.getElementById('loginForm'),
    username: document.getElementById('username'),
    password: document.getElementById('password'),
    loginBtn: document.getElementById('loginBtn'),
    loginError: document.getElementById('loginError'),
    logoutBtn: document.getElementById('logoutBtn'),
    roleBadge: document.getElementById('roleBadge'),
    userLabel: document.getElementById('userLabel'),
    counts: document.getElementById('counts'),
    tableWrap: document.getElementById('tableWrap'),
    mockActions: document.getElementById('mockActions')
  };

  function show(el) { el.hidden = false; }
  function hide(el) { el.hidden = true; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function has(v) { return v && v !== PLACEHOLDER; }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    opts.credentials = 'same-origin';
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) {
        return { status: r.status, body: body };
      });
    });
  }

  // ---------- View switching ----------
  function showLogin(message) {
    hide(els.dashView); show(els.loginView);
    if (message) { els.loginError.textContent = message; show(els.loginError); }
  }
  function showDashboard(session) {
    hide(els.loginView); show(els.dashView);
    var isSuper = session.user.role === 'super_admin';
    els.roleBadge.textContent = isSuper ? 'Super Admin' : 'Content Admin';
    els.roleBadge.className = 'badge ' + (isSuper ? 'super' : 'content');
    els.userLabel.textContent = (session.user.username || '') + ' — ' + (session.user.label || session.user.role);
    // Content Admin sees the (disabled) content actions; both roles read-only for now.
    show(els.mockActions);
    loadProducts();
  }

  // ---------- Catalog rendering (read-only) ----------
  function statusPill(p) {
    if (p.published === false) return '<span class="pill hidden">hidden</span>';
    var s = p.status || '';
    if (s === 'ok') return '<span class="pill ok">ok</span>';
    if (s === 'corrected') return '<span class="pill corrected">corrected</span>';
    if (s === 'need_confirmation') return '<span class="pill need">needs&nbsp;confirm</span>';
    return '<span class="pill">' + esc(s) + '</span>';
  }
  function modelCell(p) {
    return has(p.model)
      ? '<span class="mono">' + esc(p.model) + '</span>'
      : '<span class="inquiry">Available upon inquiry</span>';
  }
  function sizeCell(p) {
    return has(p.sizeRange) ? esc(p.sizeRange) : '<span class="inquiry">—</span>';
  }

  function renderTable(data) {
    var products = data.products || [];
    var c = data.counts || {};
    els.counts.textContent = data.total + ' products' +
      (c.total != null ? ' · confirmed ' + (c.confirmed || 0) + ' · need confirm ' + (c.need_confirmation || 0) : '');

    var rows = products.map(function (p) {
      return '<tr>' +
        '<td><img class="thumb" loading="lazy" src="/assets/' + esc(p.image) + '" alt=""></td>' +
        '<td class="wrap">' + esc(p.name) + '</td>' +
        '<td>' + modelCell(p) + '</td>' +
        '<td>' + sizeCell(p) + '</td>' +
        '<td>' + esc(p.category || '') + '</td>' +
        '<td>' + esc(p.season || '') + '</td>' +
        '<td>' + esc((p.colors || []).join(', ')) + '</td>' +
        '<td>' + statusPill(p) + '</td>' +
        '</tr>';
    }).join('');

    els.tableWrap.innerHTML =
      '<table class="catalog"><thead><tr>' +
        '<th>Photo</th><th>Name</th><th>Model No.</th><th>Size</th>' +
        '<th>Category</th><th>Season</th><th>Colors</th><th>Status</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function loadProducts() {
    els.tableWrap.innerHTML = '<p class="muted">Loading catalog…</p>';
    api('/api/admin/products').then(function (r) {
      if (r.status === 200) return renderTable(r.body);
      if (r.status === 401) return showLogin('Session expired. Please sign in again.');
      els.tableWrap.innerHTML = '<p class="error">Could not load catalog (' + r.status + ').</p>';
    }).catch(function () {
      els.tableWrap.innerHTML = '<p class="error">Network error loading catalog.</p>';
    });
  }

  // ---------- Auth actions ----------
  function checkSession() {
    api('/api/admin/session').then(function (r) {
      if (r.status === 200 && r.body.authenticated) showDashboard(r.body);
      else showLogin();
    }).catch(function () { showLogin(); });
  }

  els.loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    hide(els.loginError);
    els.loginBtn.disabled = true;
    api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: els.username.value, password: els.password.value })
    }).then(function (r) {
      els.loginBtn.disabled = false;
      if (r.status === 200) {
        els.password.value = '';
        checkSession();
      } else {
        els.loginError.textContent = r.body.error || 'Sign-in failed.';
        show(els.loginError);
      }
    }).catch(function () {
      els.loginBtn.disabled = false;
      els.loginError.textContent = 'Network error. Please try again.';
      show(els.loginError);
    });
  });

  els.logoutBtn.addEventListener('click', function () {
    api('/api/admin/logout', { method: 'POST' }).then(function () { showLogin(); });
  });

  checkSession();
})();
