const assert = require('node:assert/strict');
const test = require('node:test');

const { MAX_LENGTH, validateSuggestion } = require('../assets/suggest-validation.js');

const suggestion = () => ({
  activity: 'Noraebang night',
  dates: 'Any weekend evening',
  contact: '@hanbuddy_fan',
  website: '',
  language: 'en',
});

test('a complete suggestion passes and comes back trimmed', () => {
  const result = validateSuggestion({
    ...suggestion(),
    activity: '  Noraebang night  ',
    dates: ' Any weekend evening ',
    contact: '  @hanbuddy_fan ',
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    activity: 'Noraebang night',
    dates: 'Any weekend evening',
    contact: '@hanbuddy_fan',
    language: 'en',
  });
});

test('contact is optional but activity and dates are not', () => {
  assert.equal(validateSuggestion({ ...suggestion(), contact: '' }).ok, true);
  for (const field of ['activity', 'dates']) {
    for (const value of ['', '   ', undefined]) {
      const result = validateSuggestion({ ...suggestion(), [field]: value });
      assert.deepEqual(result, { ok: false, field });
    }
  }
});

test('over-length values are rejected with the right field', () => {
  for (const field of ['activity', 'dates', 'contact']) {
    const over = 'x'.repeat(MAX_LENGTH[field] + 1);
    assert.deepEqual(validateSuggestion({ ...suggestion(), [field]: over }), { ok: false, field });
    const exact = 'x'.repeat(MAX_LENGTH[field]);
    assert.equal(validateSuggestion({ ...suggestion(), [field]: exact }).ok, true);
  }
});

test('a filled honeypot fails as website so the caller can fake success', () => {
  const result = validateSuggestion({ ...suggestion(), website: 'https://spam.example' });
  assert.deepEqual(result, { ok: false, field: 'website' });
});

test('language falls back to en for anything that is not ko', () => {
  assert.equal(validateSuggestion({ ...suggestion(), language: 'ko' }).value.language, 'ko');
  for (const value of ['fr', '', undefined, 'KO']) {
    assert.equal(validateSuggestion({ ...suggestion(), language: value }).value.language, 'en');
  }
});

test('non-string values fail instead of crashing', () => {
  for (const value of [null, 42, {}, []]) {
    const result = validateSuggestion({ ...suggestion(), activity: value });
    assert.deepEqual(result, { ok: false, field: 'activity' });
  }
});
