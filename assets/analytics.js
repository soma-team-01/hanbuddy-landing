(function initHanBuddyAnalytics(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HanBuddyAnalytics = api;
})(typeof window === 'undefined' ? null : window, (browserWindow) => {
  const ANALYTICS_CONFIG = Object.freeze({
    googleMeasurementId: 'G-MW7MFVL50G',
    metaPixelId: '4569887956575986',
    destinations: Object.freeze({
      application_page: '/apply/',
      instagram: 'https://www.instagram.com/hanbuddy_kr/',
      kakaotalk: 'https://open.kakao.com/o/sP3n4rFi',
    }),
  });

  const ANALYTICS_CONSENT_KEY = 'hanbuddy.analyticsConsent';
  const TRACKABLE_HOSTNAMES = new Set(['www.hanbuddy.kr']);
  const LIMITED_UTM_KEYS = Object.freeze([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_id',
    'utm_content',
    'utm_term',
  ]);
  const MAX_UTM_VALUE_LENGTH = 100;
  const META_STANDARD_EVENTS = new Set(['Contact']);
  const GOOGLE_COLLECTION_DISABLE_KEY = (
    'ga-disable-' + ANALYTICS_CONFIG.googleMeasurementId
  );
  const CTA_DEFINITIONS = Object.freeze({
    // 신청 경로가 랜딩 안으로 들어왔지만 이벤트 이름은 유지한다. 기존 데이터와의
    // 연속성이 끊기면 전환 추이를 이전과 비교할 수 없다.
    apply: Object.freeze({
      gaEvent: 'application_form_open',
      destination: 'application_page',
      metaEvent: 'ApplicationFormOpen',
    }),
    apply_section: Object.freeze({
      gaEvent: 'navigation_click',
      destination: 'apply_section',
      metaEvent: null,
    }),
    instagram: Object.freeze({
      gaEvent: 'contact_click',
      destination: 'instagram',
      metaEvent: 'Contact',
    }),
    contact: Object.freeze({
      gaEvent: 'contact_click',
      destination: 'kakaotalk',
      metaEvent: 'Contact',
    }),
    meetup: Object.freeze({
      gaEvent: 'community_click',
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
        gaEvent: 'profile_click',
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
      destination: definition.destination,
      placement,
    };
    if (definition.profileId) params.profile_id = definition.profileId;

    return {
      ga: {
        name: definition.gaEvent,
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

  const isTrackableHostname = (hostname) => (
    typeof hostname === 'string'
    && TRACKABLE_HOSTNAMES.has(hostname.toLowerCase())
  );

  const resemblesPersonalData = (value) => {
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) return true;
    const phoneCandidates = value.match(/\+?\d[\d\s().-]{5,}\d/g) || [];
    return phoneCandidates.some((candidate) => (
      (candidate.match(/\d/g) || []).length >= 7
    ));
  };

  const referrerOrigin = (referrer) => {
    if (!referrer) return '';
    try {
      const parsed = new URL(referrer);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
        ? parsed.origin
        : '';
    } catch {
      return '';
    }
  };

  const buildLimitedPageView = ({ href = '', referrer = '' } = {}) => {
    try {
      const current = new URL(href);
      const clean = new URL(current.origin + current.pathname);
      LIMITED_UTM_KEYS.forEach((key) => {
        const values = current.searchParams.getAll(key);
        if (values.length !== 1) return;
        const value = values[0].trim().slice(0, MAX_UTM_VALUE_LENGTH);
        if (!value || resemblesPersonalData(value)) return;
        clean.searchParams.set(key, value);
      });
      return {
        page_location: clean.href,
        page_referrer: referrerOrigin(referrer),
      };
    } catch {
      return {};
    }
  };

  const hasGlobalPrivacySignal = (windowLike) => (
    windowLike?.navigator?.globalPrivacyControl === true
    || windowLike?.navigator?.doNotTrack === '1'
    || windowLike?.doNotTrack === '1'
  );

  const setGoogleCollectionEnabled = (enabled) => {
    if (!browserWindow) return;
    browserWindow[GOOGLE_COLLECTION_DISABLE_KEY] = !enabled;
  };

  if (!browserWindow?.document) {
    return {
      buildPageContext,
      buildCtaEvent,
      buildSelectContentEvent,
      buildLimitedPageView,
      hasGlobalPrivacySignal,
      isTrackableHostname,
    };
  }

  const { document } = browserWindow;
  setGoogleCollectionEnabled(false);
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
  browserWindow.gtag('set', 'ads_data_redaction', true);

  let googleTagLoaded = false;
  let fullAnalyticsEnabled = false;
  let pageViewSent = false;
  let consentSettingsTrigger = null;
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

  const currentConsentMode = () => (
    document.body?.dataset.analyticsConsentMode === 'advanced'
    && browserWindow.location.pathname !== '/apply/'
      ? 'advanced'
      : 'basic'
  );

  const canTrack = () => (
    fullAnalyticsEnabled
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

  const loadGoogleTag = () => {
    if (googleTagLoaded) return;
    googleTagLoaded = true;

    browserWindow.gtag('js', new Date());
    browserWindow.gtag(
      'config',
      ANALYTICS_CONFIG.googleMeasurementId,
      {
        ...currentPageContext(),
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      },
    );

    if (document.getElementById('google-analytics-script')) return;
    const script = document.createElement('script');
    script.id = 'google-analytics-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ANALYTICS_CONFIG.googleMeasurementId)}`;
    document.head.appendChild(script);
  };

  const sendPageView = (params = {}) => {
    if (pageViewSent) return;
    pageViewSent = true;
    browserWindow.gtag('event', 'page_view', {
      ...currentPageContext(),
      ...params,
    });
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

  const trackMetaStandard = (name, params = {}) => {
    if (!canTrack() || typeof browserWindow.fbq !== 'function') return;
    browserWindow.fbq('track', name, params);
  };

  const trackLead = () => {
    trackMetaStandard('Lead', { content_category: 'application' });
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
      const base = browserWindow.location.href;
      const actualUrl = new URL(element.href, base);
      const expectedUrl = new URL(expected, base);
      // 사이트 안 목적지는 경로로 대조한다. 상세페이지가 ?event=로 회차를
      // 프리필하므로 쿼리까지 맞추라고 하면 그 링크들이 전부 어긋난다.
      if (expected.startsWith('/')) {
        return actualUrl.origin === expectedUrl.origin
          && actualUrl.pathname === expectedUrl.pathname;
      }
      return actualUrl.href === expectedUrl.href;
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
      const sendMeta = META_STANDARD_EVENTS.has(event.meta.name)
        ? trackMetaStandard
        : trackMetaCustom;
      sendMeta(event.meta.name, event.meta.params);
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
    }, { threshold: 0 });

    sections.forEach((section) => observer.observe(section));
  };

  const loadAnalytics = () => {
    if (
      fullAnalyticsEnabled
      || !isTrackableHostname(browserWindow.location.hostname)
    ) {
      return;
    }
    updateGoogleConsent('granted');
    setGoogleCollectionEnabled(true);
    fullAnalyticsEnabled = true;
    loadGoogleTag();
    sendPageView();
    loadMetaPixel();
    startSectionAnalytics();
  };

  const loadLimitedAnalytics = () => {
    if (
      currentConsentMode() !== 'advanced'
      || !isTrackableHostname(browserWindow.location.hostname)
      || hasGlobalPrivacySignal(browserWindow)
    ) {
      return;
    }
    const limited = buildLimitedPageView({
      href: browserWindow.location.href,
      referrer: document.referrer,
    });
    if (!limited.page_location) return;
    setGoogleCollectionEnabled(true);
    loadGoogleTag();
    sendPageView(limited);
  };

  const clearAnalyticsCookies = () => {
    const names = document.cookie
      .split(';')
      .map((part) => part.trim().split('=')[0])
      .filter((name) => (
        name === '_ga'
        || name.startsWith('_ga_')
        || name === '_fbp'
        || name === '_fbc'
      ));
    const domains = ['', `; Domain=${browserWindow.location.hostname}`, '; Domain=.hanbuddy.kr'];
    names.forEach((name) => {
      domains.forEach((domain) => {
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${domain}`;
      });
    });
  };

  const revokeAnalytics = () => {
    updateGoogleConsent('denied');
    if (typeof browserWindow.fbq === 'function') {
      browserWindow.fbq('consent', 'revoke');
    }
    fullAnalyticsEnabled = false;
    setGoogleCollectionEnabled(false);
    clearAnalyticsCookies();
  };

  const hideConsentBanner = () => {
    const banner = document.querySelector('[data-consent-banner]');
    if (!banner) return;
    banner.classList.add('hidden');
    banner.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('[data-consent-settings]').forEach((button) => {
      button.setAttribute('aria-expanded', 'false');
    });
    const trigger = consentSettingsTrigger;
    consentSettingsTrigger = null;
    trigger?.focus();
  };

  const showConsentBanner = (moveFocus = false, trigger = null) => {
    const banner = document.querySelector('[data-consent-banner]');
    if (!banner) return;
    consentSettingsTrigger = trigger;
    document.querySelectorAll('[data-consent-settings]').forEach((button) => {
      button.setAttribute('aria-expanded', button === trigger ? 'true' : 'false');
    });
    banner.classList.remove('hidden');
    banner.setAttribute('aria-hidden', 'false');
    if (moveFocus) {
      banner.querySelector('[data-consent-action="accept"]')?.focus();
    }
  };

  // 페이지를 보기도 전에 배너가 뜨면 방문자는 내용을 읽지 않고 치우려 한다.
  // 잠깐 둘러본 뒤에 물어보면 같은 문구라도 답을 더 받는다. 표시 전에는
  // 어떤 추적도 시작하지 않으므로 지연 자체는 동의 요건과 무관하다.
  const CONSENT_BANNER_DELAY_MS = 4000;
  const CONSENT_BANNER_SCROLL_PX = 120;

  const deferConsentBanner = () => {
    const canDelay = typeof browserWindow.setTimeout === 'function';
    const canWatchScroll = typeof browserWindow.addEventListener === 'function';
    if (!canDelay && !canWatchScroll) {
      showConsentBanner();
      return;
    }

    let settled = false;
    let timer = null;
    const onScroll = () => {
      if ((browserWindow.scrollY || 0) >= CONSENT_BANNER_SCROLL_PX) reveal();
    };
    const reveal = () => {
      if (settled) return;
      settled = true;
      if (timer !== null) browserWindow.clearTimeout?.(timer);
      browserWindow.removeEventListener?.('scroll', onScroll);
      showConsentBanner();
    };

    if (canWatchScroll) browserWindow.addEventListener('scroll', onScroll, { passive: true });
    if (canDelay) timer = browserWindow.setTimeout(reveal, CONSENT_BANNER_DELAY_MS);
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
      button.addEventListener('click', () => showConsentBanner(true, button));
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && consentSettingsTrigger) {
        hideConsentBanner();
      }
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
    else {
      loadLimitedAnalytics();
      if (consent === null) deferConsentBanner();
    }
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
    buildLimitedPageView,
    hasGlobalPrivacySignal,
    isTrackableHostname,
    trackLead,
    trackLanguageSwitch,
    // 신청 폼이 자기 깔때기 이벤트를 직접 보낸다. 동의 게이트는 trackGa 안에 있다.
    trackEvent: trackGa,
  };
});
