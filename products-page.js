(function () {
  'use strict';

  // Cards are pre-rendered as static HTML by build-products.js (single source of
  // truth = products.json). This script only enhances them: season filter, model
  // search, copy/share, and ?model deep-linking. Inquiry (inquiry.js) and image
  // zoom (seo-pages.js) attach to the same cards independently.

  var grid = document.getElementById('productGrid');
  var search = document.getElementById('productModelSearch');
  var status = document.getElementById('productSearchStatus');
  if (!grid) return;

  var LABELS = { summer: 'Summer', autumn: 'Autumn', winter: 'Winter', mix: 'Mix' };
  var activeSeason = 'winter';

  function cards() {
    return Array.prototype.slice.call(grid.querySelectorAll('.prod-card'));
  }

  function applyFilters() {
    var query = search ? search.value.trim().toLowerCase() : '';
    var label = LABELS[activeSeason] || 'Winter';
    var visible = 0;
    cards().forEach(function (card) {
      var inSeason = card.dataset.season === label;
      var model = (card.dataset.model || '').toLowerCase();
      var matches = !query || model.indexOf(query) !== -1;
      var show = inSeason && matches;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (status) status.textContent = query ? visible + ' matching style' + (visible === 1 ? '' : 's') : '';
  }

  function setActiveButton(key) {
    document.querySelectorAll('[data-season]').forEach(function (item) {
      item.classList.toggle('active', item.dataset.season === key);
    });
  }

  document.querySelectorAll('[data-season]').forEach(function (button) {
    button.addEventListener('click', function () {
      activeSeason = button.dataset.season;
      setActiveButton(activeSeason);
      applyFilters();
    });
  });
  if (search) search.addEventListener('input', applyFilters);

  // Copy model number / share product (unchanged behavior)
  document.addEventListener('click', function (event) {
    var copyButton = event.target.closest('.copy-model-btn');
    var shareButton = event.target.closest('.share-product-btn');
    if (!copyButton && !shareButton) return;
    var card = event.target.closest('.prod-card');
    if (!card) return;
    event.preventDefault();
    event.stopPropagation();

    if (copyButton) {
      navigator.clipboard.writeText(card.dataset.model).then(function () {
        copyButton.textContent = 'Copied!';
        setTimeout(function () { copyButton.textContent = 'Copy Model No.'; }, 1400);
      });
      return;
    }

    var url = window.location.origin + '/products?model=' + encodeURIComponent(card.dataset.model);
    var shareData = { title: card.dataset.model + ' | Yubei Apparel', text: 'Yubei kidswear model ' + card.dataset.model, url: url };
    if (navigator.share) {
      navigator.share(shareData).catch(function () {});
    } else {
      navigator.clipboard.writeText(url).then(function () {
        shareButton.textContent = 'Link Copied!';
        setTimeout(function () { shareButton.textContent = 'Share Product'; }, 1400);
      });
    }
  });

  // Deep link: /products?model=YB0281 opens that model's season and pre-fills search
  var requestedModel = new URLSearchParams(window.location.search).get('model');
  if (requestedModel) {
    var target = cards().filter(function (card) {
      return (card.dataset.model || '').toLowerCase() === requestedModel.toLowerCase();
    })[0];
    if (target) {
      var key = Object.keys(LABELS).filter(function (k) { return LABELS[k] === target.dataset.season; })[0];
      if (key) { activeSeason = key; setActiveButton(key); }
    }
    if (search) search.value = requestedModel;
  }

  applyFilters();
})();
