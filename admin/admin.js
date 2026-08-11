'use strict';
/*
 * admin.js — read-only dashboard + Stage 2A edit + Stage 2B add/delete/reorder.
 *
 * ALL write actions are PREVIEW ONLY: each calls a server dry-run that persists
 * nothing, and results are staged in the browser only (gone on reload/logout).
 * No products.json write, no GitHub, no persistence.
 */
(function () {
  var PLACEHOLDER = 'xxxxx';
  var state = {
    session: null, csrf: null,
    products: [],          // loaded catalog (canonical)
    order: [],             // display order of existing products (image keys)
    originalOrder: [],
    staged: {},            // edits: image -> normalized fields (2A)
    adds: [],              // new preview products (2B)
    deletes: {},           // image -> true (2B)
    editMode: 'edit'
  };

  var $ = function (id) { return document.getElementById(id); };
  var els = {
    loginView: $('loginView'), dashView: $('dashView'), loginForm: $('loginForm'),
    username: $('username'), password: $('password'), loginBtn: $('loginBtn'), loginError: $('loginError'),
    logoutBtn: $('logoutBtn'), roleBadge: $('roleBadge'), userLabel: $('userLabel'),
    counts: $('counts'), tableWrap: $('tableWrap'), mockActions: $('mockActions'),
    addProductBtn: $('addProductBtn'),
    stagedBar: $('stagedBar'), stagedText: $('stagedText'), discardStaged: $('discardStaged'),
    // edit/add modal
    editOverlay: $('editOverlay'), editForm: $('editForm'), editImage: $('editImage'), editTitle: $('editTitle'),
    editClose: $('editClose'), editCancel: $('editCancel'), editError: $('editError'), editDiff: $('editDiff'),
    editStageBtn: $('editStageBtn'),
    f_name: $('f_name'), f_model: $('f_model'), f_size: $('f_size'), f_description: $('f_description'),
    f_category: $('f_category'), f_season: $('f_season'), f_colors: $('f_colors'), f_published: $('f_published'),
    // delete modal
    deleteOverlay: $('deleteOverlay'), delName: $('delName'), delModel: $('delModel'),
    delConfirm: $('delConfirm'), delCancel: $('delCancel'), delClose: $('delClose'), delError: $('delError')
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
  function productByImage(img) {
    for (var i = 0; i < state.products.length; i++) if (state.products[i].image === img) return state.products[i];
    return null;
  }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (state.csrf) opts.headers['X-Admin-CSRF'] = state.csrf;
    opts.credentials = 'same-origin';
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (body) { return { status: r.status, body: body }; });
    });
  }

  // ---------- Views ----------
  function showLogin(message) {
    hide(els.dashView); show(els.loginView);
    if (message) { els.loginError.textContent = message; show(els.loginError); }
  }
  function showDashboard(session) {
    state.session = session;
    resetStaging();
    hide(els.loginView); show(els.dashView);
    var isSuper = session.user.role === 'super_admin';
    els.roleBadge.textContent = isSuper ? 'Super Admin' : 'Content Admin';
    els.roleBadge.className = 'badge ' + (isSuper ? 'super' : 'content');
    els.userLabel.textContent = (session.user.username || '') + ' — ' + (session.user.label || session.user.role);
    show(els.mockActions);
    if (can('product:add')) show(els.addProductBtn); else hide(els.addProductBtn);
    fetchCsrf();
    loadProducts();
  }
  function fetchCsrf() {
    api('/api/admin/csrf').then(function (r) { if (r.status === 200 && r.body.csrfToken) state.csrf = r.body.csrfToken; });
  }
  function resetStaging() { state.staged = {}; state.adds = []; state.deletes = {}; }

  // ---------- Rendering ----------
  function displayProduct(p) { var s = state.staged[p.image]; return s ? Object.assign({}, p, s) : p; }
  function statusPill(p) {
    if (p.published === false) return '<span class="pill hidden">hidden</span>';
    var s = p.status || '';
    if (s === 'ok') return '<span class="pill ok">ok</span>';
    if (s === 'corrected') return '<span class="pill corrected">corrected</span>';
    if (s === 'need_confirmation') return '<span class="pill need">needs&nbsp;confirm</span>';
    return '<span class="pill">' + esc(s) + '</span>';
  }
  function modelCell(p) {
    return has(p.model) ? '<span class="mono">' + esc(p.model) + '</span>' : '<span class="inquiry">Available upon inquiry</span>';
  }
  function sizeCell(p) { return has(p.sizeRange) ? esc(p.sizeRange) : '<span class="inquiry">—</span>'; }

  function rowHtml(p, thumb, namePills, actions, deleted) {
    return '<tr class="' + (deleted ? 'row-deleted' : '') + '">' +
      '<td>' + thumb + '</td>' +
      '<td class="wrap">' + esc(p.name) + namePills + '</td>' +
      '<td>' + modelCell(p) + '</td>' +
      '<td>' + sizeCell(p) + '</td>' +
      '<td>' + esc(p.category || '') + '</td>' +
      '<td>' + esc(p.season || '') + '</td>' +
      '<td>' + esc((p.colors || []).join(', ')) + '</td>' +
      '<td>' + statusPill(p) + '</td>' +
      (actions != null ? '<td class="act">' + actions + '</td>' : '') +
      '</tr>';
  }

  function renderTable() {
    var canEdit = can('product:edit'), canDel = can('product:delete'), canReorder = can('product:reorder');
    var hasActions = canEdit || canDel || canReorder;

    var rows = '';
    state.order.forEach(function (img) {
      var raw = productByImage(img);
      if (!raw) return;
      var p = displayProduct(raw);
      var deleted = !!state.deletes[img];
      var pills = deleted ? ' <span class="pill del">pending&nbsp;delete</span>'
        : (state.staged[img] ? ' <span class="pill staged">edited&nbsp;(preview)</span>' : '');
      var actions = null;
      if (hasActions) {
        if (deleted) {
          actions = '<button class="undo-del btn-ghost" data-image="' + esc(img) + '">Undo</button>';
        } else {
          actions = '';
          if (canEdit) actions += '<button class="edit-btn btn-ghost" data-image="' + esc(img) + '">Edit</button> ';
          if (canDel) actions += '<button class="del-btn btn-ghost" data-image="' + esc(img) + '">Delete</button> ';
          if (canReorder) actions += '<button class="mv-btn btn-ghost" data-image="' + esc(img) + '" data-dir="up" title="Move up">↑</button>' +
            '<button class="mv-btn btn-ghost" data-image="' + esc(img) + '" data-dir="down" title="Move down">↓</button>';
        }
      }
      var thumb = '<img class="thumb" loading="lazy" src="/assets/' + esc(img) + '" alt="">';
      rows += rowHtml(p, thumb, pills, actions, deleted);
    });

    state.adds.forEach(function (a) {
      var pills = ' <span class="pill new">new&nbsp;(preview)</span>';
      var actions = hasActions ? '<button class="rm-add btn-ghost" data-pid="' + esc(a.previewId) + '">Remove</button>' : null;
      var thumb = '<span class="thumb thumb-pending" title="Photo pending (Stage 2C)">photo</span>';
      rows += rowHtml(a, thumb, pills, actions, false);
    });

    var actHead = (canEdit || canDel || canReorder) ? '<th>Actions</th>' : '';
    els.tableWrap.innerHTML =
      '<table class="catalog"><thead><tr>' +
        '<th>Photo</th><th>Name</th><th>Model No.</th><th>Size</th>' +
        '<th>Category</th><th>Season</th><th>Colors</th><th>Status</th>' + actHead +
      '</tr></thead><tbody>' + rows + '</tbody></table>';

    renderStagedBar();
  }

  function isReordered() {
    if (state.order.length !== state.originalOrder.length) return true;
    for (var i = 0; i < state.order.length; i++) if (state.order[i] !== state.originalOrder[i]) return true;
    return false;
  }
  function renderStagedBar() {
    var parts = [];
    var nEdit = Object.keys(state.staged).length;
    var nAdd = state.adds.length;
    var nDel = Object.keys(state.deletes).length;
    if (nEdit) parts.push(nEdit + ' edit' + (nEdit === 1 ? '' : 's'));
    if (nAdd) parts.push(nAdd + ' add' + (nAdd === 1 ? '' : 's'));
    if (nDel) parts.push(nDel + ' delete' + (nDel === 1 ? '' : 's'));
    if (isReordered()) parts.push('reordered');
    if (parts.length === 0) { hide(els.stagedBar); return; }
    els.stagedText.textContent = 'Staged preview: ' + parts.join(', ') + ' — not saved to the live website.';
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
        state.order = state.products.map(function (p) { return p.image; });
        state.originalOrder = state.order.slice();
        renderCounts(r.body);
        return renderTable();
      }
      if (r.status === 401) return showLogin('Session expired. Please sign in again.');
      els.tableWrap.innerHTML = '<p class="error">Could not load catalog (' + r.status + ').</p>';
    }).catch(function () { els.tableWrap.innerHTML = '<p class="error">Network error loading catalog.</p>'; });
  }

  // ---------- Reorder (within season) ----------
  function moveWithinSeason(image, dir) {
    var idx = state.order.indexOf(image);
    var raw = productByImage(image);
    if (idx < 0 || !raw) return;
    var target = -1, i;
    if (dir === 'up') { for (i = idx - 1; i >= 0; i--) { var pu = productByImage(state.order[i]); if (pu && pu.season === raw.season) { target = i; break; } } }
    else { for (i = idx + 1; i < state.order.length; i++) { var pd = productByImage(state.order[i]); if (pd && pd.season === raw.season) { target = i; break; } } }
    if (target < 0) return;
    var t = state.order[idx]; state.order[idx] = state.order[target]; state.order[target] = t;
    renderTable();
    api('/api/admin/product-reorder', { method: 'POST', body: JSON.stringify({ order: state.order }) }); // dry-run validate
  }

  // ---------- Edit / Add modal ----------
  function openEdit(image) {
    var raw = productByImage(image);
    if (!raw) return;
    var p = displayProduct(raw);
    state.editMode = 'edit';
    els.editTitle.textContent = 'Edit product';
    els.editStageBtn.textContent = 'Keep as staged preview';
    els.editImage.value = image;
    els.f_name.value = p.name || '';
    els.f_model.value = has(p.model) ? p.model : '';
    els.f_size.value = has(p.sizeRange) ? p.sizeRange : '';
    els.f_description.value = p.description || '';
    els.f_category.value = p.category || '';
    els.f_season.value = p.season || 'Winter';
    els.f_colors.value = (p.colors || []).join(', ');
    els.f_published.checked = p.published !== false;
    resetModal();
    show(els.editOverlay);
  }
  function openAdd() {
    state.editMode = 'add';
    els.editTitle.textContent = 'Add product (preview)';
    els.editStageBtn.textContent = 'Keep as staged new product';
    els.editImage.value = '';
    els.f_name.value = ''; els.f_model.value = ''; els.f_size.value = '';
    els.f_description.value = ''; els.f_category.value = ''; els.f_season.value = 'Winter';
    els.f_colors.value = ''; els.f_published.checked = true;
    resetModal();
    show(els.editOverlay);
  }
  function resetModal() {
    hide(els.editError); hide(els.editDiff); hide(els.editStageBtn);
    els.editDiff.innerHTML = ''; els.editForm._normalized = null; els.editForm._add = null;
  }
  function closeEdit() { hide(els.editOverlay); }

  function collectFields() {
    return {
      name: els.f_name.value, model: els.f_model.value, sizeRange: els.f_size.value,
      description: els.f_description.value, category: els.f_category.value, season: els.f_season.value,
      colors: els.f_colors.value, published: !!els.f_published.checked
    };
  }
  function renderDiff(changed) {
    var keys = Object.keys(changed || {});
    els.editDiff.innerHTML = keys.length === 0
      ? '<p class="muted">No changes vs the current catalog.</p>'
      : '<p class="diff-head">Preview of changes (not saved):</p>' + keys.map(function (k) {
          var c = changed[k];
          return '<div class="diff-row"><b>' + esc(k) + '</b>: <span class="from">' + esc(JSON.stringify(c.from)) + '</span> → <span class="to">' + esc(JSON.stringify(c.to)) + '</span></div>';
        }).join('');
    show(els.editDiff);
  }
  function renderAddPreview(product) {
    var keys = ['name', 'model', 'sizeRange', 'category', 'season', 'colors', 'published', 'description'];
    els.editDiff.innerHTML = '<p class="diff-head">New product preview (not saved):</p>' + keys.map(function (k) {
      return '<div class="diff-row"><b>' + esc(k) + '</b>: <span class="to">' + esc(JSON.stringify(product[k])) + '</span></div>';
    }).join('') + '<div class="diff-row"><b>photo</b>: <span class="muted">pending (Stage 2C)</span></div>';
    show(els.editDiff);
  }

  els.editForm.addEventListener('submit', function (e) {
    e.preventDefault();
    hide(els.editError);
    if (state.editMode === 'add') {
      api('/api/admin/product-add', { method: 'POST', body: JSON.stringify({ fields: collectFields() }) }).then(function (r) {
        if (r.status === 200 && r.body.preview) {
          renderAddPreview(r.body.product);
          els.editForm._add = r.body.product;
          show(els.editStageBtn);
        } else { modalError(r); }
      }).catch(netErr);
      return;
    }
    var image = els.editImage.value;
    api('/api/admin/product-update', { method: 'POST', body: JSON.stringify({ image: image, fields: collectFields() }) }).then(function (r) {
      if (r.status === 200 && r.body.preview) {
        renderDiff(r.body.changed);
        els.editForm._normalized = r.body.normalized;
        show(els.editStageBtn);
      } else { modalError(r); }
    }).catch(netErr);
  });
  function modalError(r) {
    if (r.status === 401) { closeEdit(); showLogin('Session expired. Please sign in again.'); return; }
    var msg = (r.body.fieldErrors || [r.body.error || ('Error (' + r.status + ').')]).join(' · ');
    els.editError.textContent = msg; show(els.editError);
  }
  function netErr() { els.editError.textContent = 'Network error.'; show(els.editError); }

  els.editStageBtn.addEventListener('click', function () {
    if (state.editMode === 'add' && els.editForm._add) {
      state.adds.push(els.editForm._add);
    } else if (state.editMode === 'edit' && els.editForm._normalized) {
      state.staged[els.editImage.value] = els.editForm._normalized;
    }
    closeEdit(); renderTable();
  });

  // ---------- Delete modal ----------
  var pendingDeleteImage = null;
  function openDelete(image) {
    var raw = productByImage(image);
    if (!raw) return;
    pendingDeleteImage = image;
    els.delName.textContent = raw.name || '(unnamed)';
    els.delModel.textContent = has(raw.model) ? raw.model : 'Available upon inquiry';
    hide(els.delError);
    show(els.deleteOverlay);
  }
  function closeDelete() { hide(els.deleteOverlay); pendingDeleteImage = null; }
  els.delConfirm.addEventListener('click', function () {
    if (!pendingDeleteImage) return;
    var image = pendingDeleteImage;
    api('/api/admin/product-delete', { method: 'POST', body: JSON.stringify({ image: image, confirm: true }) }).then(function (r) {
      if (r.status === 200 && r.body.preview) { state.deletes[image] = true; closeDelete(); renderTable(); }
      else if (r.status === 401) { closeDelete(); showLogin('Session expired. Please sign in again.'); }
      else { els.delError.textContent = r.body.error || ('Error (' + r.status + ').'); show(els.delError); }
    }).catch(function () { els.delError.textContent = 'Network error.'; show(els.delError); });
  });

  // ---------- Events ----------
  if (els.addProductBtn) els.addProductBtn.addEventListener('click', openAdd);
  els.editClose.addEventListener('click', closeEdit);
  els.editCancel.addEventListener('click', closeEdit);
  els.editOverlay.addEventListener('click', function (e) { if (e.target === els.editOverlay) closeEdit(); });
  els.delClose.addEventListener('click', closeDelete);
  els.delCancel.addEventListener('click', closeDelete);
  els.deleteOverlay.addEventListener('click', function (e) { if (e.target === els.deleteOverlay) closeDelete(); });

  els.tableWrap.addEventListener('click', function (e) {
    var t = e.target;
    var pick = function (sel) { return t.closest ? t.closest(sel) : null; };
    var b;
    if ((b = pick('.edit-btn'))) return openEdit(b.getAttribute('data-image'));
    if ((b = pick('.del-btn'))) return openDelete(b.getAttribute('data-image'));
    if ((b = pick('.undo-del'))) { delete state.deletes[b.getAttribute('data-image')]; return renderTable(); }
    if ((b = pick('.rm-add'))) {
      var pid = b.getAttribute('data-pid');
      state.adds = state.adds.filter(function (a) { return a.previewId !== pid; });
      return renderTable();
    }
    if ((b = pick('.mv-btn'))) return moveWithinSeason(b.getAttribute('data-image'), b.getAttribute('data-dir'));
  });

  els.discardStaged.addEventListener('click', function () {
    resetStaging();
    state.order = state.originalOrder.slice();
    renderTable();
  });

  // ---------- Auth ----------
  function checkSession() {
    api('/api/admin/session').then(function (r) {
      if (r.status === 200 && r.body.authenticated) showDashboard(r.body); else showLogin();
    }).catch(function () { showLogin(); });
  }
  els.loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    hide(els.loginError); els.loginBtn.disabled = true;
    api('/api/admin/login', { method: 'POST', body: JSON.stringify({ username: els.username.value, password: els.password.value }) }).then(function (r) {
      els.loginBtn.disabled = false;
      if (r.status === 200) { els.password.value = ''; checkSession(); }
      else { els.loginError.textContent = r.body.error || 'Sign-in failed.'; show(els.loginError); }
    }).catch(function () { els.loginBtn.disabled = false; els.loginError.textContent = 'Network error. Please try again.'; show(els.loginError); });
  });
  els.logoutBtn.addEventListener('click', function () {
    api('/api/admin/logout', { method: 'POST' }).then(function () {
      state.session = null; state.csrf = null; resetStaging();
      showLogin();
    });
  });

  checkSession();
})();
