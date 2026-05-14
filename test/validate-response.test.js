const { validateResponse } = require('../src/lib/validate-response');

const VALID = {
  summary: 'A short summary of the release.',
  items: [
    { category: 'New', text: 'Added dark mode toggle.' },
    { category: 'Fix', text: 'Resolved login crash.' },
  ],
};

describe('validateResponse', () => {
  test('returns the response unchanged when valid', () => {
    expect(validateResponse(VALID)).toEqual(VALID);
  });

  test('accepts empty items array (release with only a summary)', () => {
    const r = { summary: 'Maintenance release.', items: [] };
    expect(validateResponse(r)).toEqual(r);
  });

  test('accepts all four valid categories', () => {
    const r = {
      summary: 's',
      items: [
        { category: 'Breaking', text: 'a' },
        { category: 'New', text: 'b' },
        { category: 'Improvement', text: 'c' },
        { category: 'Fix', text: 'd' },
      ],
    };
    expect(validateResponse(r)).toEqual(r);
  });

  test('tolerates extra unknown top-level fields (forward compat)', () => {
    const r = { ...VALID, extra: 'whatever' };
    expect(() => validateResponse(r)).not.toThrow();
  });

  test('throws when input is not an object', () => {
    expect(() => validateResponse(null)).toThrow();
    expect(() => validateResponse(undefined)).toThrow();
    expect(() => validateResponse('a string')).toThrow();
    expect(() => validateResponse([])).toThrow();
  });

  test('throws when summary is missing', () => {
    expect(() => validateResponse({ items: [] })).toThrow(/summary/i);
  });

  test('throws when summary is not a string', () => {
    expect(() => validateResponse({ summary: 42, items: [] })).toThrow(/summary/i);
  });

  test('throws when items is missing', () => {
    expect(() => validateResponse({ summary: 's' })).toThrow(/items/i);
  });

  test('throws when items is not an array', () => {
    expect(() => validateResponse({ summary: 's', items: 'nope' })).toThrow(/items/i);
  });

  test('throws when an item is missing category', () => {
    expect(() =>
      validateResponse({ summary: 's', items: [{ text: 'no cat' }] })
    ).toThrow(/category/i);
  });

  test('throws when an item is missing text', () => {
    expect(() =>
      validateResponse({ summary: 's', items: [{ category: 'New' }] })
    ).toThrow(/text/i);
  });

  test('throws when an item category is outside the enum', () => {
    expect(() =>
      validateResponse({ summary: 's', items: [{ category: 'Other', text: 't' }] })
    ).toThrow(/category/i);
  });

  test('throws when item text is empty string', () => {
    expect(() =>
      validateResponse({ summary: 's', items: [{ category: 'New', text: '' }] })
    ).toThrow(/text/i);
  });
});
