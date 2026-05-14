const { renderMarkdown } = require('../src/lib/render-markdown');

describe('renderMarkdown', () => {
  test('returns the summary followed by a trailing newline when items is empty', () => {
    expect(renderMarkdown({ summary: 'Maintenance release.', items: [] })).toBe(
      'Maintenance release.\n'
    );
  });

  test('formats bullets as Markdown list items (* **Category:** text)', () => {
    const out = renderMarkdown({
      summary: 'A release.',
      items: [{ category: 'New', text: 'Added dark mode.' }],
    });
    expect(out).toContain('* **New:** Added dark mode.');
  });

  test('places bullets after the summary with a blank line between, ending with a trailing newline', () => {
    const out = renderMarkdown({
      summary: 'A release.',
      items: [{ category: 'New', text: 'one' }],
    });
    expect(out).toBe('A release.\n\n* **New:** one\n');
  });

  test('orders categories Breaking, New, Improvement, Fix regardless of input order', () => {
    const out = renderMarkdown({
      summary: 's',
      items: [
        { category: 'Fix', text: 'fix one' },
        { category: 'Breaking', text: 'breaking one' },
        { category: 'Improvement', text: 'imp one' },
        { category: 'New', text: 'new one' },
      ],
    });
    expect(out).toBe(
      's\n\n* **Breaking:** breaking one\n* **New:** new one\n* **Improvement:** imp one\n* **Fix:** fix one\n'
    );
  });

  test('preserves item order within each category', () => {
    const out = renderMarkdown({
      summary: 's',
      items: [
        { category: 'New', text: 'first new' },
        { category: 'New', text: 'second new' },
        { category: 'Fix', text: 'first fix' },
        { category: 'New', text: 'third new' },
        { category: 'Fix', text: 'second fix' },
      ],
    });
    expect(out).toBe(
      's\n\n* **New:** first new\n* **New:** second new\n* **New:** third new\n* **Fix:** first fix\n* **Fix:** second fix\n'
    );
  });

  test('preserves multi-paragraph summary verbatim', () => {
    const summary = 'Para one.\n\nPara two with details.\n\nPara three.';
    const out = renderMarkdown({ summary, items: [{ category: 'New', text: 't' }] });
    expect(out.startsWith(summary)).toBe(true);
    expect(out).toBe(`${summary}\n\n* **New:** t\n`);
  });

  test('omits categories absent from items', () => {
    const out = renderMarkdown({
      summary: 's',
      items: [{ category: 'Fix', text: 'only fix' }],
    });
    expect(out).toBe('s\n\n* **Fix:** only fix\n');
  });

  test('output always ends with exactly one trailing newline', () => {
    const out = renderMarkdown({
      summary: 'A release.',
      items: [{ category: 'New', text: 'one' }],
    });
    expect(out.endsWith('\n')).toBe(true);
    expect(out.endsWith('\n\n')).toBe(false);
  });
});
