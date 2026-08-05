(function() {
  var STORAGE_KEY = 'yubeiInquiryListV1';
  var DETAILS_KEY = 'yubeiInquiryBuyerV1';
  var MAX_ITEMS = 30;
  var items = [];
  var buyer = { name: '', company: '', country: '' };

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) items = saved.slice(0, MAX_ITEMS);
  } catch (e) {}
  try {
    var savedBuyer = JSON.parse(localStorage.getItem(DETAILS_KEY) || '{}') || {};
    buyer.name = savedBuyer.name || '';
    buyer.company = savedBuyer.company || '';
    buyer.country = savedBuyer.country || '';
  } catch (e) {}

  function storeItems(render) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) {}
    updateCount();
    updateButtons();
    if (render && overlay().classList.contains('open')) renderItems();
  }
  function storeBuyer() {
    try { localStorage.setItem(DETAILS_KEY, JSON.stringify(buyer)); } catch (e) {}
  }
  function overlay() { return document.getElementById('inquiryOverlay'); }
  function status(message) { document.getElementById('inquiryStatus').textContent = message || ''; }
  function updateCount() {
    document.getElementById('inquiryFloatCount').textContent = items.length;
    document.getElementById('inquiryFloat').classList.toggle('visible', items.length > 0);
  }
  function updateButtons() {
    document.querySelectorAll('.inquiry-add-btn').forEach(function(button) {
      var card = button.closest('.prod-card');
      var selected = card && items.some(function(item) { return item.model === card.dataset.model; });
      button.classList.toggle('selected', !!selected);
      button.textContent = selected ? '✓ Added to Inquiry' : '+ Add to Inquiry';
    });
  }
  function addFromCard(button) {
    var card = button.closest('.prod-card');
    if (!card) return;
    var model = card.dataset.model || '';
    var existing = items.findIndex(function(item) { return item.model === model; });
    if (existing >= 0) items.splice(existing, 1);
    else if (items.length < MAX_ITEMS) items.push({
      model: model,
      size: card.dataset.size || '',
      season: card.dataset.season || '',
      quantity: '',
      note: ''
    });
    else {
      openPanel();
      status('Your inquiry list can contain up to ' + MAX_ITEMS + ' styles.');
      return;
    }
    storeItems(true);
  }
  function makeField(labelText, input) {
    var field = document.createElement('div');
    field.className = 'inquiry-field';
    var label = document.createElement('label');
    label.textContent = labelText;
    field.appendChild(label);
    field.appendChild(input);
    return field;
  }
  function renderItems() {
    var container = document.getElementById('inquiryItems');
    container.textContent = '';
    if (!items.length) {
      var empty = document.createElement('div');
      empty.id = 'inquiryEmpty';
      empty.textContent = 'Your inquiry list is empty. Add styles from the Products page.';
      container.appendChild(empty);
      return;
    }
    items.forEach(function(item, index) {
      var row = document.createElement('div');
      row.className = 'inquiry-item';
      var info = document.createElement('div');
      info.className = 'inquiry-model';
      info.textContent = item.model;
      var meta = document.createElement('span');
      meta.className = 'inquiry-meta';
      meta.textContent = [item.season, item.size].filter(Boolean).join(' · ');
      info.appendChild(meta);

      var quantity = document.createElement('input');
      quantity.type = 'number'; quantity.min = '1'; quantity.inputMode = 'numeric';
      quantity.placeholder = 'Pieces'; quantity.value = item.quantity || '';
      quantity.addEventListener('input', function() { items[index].quantity = quantity.value; storeItems(false); });

      var note = document.createElement('input');
      note.type = 'text'; note.maxLength = 120; note.placeholder = 'Color, label, or other request';
      note.value = item.note || '';
      note.addEventListener('input', function() { items[index].note = note.value; storeItems(false); });
      var noteField = makeField('Notes', note);
      noteField.classList.add('notes');

      var remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'inquiry-remove'; remove.innerHTML = '&times;';
      remove.setAttribute('aria-label', 'Remove ' + item.model);
      remove.addEventListener('click', function() { items.splice(index, 1); storeItems(true); });

      row.appendChild(info);
      row.appendChild(makeField('Quantity', quantity));
      row.appendChild(noteField);
      row.appendChild(remove);
      container.appendChild(row);
    });
  }
  function summary() {
    var lines = ['Hello Yubei Apparel,', ''];
    if (buyer.name) lines.push('Name: ' + buyer.name);
    if (buyer.company) lines.push('Company: ' + buyer.company);
    if (buyer.country) lines.push('Country: ' + buyer.country);
    if (buyer.name || buyer.company || buyer.country) lines.push('');
    lines.push('I am interested in the following ' + items.length + ' style' + (items.length === 1 ? '' : 's') + ':');
    items.forEach(function(item, index) {
      var line = (index + 1) + '. ' + item.model;
      if (item.season) line += ' | ' + item.season;
      if (item.size) line += ' | Size: ' + item.size;
      line += ' | Quantity: ' + (item.quantity ? item.quantity + ' pcs' : 'Not specified');
      if (item.note) line += ' | Notes: ' + item.note;
      lines.push(line);
    });
    lines.push('', 'Please send availability, MOQ, and quotation. Thank you.');
    return lines.join('\n');
  }
  function copySummary() {
    if (!items.length) { status('Add at least one style first.'); return Promise.resolve(false); }
    var text = summary();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function() { status('Inquiry summary copied.'); return true; });
    }
    var area = document.createElement('textarea');
    area.value = text; area.style.position = 'fixed'; area.style.opacity = '0';
    document.body.appendChild(area); area.select();
    var copied = document.execCommand('copy'); area.remove();
    status(copied ? 'Inquiry summary copied.' : 'Could not copy automatically.');
    return Promise.resolve(copied);
  }
  function openPanel() {
    renderItems(); status(''); overlay().classList.add('open'); document.body.style.overflow = 'hidden';
  }
  function closePanel() { overlay().classList.remove('open'); document.body.style.overflow = ''; }

  window._addInquiryFromCard = addFromCard;
  document.getElementById('inquiryBuyerName').value = buyer.name;
  document.getElementById('inquiryBuyerCompany').value = buyer.company;
  document.getElementById('inquiryBuyerCountry').value = buyer.country;
  document.getElementById('inquiryFloat').addEventListener('click', openPanel);
  document.getElementById('inquiryClose').addEventListener('click', closePanel);
  document.getElementById('inquiryBuyerName').addEventListener('input', function(e) { buyer.name = e.target.value; storeBuyer(); });
  document.getElementById('inquiryBuyerCompany').addEventListener('input', function(e) { buyer.company = e.target.value; storeBuyer(); });
  document.getElementById('inquiryBuyerCountry').addEventListener('input', function(e) { buyer.country = e.target.value; storeBuyer(); });
  document.getElementById('inquiryApplyQuantity').addEventListener('click', function() {
    var quantity = document.getElementById('inquiryBulkQuantity').value;
    if (!items.length) { status('Add at least one style first.'); return; }
    if (!quantity || Number(quantity) < 1) { status('Enter a valid quantity first.'); return; }
    items.forEach(function(item) { item.quantity = quantity; });
    storeItems(true);
    status('Applied ' + quantity + ' pieces to all ' + items.length + ' selected styles.');
  });
  document.getElementById('inquiryCopy').addEventListener('click', copySummary);
  document.getElementById('inquiryWhatsApp').addEventListener('click', function() {
    if (!items.length) { status('Add at least one style first.'); return; }
    var text = summary();
    if (encodeURIComponent(text).length > 1800) copySummary().then(function() {
      status('Summary copied. Paste it into WhatsApp.');
      window.open('https://wa.me/8618367259637', '_blank', 'noopener');
    });
    else window.open('https://wa.me/8618367259637?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });
  document.getElementById('inquiryEmail').addEventListener('click', function() {
    if (!items.length) { status('Add at least one style first.'); return; }
    window.location.href = 'mailto:358630530@qq.com?subject=' + encodeURIComponent('Product Inquiry - ' + items.length + ' Styles') + '&body=' + encodeURIComponent(summary());
  });
  document.getElementById('inquiryClear').addEventListener('click', function() {
    if (!items.length || window.confirm('Clear all selected styles?')) { items = []; storeItems(true); status('Inquiry list cleared.'); }
  });
  document.addEventListener('click', function(e) {
    var button = e.target.closest('.inquiry-add-btn');
    if (button) { e.preventDefault(); e.stopPropagation(); addFromCard(button); }
  });
  overlay().addEventListener('click', function(e) { if (e.target === overlay()) closePanel(); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && overlay().classList.contains('open')) closePanel(); });
  updateCount();
  updateButtons();
})();
