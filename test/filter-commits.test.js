const { filterCommits } = require('../src/lib/filter-commits');

describe('filterCommits', () => {
  test('returns commits unchanged when none match drop patterns', () => {
    const commits = [
      { subject: 'feat: add login', body: '' },
      { subject: 'fix: handle null user', body: 'edge case' },
    ];
    expect(filterCommits(commits)).toEqual(commits);
  });

  test('drops commits with empty subject', () => {
    const commits = [
      { subject: 'feat: add login', body: '' },
      { subject: '', body: 'body only' },
      { subject: '   ', body: 'whitespace only' },
    ];
    expect(filterCommits(commits)).toEqual([{ subject: 'feat: add login', body: '' }]);
  });

  test('drops commits whose subject starts with "hide:" (case-insensitive)', () => {
    const commits = [
      { subject: 'feat: keep me', body: '' },
      { subject: 'hide: drop me', body: '' },
      { subject: 'HIDE: drop me too', body: '' },
      { subject: 'Hide: also drop', body: '' },
    ];
    expect(filterCommits(commits)).toEqual([{ subject: 'feat: keep me', body: '' }]);
  });

  test('drops commits whose subject ends with "[hide]" (case-insensitive)', () => {
    const commits = [
      { subject: 'feat: keep me', body: '' },
      { subject: 'fix: drop me [hide]', body: '' },
      { subject: 'chore: drop me too [HIDE]', body: '' },
      { subject: 'refactor: also drop [Hide]', body: '' },
    ];
    expect(filterCommits(commits)).toEqual([{ subject: 'feat: keep me', body: '' }]);
  });

  test('drops commits whose subject starts with "ignore:" (case-insensitive)', () => {
    const commits = [
      { subject: 'feat: keep me', body: '' },
      { subject: 'ignore: drop me', body: '' },
      { subject: 'IGNORE: drop me too', body: '' },
      { subject: 'Ignore: also drop', body: '' },
    ];
    expect(filterCommits(commits)).toEqual([{ subject: 'feat: keep me', body: '' }]);
  });

  test('drops commits whose subject ends with "[ignore]" (case-insensitive)', () => {
    const commits = [
      { subject: 'feat: keep me', body: '' },
      { subject: 'fix: drop me [ignore]', body: '' },
      { subject: 'chore: drop me too [IGNORE]', body: '' },
      { subject: 'refactor: also drop [Ignore]', body: '' },
    ];
    expect(filterCommits(commits)).toEqual([{ subject: 'feat: keep me', body: '' }]);
  });

  test('drops commits whose subject starts with "bump version" (case-insensitive)', () => {
    const commits = [
      { subject: 'feat: keep me', body: '' },
      { subject: 'bump version to 1.0.1', body: '' },
      { subject: 'BUMP VERSION: 1.0.2', body: '' },
      { subject: 'Bump Version 1.0.3', body: '' },
    ];
    expect(filterCommits(commits)).toEqual([{ subject: 'feat: keep me', body: '' }]);
  });

  test('drops commits with surrounding whitespace in matched patterns', () => {
    const commits = [
      { subject: '  feat: keep me  ', body: '' },
      { subject: '  hide: drop me  ', body: '' },
      { subject: '  fix: drop me [hide]  ', body: '' },
    ];
    const result = filterCommits(commits);
    expect(result).toHaveLength(1);
    expect(result[0].subject).toBe('  feat: keep me  ');
  });

  test('does not drop commits where pattern appears mid-subject', () => {
    const commits = [
      { subject: 'feat: rewrite hide: function', body: '' },
      { subject: 'fix: implement bump version helper', body: '' },
      { subject: 'feat: add ignore: parser', body: '' },
    ];
    expect(filterCommits(commits)).toEqual(commits);
  });

  test('returns empty array for empty input', () => {
    expect(filterCommits([])).toEqual([]);
  });

  test('preserves commit body unchanged', () => {
    const commits = [{ subject: 'feat: add login', body: 'Closes ETC-123\n\nDetails here.' }];
    expect(filterCommits(commits)).toEqual(commits);
  });
});
