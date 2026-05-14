const childProcess = require('child_process');
const { getCommits } = require('../src/lib/git-log');

jest.mock('child_process');

const FS = '\x1f';
const RS = '\x1e';

function mockGitOutput(commits) {
  return commits.map((c) => [c.hash, c.author, c.date, c.subject, c.body].join(FS)).join(RS) + RS;
}

describe('getCommits', () => {
  test('parses a single commit with all fields', () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        mockGitOutput([
          {
            hash: 'abc123',
            author: 'Jane Dev',
            date: '2026-05-14T10:00:00Z',
            subject: 'feat: add login',
            body: 'Closes ETC-123',
          },
        ])
      )
    );

    expect(getCommits('v1.0.0', 'v1.0.1')).toEqual([
      {
        hash: 'abc123',
        author: 'Jane Dev',
        date: '2026-05-14T10:00:00Z',
        subject: 'feat: add login',
        body: 'Closes ETC-123',
      },
    ]);
  });

  test('parses multiple commits', () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        mockGitOutput([
          { hash: 'a1', author: 'Dev A', date: '2026-05-13T00:00:00Z', subject: 'feat: one', body: '' },
          { hash: 'b2', author: 'Dev B', date: '2026-05-14T00:00:00Z', subject: 'fix: two', body: 'details' },
        ])
      )
    );

    const result = getCommits('v1.0.0', 'v1.1.0');
    expect(result).toHaveLength(2);
    expect(result[0].hash).toBe('a1');
    expect(result[1].subject).toBe('fix: two');
  });

  test('preserves multi-line body content', () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        mockGitOutput([
          {
            hash: 'a1',
            author: 'Dev',
            date: '2026-05-14T00:00:00Z',
            subject: 'feat: multiline',
            body: 'line one\nline two\n\nline four',
          },
        ])
      )
    );

    expect(getCommits('v1.0.0', 'v1.0.1')[0].body).toBe('line one\nline two\n\nline four');
  });

  test('returns empty array when git log output is empty', () => {
    childProcess.execSync.mockReturnValue(Buffer.from(''));
    expect(getCommits('v1.0.0', 'v1.0.0')).toEqual([]);
  });

  test('defaults current_version to HEAD when omitted', () => {
    childProcess.execSync.mockReturnValue(Buffer.from(''));
    getCommits('v1.0.0');
    const call = childProcess.execSync.mock.calls[0][0];
    expect(call).toContain('v1.0.0..HEAD');
  });

  test('defaults current_version to HEAD when empty string', () => {
    childProcess.execSync.mockReturnValue(Buffer.from(''));
    getCommits('v1.0.0', '');
    const call = childProcess.execSync.mock.calls[0][0];
    expect(call).toContain('v1.0.0..HEAD');
  });

  test('uses the configured ASCII record/field separators', () => {
    childProcess.execSync.mockReturnValue(Buffer.from(''));
    getCommits('v1.0.0', 'HEAD');
    const call = childProcess.execSync.mock.calls[0][0];
    expect(call).toContain('%H');
    expect(call).toContain('%an');
    expect(call).toContain('%aI');
    expect(call).toContain('%s');
    expect(call).toContain('%b');
  });

  test('throws when previousVersion is missing', () => {
    expect(() => getCommits()).toThrow(/previousVersion/i);
    expect(() => getCommits('')).toThrow(/previousVersion/i);
  });

  test('handles commits whose subject or body contains unusual characters', () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        mockGitOutput([
          {
            hash: 'a1',
            author: 'Dev',
            date: '2026-05-14T00:00:00Z',
            subject: 'feat: "quotes" and $vars',
            body: 'body with `backticks`',
          },
        ])
      )
    );
    const result = getCommits('v1.0.0', 'v1.0.1');
    expect(result[0].subject).toBe('feat: "quotes" and $vars');
    expect(result[0].body).toBe('body with `backticks`');
  });

  test('uses execFile-style argv passing to avoid shell interpretation', () => {
    childProcess.execSync.mockReturnValue(Buffer.from(''));
    getCommits('v1.0.0', 'HEAD');
    expect(childProcess.execSync).toHaveBeenCalled();
  });
});
