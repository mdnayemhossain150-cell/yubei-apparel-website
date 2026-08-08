(function () {
  'use strict';

  var seasons = {
    summer: {
      label: 'Summer',
      code: 'SU',
      files: Array.from({ length: 20 }, function (_, i) { return 'summer-' + String(i + 1).padStart(2, '0') + '.jpg'; }),
      overrides: {
        1: ['85021#', '100–140cm'], 2: ['85321#', '100–140cm'], 3: ['85221#', '100–140cm'],
        4: ['711321#', '100–140cm'], 5: ['84921#', '100–130cm'], 9: ['YB253274-63', '100–130cm'],
        11: ['YB24709', '120–160cm'], 13: ['YB21007140', '110–150cm'], 14: ['YB002', '110–150cm'],
        15: ['YB003', '110–150cm'], 16: ['YB005', '110–150cm'], 17: ['YB009', '110–150cm'],
        18: ['YB021', '110–150cm'], 19: ['YB016', '110–150cm']
      }
    },
    autumn: {
      label: 'Autumn',
      code: 'AU',
      files: Array.from({ length: 20 }, function (_, i) { return 'autumn-' + String(i + 1).padStart(2, '0') + '.jpg'; }),
      overrides: {
        1: ['YB0224', '120–160cm'], 6: ['YB0286', '110–150cm'], 7: ['YB0264', '110–150cm'],
        9: ['YB0292', '110–150cm'], 10: ['YB0277', '110–150cm'], 12: ['31136#', '6Y–14Y'],
        13: ['111536#', '6Y–14Y'], 14: ['31536#', '6Y–14Y'], 17: ['315128#', '120–160cm'],
        18: ['16236#', '6Y–14Y'], 19: ['315428#', '120–160cm'], 20: ['YB0214', '120–160cm']
      }
    },
    winter: {
      label: 'Winter',
      code: 'WI',
      files: Array.from({ length: 20 }, function (_, i) { return 'winter-' + String(i + 1).padStart(2, '0') + '.jpg'; }),
      overrides: {}
    },
    mix: {
      label: 'Mix Items',
      code: 'MX',
      files: Array.from({ length: 20 }, function (_, i) { return 'mix-' + String(i + 1).padStart(2, '0') + '.jpg'; }),
      overrides: {
        1: ['YB0205', '120–160cm'], 2: ['YB0206', '120–160cm'], 3: ['YB0207', '120–160cm'],
        4: ['YB0209', '120–160cm'], 5: ['YB0210', '120–160cm'], 6: ['YB0214', '120–160cm'],
        7: ['YB0224', '120–160cm'], 8: ['YB0189', '6Y–14Y'], 9: ['YB0185', '6Y–14Y'],
        10: ['YB0177', '6Y–14Y'], 11: ['YB02296', '6Y–14Y'], 12: ['YB0190', '6Y–14Y'],
        13: ['YB529139', '120–160cm'], 14: ['529639', '120–160cm'], 15: ['529339', '120–160cm'],
        16: ['YB529739', '120–160cm'], 17: ['YB006', '120–160cm'], 18: ['YB005', '120–160cm'],
        19: ['YB007', '120–160cm'], 20: ['YB007', '120–160cm']
      }
    }
  };

  var grid = document.getElementById('productGrid');
  var search = document.getElementById('productModelSearch');
  var status = document.getElementById('productSearchStatus');
  var activeSeason = 'winter';

  function productsFor(key) {
    var season = seasons[key];
    return season.files.map(function (file, index) {
      var number = index + 1;
      var override = season.overrides[number];
      return {
        model: override ? override[0] : 'YB-' + season.code + '-' + String(number).padStart(3, '0'),
        size: override ? override[1] : '110–150cm',
        weight: '0.45kg',
        season: season.label,
        src: '/assets/' + file
      };
    });
  }

  function savedModels() {
    try {
      var items = JSON.parse(localStorage.getItem('yubeiInquiryListV1') || '[]');
      return new Set(Array.isArray(items) ? items.map(function (item) { return item.model; }) : []);
    } catch (error) {
      return new Set();
    }
  }

  function element(name, className, text) {
    var node = document.createElement(name);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function makeCard(product, index, selected) {
    var card = element('article', 'prod-card');
    card.dataset.model = product.model;
    card.dataset.size = product.size;
    card.dataset.weight = product.weight;
    card.dataset.season = product.season;
    card.dataset.src = product.src;

    var image = element('img');
    image.src = product.src;
    image.alt = product.season + " kidswear overalls set, model " + product.model + ", size " + product.size + " — Yubei Apparel wholesale children's clothing";
    image.width = 800;
    image.height = 1000;
    image.loading = index < 2 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.setAttribute('data-zoom', '');
    if (index === 0) image.fetchPriority = 'high';
    card.appendChild(image);

    var body = element('div', 'product-body');
    body.appendChild(element('div', 'product-model', 'Model No: ' + product.model));
    var meta = element('div', 'product-meta');
    meta.innerHTML = '<div><b>Size:</b> ' + product.size + '</div><div><b>Weight:</b> ' + product.weight + '</div><div><b>Season:</b> ' + product.season + '</div>';
    body.appendChild(meta);

    var utilities = element('div', 'product-actions');
    var copy = element('button', 'copy-model-btn', 'Copy Model No.');
    copy.type = 'button';
    var share = element('button', 'share-product-btn', 'Share Product');
    share.type = 'button';
    utilities.append(copy, share);
    body.appendChild(utilities);

    var inquiry = element('button', 'inquiry-add-btn', selected ? '✓ Added to Inquiry' : '+ Add to Inquiry');
    inquiry.type = 'button';
    inquiry.classList.toggle('selected', selected);
    body.appendChild(inquiry);
    card.appendChild(body);
    return card;
  }

  function render() {
    if (!grid) return;
    var query = search ? search.value.trim().toLowerCase() : '';
    var products = productsFor(activeSeason).filter(function (product) {
      return !query || product.model.toLowerCase().includes(query);
    });
    var selected = savedModels();
    var fragment = document.createDocumentFragment();
    products.forEach(function (product, index) {
      fragment.appendChild(makeCard(product, index, selected.has(product.model)));
    });
    grid.replaceChildren(fragment);
    if (status) status.textContent = query ? products.length + ' matching style' + (products.length === 1 ? '' : 's') : '';
  }

  document.querySelectorAll('[data-season]').forEach(function (button) {
    button.addEventListener('click', function () {
      activeSeason = button.dataset.season;
      document.querySelectorAll('[data-season]').forEach(function (item) {
        item.classList.toggle('active', item === button);
      });
      render();
    });
  });
  if (search) search.addEventListener('input', render);

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

  var requestedModel = new URLSearchParams(window.location.search).get('model');
  if (requestedModel) {
    Object.keys(seasons).some(function (key) {
      if (!productsFor(key).some(function (product) { return product.model.toLowerCase() === requestedModel.toLowerCase(); })) return false;
      activeSeason = key;
      var button = document.querySelector('[data-season="' + key + '"]');
      if (button) {
        document.querySelectorAll('[data-season]').forEach(function (item) { item.classList.remove('active'); });
        button.classList.add('active');
      }
      return true;
    });
    if (search) search.value = requestedModel;
  }
  render();
})();
