(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.site-nav');
  const header = document.querySelector('[data-header]');

  const setMenu = (open) => {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (open) header?.classList.remove('is-hidden');
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
    if (window.innerWidth >= 1080) {
      setMenu(false);
      header?.classList.remove('is-hidden');
    }
  });

  let lastHeaderScroll = window.scrollY;
  let headerScrollQueued = false;

  const updateMobileHeader = () => {
    const currentScroll = window.scrollY;
    const menuIsOpen = menuButton?.getAttribute('aria-expanded') === 'true';

    if (!header || window.innerWidth >= 1080 || menuIsOpen || currentScroll <= 16) {
      header?.classList.remove('is-hidden');
      lastHeaderScroll = currentScroll;
      headerScrollQueued = false;
      return;
    }

    if (currentScroll > lastHeaderScroll + 8) {
      header.classList.add('is-hidden');
      lastHeaderScroll = currentScroll;
    } else if (currentScroll < lastHeaderScroll - 8) {
      header.classList.remove('is-hidden');
      lastHeaderScroll = currentScroll;
    }

    headerScrollQueued = false;
  };

  window.addEventListener('scroll', () => {
    if (headerScrollQueued) return;
    headerScrollQueued = true;
    window.requestAnimationFrame(updateMobileHeader);
  }, { passive: true });

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

  document.querySelectorAll('[data-product-gallery]').forEach((gallery) => {
    const galleryStage = gallery.querySelector('.mkb-gallery-stage');
    const thumbnailStrip = gallery.querySelector('.mkb-gallery-thumbs');
    const mainImage = gallery.querySelector('[data-gallery-main]');
    const thumbnails = Array.from(gallery.querySelectorAll('[data-gallery-thumb]'));
    const previousButton = gallery.querySelector('[data-gallery-prev]');
    const nextButton = gallery.querySelector('[data-gallery-next]');
    const openButton = gallery.querySelector('[data-gallery-open]');
    const dialog = gallery.querySelector('[data-gallery-dialog]');
    const dialogImage = gallery.querySelector('[data-gallery-dialog-image]');
    const closeButton = gallery.querySelector('[data-gallery-close]');

    if (!mainImage || !thumbnails.length) return;

    let activeIndex = Math.max(0, thumbnails.findIndex((thumbnail) => thumbnail.getAttribute('aria-pressed') === 'true'));
    let touchStartX = null;

    const selectImage = (index, moveThumbnail = true) => {
      activeIndex = (index + thumbnails.length) % thumbnails.length;
      const selected = thumbnails[activeIndex];

      mainImage.src = selected.dataset.src;
      mainImage.alt = selected.dataset.alt || '';

      thumbnails.forEach((thumbnail, thumbnailIndex) => {
        thumbnail.setAttribute('aria-pressed', String(thumbnailIndex === activeIndex));
      });

      if (moveThumbnail && thumbnailStrip) {
        const targetLeft = selected.offsetLeft - ((thumbnailStrip.clientWidth - selected.clientWidth) / 2);
        thumbnailStrip.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
      }
    };

    thumbnails.forEach((thumbnail, index) => {
      thumbnail.addEventListener('click', () => selectImage(index));

      const preloadImage = () => {
        const image = new Image();
        image.src = thumbnail.dataset.src;
      };

      thumbnail.addEventListener('pointerenter', preloadImage, { once: true });
      thumbnail.addEventListener('focus', preloadImage, { once: true });
    });

    previousButton?.addEventListener('click', () => selectImage(activeIndex - 1));
    nextButton?.addEventListener('click', () => selectImage(activeIndex + 1));

    gallery.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectImage(activeIndex - 1);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        selectImage(activeIndex + 1);
      }
    });

    galleryStage?.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0]?.clientX ?? null;
    }, { passive: true });

    galleryStage?.addEventListener('touchend', (event) => {
      if (touchStartX === null) return;
      const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
      const distance = touchEndX - touchStartX;
      touchStartX = null;

      if (Math.abs(distance) < 45) return;
      selectImage(activeIndex + (distance < 0 ? 1 : -1));
    }, { passive: true });

    openButton?.addEventListener('click', () => {
      if (!dialog || !dialogImage || typeof dialog.showModal !== 'function') return;
      dialogImage.src = mainImage.currentSrc || mainImage.src;
      dialogImage.alt = mainImage.alt;
      dialog.showModal();
    });

    closeButton?.addEventListener('click', () => dialog?.close());
    dialog?.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
})();
