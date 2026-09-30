(function () {
  'use strict';

  var STORAGE_KEY = 'yubeiInquiryListV1';
  var MAX_ITEMS = 30;
  var detail = document.querySelector('[data-product-detail]');
  var mainImage = document.getElementById('productMainImage');
  var inquiryButton = document.getElementById('productInquiryButton');
  var inquiryStatus = document.getElementById('productInquiryStatus');

  document.querySelectorAll('[data-gallery-src]').forEach(function (button) {
    button.addEventListener('click', function () {
      if (!mainImage) return;
      mainImage.src = button.getAttribute('data-gallery-src');
      mainImage.alt = button.getAttribute('data-gallery-alt') || '';
      document.querySelectorAll('[data-gallery-src]').forEach(function (item) {
        var active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    });
  });

  if (!detail || !inquiryButton) return;

  var product = {
    model: detail.getAttribute('data-model') || '',
    size: detail.getAttribute('data-size') || '',
    season: detail.getAttribute('data-season') || '',
    quantity: '',
    note: ''
  };

  function readItems() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function selected(items) {
    return items.some(function (item) { return item.model === product.model; });
  }

  function render(items) {
    var isSelected = selected(items);
    inquiryButton.classList.toggle('selected', isSelected);
    inquiryButton.textContent = isSelected ? '✓ Added to Inquiry' : '+ Add to Inquiry';
    inquiryButton.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  }

  inquiryButton.addEventListener('click', function () {
    var items = readItems();
    var index = items.findIndex(function (item) { return item.model === product.model; });
    if (index >= 0) {
      items.splice(index, 1);
      inquiryStatus.textContent = 'Removed from your inquiry list.';
    } else if (items.length >= MAX_ITEMS) {
      inquiryStatus.textContent = 'Your inquiry list is full. Open the catalog to review its 30 items.';
      return;
    } else {
      items.push(product);
      inquiryStatus.innerHTML = 'Added. <a href="/products?model=' + encodeURIComponent(product.model) + '">Open this model in the catalog</a> to review your inquiry list.';
    }
    writeItems(items);
    render(items);
  });

  window.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY) render(readItems());
  });

  render(readItems());
})();
