(() => {
  'use strict';

  const STORAGE_KEY = 'mk_cookie_consent_v1';
  const config = window.MK_TRACKING_CONFIG || {};
  let analyticsLoaded = false;

  const readConsent = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return typeof value?.analytics === 'boolean' ? value : null;
    } catch {
      return null;
    }
  };

  const hasAnalyticsConsent = () => readConsent()?.analytics === true;

  const deleteCookie = (name) => {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${window.location.hostname}; SameSite=Lax`;
  };

  const clearAnalyticsCookies = () => {
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      if (name === '_ga' || name.startsWith('_ga_') || name === '_clck' || name === '_clsk') {
        deleteCookie(name);
      }
    });
  };

  const updateGoogleConsent = (analytics) => {
    window.gtag?.('consent', 'update', {
      analytics_storage: analytics ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  };

  const updateClarityConsent = (analytics) => {
    window.clarity?.('consentv2', {
      ad_Storage: 'denied',
      analytics_Storage: analytics ? 'granted' : 'denied'
    });
  };

  const loadGoogleAnalytics = () => {
    if (!config.gaMeasurementId || document.querySelector('[data-mk-ga4]')) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    updateGoogleConsent(true);
    window.gtag('js', new Date());
    window.gtag('config', config.gaMeasurementId, { allow_google_signals: false });

    const script = document.createElement('script');
    script.async = true;
    script.dataset.mkGa4 = 'true';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.gaMeasurementId)}`;
    document.head.appendChild(script);
  };

  const loadClarity = () => {
    if (!config.clarityProjectId || document.querySelector('[data-mk-clarity]')) return;

    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };
    updateClarityConsent(true);

    const script = document.createElement('script');
    script.async = true;
    script.dataset.mkClarity = 'true';
    script.src = `https://www.clarity.ms/tag/${encodeURIComponent(config.clarityProjectId)}`;
    document.head.appendChild(script);
  };

  const loadAnalytics = () => {
    if (analyticsLoaded) {
      updateGoogleConsent(true);
      updateClarityConsent(true);
      return;
    }
    analyticsLoaded = true;
    loadGoogleAnalytics();
    loadClarity();
  };

  const denyAnalytics = () => {
    updateGoogleConsent(false);
    updateClarityConsent(false);
    clearAnalyticsCookies();
  };

  const saveConsent = (analytics) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        analytics: Boolean(analytics),
        updatedAt: new Date().toISOString()
      }));
    } catch {
      /* The banner remains usable if storage is unavailable. */
    }

    if (analytics) loadAnalytics();
    else denyAnalytics();

    window.dispatchEvent(new CustomEvent('mk:consent-updated', {
      detail: { analytics: Boolean(analytics) }
    }));
  };

  window.MKCookieConsent = {
    hasAnalyticsConsent,
    hasConsentChoice: () => Boolean(readConsent()),
    open: () => document.querySelector('[data-cookie-settings]')?.click()
  };

  if (hasAnalyticsConsent()) loadAnalytics();

  document.addEventListener('DOMContentLoaded', () => {
    const consent = document.querySelector('[data-cookie-consent]');
    if (!consent) return;

    const summary = consent.querySelector('[data-cookie-summary]');
    const preferencesPanel = consent.querySelector('[data-cookie-preferences-panel]');
    const analyticsInput = consent.querySelector('[data-cookie-analytics]');
    const firstButton = consent.querySelector('[data-cookie-accept]');

    const showSummary = () => {
      summary.hidden = false;
      preferencesPanel.hidden = true;
    };

    const showPreferences = () => {
      analyticsInput.checked = hasAnalyticsConsent();
      summary.hidden = true;
      preferencesPanel.hidden = false;
      analyticsInput.focus();
    };

    const open = (preferences = false) => {
      consent.hidden = false;
      preferences ? showPreferences() : showSummary();
      document.body.classList.add('cookie-consent-open');
      if (!preferences) firstButton.focus();
    };

    const close = () => {
      consent.hidden = true;
      document.body.classList.remove('cookie-consent-open');
    };

    consent.querySelector('[data-cookie-accept]')?.addEventListener('click', () => {
      saveConsent(true);
      close();
    });

    consent.querySelector('[data-cookie-preferences]')?.addEventListener('click', showPreferences);
    consent.querySelector('[data-cookie-back]')?.addEventListener('click', showSummary);
    consent.querySelector('[data-cookie-save]')?.addEventListener('click', () => {
      saveConsent(analyticsInput.checked);
      close();
    });

    document.querySelectorAll('[data-cookie-settings]').forEach((button) => {
      button.addEventListener('click', () => open(true));
    });

    if (!readConsent()) open(false);
  });
})();
