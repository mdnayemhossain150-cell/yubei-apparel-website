'use strict';
/*
 * admin.js — Phase 0/1 read-only dashboard + Stage 2A edit PREVIEW.
 *
 * Stage 2A adds a permission-gated edit form that calls the server dry-run
 * (/api/admin/product-update). It NEVER persists: edits are validated and
 * diffed server-side, then optionally kept as an in-browser "staged preview".
 * Nothing is written to products.json or the live site.
 */
(function () {
  var PLACEHOLDER = 'xxxxx';
  var state = { session: null, csrf: null, products: [], staged: {} };

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
    mockActions: document.getElementById('mockActions'),
    stagedBar: document.getElementById('stagedBar'),
    stagedText: document.getElementById('stagedText'),
    discardStaged: document.getElementById('discardStaged'),
    // edit modal
    editOverlay: document.getElementById('editOverlay'),
    editForm: document.getElementById('editForm'),
    editImage: document.getElementById('editImage'),
    editClose: document.getElementById('editClose'),
    editCancel: document.getElementById('editCancel'),
    editError: document.getElementById('editError'),
    editDiff: document.getElementById('editDiff'),
    editStageBtn: document.getElementById('editStageBtn'),
    f_name: document.getElementById('f_name'),
    f_model: document.getElementById('f_model'),
    f_size: document.getElementById('f_size'),
    f_description: document.getElementById('f_description'),
    f_category: document.getElementById('f_category'),
    f_season: document.getElementById('f_season'),
    f_colors: document.getElementById('f_colors'),
    f_published: document.getElementById('f_published')
  };

  function show(el) { if (el) el.hidden = false; }
  function hide(el) { if (el) el.hidden = true; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function has(v) { return v && v !== PLACEHOLDER; }
  function can(perm) {
    return !!(state.session && state.session.permissions && state.session.permissions.indexOf(perm) !== -1);
  }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (state.csrf) opts.headers['X-Admin-CSRF'] = state.csrf;
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
    state.session = session;
    state.staged = {};
    hide(els.loginView); show(els.dashView);
    var isSuper = session.user.role === 'super_admin';
    els.roleBadge.textContent = isSuper ? 'Super Admin' : 'Content Admin';
    els.roleBadge.className = 'badge ' + (isSuper ? 'super' : 'content');
    els.userLabel.textContent = (session.user.username || '') + ' — ' + (session.user.label || session.user.role);
    show(els.mockActions);
    fetchCsrf();
    loadProducts();
  }

  function fetchCsrf() {
    api('/api/admin/csrf').then(function (r) {
      if (r.status === 200 && r.body.csrfToken) state.csrf = r.body.csrfToken;
    }).catch(function () { /* writes will be blocked without a token */ });
  }

  // ---------- Catalog rendering (read-only view + staged preview) ----------
  function displayProduct(p) {
    var s = state.staged[p.image];
    return s ? Object.assign({}, p, s) : p;
  }
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

  function renderTable() {
    var products = state.products;
    var canEdit = can('product:edit');
    var actionsHead = canEdit ? '<th>Actions</th>' : '';

    var rows = products.map(function (raw) {
      var p = displayProduct(raw);
      var stagedPill = state.staged[raw.image] ? ' <span class="pill staged">edited&nbsp;(preview)</span>' : '';
      var actionCell = canEdit
        ? '<td><button class="edit-btn btn-ghost" type="button" data-image="' + esc(raw.image) + '">Edit</button></td>'
        : '';
      return '<tr>' +
        '<td><img class="thumb" loading="lazy" src="/assets/' + esc(raw.image) + '" alt=""></td>' +
        '<td class="wrap">' + esc(p.name) + stagedPill + '</td>' +
        '<td>' + modelCell(p) + '</td>' +
        '<td>' + sizeCell(p) + '</td>' +
        '<td>' + esc(p.category || '') + '</td>' +
        '<td>' + esc(p.season || '') + '</td>' +
        '<td>' + esc((p.colors || []).join(', ')) + '</td>' +
        '<td>' + statusPill(p) + '</td>' +
        actionCell +
        '</tr>';
    }).join('');

    els.tableWrap.innerHTML =
      '<table class="catalog"><thead><tr>' +
        '<th>Photo</th><th>Name</th><th>Model No.</th><th>Size</th>' +
        '<th>Category</th><th>Season</th><th>Colors</th><th>Status</th>' + actionsHead +
      '</tr></thead><tbody>' + rows + '</tbody></table>';

    renderStagedBar();
  }

  function renderStagedBar() {
    var n = Object.keys(state.staged).length;
    if (n === 0) { hide(els.stagedBar); return; }
    els.stagedText.textContent = n + ' staged preview edit' + (n === 1 ? '' : 's') +
      ' — not saved to the live website.';
    show(els.stagedBar);
  }

  function renderCounts(data) {
    var c = data.counts || {};
    els.counts.textContent = data.total + ' products' +
      (c.total != null ? ' · confirmed ' + (c.confirmed || 0) + ' · need confirm ' + (c.need_confirmation || 0) : '');
  }

  function loadProducts() {
    els.tableWrap.innerHTML = '<p class="muted">Loading catalog…</p>';
    api('/api/admin/products').then(function (r) {
      if (r.status === 200) {
        state.products = r.body.products || [];
        renderCounts(r.body);
        return renderTable();
      }
      if (r.status === 401) return showLogin('Session expired. Please sign in again.');
      els.tableWrap.innerHTML = '<p class="error">Could not load catalog (' + r.status + ').</p>';
    }).catch(function () {
      els.tableWrap.innerHTML = '<p class="error">Network error loading catalog.</p>';
    });
  }

  // ---------- Edit modal (Stage 2A — preview only) ----------
  function openEdit(image) {
    var raw = null;
    for (var i = 0; i < state.products.length; i++) {
      if (state.products[i].image === image) { raw = state.products[i]; break; }
    }
    if (!raw) return;
    var p = displayProduct(raw);
    els.editImage.value = image;
    els.f_name.value = p.name || '';
    els.f_model.value = has(p.model) ? p.model : '';
    els.f_size.value = has(p.sizeRange) ? p.sizeRange : '';
    els.f_description.value = p.description || '';
    els.f_category.value = p.category || '';
    els.f_season.value = p.season || 'Winter';
    els.f_colors.value = (p.colors || []).join(', ');
    els.f_published.checked = p.published !== false;
    hide(els.editError); hide(els.editDiff); hide(els.editStageBtn);
    els.editDiff.innerHTML = '';
    show(els.editOverlay);
  }
  function closeEdit() { hide(els.editOverlay); }

  function collectFields() {
    return {
      name: els.f_name.value,
      model: els.f_model.value,
      sizeRange: els.f_size.value,
      description: els.f_description.value,
      category: els.f_category.value,
      season: els.f_season.value,
      colors: els.f_colors.value,
      published: !!els.f_published.checked
    };
  }

  function renderDiff(changed) {
    var keys = Object.keys(changed || {});
    if (keys.length === 0) {
      els.editDiff.innerHTML = '<p class="muted">No changes vs the current catalog.</p>';
    } else {
      els.editDiff.innerHTML = '<p class="diff-head">Preview of changes (not saved):</p>' +
        keys.map(function (k) {
          var c = changed[k];
          return '<div class="diff-row"><b>' + esc(k) + '</b>: <span class="from">' +
            esc(JSON.stringify(c.from)) + '</span> → <span class="to">' + esc(JSON.stringify(c.to)) + '</span></div>';
        }).join('');
    }
    show(els.editDiff);
  }

  els.editForm.addEventListener('submit', function (e) {
    e.preventDefault();
    hide(els.editError);
    var image = els.editImage.value;
    api('/api/admin/product-update', {
      method: 'POST',
      body: JSON.stringify({ image: image, fields: collectFields() })
    }).then(function (r) {
      if (r.status === 200 && r.body.preview) {
        renderDiff(r.body.changed);
        // stash normalized values so "Keep as staged preview" uses server-normalized data
        els.editForm._normalized = r.body.normalized;
        show(els.editStageBtn);
      } else if (r.status === 400) {
        var msg = (r.body.fieldErrors || [r.body.error || 'Validation failed']).join(' · ');
        els.editError.textContent = msg; show(els.editError);
      } else if (r.status === 403) {
        els.editError.textContent = r.body.error || 'Not permitted.'; show(els.editError);
      } else if (r.status === 401) {
        closeEdit(); showLogin('Session expired. Please sign in again.');
      } else {
        els.editError.textContent = r.body.error || ('Error (' + r.status + ').'); show(els.editError);
      }
    }).catch(function () {
      els.editError.textContent = 'Network error.'; show(els.editError);
    });
  });

  els.editStageBtn.addEventListener('click', function () {
    var image = els.editImage.value;
    var normalized = els.editForm._normalized;
    if (image && normalized) {
      state.staged[image] = normalized; // in-browser only; never persisted
      renderTable();
    }
    closeEdit();
  });

  els.discardStaged.addEventListener('click', function () {
    state.staged = {};
    renderTable();
  });

  els.editClose.addEventListener('click', closeEdit);
  els.editCancel.addEventListener('click', closeEdit);
  els.editOverlay.addEventListener('click', function (e) { if (e.target === els.editOverlay) closeEdit(); });

  els.tableWrap.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.edit-btn') : null;
    if (btn) openEdit(btn.getAttribute('data-image'));
  });

  // ---------- Auth ----------
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
      if (r.status === 200) { els.password.value = ''; checkSession(); }
      else { els.loginError.textContent = r.body.error || 'Sign-in failed.'; show(els.loginError); }
    }).catch(function () {
      els.loginBtn.disabled = false;
      els.loginError.textContent = 'Network error. Please try again.'; show(els.loginError);
    });
  });

  els.logoutBtn.addEventListener('click', function () {
    api('/api/admin/logout', { method: 'POST' }).then(function () {
      state.session = null; state.csrf = null; state.staged = {};
      showLogin();
    });
  });

  checkSession();
})();
