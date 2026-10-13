(() => {
  'use strict';

  const STORAGE_KEY = 'mk_cookie_consent_v1';
  const DISMISSED_KEY = 'mk_cookie_consent_dismissed';
  const config = window.MK_TRACKING_CONFIG || {};
  const readConsent = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (typeof value?.statistics === 'boolean' && typeof value?.sessionReplay === 'boolean') return value;
      if (typeof value?.analytics === 'boolean') {
        return { statistics: value.analytics, sessionReplay: value.analytics };
      }
      return null;
    } catch {
      return null;
    }
  };

  const wasDismissed = () => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === 'true';
    } catch {
      return false;
    }
  };

  const hasAnalyticsConsent = () => readConsent()?.statistics === true;

  const updateSettingsVisibility = () => {
    const choice = readConsent();
    const wasRejected = choice && (!choice.statistics || !choice.sessionReplay);
    document.querySelectorAll('[data-cookie-settings]').forEach((button) => {
      button.hidden = !wasRejected;
    });
  };

  const deleteCookie = (name) => {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${window.location.hostname}; SameSite=Lax`;
  };

  const clearAnalyticsCookies = (statistics, sessionReplay) => {
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0].trim();
      if ((!statistics && (name === '_ga' || name.startsWith('_ga_')))
        || (!sessionReplay && (name === '_clck' || name === '_clsk'))) {
        deleteCookie(name);
      }
    });
  };

  const updateGoogleConsent = (analytics) => {
    if (config.gaMeasurementId) {
      window[`ga-disable-${config.gaMeasurementId}`] = !analytics;
    }

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
      analytics_storage: 'granted',
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

  const applyConsent = (choice) => {
    if (choice.statistics) loadGoogleAnalytics();
    updateGoogleConsent(choice.statistics);
    if (choice.sessionReplay) loadClarity();
    updateClarityConsent(choice.sessionReplay);
    clearAnalyticsCookies(choice.statistics, choice.sessionReplay);
  };

  const saveConsent = (choice) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        statistics: Boolean(choice.statistics),
        sessionReplay: Boolean(choice.sessionReplay),
        updatedAt: new Date().toISOString()
      }));
    } catch {
      /* The banner remains usable if storage is unavailable. */
    }

    applyConsent(choice);

    updateSettingsVisibility();

    window.dispatchEvent(new CustomEvent('mk:consent-updated', {
      detail: { analytics: Boolean(choice.statistics), sessionReplay: Boolean(choice.sessionReplay) }
    }));
  };

  window.MKCookieConsent = {
    hasAnalyticsConsent,
    hasConsentChoice: () => Boolean(readConsent()),
    wasDismissed,
    open: () => window.dispatchEvent(new Event('mk:open-cookie-settings'))
  };

  applyConsent(readConsent() || { statistics: false, sessionReplay: false });

  document.addEventListener('DOMContentLoaded', () => {
    updateSettingsVisibility();
    const consent = document.querySelector('[data-cookie-consent]');
    if (!consent) return;

    let showTimer;

    const forceLocalPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname)
      && new URLSearchParams(window.location.search).has('previewCookies');

    const open = () => {
      window.clearTimeout(showTimer);
      consent.hidden = false;
      document.body.classList.add('cookie-consent-open');
      window.dispatchEvent(new CustomEvent('mk:consent-opened'));
    };

    const close = () => {
      window.clearTimeout(showTimer);
      consent.hidden = true;
      document.body.classList.remove('cookie-consent-open');
    };

    const dismiss = () => {
      try {
        sessionStorage.setItem(DISMISSED_KEY, 'true');
      } catch {
        /* Closing remains possible if storage is unavailable. */
      }
      close();
      window.dispatchEvent(new CustomEvent('mk:consent-dismissed'));
    };

    consent.querySelector('[data-cookie-accept]')?.addEventListener('click', () => {
      saveConsent({ statistics: true, sessionReplay: true });
      close();
    });

    consent.querySelector('[data-cookie-reject]')?.addEventListener('click', () => {
      saveConsent({ statistics: false, sessionReplay: false });
      close();
    });
    consent.querySelector('[data-cookie-close]')?.addEventListener('click', dismiss);

    document.querySelectorAll('[data-cookie-settings]').forEach((button) => {
      button.addEventListener('click', open);
    });
    document.querySelectorAll('[data-cookie-open-preferences]').forEach((button) => {
      button.addEventListener('click', open);
    });
    window.addEventListener('mk:open-cookie-settings', open);

    if (forceLocalPreview) {
      showTimer = window.setTimeout(() => open(), 250);
    } else if (!readConsent() && !wasDismissed()) {
      showTimer = window.setTimeout(() => open(), 5 * 1000);
    }
  });
})();
