const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');

const modulePath = join(__dirname, '..', 'assets', 'analytics.js');
const moduleExists = existsSync(modulePath);
const analytics = moduleExists ? require(modulePath) : {};
const analyticsSource = moduleExists ? readFileSync(modulePath, 'utf8') : '';

const createBrowserHarness = ({
  withSection = false,
  consentMode = 'basic',
  pageType = 'home',
  href = 'https://www.hanbuddy.kr/',
  referrer = '',
  storedConsent = null,
  globalPrivacyControl = false,
  doNotTrack = null,
  cookies = '',
} = {}) => {
  const consentHandlers = {};
  const documentHandlers = {};
  const settingsHandlers = [];
  const storedValues = new Map();
  let activeElement = null;
  let intersectionCallback = null;
  let intersectionOptions = null;
  let observedSection = null;
  let sectionUnobserved = false;
  const appendedScripts = [];
  const insertedScripts = [];
  const cookieAssignments = [];
  const focusElement = (element) => {
    activeElement = element;
  };
  const consentButtons = ['accept', 'reject'].map((action) => {
    const button = {
      dataset: { consentAction: action },
      addEventListener(type, handler) {
        if (type === 'click') consentHandlers[action] = handler;
      },
      focus() {
        focusElement(button);
      },
    };
    return button;
  });
  const settingsAttributes = new Map([['aria-expanded', 'false']]);
  const settingsButton = {
    addEventListener(type, handler) {
      if (type === 'click') settingsHandlers.push(handler);
    },
    focus() {
      focusElement(settingsButton);
    },
    getAttribute(name) {
      return settingsAttributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      settingsAttributes.set(name, value);
    },
  };
  const bannerClasses = new Set(['hidden']);
  const bannerAttributes = new Map([['aria-hidden', 'true']]);
  const banner = {
    classList: {
      add(name) {
        bannerClasses.add(name);
      },
      contains(name) {
        return bannerClasses.has(name);
      },
      remove(name) {
        bannerClasses.delete(name);
      },
    },
    querySelector(selector) {
      return selector === '[data-consent-action="accept"]' ? consentButtons[0] : null;
    },
    getAttribute(name) {
      return bannerAttributes.get(name) ?? null;
    },
    setAttribute(name, value) {
      bannerAttributes.set(name, value);
    },
  };
  const section = { id: 'events' };
  const document = {
    get activeElement() {
      return activeElement;
    },
    readyState: 'complete',
    body: { dataset: { analyticsPageType: pageType, analyticsConsentMode: consentMode } },
    documentElement: { lang: 'en' },
    referrer,
    head: {
      appendChild(script) {
        appendedScripts.push(script);
      },
    },
    addEventListener(type, handler) {
      documentHandlers[type] = documentHandlers[type] || [];
      documentHandlers[type].push(handler);
    },
    createElement() {
      return {};
    },
    getElementById() {
      return null;
    },
    getElementsByTagName() {
      return [{ parentNode: { insertBefore(script) { insertedScripts.push(script); } } }];
    },
    querySelector(selector) {
      return selector === '[data-consent-banner]' ? banner : null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-consent-action]') return consentButtons;
      if (selector === '[data-consent-settings]') return [settingsButton];
      if (selector === '[data-analytics-section]') return withSection ? [section] : [];
      return [];
    },
  };
  Object.defineProperty(document, 'cookie', {
    get() {
      return cookies;
    },
    set(value) {
      cookieAssignments.push(value);
    },
  });
  if (storedConsent) storedValues.set('hanbuddy.analyticsConsent', storedConsent);
  const parsedLocation = (() => {
    try {
      return new URL(href);
    } catch {
      return null;
    }
  })();
  const browserWindow = {
    document,
    location: {
      hostname: parsedLocation?.hostname ?? '',
      href,
      pathname: parsedLocation?.pathname ?? '/',
    },
    navigator: { globalPrivacyControl, doNotTrack },
    doNotTrack,
    localStorage: {
      getItem(key) {
        return storedValues.get(key) ?? null;
      },
      setItem(key, value) {
        storedValues.set(key, value);
      },
    },
    IntersectionObserver: class IntersectionObserver {
      constructor(callback, options) {
        intersectionCallback = callback;
        intersectionOptions = options;
      }

      observe(target) {
        observedSection = target;
      }

      unobserve(target) {
        if (target === observedSection) sectionUnobserved = true;
      }
    },
  };

  // vm 컨텍스트에는 URL 전역이 없다. 넣지 않으면 목적지 대조가 통째로
  // catch로 빠져 Meta 전환이 한 번도 발화하지 않는데, GA는 그대로라 조용하다.
  runInNewContext(analyticsSource, { window: browserWindow, URL });

  return {
    browserWindow,
    banner,
    settingsButton,
    appendedScripts,
    insertedScripts,
    cookieAssignments,
    chooseConsent(action) {
      consentHandlers[action]();
    },
    clickSettings() {
      settingsHandlers.forEach((handler) => handler());
    },
    clickDocument(target) {
      (documentHandlers.click || []).forEach((handler) => handler({ target }));
    },
    pressKey(key) {
      (documentHandlers.keydown || []).forEach((handler) => handler({ key }));
    },
    revealSection(intersectionRatio) {
      if (!intersectionCallback || sectionUnobserved) return;
      const configuredThresholds = Array.isArray(intersectionOptions?.threshold)
        ? intersectionOptions.threshold
        : [intersectionOptions?.threshold ?? 0];
      if (!configuredThresholds.some((threshold) => intersectionRatio >= threshold)) return;
      intersectionCallback([{
        isIntersecting: intersectionRatio > 0,
        intersectionRatio,
        target: observedSection,
      }]);
    },
  };
};

