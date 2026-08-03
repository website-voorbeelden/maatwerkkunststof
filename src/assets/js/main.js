(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.site-nav');

  const setMenu = (open) => {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  };

  menuButton?.addEventListener('click', () => {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });

  menu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenu(false));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMenu(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 900) setMenu(false);
  });

  window.dataLayer = window.dataLayer || [];

  document.querySelectorAll('[data-analytics]').forEach((element) => {
    element.addEventListener('click', () => {
      window.dataLayer.push({
        event: element.dataset.analytics,
        click_location: element.dataset.location || '',
        click_text: element.textContent.trim(),
        page_path: window.location.pathname
      });
    });
  });

  const campaignKeys = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'gbraid', 'wbraid'
  ];

  const params = new URLSearchParams(window.location.search);
  const readStoredValue = (key) => {
    try { return sessionStorage.getItem(`mk_${key}`) || ''; } catch { return ''; }
  };
  const storeValue = (key, value) => {
    try { sessionStorage.setItem(`mk_${key}`, value); } catch { /* storage may be unavailable */ }
  };

  campaignKeys.forEach((key) => {
    const currentValue = params.get(key);
    if (currentValue) storeValue(key, currentValue);
  });

  document.querySelectorAll('[data-quote-form]').forEach((form) => {
    const startedField = form.querySelector('[data-form-started]');
    const status = form.querySelector('[data-form-status]');
    const submitButton = form.querySelector('[data-submit-button]');
    const fileInput = form.querySelector('input[type="file"]');

    if (startedField) startedField.value = String(Date.now());

    campaignKeys.forEach((key) => {
      const field = form.elements.namedItem(key);
      if (field) field.value = readStoredValue(key);
    });

    fileInput?.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const invalid = files.length > 3 || totalSize > 8 * 1024 * 1024;
      fileInput.setCustomValidity(invalid ? 'Selecteer maximaal 3 bestanden van samen maximaal 8 MB.' : '');
    });

    form.addEventListener('submit', async (event) => {
      if (!window.fetch || !form.reportValidity()) return;
      event.preventDefault();

      status.className = 'form-status';
      status.textContent = '';
      submitButton.disabled = true;
      const originalText = submitButton.textContent;
      submitButton.textContent = 'Aanvraag versturen…';

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });

        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.message || 'De aanvraag kon niet worden verstuurd. Probeer het opnieuw.');
        }

        window.dataLayer.push({
          event: 'quote_form_submit',
          product_type: form.elements.namedItem('product')?.value || '',
          page_path: window.location.pathname
        });

        window.location.assign('/bedankt/');
      } catch (error) {
        status.className = 'form-status is-error';
        status.textContent = error.message || 'Er ging iets mis. Probeer het later opnieuw of stuur een e-mail.';
        status.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    });
  });
})();
