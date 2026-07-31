(function initHanBuddyAnalytics(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HanBuddyAnalytics = api;
})(typeof window === 'undefined' ? null : window, (browserWindow) => {
  const ANALYTICS_CONFIG = Object.freeze({
    googleMeasurementId: 'G-MW7MFVL50G',
    metaPixelId: '4569887956575986',
    destinations: Object.freeze({
      google_form: 'https://forms.gle/B1fWgX3MjtHUHGNt5',
      instagram: 'https://www.instagram.com/hanbuddy_kr/',
      kakaotalk: 'https://open.kakao.com/o/sP3n4rFi',
    }),
  });

  const ANALYTICS_CONSENT_KEY = 'hanbuddy.analyticsConsent';
  const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
  const CTA_DEFINITIONS = Object.freeze({
    apply: Object.freeze({
      ctaType: 'apply',
      destination: 'google_form',
      metaEvent: 'ApplicationFormOpen',
    }),
    apply_section: Object.freeze({
      ctaType: 'navigation',
      destination: 'apply_section',
      metaEvent: null,
    }),
    instagram: Object.freeze({
      ctaType: 'contact',
      destination: 'instagram',
      metaEvent: 'ContactClick',
    }),
    contact: Object.freeze({
      ctaType: 'contact',
      destination: 'kakaotalk',
      metaEvent: 'ContactClick',
    }),
    meetup: Object.freeze({
      ctaType: 'community',
      destination: 'meetup',
      metaEvent: null,
    }),
  });

  const buildPageContext = ({
    pageType = 'page',
    contentLanguage = 'en',
    experienceType = '',
  } = {}) => {
    const context = {
      page_type: pageType,
      content_language: contentLanguage,
    };
    if (experienceType) context.experience_type = experienceType;
    return context;
  };

  const ctaDefinition = (ctaKey) => {
    if (CTA_DEFINITIONS[ctaKey]) {
      return { ...CTA_DEFINITIONS[ctaKey] };
    }
    if (ctaKey?.startsWith('linkedin_')) {
      return {
        ctaType: 'profile',
        destination: 'linkedin',
        metaEvent: null,
        profileId: ctaKey.slice('linkedin_'.length),
      };
    }
    return null;
  };

  const buildCtaEvent = ({
    ctaKey,
    placement = 'page',
    pageContext = {},
  } = {}) => {
    const definition = ctaDefinition(ctaKey);
    if (!definition) return null;

    const params = {
      ...pageContext,
      cta_type: definition.ctaType,
      destination: definition.destination,
      placement,
    };
    if (definition.profileId) params.profile_id = definition.profileId;

    return {
      ga: {
        name: 'cta_click',
        params,
      },
      meta: definition.metaEvent
        ? {
            name: definition.metaEvent,
            params: { ...params },
          }
        : null,
    };
  };

  const buildSelectContentEvent = ({
    contentId,
    availabilityStatus,
    pageContext = {},
  } = {}) => ({
    name: 'select_content',
    params: {
      ...pageContext,
      content_type: 'experience',
      item_id: contentId,
      availability_status: availabilityStatus,
    },
  });

  const isTrackableHostname = (hostname) => !LOCAL_HOSTNAMES.has(hostname);

  if (!browserWindow?.document) {
    return {
      buildPageContext,
      buildCtaEvent,
      buildSelectContentEvent,
      isTrackableHostname,
    };
  }

  const { document } = browserWindow;
  browserWindow.dataLayer = browserWindow.dataLayer || [];
  browserWindow.gtag = browserWindow.gtag || function gtag() {
    browserWindow.dataLayer.push(arguments);
  };
  browserWindow.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });

  let analyticsLoaded = false;
  let initialized = false;
  let sectionObserverStarted = false;

  const safeStoredAnalyticsConsent = () => {
    try {
      const consent = browserWindow.localStorage.getItem(ANALYTICS_CONSENT_KEY);
      return consent === 'granted' || consent === 'denied' ? consent : null;
    } catch {
      return null;
    }
  };

  const persistAnalyticsConsent = (consent) => {
    try {
      browserWindow.localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
    } catch {
      // Tracking stays disabled when storage is unavailable.
    }
  };

  const currentPageContext = () => buildPageContext({
    pageType: document.body?.dataset.analyticsPageType || 'page',
    contentLanguage: document.documentElement.lang || 'en',
    experienceType: document.body?.dataset.analyticsExperienceType || '',
  });

  const canTrack = () => (
    analyticsLoaded
    && safeStoredAnalyticsConsent() === 'granted'
    && isTrackableHostname(browserWindow.location.hostname)
  );

  const updateGoogleConsent = (consent) => {
    browserWindow.gtag('consent', 'update', {
      ad_storage: consent,
      ad_user_data: consent,
      ad_personalization: consent,
      analytics_storage: consent,
    });
  };

  const loadGoogleAnalytics = () => {
    updateGoogleConsent('granted');
    if (document.getElementById('google-analytics-script')) {
      browserWindow.gtag('event', 'page_view', currentPageContext());
      return;
    }

    browserWindow.gtag('js', new Date());
    browserWindow.gtag(
      'config',
      ANALYTICS_CONFIG.googleMeasurementId,
      currentPageContext(),
    );

    const script = document.createElement('script');
    script.id = 'google-analytics-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_CONFIG.googleMeasurementId)}`;
    document.head.appendChild(script);
  };

  const installMetaPixel = () => {
    if (typeof browserWindow.fbq === 'function') return;

    (function bootstrapMetaPixel(f, b, e, v, n, t, s) {
      n = f.fbq = function fbq() {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(browserWindow, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js'));

    browserWindow.fbq('init', ANALYTICS_CONFIG.metaPixelId);
  };

  const loadMetaPixel = () => {
    installMetaPixel();
    browserWindow.fbq('consent', 'grant');
    browserWindow.fbq('track', 'PageView', currentPageContext());
  };

  const trackGa = (name, params = {}) => {
    if (!canTrack()) return;
    browserWindow.gtag('event', name, params);
  };

  const trackMetaCustom = (name, params = {}) => {
    if (!canTrack() || typeof browserWindow.fbq !== 'function') return;
    browserWindow.fbq('trackCustom', name, params);
  };

  const ctaPlacement = (element) => {
    if (element.dataset.analyticsPlacement) return element.dataset.analyticsPlacement;
    if (element.closest('header')) return 'nav';
    if (element.closest('footer')) return 'footer';
    return element.closest('section[id]')?.id || 'page';
  };

  const matchesConfiguredDestination = (element, destination) => {
    const expected = ANALYTICS_CONFIG.destinations[destination];
    if (!expected) return false;
    try {
      return new URL(element.href, browserWindow.location.href).href === new URL(expected).href;
    } catch {
      return false;
    }
  };

  const trackCtaElement = (element) => {
    const ctaKey = element.dataset.cta;
    const event = buildCtaEvent({
      ctaKey,
      placement: ctaPlacement(element),
      pageContext: currentPageContext(),
    });
    if (!event) return;

    trackGa(event.ga.name, event.ga.params);
    if (
      event.meta
      && matchesConfiguredDestination(element, event.meta.params.destination)
    ) {
      trackMetaCustom(event.meta.name, event.meta.params);
    }
  };

  const trackContentElement = (element) => {
    const event = buildSelectContentEvent({
      contentId: element.dataset.analyticsContentId,
      availabilityStatus: element.dataset.analyticsContentStatus,
      pageContext: currentPageContext(),
    });
    trackGa(event.name, event.params);
  };

  const startSectionAnalytics = () => {
    if (
      sectionObserverStarted
      || !('IntersectionObserver' in browserWindow)
    ) {
      return;
    }

    const sections = document.querySelectorAll('[data-analytics-section]');
    if (sections.length === 0) return;

    sectionObserverStarted = true;
    const observer = new browserWindow.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        trackGa('section_view', {
          ...currentPageContext(),
          section_id: entry.target.id,
        });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.2 });

    sections.forEach((section) => observer.observe(section));
  };

  const loadAnalytics = () => {
    if (
      analyticsLoaded
      || !isTrackableHostname(browserWindow.location.hostname)
    ) {
      return;
    }
    analyticsLoaded = true;
    loadGoogleAnalytics();
    loadMetaPixel();
    startSectionAnalytics();
  };

  const revokeAnalytics = () => {
    updateGoogleConsent('denied');
    if (typeof browserWindow.fbq === 'function') {
      browserWindow.fbq('consent', 'revoke');
    }
    analyticsLoaded = false;
  };

  const hideConsentBanner = () => {
    const banner = document.querySelector('[data-consent-banner]');
    if (!banner) return;
    banner.classList.add('hidden');
    banner.setAttribute('aria-hidden', 'true');
  };

  const showConsentBanner = (moveFocus = false) => {
    const banner = document.querySelector('[data-consent-banner]');
    if (!banner) return;
    banner.classList.remove('hidden');
    banner.setAttribute('aria-hidden', 'false');
    if (moveFocus) {
      banner.querySelector('[data-consent-action="accept"]')?.focus();
    }
  };

  const setAnalyticsConsent = (consent) => {
    persistAnalyticsConsent(consent);
    if (consent === 'granted') loadAnalytics();
    else revokeAnalytics();
    hideConsentBanner();
  };

  const trackLanguageSwitch = (nextLanguage, previousLanguage) => {
    if (!nextLanguage || nextLanguage === previousLanguage) return;
    trackGa('language_switch', {
      ...currentPageContext(),
      content_language: nextLanguage,
      previous_content_language: previousLanguage,
    });
  };

  const init = () => {
    if (initialized) return;
    initialized = true;

    document.querySelectorAll('[data-consent-action]').forEach((button) => {
      button.addEventListener('click', () => {
        setAnalyticsConsent(
          button.dataset.consentAction === 'accept' ? 'granted' : 'denied',
        );
      });
    });
    document.querySelectorAll('[data-consent-settings]').forEach((button) => {
      button.addEventListener('click', () => showConsentBanner(true));
    });
    document.addEventListener('click', (event) => {
      const cta = event.target.closest?.('[data-cta]');
      if (cta) {
        trackCtaElement(cta);
        return;
      }
      const content = event.target.closest?.('[data-analytics-content-id]');
      if (content) trackContentElement(content);
    });

    const consent = safeStoredAnalyticsConsent();
    if (consent === 'granted') loadAnalytics();
    else if (consent === null) showConsentBanner();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  return {
    buildPageContext,
    buildCtaEvent,
    buildSelectContentEvent,
    isTrackableHostname,
    trackLanguageSwitch,
  };
});