test('ships one shared analytics module', () => {
  assert.ok(moduleExists, 'assets/analytics.js must exist');
});

test('builds a stable page context without empty optional values', { skip: !moduleExists }, () => {
  assert.deepEqual(
    analytics.buildPageContext({
      pageType: 'event_detail',
      contentLanguage: 'en',
      experienceType: 'kbo',
    }),
    {
      page_type: 'event_detail',
      content_language: 'en',
      experience_type: 'kbo',
    },
  );
  assert.deepEqual(
    analytics.buildPageContext({
      pageType: 'home',
      contentLanguage: 'ko',
      experienceType: '',
    }),
    {
      page_type: 'home',
      content_language: 'ko',
    },
  );
});

test('maps the application CTA to its own GA event and the existing Meta high-intent event', { skip: !moduleExists }, () => {
  const pageContext = {
    page_type: 'home',
    content_language: 'en',
  };

  assert.deepEqual(
    analytics.buildCtaEvent({
      ctaKey: 'apply',
      placement: 'top',
      pageContext,
    }),
    {
      ga: {
        name: 'application_form_open',
        params: {
          page_type: 'home',
          content_language: 'en',
          destination: 'application_page',
          placement: 'top',
        },
      },
      meta: {
        name: 'ApplicationFormOpen',
        params: {
          page_type: 'home',
          content_language: 'en',
          destination: 'application_page',
          placement: 'top',
        },
      },
    },
  );
});

