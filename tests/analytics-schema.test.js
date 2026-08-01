const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const { runInNewContext } = require('node:vm');

const modulePath = join(__dirname, '..', 'assets', 'analytics.js');
const moduleExists = existsSync(modulePath);
const analytics = moduleExists ? require(modulePath) : {};
const analyticsSource = moduleExists ? readFileSync(modulePath, 'utf8') : '';

const createBrowserHarness = () => {
  const consentHandlers = {};
  const storedValues = new Map();
  const consentButtons = ['accept', 'reject'].map((action) => ({
    dataset: { consentAction: action },
    addEventListener(type, handler) {
      if (type === 'click') consentHandlers[action] = handler;
    },
  }));
  const banner = {
    classList: {
      add() {},
      remove() {},
    },
    querySelector() {
      return null;
    },
    setAttribute() {},
  };
  const document = {
    readyState: 'complete',
    body: { dataset: { analyticsPageType: 'home' } },
    documentElement: { lang: 'en' },
    head: {
      appendChild() {},
    },
    addEventListener() {},
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
      return selector === '[data-consent-action]' ? consentButtons : [];
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
  };

  runInNewContext(analyticsSource, { window: browserWindow });

  return {
    browserWindow,
    chooseConsent(action) {
      consentHandlers[action]();
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
