const { generateChangelog } = require('../src/changelogGenerator');
const childProcess = require('child_process');

// Mock child_process
jest.mock('child_process');

describe('Changelog Generator', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('should generate empty changelog when no commits exist between versions', async () => {
    // Mock execSync to throw an error (git behavior when no commits found)
    childProcess.execSync.mockImplementation(() => {
      throw new Error('No commits found');
    });

    const result = await generateChangelog('v1.0.0', 'v1.0.0');
    expect(result).toBe('');
  });

  test('should generate changelog with single commit', async () => {
    // Mock execSync to return a single commit
    childProcess.execSync.mockReturnValue(Buffer.from('* feat: add new feature'));

    const result = await generateChangelog('v1.0.0', 'v1.0.1');

    // Verify the result contains the commit message
    expect(result).toBe('* feat: add new feature');

    // Verify git command was called correctly
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'git log 1.0.0..1.0.1 --pretty=format:"* %s"'
    );
  });

  test('should generate changelog with multiple commits', async () => {
    // Mock execSync to return multiple commits
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        '* feat: add new feature\n' +
          '* fix: resolve bug in login\n' +
          '* chore: update dependencies'
      )
    );

    const result = await generateChangelog('v1.0.0', 'v1.1.0');

    // Verify the result contains all commit messages
    expect(result).toBe(
      '* feat: add new feature\n' + '* fix: resolve bug in login\n' + '* chore: update dependencies'
    );

    // Verify git command was called correctly
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'git log 1.0.0..1.1.0 --pretty=format:"* %s"'
    );
  });

  test('should use HEAD when current version is empty', async () => {
    childProcess.execSync.mockReturnValue(Buffer.from('* feat: add new feature'));
    const _result = await generateChangelog('v1.0.0', '');
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'git log 1.0.0..HEAD --pretty=format:"* %s"'
    );
  });

  test('should use HEAD when current version is undefined', async () => {
    childProcess.execSync.mockReturnValue(Buffer.from('* feat: add new feature'));
    const _result = await generateChangelog('v1.0.0', undefined);
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'git log 1.0.0..HEAD --pretty=format:"* %s"'
    );
  });

  test('should use HEAD when current version is null', async () => {
    childProcess.execSync.mockReturnValue(Buffer.from('* feat: add new feature'));
    const _result = await generateChangelog('v1.0.0', null);
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'git log 1.0.0..HEAD --pretty=format:"* %s"'
    );
  });

  test('should use first commit when previous version is empty or undefined', async () => {
    // Mock execSync for getting first commit hash
    childProcess.execSync
      .mockReturnValueOnce(Buffer.from('abc123'))
      .mockReturnValueOnce(Buffer.from('* feat: initial commit'));

    // Test with empty string
    let _result = await generateChangelog('', 'v1.0.0');
    expect(childProcess.execSync).toHaveBeenNthCalledWith(1, 'git rev-list --max-parents=0 HEAD');
    expect(childProcess.execSync).toHaveBeenNthCalledWith(
      2,
      'git log abc123..1.0.0 --pretty=format:"* %s"'
    );

    // Clear mock calls
    jest.clearAllMocks();

    // Mock again for undefined test
    childProcess.execSync
      .mockReturnValueOnce(Buffer.from('abc123'))
      .mockReturnValueOnce(Buffer.from('* feat: initial commit'));

    // Test with undefined
    _result = await generateChangelog(undefined, 'v1.0.0');
    expect(childProcess.execSync).toHaveBeenNthCalledWith(1, 'git rev-list --max-parents=0 HEAD');
  });

  test('should fall back to first commit only if this is the first release', async () => {
    // Scenario 1: First release (no tags exist)
    childProcess.execSync
      .mockImplementationOnce(() => {
        throw new Error("fatal: ambiguous argument 'v0.9.0': unknown revision or path");
      })
      .mockReturnValueOnce('') // No tags exist
      .mockReturnValueOnce(Buffer.from('abc123')) // First commit
      .mockReturnValueOnce(Buffer.from('* feat: initial commit'));

    const result1 = await generateChangelog('v0.9.0', 'v1.0.0');
    expect(result1).toBe('* feat: initial commit');

    jest.clearAllMocks();

    // Scenario 2: Missing tag but other releases exist
    childProcess.execSync
      .mockImplementationOnce(() => {
        throw new Error("fatal: ambiguous argument 'v0.9.0': unknown revision or path");
      })
      .mockReturnValueOnce('v1.1.0\nv1.0.0'); // Other tags exist

    await expect(generateChangelog('v0.9.0', 'v1.2.0')).rejects.toThrow(
      'Previous version 0.9.0 not found, and this is not the first release'
    );
  });

  test('should include all prerelease changes when going from prerelease to stable', async () => {
    // Mock sequence:
    // 1. Verify tag exists
    // 2. Get all tags to find earliest prerelease
    // 3. Get changelog from earliest prerelease to current
    childProcess.execSync
      .mockImplementationOnce(() => Buffer.from('')) // verify tag exists
      .mockReturnValueOnce(Buffer.from('v1.0.0-dev.2\n' + 'v1.0.0-dev.1\n' + 'v0.9.0'))
      .mockReturnValueOnce(
        Buffer.from(
          '* feat: feature from dev.2\n' + '* feat: feature from dev.1\n' + '* fix: fix from dev.1'
        )
      );

    const result = await generateChangelog('1.0.0-dev.2', '1.0.0');

    // Should have gotten tags to find earliest prerelease
    expect(childProcess.execSync).toHaveBeenNthCalledWith(1, 'git rev-parse --verify 1.0.0-dev.2');
    expect(childProcess.execSync).toHaveBeenNthCalledWith(2, 'git tag -l');

    // Should generate changelog from v1.0.0-dev.1 to current
    expect(childProcess.execSync).toHaveBeenNthCalledWith(
      3,
      'git log 1.0.0-dev.1..1.0.0 --pretty=format:"* %s"'
    );

    // Should include all changes since the first prerelease
    expect(result).toBe(
      '* feat: feature from dev.2\n' + '* feat: feature from dev.1\n' + '* fix: fix from dev.1'
    );
  });

  test('should use provided version when not going from prerelease to stable', async () => {
    childProcess.execSync
      .mockImplementationOnce(() => Buffer.from(''))
      .mockReturnValueOnce(Buffer.from('* feat: new feature'));

    const _result = await generateChangelog('1.0.0', '1.1.0');

    expect(childProcess.execSync).toHaveBeenNthCalledWith(
      2,
      'git log 1.0.0..1.1.0 --pretty=format:"* %s"'
    );
  });

  test('should throw error for non-semver previous version', async () => {
    await expect(generateChangelog('not.a.version', '1.0.0')).rejects.toThrow(
      'Invalid version format: not.a.version'
    );
  });

  test('should throw error for non-semver current version', async () => {
    await expect(generateChangelog('1.0.0', 'invalid')).rejects.toThrow(
      'Invalid version format: invalid'
    );
  });

  test('should throw error for incomplete version format', async () => {
    await expect(generateChangelog('1.0', '1.0.0')).rejects.toThrow('Invalid version format: 1.0');
  });

  test('should accept valid version formats', async () => {
    childProcess.execSync.mockReturnValue(Buffer.from('* feat: new feature'));
    await expect(generateChangelog('1.0.0', '1.0.1')).resolves.not.toThrow();
    await expect(generateChangelog('1.0.0-rc.1', '1.0.0')).resolves.not.toThrow();
    await expect(generateChangelog('1.0.0-alpha.1', '1.0.0-beta.1')).resolves.not.toThrow();
  });

  test('should throw error when regular version is newer than current', async () => {
    await expect(generateChangelog('2.0.0', '1.0.0')).rejects.toThrow(
      'Previous version (2.0.0) is newer than current version (1.0.0)'
    );
  });

  test('should throw error when prerelease version is newer than current', async () => {
    await expect(generateChangelog('1.0.0-rc.2', '1.0.0-rc.1')).rejects.toThrow(
      'Previous version (1.0.0-rc.2) is newer than current version (1.0.0-rc.1)'
    );
  });

  test('should accept valid version ordering', async () => {
    childProcess.execSync.mockReturnValue(Buffer.from('* feat: new feature'));
    await expect(generateChangelog('1.0.0', '2.0.0')).resolves.not.toThrow();
    await expect(generateChangelog('1.0.0-rc.1', '1.0.0-rc.2')).resolves.not.toThrow();
    await expect(generateChangelog('1.0.0-rc.1', '1.0.0')).resolves.not.toThrow();
  });

  test('should filter out commits starting with "hide:" or "Bump version"', async () => {
    // Mock execSync to return mixed commits
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        '* feat: add new feature\n' +
          '* hide: secret change\n' +
          '* fix: resolve bug\n' +
          '* BUMP VERSION: 1.0.1\n' +
          '* bump version to 1.0.2\n' +
          '* HIDE: another secret'
      )
    );

    const result = await generateChangelog('v1.0.0', 'v1.1.0');

    // Verify filtered result
    expect(result).toBe('* feat: add new feature\n' + '* fix: resolve bug');
  });

  test('should handle emoji in commit messages', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(['* ✨ feat: add sparkles', '* feat: handle emoji 🚀 in middle'].join('\n'))
    );

    const result = await generateChangelog('1.0.0', '1.1.0');
    expect(result).toBe(
      ['* ✨ feat: add sparkles', '* feat: handle emoji 🚀 in middle'].join('\n')
    );
  });

  test('should handle quotes in commit messages', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(['* fix: handle "double quotes"', "* feat: handle 'single quotes'"].join('\n'))
    );

    const result = await generateChangelog('1.0.0', '1.1.0');
    expect(result).toBe(
      ['* fix: handle "double quotes"', "* feat: handle 'single quotes'"].join('\n')
    );
  });

  test('should handle multi-line commit messages', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(['* fix: handle multiple', 'line', 'commit message'].join('\n'))
    );

    const result = await generateChangelog('1.0.0', '1.1.0');
    // Multi-line commits should be treated as a single commit message
    expect(result).toBe('* fix: handle multiple line commit message');
  });

  test('should handle HTML and Markdown symbols', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(['* fix: handle <html> & [markdown] symbols'].join('\n'))
    );

    const result = await generateChangelog('1.0.0', '1.1.0');
    expect(result).toBe('* fix: handle <html> & [markdown] symbols');
  });

  test('should handle Unicode characters', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        [
          '* feat: handle Unicode — em dash and … ellipsis',
          '* fix: handle backslashes \\ and slashes /',
        ].join('\n')
      )
    );

    const result = await generateChangelog('1.0.0', '1.1.0');
    expect(result).toBe(
      [
        '* feat: handle Unicode — em dash and … ellipsis',
        '* fix: handle backslashes \\ and slashes /',
      ].join('\n')
    );
  });

  test('should handle parentheses and special characters', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        [
          '* feat(scope): handle parentheses (like this)',
          '* fix: handle $ ^ & * special chars',
        ].join('\n')
      )
    );

    const result = await generateChangelog('1.0.0', '1.1.0');
    expect(result).toBe(
      ['* feat(scope): handle parentheses (like this)', '* fix: handle $ ^ & * special chars'].join(
        '\n'
      )
    );
  });

  test('should handle empty or whitespace-only commit messages', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        [
          '* feat: normal commit',
          '*    ', // just whitespace
          '* feat: another commit',
          '*', // empty
          '* fix: final commit',
        ].join('\n')
      )
    );

    const result = await generateChangelog('1.0.0', '1.1.0');

    // Verify empty/whitespace lines are filtered out
    expect(result).toBe(
      ['* feat: normal commit', '* feat: another commit', '* fix: final commit'].join('\n')
    );
  });

  test('should handle malformed bullet points', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        [
          '* feat: normal commit',
          '*feat: missing space',
          '** fix: double asterisk',
          ' * chore: leading space',
          '+ feat: plus instead of asterisk',
          '* fix: normal commit',
        ].join('\n')
      )
    );

    const result = await generateChangelog('1.0.0', '1.1.0');

    // Verify all commits are properly formatted with consistent bullets
    expect(result).toBe(
      [
        '* feat: normal commit',
        '* feat: missing space',
        '* fix: double asterisk',
        '* chore: leading space',
        '* feat: plus instead of asterisk',
        '* fix: normal commit',
      ].join('\n')
    );
  });

  test('should handle single prerelease when going to stable', async () => {
    // Mock sequence:
    // 1. Verify tag exists
    // 2. Get all tags to find earliest prerelease
    // 3. Get changelog from prerelease to current
    childProcess.execSync
      .mockImplementationOnce(() => Buffer.from('')) // verify tag exists
      .mockReturnValueOnce(Buffer.from('v1.0.0-dev.1\n' + 'v0.9.0'))
      .mockReturnValueOnce(Buffer.from('* feat: feature from dev.1\n' + '* fix: fix from dev.1'));

    const result = await generateChangelog('1.0.0-dev.1', '1.0.0');

    // Should have gotten tags to find earliest prerelease
    expect(childProcess.execSync).toHaveBeenNthCalledWith(1, 'git rev-parse --verify 1.0.0-dev.1');
    expect(childProcess.execSync).toHaveBeenNthCalledWith(2, 'git tag -l');

    // Should generate changelog from the prerelease to current
    expect(childProcess.execSync).toHaveBeenNthCalledWith(
      3,
      'git log 1.0.0-dev.1..1.0.0 --pretty=format:"* %s"'
    );

    // Should include all changes since the prerelease
    expect(result).toBe('* feat: feature from dev.1\n' + '* fix: fix from dev.1');
  });
});