test('uses separate GA events for contact, community, profile, and navigation actions', { skip: !moduleExists }, () => {
  const pageContext = {
    page_type: 'about',
    content_language: 'ko',
  };

  assert.deepEqual(
    analytics.buildCtaEvent({
      ctaKey: 'instagram',
      placement: 'footer',
      pageContext,
    }),
    {
      ga: {
        name: 'contact_click',
        params: {
          page_type: 'about',
          content_language: 'ko',
          destination: 'instagram',
          placement: 'footer',
        },
      },
      meta: {
        name: 'Contact',
        params: {
          page_type: 'about',
          content_language: 'ko',
          destination: 'instagram',
          placement: 'footer',
        },
      },
    },
  );

  assert.deepEqual(
    analytics.buildCtaEvent({
      ctaKey: 'contact',
      placement: 'apply',
      pageContext,
    }),
    {
      ga: {
        name: 'contact_click',
        params: {
          page_type: 'about',
          content_language: 'ko',
          destination: 'kakaotalk',
          placement: 'apply',
        },
      },
      meta: {
        name: 'Contact',
        params: {
          page_type: 'about',
          content_language: 'ko',
          destination: 'kakaotalk',
          placement: 'apply',
        },
      },
    },
  );

  assert.deepEqual(
    analytics.buildCtaEvent({
      ctaKey: 'meetup',
      placement: 'footer',
      pageContext,
    }),
    {
      ga: {
        name: 'community_click',
        params: {
          page_type: 'about',
          content_language: 'ko',
          destination: 'meetup',
          placement: 'footer',
        },
      },
      meta: null,
    },
  );

  assert.deepEqual(
    analytics.buildCtaEvent({
      ctaKey: 'apply_section',
      placement: 'nav',
      pageContext,
    }).ga,
    {
      name: 'navigation_click',
      params: {
        page_type: 'about',
        content_language: 'ko',
        destination: 'apply_section',
        placement: 'nav',
      },
    },
  );

  assert.deepEqual(
    analytics.buildCtaEvent({
      ctaKey: 'linkedin_minhyung',
      placement: 'team',
      pageContext,
    }).ga,
    {
      name: 'profile_click',
      params: {
        page_type: 'about',
        content_language: 'ko',
        destination: 'linkedin',
        placement: 'team',
        profile_id: 'minhyung',
      },
    },
  );
});

test('maps an event-card click to the GA recommended content-selection schema', { skip: !moduleExists }, () => {
  assert.deepEqual(
    analytics.buildSelectContentEvent({
      contentId: 'kbo-0805',
      availabilityStatus: 'open',
      pageContext: {
        page_type: 'home',
        content_language: 'en',
      },
    }),
    {
      name: 'select_content',
      params: {
        page_type: 'home',
        content_language: 'en',
        content_type: 'experience',
        item_id: 'kbo-0805',
        availability_status: 'open',
      },
    },
  );
});

test('allows analytics only after redirects reach the canonical hostname', { skip: !moduleExists }, () => {
  for (const hostname of [
    'localhost',
    '127.0.0.1',
    '::1',
    'hanbuddy.kr',
    'landing.hanbuddy.kr',
    'hanbuddy-preview.vercel.app',
  ]) {
    assert.equal(analytics.isTrackableHostname(hostname), false);
  }
  assert.equal(analytics.isTrackableHostname('www.hanbuddy.kr'), true);
});

test('builds a limited page view from the path and allowlisted UTM values', { skip: !moduleExists }, () => {
  assert.deepEqual(
    analytics.buildLimitedPageView({
      href: 'https://www.hanbuddy.kr/events/kbo-gocheok/?utm_source=instagram&utm_campaign=summer%20night&event=kbo-gocheok#tickets',
      referrer: 'https://www.instagram.com/hanbuddy_kr/?secret=1',
    }),
    {
      page_location: 'https://www.hanbuddy.kr/events/kbo-gocheok/?utm_source=instagram&utm_campaign=summer+night',
      page_referrer: 'https://www.instagram.com',
    },
  );
});

test('drops duplicate, personal, and overlong UTM data from limited page views', { skip: !moduleExists }, () => {
  const longCampaign = 'x'.repeat(120);
  const result = analytics.buildLimitedPageView({
    href: `https://www.hanbuddy.kr/?utm_source=first&utm_source=second&utm_medium=julie%40example.com&utm_campaign=${longCampaign}&utm_id=%2B82%2010-1234-5678&utm_content=night&utm_term=baseball&private=yes#form`,
    referrer: 'mailto:hello@example.com',
  });

  assert.deepEqual(result, {
    page_location: `https://www.hanbuddy.kr/?utm_campaign=${'x'.repeat(100)}&utm_content=night&utm_term=baseball`,
    page_referrer: '',
  });
});

