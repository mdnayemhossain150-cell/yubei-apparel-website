(function () {
  'use strict';

  var menuButton = document.getElementById('mobileMenuButton');
  var mobileNav = document.getElementById('mobileNav');

  function closeMenu() {
    if (!menuButton || !mobileNav) return;
    mobileNav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }

  if (menuButton && mobileNav) {
    menuButton.addEventListener('click', function () {
      var open = !mobileNav.classList.contains('open');
      mobileNav.classList.toggle('open', open);
      menuButton.setAttribute('aria-expanded', String(open));
    });
    mobileNav.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeMenu();
    });
  }

  var viewer = document.getElementById('imageViewer');
  var viewerImage = document.getElementById('imageViewerImage');
  var viewerClose = document.getElementById('imageViewerClose');

  function closeViewer() {
    if (!viewer) return;
    viewer.classList.remove('open');
    viewer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', function (event) {
    var zoomImage = event.target.closest('img[data-zoom]');
    if (!zoomImage || !viewer || !viewerImage) return;
    viewerImage.src = zoomImage.getAttribute('data-full-src') || zoomImage.currentSrc || zoomImage.src;
    viewerImage.alt = zoomImage.alt || '';
    viewer.classList.add('open');
    viewer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  });

  if (viewerClose) viewerClose.addEventListener('click', closeViewer);
  if (viewer) viewer.addEventListener('click', function (event) {
    if (event.target === viewer) closeViewer();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeMenu();
      closeViewer();
    }
  });

  var aboutTabs = Array.prototype.slice.call(document.querySelectorAll('[data-about-tab]'));
  var aboutPanels = Array.prototype.slice.call(document.querySelectorAll('[data-about-panel]'));

  function showAboutPanel(name) {
    aboutTabs.forEach(function (button) {
      var active = button.getAttribute('data-about-tab') === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    aboutPanels.forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-about-panel') !== name;
    });
  }

  aboutTabs.forEach(function (button) {
    button.addEventListener('click', function () {
      showAboutPanel(button.getAttribute('data-about-tab'));
    });
  });
})();
