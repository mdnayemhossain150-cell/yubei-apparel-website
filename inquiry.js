(function() {
  var STORAGE_KEY = 'yubeiInquiryListV1';
  var DETAILS_KEY = 'yubeiInquiryBuyerV1';
  var MAX_ITEMS = 30;
  var items = [];
  var buyer = {
    name: '', company: '', country: '', deliveryDate: '',
    destinationPort: '', targetPrice: '', customization: '',
    currency: 'USD', contactMethod: 'WhatsApp'
  };

  try {
    var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) items = saved.slice(0, MAX_ITEMS);
  } catch (e) {}
  try {
    var savedBuyer = JSON.parse(localStorage.getItem(DETAILS_KEY) || '{}') || {};
    buyer.name = savedBuyer.name || '';
    buyer.company = savedBuyer.company || '';
    buyer.country = savedBuyer.country || '';
    buyer.deliveryDate = savedBuyer.deliveryDate || '';
    buyer.destinationPort = savedBuyer.destinationPort || '';
    buyer.targetPrice = savedBuyer.targetPrice || '';
    buyer.customization = savedBuyer.customization || '';
    buyer.currency = savedBuyer.currency || 'USD';
    buyer.contactMethod = savedBuyer.contactMethod || 'WhatsApp';
  } catch (e) {}

  function storeItems(render) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) {}
    updateCount();
    updateTotals();
    updateButtons();
    if (render && overlay().classList.contains('open')) renderItems();
  }
  function storeBuyer() {
    try { localStorage.setItem(DETAILS_KEY, JSON.stringify(buyer)); } catch (e) {}
  }
  function language() {
    return window.YubeiI18n ? window.YubeiI18n.getLanguage() : 'en';
  }
  function translatedValue(value) {
    return window.YubeiI18n ? window.YubeiI18n.translate(value) : value;
  }
  function overlay() { return document.getElementById('inquiryOverlay'); }
  function status(message) { document.getElementById('inquiryStatus').textContent = message || ''; }
  function updateCount() {
    document.getElementById('inquiryFloatCount').textContent = items.length;
    document.getElementById('inquiryFloat').classList.toggle('visible', items.length > 0);
  }
  function getTotalQuantity() {
    return items.reduce(function(sum, item) {
      var quantity = Number(item.quantity);
      return sum + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
    }, 0);
  }
  function updateTotals() {
    var total = getTotalQuantity();
    var average = items.length && total ? Math.round(total / items.length) : 0;
    var text = items.length + ' selected style' + (items.length === 1 ? '' : 's') + ' · ' + total.toLocaleString() + ' total pieces';
    if (average) text += ' · ' + average.toLocaleString() + ' average per style';
    document.getElementById('inquiryTotals').textContent = text;
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
      meta.textContent = [translatedValue(item.season), item.size].filter(Boolean).join(' · ');
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
    var selectedLanguage = language();
    var labels = selectedLanguage === 'ar' ? {
      hello: 'مرحباً يوبي للملابس،', name: 'الاسم: ', company: 'الشركة: ', country: 'الدولة: ',
      delivery: 'تاريخ التسليم المطلوب: ', port: 'ميناء الوصول: ', price: 'السعر المستهدف: ', custom: 'متطلبات التخصيص: ', contact: 'طريقة التواصل المفضلة: ',
      intro: 'أنا مهتم بالموديلات التالية، وعددها ', styleUnit: ':', season: 'الموسم: ', size: 'المقاس: ', quantity: 'الكمية: ', notes: 'ملاحظات: ',
      unspecified: 'غير محدد', pieces: ' قطعة', total: 'إجمالي الكمية: ', closing: 'يرجى إرسال حالة التوفر والحد الأدنى للطلب وعرض السعر. شكراً.'
    } : {
      hello: 'Hello Yubei Apparel,', name: 'Name: ', company: 'Company: ', country: 'Country: ',
      delivery: 'Required delivery date: ', port: 'Destination port: ', price: 'Target price: ', custom: 'Customization: ', contact: 'Preferred contact method: ',
      intro: 'I am interested in the following ', styleUnit: ' style(s):', season: 'Season: ', size: 'Size: ', quantity: 'Quantity: ', notes: 'Notes: ',
      unspecified: 'Not specified', pieces: ' pcs', total: 'Total quantity: ', closing: 'Please send availability, MOQ, and quotation. Thank you.'
    };
    var lines = [labels.hello, ''];
    if (buyer.name) lines.push(labels.name + buyer.name);
    if (buyer.company) lines.push(labels.company + buyer.company);
    if (buyer.country) lines.push(labels.country + buyer.country);
    if (buyer.deliveryDate) lines.push(labels.delivery + buyer.deliveryDate);
    if (buyer.destinationPort) lines.push(labels.port + buyer.destinationPort);
    if (buyer.targetPrice) lines.push(labels.price + buyer.currency + ' ' + buyer.targetPrice);
    if (buyer.customization) lines.push(labels.custom + buyer.customization);
    if (buyer.contactMethod) lines.push(labels.contact + translatedValue(buyer.contactMethod));
    if (buyer.name || buyer.company || buyer.country || buyer.deliveryDate || buyer.destinationPort || buyer.targetPrice || buyer.customization || buyer.contactMethod) lines.push('');
    lines.push(labels.intro + items.length + labels.styleUnit);
    items.forEach(function(item, index) {
      var line = (index + 1) + '. 🟠 ' + item.model;
      if (item.season) line += ' | ' + labels.season + translatedValue(item.season);
      if (item.size) line += ' | ' + labels.size + item.size;
      line += ' | ' + labels.quantity + (item.quantity ? item.quantity + labels.pieces : labels.unspecified);
      if (item.note) line += ' | ' + labels.notes + item.note;
      lines.push(line);
    });
    if (getTotalQuantity()) lines.push(labels.total + getTotalQuantity().toLocaleString() + labels.pieces);
    lines.push('', labels.closing);
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
  document.getElementById('inquiryDeliveryDate').value = buyer.deliveryDate;
  document.getElementById('inquiryDestinationPort').value = buyer.destinationPort;
  document.getElementById('inquiryTargetPrice').value = buyer.targetPrice;
  document.getElementById('inquiryCustomization').value = buyer.customization;
  document.getElementById('inquiryCurrency').value = buyer.currency;
  document.getElementById('inquiryContactMethod').value = buyer.contactMethod;
  document.getElementById('inquiryFloat').addEventListener('click', openPanel);
  document.getElementById('inquiryClose').addEventListener('click', closePanel);
  document.getElementById('inquiryBuyerName').addEventListener('input', function(e) { buyer.name = e.target.value; storeBuyer(); });
  document.getElementById('inquiryBuyerCompany').addEventListener('input', function(e) { buyer.company = e.target.value; storeBuyer(); });
  document.getElementById('inquiryBuyerCountry').addEventListener('input', function(e) { buyer.country = e.target.value; storeBuyer(); });
  document.getElementById('inquiryDeliveryDate').addEventListener('input', function(e) { buyer.deliveryDate = e.target.value; storeBuyer(); });
  document.getElementById('inquiryDestinationPort').addEventListener('input', function(e) { buyer.destinationPort = e.target.value; storeBuyer(); });
  document.getElementById('inquiryTargetPrice').addEventListener('input', function(e) { buyer.targetPrice = e.target.value; storeBuyer(); });
  document.getElementById('inquiryCustomization').addEventListener('input', function(e) { buyer.customization = e.target.value; storeBuyer(); });
  document.getElementById('inquiryCurrency').addEventListener('change', function(e) { buyer.currency = e.target.value; storeBuyer(); });
  document.getElementById('inquiryContactMethod').addEventListener('change', function(e) { buyer.contactMethod = e.target.value; storeBuyer(); });
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
    window.location.href = 'https://wa.me/8618367259637?text=' + encodeURIComponent(text);
  });
  document.getElementById('inquiryEmail').addEventListener('click', function() {
    if (!items.length) { status('Add at least one style first.'); return; }
    var subject = language() === 'ar' ? 'استفسار منتجات - ' + items.length + ' موديلات' : 'Product Inquiry - ' + items.length + ' Styles';
    window.location.href = 'mailto:358630530@qq.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(summary());
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
  document.addEventListener('yubei:languagechange', function() {
    updateTotals();
    updateButtons();
    if (overlay().classList.contains('open')) renderItems();
  });
  updateCount();
  updateTotals();
  updateButtons();
})();