test('invalid page URLs fail closed without blocking analytics initialization', { skip: !moduleExists }, () => {
  assert.deepEqual(
    analytics.buildLimitedPageView({ href: 'not a URL', referrer: 'https://example.com/path?q=1' }),
    {},
  );
});

test('drops personal data even when a UTM value wraps it in campaign text', { skip: !moduleExists }, () => {
  assert.deepEqual(
    analytics.buildLimitedPageView({
      href: 'https://www.hanbuddy.kr/?utm_campaign=reach%20julie%40example.com%20now&utm_content=call%20%2B82%2010-1234-5678&utm_source=instagram',
    }),
    {
      page_location: 'https://www.hanbuddy.kr/?utm_source=instagram',
      page_referrer: '',
    },
  );
});

test('advanced mode sends one sanitized cookieless page view before consent', { skip: !moduleExists }, () => {
  const harness = createBrowserHarness({
    consentMode: 'advanced',
    href: 'https://www.hanbuddy.kr/?utm_source=instagram&email=julie%40example.com#apply',
    referrer: 'https://www.instagram.com/hanbuddy_kr/?secret=1',
  });
  const calls = harness.browserWindow.dataLayer.map((entry) => Array.from(entry));
  const defaultIndex = calls.findIndex(([command, action]) => command === 'consent' && action === 'default');
  const configIndex = calls.findIndex(([command]) => command === 'config');
  const config = calls[configIndex]?.[2];
  const pageViews = calls.filter(([command, name]) => command === 'event' && name === 'page_view');

  assert.ok(defaultIndex >= 0 && defaultIndex < configIndex, 'denied defaults must precede measurement');
  assert.deepEqual({ ...calls[defaultIndex][2] }, {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });
  assert.ok(calls.some(([command, value, enabled]) => (
    command === 'set' && value === 'ads_data_redaction' && enabled === true
  )));
  assert.equal(config.send_page_view, false);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(
    calls.some(([command, name]) => command === 'set' && name === 'url_passthrough'),
    false,
  );
  assert.equal(harness.appendedScripts.length, 1);
  assert.match(harness.appendedScripts[0].src, /googletagmanager\.com\/gtag\/js/);
  assert.equal(harness.insertedScripts.length, 0, 'Meta stays unloaded before consent');
  assert.equal(pageViews.length, 1);
  assert.equal(pageViews[0][2].page_location, 'https://www.hanbuddy.kr/?utm_source=instagram');
  assert.equal(pageViews[0][2].page_referrer, 'https://www.instagram.com');

  harness.browserWindow.HanBuddyAnalytics.trackEvent('application_start', { source: 'test' });
  harness.chooseConsent('reject');
  const eventsAfterReject = harness.browserWindow.dataLayer
    .map((entry) => Array.from(entry))
    .filter(([command]) => command === 'event');
  assert.equal(eventsAfterReject.filter(([, name]) => name === 'page_view').length, 1);
  assert.equal(eventsAfterReject.filter(([, name]) => name === 'application_start').length, 0);
});

test('stored denial still sends one sanitized cookieless marketing page view', { skip: !moduleExists }, () => {
  const harness = createBrowserHarness({
    consentMode: 'advanced',
    storedConsent: 'denied',
    href: 'https://www.hanbuddy.kr/events/kleague/?utm_source=instagram&secret=drop-me',
  });
  const calls = harness.browserWindow.dataLayer.map((entry) => Array.from(entry));
  const pageViews = calls.filter(([command, name]) => command === 'event' && name === 'page_view');

  assert.equal(harness.appendedScripts.length, 1, 'advanced mode keeps Google cookieless measurement');
  assert.equal(harness.insertedScripts.length, 0, 'Meta stays blocked after denial');
  assert.equal(pageViews.length, 1);
  assert.equal(
    pageViews[0][2].page_location,
    'https://www.hanbuddy.kr/events/kleague/?utm_source=instagram',
  );
});

