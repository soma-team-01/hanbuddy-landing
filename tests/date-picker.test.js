const assert = require('node:assert/strict');
const test = require('node:test');

const datePickerModule = require('../assets/date-picker.js');
const measurement = require('../assets/application-measurement.js');

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.dataset = {};
    this.attributes = new Map();
    this.handlers = new Map();
    this.disabled = false;
    this.hidden = false;
    this.value = '';
  }

  append(...children) {
    this.children.push(...children);
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  addEventListener(type, handler) {
    this.handlers.set(type, handler);
  }

  dispatch(type, event = {}) {
    const interaction = {
      target: this,
      isTrusted: false,
      key: undefined,
      preventDefault() {},
      ...event,
    };
    this.handlers.get(type)?.(interaction);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'tabindex') this.tabIndex = Number(value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  closest(selector) {
    if (selector === 'button[data-day]' && this.tagName === 'BUTTON' && this.dataset.day) return this;
    return null;
  }

  querySelector(selector) {
    if (selector === '[tabindex="0"]') {
      return this.walk().find((element) => element.tabIndex === 0) || null;
    }
    return null;
  }

  walk() {
    return [this, ...this.children.flatMap((child) => child.walk?.() || [])];
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }
}

const labels = {
  en: {
    gridLabel: 'Dates',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    weekdays: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    noDates: 'No dates',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    monthTitle: (month, year) => `${month} ${year}`,
    unavailable: (day) => `Unavailable ${day}`,
    selected: (label) => `Selected ${label}`,
    pickPrompt: 'Pick a date',
  },
};

const slots = [
  { iso: '2026-09-05T16:00', label: { en: 'Sep 5' } },
  { iso: '2026-09-06T13:00', label: { en: 'Sep 6' } },
];

const setup = () => {
  const previousDocument = global.document;
  const document = {
    activeElement: null,
    createElement: (tagName) => new FakeElement(tagName, document),
  };
  global.document = document;
  const mount = new FakeElement('div', document);
  const input = new FakeElement('input', document);
  const picker = datePickerModule.create({ mount, input, labels });
  picker.setDates(slots, 'en');
  const grid = picker.element.walk().find((element) => element.getAttribute('role') === 'group');
  const day = (ymd) => grid.walk().find((element) => element.dataset.day === ymd);
  return {
    picker,
    grid,
    day,
    restore() { global.document = previousDocument; },
  };
};

const runSelection = ({ type, isTrusted }) => {
  const harness = setup();
  const tracked = [];
  const funnel = measurement.createApplicationFunnel({
    trackEvent: (name) => tracked.push(name),
  });
  harness.picker.onChange((_iso, selectionIsTrusted) => {
    funnel.start({ isTrusted: selectionIsTrusted });
  });
  if (type === 'click') {
    harness.grid.dispatch('click', { target: harness.day('2026-09-05'), isTrusted });
  } else {
    harness.grid.dispatch('keydown', { key: 'ArrowRight', isTrusted });
  }
  harness.restore();
  return tracked;
};

test('a trusted date click starts the application funnel', () => {
  assert.deepEqual(runSelection({ type: 'click', isTrusted: true }), ['application_start']);
});

test('a trusted date keyboard selection starts the application funnel', () => {
  assert.deepEqual(runSelection({ type: 'keyboard', isTrusted: true }), ['application_start']);
});

test('synthetic click and keyboard date selections do not start the application funnel', () => {
  assert.deepEqual(runSelection({ type: 'click', isTrusted: false }), []);
  assert.deepEqual(runSelection({ type: 'keyboard', isTrusted: false }), []);
});

test('programmatic date setup stays silent', () => {
  const harness = setup();
  const changes = [];
  harness.picker.onChange((...args) => changes.push(args));
  harness.picker.setDates(slots, 'en');
  harness.restore();
  assert.deepEqual(changes, []);
});
