const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const modulePath = join(__dirname, '..', 'assets', 'analytics.js');
const moduleExists = existsSync(modulePath);
const analytics = moduleExists ? require(modulePath) : {};

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

test('maps an application CTA to one GA event and the existing Meta high-intent event', { skip: !moduleExists }, () => {
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
        name: 'cta_click',
        params: {
          page_type: 'home',
          content_language: 'en',
          cta_type: 'apply',
          destination: 'google_form',
          placement: 'top',
        },
      },
      meta: {
        name: 'ApplicationFormOpen',
        params: {
          page_type: 'home',
          content_language: 'en',
          cta_type: 'apply',
          destination: 'google_form',
          placement: 'top',
        },
      },
    },
  );
});

test('keeps navigation, contact, community, and profile destinations semantically distinct', { skip: !moduleExists }, () => {
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
        name: 'cta_click',
        params: {
          page_type: 'about',
          content_language: 'ko',
          cta_type: 'contact',
          destination: 'instagram',
          placement: 'footer',
        },
      },
      meta: {
        name: 'ContactClick',
        params: {
          page_type: 'about',
          content_language: 'ko',
          cta_type: 'contact',
          destination: 'instagram',
          placement: 'footer',
        },
      },
    },
  );

  assert.equal(
    analytics.buildCtaEvent({
      ctaKey: 'meetup',
      placement: 'footer',
      pageContext,
    }).meta,
    null,
  );

  assert.deepEqual(
    analytics.buildCtaEvent({
      ctaKey: 'apply_section',
      placement: 'nav',
      pageContext,
    }).ga.params,
    {
      page_type: 'about',
      content_language: 'ko',
      cta_type: 'navigation',
      destination: 'apply_section',
      placement: 'nav',
    },
  );

  assert.deepEqual(
    analytics.buildCtaEvent({
      ctaKey: 'linkedin_minhyung',
      placement: 'team',
      pageContext,
    }).ga.params,
    {
      page_type: 'about',
      content_language: 'ko',
      cta_type: 'profile',
      destination: 'linkedin',
      placement: 'team',
      profile_id: 'minhyung',
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

test('blocks local preview hosts while allowing deploy hosts', { skip: !moduleExists }, () => {
  for (const hostname of ['localhost', '127.0.0.1', '::1']) {
    assert.equal(analytics.isTrackableHostname(hostname), false);
  }
  assert.equal(analytics.isTrackableHostname('landing.hanbuddy.kr'), true);
  assert.equal(analytics.isTrackableHostname('hanbuddy-preview.vercel.app'), true);
});