test('basic application mode is silent before consent and sends one page view after grant', { skip: !moduleExists }, () => {
  const harness = createBrowserHarness({
    consentMode: 'basic',
    pageType: 'application',
    href: 'https://www.hanbuddy.kr/apply/?event=kbo-gocheok&utm_source=instagram',
  });

  assert.equal(harness.appendedScripts.length, 0);
  assert.equal(harness.insertedScripts.length, 0);
  assert.equal(
    harness.browserWindow.dataLayer
      .map((entry) => Array.from(entry))
      .filter(([command]) => command === 'event').length,
    0,
  );

  harness.chooseConsent('accept');
  const calls = harness.browserWindow.dataLayer.map((entry) => Array.from(entry));
  const pageViews = calls.filter(([command, name]) => command === 'event' && name === 'page_view');
  const grant = calls.find(([command, action, values]) => (
    command === 'consent' && action === 'update' && values.analytics_storage === 'granted'
  ));
  assert.ok(grant, 'consent update with granted analytics_storage must be sent');
  assert.deepEqual({ ...grant[2] }, {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  });
  assert.equal(pageViews.length, 1);
  assert.equal(harness.appendedScripts.length, 1);
  assert.equal(harness.insertedScripts.length, 1);
  assert.match(harness.insertedScripts[0].src, /connect\.facebook\.net\/en_US\/fbevents\.js/);
});

test('application leads use the Meta standard Lead event only while consent is granted', { skip: !moduleExists }, () => {
  const harness = createBrowserHarness({
    consentMode: 'basic',
    pageType: 'application',
    href: 'https://www.hanbuddy.kr/apply/?event=kbo-gocheok',
  });
  const metaCalls = [];
  harness.browserWindow.fbq = (...args) => metaCalls.push(args);

  assert.equal(typeof harness.browserWindow.HanBuddyAnalytics.trackLead, 'function');
  harness.browserWindow.HanBuddyAnalytics.trackLead();
  assert.equal(metaCalls.length, 0, 'Lead must stay blocked before consent');

  harness.chooseConsent('accept');
  harness.browserWindow.HanBuddyAnalytics.trackLead();
  const leads = metaCalls.filter(([command, name]) => command === 'track' && name === 'Lead');
  assert.equal(leads.length, 1);
  assert.deepEqual({ ...leads[0][2] }, { content_category: 'application' });
  assert.equal(
    metaCalls.some(([command, name]) => command === 'trackCustom' && name === 'Lead'),
    false,
  );

  harness.chooseConsent('reject');
  harness.browserWindow.HanBuddyAnalytics.trackLead();
  assert.equal(
    metaCalls.filter(([command, name]) => command === 'track' && name === 'Lead').length,
    1,
    'Lead must stay blocked after consent is revoked',
  );
});

test('granting advanced consent enables behavior without duplicating its page view', { skip: !moduleExists }, () => {
  const harness = createBrowserHarness({ consentMode: 'advanced' });

  harness.chooseConsent('accept');
  harness.browserWindow.HanBuddyAnalytics.trackEvent('language_switch', { content_language: 'ko' });

  const events = harness.browserWindow.dataLayer
    .map((entry) => Array.from(entry))
    .filter(([command]) => command === 'event');
  assert.equal(events.filter(([, name]) => name === 'page_view').length, 1);
  assert.equal(events.filter(([, name]) => name === 'language_switch').length, 1);
  assert.equal(harness.insertedScripts.length, 1);
});

