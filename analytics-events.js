(function () {
  'use strict';

  function cleanText(value, maxLength) {
    return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength || 100);
  }

  function sendEvent(name, parameters) {
    var details = Object.assign({
      page_path: window.location.pathname
    }, parameters || {});

    if (typeof window.gtag === 'function') {
      window.gtag('event', name, details);
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name }, details));
  }

  function buttonLabel(element) {
    return cleanText(element.getAttribute('aria-label') || element.textContent, 100);
  }

  function productDetails(element) {
    var card = element.closest('.prod-card, [data-product-detail]');
    if (!card) return {};
    return {
      product_model: cleanText(card.dataset.model, 60),
      product_collection: cleanText(card.dataset.season, 40)
    };
  }

  function selectedStyleCount() {
    try {
      var saved = JSON.parse(localStorage.getItem('yubeiInquiryListV1') || '[]');
      return Array.isArray(saved) ? saved.length : 0;
    } catch (error) {
      return document.querySelectorAll('.inquiry-item').length;
    }
  }

  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target : event.target.parentElement;
    if (!target) return;

    var addButton = target.closest('.inquiry-add-btn');
    if (addButton) {
      var addDetails = productDetails(addButton);
      // Direct inquiry handlers update the selected class before the click
      // bubbles here, so the resulting state describes the completed action.
      addDetails.action = addButton.classList.contains('selected') ? 'add' : 'remove';
      sendEvent('product_inquiry_update', addDetails);
      return;
    }

    var shareButton = target.closest('.share-product-btn');
    if (shareButton) {
      sendEvent('share_product', productDetails(shareButton));
      return;
    }

    var copyButton = target.closest('.copy-model-btn');
    if (copyButton) {
      sendEvent('copy_product_model', productDetails(copyButton));
      return;
    }

    var inquiryWhatsApp = target.closest('#inquiryWhatsApp');
    if (inquiryWhatsApp) {
      var whatsappCount = selectedStyleCount();
      if (whatsappCount > 0) {
        sendEvent('generate_lead', {
          contact_method: 'whatsapp',
          inquiry_type: 'product_list',
          selected_style_count: whatsappCount
        });
      }
      return;
    }

    var inquiryEmail = target.closest('#inquiryEmail');
    if (inquiryEmail) {
      var emailCount = selectedStyleCount();
      if (emailCount > 0) {
        sendEvent('generate_lead', {
          contact_method: 'email',
          inquiry_type: 'product_list',
          selected_style_count: emailCount
        });
      }
      return;
    }

    var sampleButton = target.closest('#lb-sample');
    if (sampleButton) {
      sendEvent('sample_request_click', {
        product_model: cleanText(sampleButton.dataset.model || '', 60)
      });
      return;
    }

    var quoteButton = target.closest('#sqbBtn');
    if (quoteButton) {
      sendEvent('quote_request_click', { link_text: buttonLabel(quoteButton) });
      return;
    }

    var link = target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var label = buttonLabel(link);

    if (/^(https?:\/\/)?(wa\.me|api\.whatsapp\.com)(\/|$)/i.test(href)) {
      sendEvent('whatsapp_click', { link_text: label });
      sendEvent('generate_lead', {
        contact_method: 'whatsapp',
        inquiry_type: 'direct_contact',
        link_text: label
      });
      return;
    }

    if (/^mailto:/i.test(href)) {
      sendEvent('email_click', { link_text: label });
      sendEvent('generate_lead', {
        contact_method: 'email',
        inquiry_type: 'direct_contact',
        link_text: label
      });
      return;
    }

    if (/^tel:/i.test(href)) {
      sendEvent('phone_click', { link_text: label });
      sendEvent('generate_lead', {
        contact_method: 'phone',
        inquiry_type: 'direct_contact',
        link_text: label
      });
      return;
    }

    var destination;
    try {
      destination = new URL(href, window.location.href);
    } catch (error) {
      return;
    }

    if (destination.origin === window.location.origin && destination.pathname === '/contact') {
      var eventName = /quote|enquiry|inquiry/i.test(label) ? 'quote_request_click' : 'contact_page_click';
      sendEvent(eventName, { link_text: label });
    }
  });
})();
