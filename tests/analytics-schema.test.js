const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');

const modulePath = join(__dirname, '..', 'assets', 'analytics.js');
const moduleExists = existsSync(modulePath);
const analytics = moduleExists ? require(modulePath) : {};
const analyticsSource = moduleExists ? readFileSync(modulePath, 'utf8') : '';

const createBrowserHarness = ({ withSection = false } = {}) => {
  const consentHandlers = {};
  const documentHandlers = {};
  const settingsHandlers = [];
  const storedValues = new Map();
  let activeElement = null;
  let intersectionCallback = null;
  let intersectionOptions = null;
  let observedSection = null;
  let sectionUnobserved = false;
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
    body: { dataset: { analyticsPageType: 'home' } },
    documentElement: { lang: 'en' },
    head: {
      appendChild() {},
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
      return [{ parentNode: { insertBefore() {} } }];
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
  const browserWindow = {
    document,
    location: {
      hostname: 'www.hanbuddy.kr',
      href: 'https://www.hanbuddy.kr/',
    },
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

  runInNewContext(analyticsSource, { window: browserWindow });

  return {
    browserWindow,
    banner,
    settingsButton,
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

test('maps the Google Form application CTA to its own GA event and the existing Meta high-intent event', { skip: !moduleExists }, () => {
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
          destination: 'google_form',
          placement: 'top',
        },
      },
      meta: {
        name: 'ApplicationFormOpen',
        params: {
          page_type: 'home',
          content_language: 'en',
          destination: 'google_form',
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
        name: 'ContactClick',
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
        name: 'ContactClick',
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
    href: 'https://forms.gle/B1fWgX3MjtHUHGNt5',
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
  assert.equal(applicationEvents[0][2].destination, 'google_form');
  assert.equal(applicationEvents[0][2].placement, 'test');
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