test('a stored grant loads analytics on the application page', { skip: !moduleExists }, () => {
  const harness = createBrowserHarness({
    consentMode: 'basic',
    pageType: 'application',
    href: 'https://www.hanbuddy.kr/apply/?event=kbo-gocheok',
    storedConsent: 'granted',
  });
  const pageViews = harness.browserWindow.dataLayer
    .map((entry) => Array.from(entry))
    .filter(([command, name]) => command === 'event' && name === 'page_view');

  assert.equal(harness.appendedScripts.length, 1);
  assert.equal(harness.insertedScripts.length, 1);
  assert.equal(pageViews.length, 1);
});

test('privacy signals and non-production hosts suppress cookieless measurement', { skip: !moduleExists }, () => {
  for (const [label, options] of [
    ['Global Privacy Control', { globalPrivacyControl: true }],
    ['Do Not Track', { doNotTrack: '1' }],
    ['non-production host', { href: 'https://preview.hanbuddy.vercel.app/' }],
  ]) {
    const harness = createBrowserHarness({ consentMode: 'advanced', ...options });
    assert.equal(harness.appendedScripts.length, 0, `Google must stay unloaded for ${label}`);
    assert.equal(
      harness.browserWindow.dataLayer
        .map((entry) => Array.from(entry))
        .filter(([command]) => command === 'event').length,
      0,
      `no events may be sent for ${label}`,
    );
  }
});

test('malformed marketing URLs do not block consent controls', { skip: !moduleExists }, () => {
  const harness = createBrowserHarness({ consentMode: 'advanced', href: 'not a URL' });
  assert.doesNotThrow(() => harness.chooseConsent('reject'));
});

test('revoking consent expires accessible Google and Meta cookies', { skip: !moduleExists }, () => {
  const harness = createBrowserHarness({
    consentMode: 'advanced',
    storedConsent: 'granted',
    cookies: '_ga=one; _ga_MW7MFVL50G=two; _fbp=three; _fbc=four; session=five',
  });

  harness.chooseConsent('reject');
  const clearedNames = new Set(harness.cookieAssignments.map((assignment) => assignment.split('=')[0]));
  assert.deepEqual(clearedNames, new Set(['_ga', '_ga_MW7MFVL50G', '_fbp', '_fbc']));
  assert.ok(harness.cookieAssignments.every((assignment) => /Max-Age=0/.test(assignment)));
});

test('toggles the Google collection opt-out across consent grant and revoke', { skip: !moduleExists }, () => {
  const { browserWindow, chooseConsent } = createBrowserHarness();
  const disableKey = 'ga-disable-G-MW7MFVL50G';

  assert.equal(browserWindow[disableKey], true, 'Google collection starts disabled');

  chooseConsent('accept');
  assert.equal(browserWindow[disableKey], false, 'granting consent enables Google collection');

  chooseConsent('reject');
  assert.equal(browserWindow[disableKey], true, 'revoking consent disables Google collection again');
});

test('routes delegated document clicks through CTA tracking', { skip: !moduleExists }, () => {
  const { browserWindow, chooseConsent, clickDocument } = createBrowserHarness();
  const applicationLink = {
    dataset: {
      analyticsPlacement: 'test',
      cta: 'apply',
    },
    href: 'https://www.hanbuddy.kr/apply/?event=kbo-jamsil',
    closest(selector) {
      return selector === '[data-cta]' ? applicationLink : null;
    },
  };

  chooseConsent('accept');
  clickDocument(applicationLink);

  const applicationEvents = browserWindow.dataLayer
    .map((entry) => Array.from(entry))
    .filter(([command, eventName]) => (
      command === 'event' && eventName === 'application_form_open'
    ));
  assert.equal(applicationEvents.length, 1);
  assert.equal(applicationEvents[0][2].destination, 'application_page');
  assert.equal(applicationEvents[0][2].placement, 'test');
});

