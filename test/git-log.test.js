const childProcess = require('child_process');
const { getCommits } = require('../src/lib/git-log');

jest.mock('child_process');

const FS = '\x1f';
const RS = '\x1e';

function mockGitOutput(commits) {
  return commits.map((c) => [c.hash, c.author, c.date, c.subject, c.body].join(FS)).join(RS) + RS;
}

function findGitLogCall() {
  const call = childProcess.execFileSync.mock.calls.find(
    (c) => c[0] === 'git' && Array.isArray(c[1]) && c[1][0] === 'log'
  );
  // Return a single-string approximation for assertions that use `.toContain(...)`.
  return [call[0], ...call[1]].join(' ');
}

describe('getCommits', () => {
  test('parses a single commit with all fields', () => {
    childProcess.execFileSync.mockReturnValue(
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
    childProcess.execFileSync.mockReturnValue(
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
    childProcess.execFileSync.mockReturnValue(
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
    childProcess.execFileSync.mockReturnValue(Buffer.from(''));
    expect(getCommits('v1.0.0', 'v1.0.0')).toEqual([]);
  });

  test('defaults current_version to HEAD when omitted', () => {
    childProcess.execFileSync.mockReturnValue(Buffer.from(''));
    getCommits('v1.0.0');
    expect(findGitLogCall()).toContain('v1.0.0..HEAD');
  });

  test('defaults current_version to HEAD when empty string', () => {
    childProcess.execFileSync.mockReturnValue(Buffer.from(''));
    getCommits('v1.0.0', '');
    expect(findGitLogCall()).toContain('v1.0.0..HEAD');
  });

  test('uses the configured ASCII record/field separators', () => {
    childProcess.execFileSync.mockReturnValue(Buffer.from(''));
    getCommits('v1.0.0', 'HEAD');
    const call = findGitLogCall();
    expect(call).toContain('%H');
    expect(call).toContain('%an');
    expect(call).toContain('%aI');
    expect(call).toContain('%s');
    expect(call).toContain('%b');
  });

  // Regression: the format string contains raw \x1f / \x1e separators.
  // Earlier impl JSON.stringify'd it through execSync, which let the shell
  // pass the literal 6-char sequences "" / "" to git. Git
  // doesn't interpret those, so the output never contained real separators
  // and every commit parsed as one mangled blob. This test pins the argv-
  // passing contract so a regression can't sneak back in.
  test('REGRESSION: format string reaches subprocess with raw \\x1f / \\x1e bytes', () => {
    childProcess.execFileSync.mockReturnValue(Buffer.from(''));
    getCommits('1.0.0', 'HEAD');
    const logCall = childProcess.execFileSync.mock.calls.find(
      (c) => c[0] === 'git' && Array.isArray(c[1]) && c[1][0] === 'log'
    );
    expect(logCall).toBeDefined();
    const formatArg = logCall[1].find((a) => typeof a === 'string' && a.startsWith('--pretty=format:'));
    expect(formatArg).toBeDefined();
    expect(formatArg).toContain('\x1f');
    expect(formatArg).toContain('\x1e');
    expect(formatArg).not.toContain('\\u001f');
    expect(formatArg).not.toContain('\\u001e');
  });

  describe('v-prefix tolerance', () => {
    // mock rev-parse to succeed only for refs in `existingRefs`; mock git log to return empty
    function mockTagsExist(existingRefs) {
      childProcess.execFileSync.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === 'rev-parse' && args[1] === '--verify') {
          const ref = args[2];
          if (existingRefs.includes(ref)) return Buffer.from('deadbeef\n');
          throw new Error('fatal: Needed a single revision');
        }
        if (cmd === 'git' && args[0] === 'log') return Buffer.from('');
        return Buffer.from('');
      });
    }

    test('input "1.0.0" resolves to tag "1.0.0" when bare tag exists', () => {
      mockTagsExist(['1.0.0', '1.0.1']);
      getCommits('1.0.0', '1.0.1');
      expect(findGitLogCall()).toContain('1.0.0..1.0.1');
    });

    test('input "1.0.0" resolves to tag "v1.0.0" when only v-prefixed tag exists', () => {
      mockTagsExist(['v1.0.0', 'v1.0.1']);
      getCommits('1.0.0', '1.0.1');
      expect(findGitLogCall()).toContain('v1.0.0..v1.0.1');
    });

    test('input "v1.0.0" resolves to tag "1.0.0" when only bare tag exists', () => {
      mockTagsExist(['1.0.0', '1.0.1']);
      getCommits('v1.0.0', 'v1.0.1');
      expect(findGitLogCall()).toContain('1.0.0..1.0.1');
    });

    test('input "v1.0.0" resolves to tag "v1.0.0" when v-prefixed tag exists', () => {
      mockTagsExist(['v1.0.0', 'v1.0.1']);
      getCommits('v1.0.0', 'v1.0.1');
      expect(findGitLogCall()).toContain('v1.0.0..v1.0.1');
    });

    test('mixed: previous bare, current v-prefixed — each resolves independently', () => {
      mockTagsExist(['1.0.0', 'v1.0.1']);
      getCommits('v1.0.0', '1.0.1');
      expect(findGitLogCall()).toContain('1.0.0..v1.0.1');
    });

    test('HEAD is never toggled', () => {
      mockTagsExist(['v1.0.0']);
      getCommits('1.0.0', 'HEAD');
      const call = findGitLogCall();
      expect(call).toContain('v1.0.0..HEAD');
    });

    test('falls back to input as-given when neither form exists (lets git log error surface)', () => {
      mockTagsExist([]);
      childProcess.execFileSync.mockImplementation((cmd) => {
        if (cmd.startsWith('git rev-parse --verify ')) {
          throw new Error('not a valid ref');
        }
        if (cmd.startsWith('git log ')) return Buffer.from('');
        return Buffer.from('');
      });
      getCommits('nonexistent', 'HEAD');
      expect(findGitLogCall()).toContain('nonexistent..HEAD');
    });
  });

  test('throws when previousVersion is missing', () => {
    expect(() => getCommits()).toThrow(/previousVersion/i);
    expect(() => getCommits('')).toThrow(/previousVersion/i);
  });

  test('handles commits whose subject or body contains unusual characters', () => {
    childProcess.execFileSync.mockReturnValue(
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
    childProcess.execFileSync.mockReturnValue(Buffer.from(''));
    getCommits('v1.0.0', 'HEAD');
    expect(childProcess.execFileSync).toHaveBeenCalled();
  });
});