test('contact CTAs use the Meta standard Contact event after consent', { skip: !moduleExists }, () => {
  const { browserWindow, chooseConsent, clickDocument } = createBrowserHarness();
  const metaCalls = [];
  browserWindow.fbq = (...args) => metaCalls.push(args);
  const instagramLink = {
    dataset: { analyticsPlacement: 'footer', cta: 'instagram' },
    href: 'https://www.instagram.com/hanbuddy_kr/',
    closest(selector) {
      return selector === '[data-cta]' ? instagramLink : null;
    },
  };

  chooseConsent('accept');
  clickDocument(instagramLink);

  const standardContacts = metaCalls.filter(([command, name]) => (
    command === 'track' && name === 'Contact'
  ));
  assert.equal(standardContacts.length, 1);
  assert.equal(
    metaCalls.some(([command, name]) => command === 'trackCustom' && name === 'Contact'),
    false,
  );
  assert.equal(standardContacts[0][2].destination, 'instagram');
});

test('consent settings expose their expanded state and restore focus after a choice', { skip: !moduleExists }, () => {
  const {
    banner,
    chooseConsent,
    clickSettings,
    browserWindow,
    settingsButton,
  } = createBrowserHarness();

  chooseConsent('reject');
  clickSettings();
  assert.equal(settingsButton.getAttribute('aria-expanded'), 'true');
  assert.equal(banner.getAttribute('aria-hidden'), 'false');

  chooseConsent('reject');
  assert.equal(settingsButton.getAttribute('aria-expanded'), 'false');
  assert.equal(banner.getAttribute('aria-hidden'), 'true');
  assert.equal(browserWindow.document.activeElement, settingsButton);
});

test('Escape dismisses reopened consent settings and restores focus', { skip: !moduleExists }, () => {
  const {
    banner,
    chooseConsent,
    clickSettings,
    pressKey,
    browserWindow,
    settingsButton,
  } = createBrowserHarness();

  chooseConsent('reject');
  clickSettings();
  pressKey('Escape');

  assert.equal(banner.classList.contains('hidden'), true);
  assert.equal(settingsButton.getAttribute('aria-expanded'), 'false');
  assert.equal(browserWindow.document.activeElement, settingsButton);
});

test('records a section view on first visible exposure', { skip: !moduleExists }, () => {
  const { browserWindow, chooseConsent, revealSection } = createBrowserHarness({
    withSection: true,
  });

  chooseConsent('accept');
  revealSection(0.05);
  revealSection(0.5);

  const sectionEvents = browserWindow.dataLayer
    .map((entry) => Array.from(entry))
    .filter(([command, eventName]) => command === 'event' && eventName === 'section_view');
  assert.equal(sectionEvents.length, 1);
  assert.equal(sectionEvents[0][2].section_id, 'events');
});

test('a prefilled apply link still reports the Meta conversion', { skip: !moduleExists }, () => {
  // 목적지 대조가 쿼리까지 맞추라고 하면 /apply/?event=... 링크가 전부 어긋나고
  // ApplicationFormOpen이 조용히 사라진다. GA는 남아 있어 눈치채기 어렵다.
  const { browserWindow, chooseConsent, clickDocument } = createBrowserHarness();
  const metaCalls = [];
  browserWindow.fbq = (...args) => metaCalls.push(args);

  const applicationLink = {
    dataset: { analyticsPlacement: 'desktop_sidebar', cta: 'apply' },
    href: 'https://www.hanbuddy.kr/apply/?event=kbo-gocheok',
    closest(selector) {
      return selector === '[data-cta]' ? applicationLink : null;
    },
  };

  chooseConsent('accept');
  clickDocument(applicationLink);

  const conversions = metaCalls.filter(([command, name]) => (
    command === 'trackCustom' && name === 'ApplicationFormOpen'
  ));
  assert.equal(conversions.length, 1, 'prefilled apply link must still fire ApplicationFormOpen');
  assert.equal(conversions[0][2].destination, 'application_page');
});
