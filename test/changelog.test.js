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

  test('should generate changelog with single commit (no body)', async () => {
    // Mock execSync to return a single commit without body
    childProcess.execSync.mockReturnValue(
      Buffer.from('feat: add new feature\n\n---COMMIT_SEPARATOR---')
    );

    const result = await generateChangelog('v1.0.0', 'v1.0.1');

    // Verify the result uses unified accordion format even without body
    expect(result).toBe(`<details>
<summary>feat: add new feature</summary>
</details>`);

    // Verify git command was called correctly
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'git log 1.0.0..1.0.1 --pretty=format:"%s%n%b%n---COMMIT_SEPARATOR---"'
    );
  });

  test('should generate changelog with single commit with body (accordion format)', async () => {
    // Mock execSync to return a single commit with body
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        'feat: add new feature\nThis is the detailed description of the new feature.\n\nIt includes multiple lines.\n---COMMIT_SEPARATOR---'
      )
    );

    const result = await generateChangelog('v1.0.0', 'v1.0.1');

    // Verify the result uses accordion format
    expect(result).toBe(`<details>
<summary>feat: add new feature</summary>

This is the detailed description of the new feature.

It includes multiple lines.

</details>`);

    // Verify git command was called correctly
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'git log 1.0.0..1.0.1 --pretty=format:"%s%n%b%n---COMMIT_SEPARATOR---"'
    );
  });

  test('should generate changelog with multiple commits (mixed with and without bodies)', async () => {
    // Mock execSync to return multiple commits - some with bodies, some without
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        'feat: add new feature\nDetailed description of the new feature\n---COMMIT_SEPARATOR---\n' +
          'fix: resolve bug in login\n\n---COMMIT_SEPARATOR---\n' +
          'chore: update dependencies\nUpdated all packages to latest versions.\n\nTested thoroughly.\n---COMMIT_SEPARATOR---'
      )
    );

    const result = await generateChangelog('v1.0.0', 'v1.1.0');

    // Verify the result uses unified accordion format
    expect(result).toBe(
      `<details>
<summary>feat: add new feature</summary>

Detailed description of the new feature

</details>

<details>
<summary>fix: resolve bug in login</summary>
</details>

<details>
<summary>chore: update dependencies</summary>

Updated all packages to latest versions.

Tested thoroughly.

</details>`
    );

    // Verify git command was called correctly
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'git log 1.0.0..1.1.0 --pretty=format:"%s%n%b%n---COMMIT_SEPARATOR---"'
    );
  });

  test('should use HEAD when current version is empty', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from('feat: add new feature\n\n---COMMIT_SEPARATOR---')
    );
    const _result = await generateChangelog('v1.0.0', '');
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'git log 1.0.0..HEAD --pretty=format:"%s%n%b%n---COMMIT_SEPARATOR---"'
    );
  });

  test('should use HEAD when current version is undefined', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from('feat: add new feature\n\n---COMMIT_SEPARATOR---')
    );
    const _result = await generateChangelog('v1.0.0', undefined);
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'git log 1.0.0..HEAD --pretty=format:"%s%n%b%n---COMMIT_SEPARATOR---"'
    );
  });

  test('should use HEAD when current version is null', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from('feat: add new feature\n\n---COMMIT_SEPARATOR---')
    );
    const _result = await generateChangelog('v1.0.0', null);
    expect(childProcess.execSync).toHaveBeenCalledWith(
      'git log 1.0.0..HEAD --pretty=format:"%s%n%b%n---COMMIT_SEPARATOR---"'
    );
  });

  test('should use first commit when previous version is empty or undefined', async () => {
    // Mock execSync for getting first commit hash
    childProcess.execSync
      .mockReturnValueOnce(Buffer.from('abc123'))
      .mockReturnValueOnce(Buffer.from('feat: initial commit\n\n---COMMIT_SEPARATOR---'));

    // Test with empty string
    let _result = await generateChangelog('', 'v1.0.0');
    expect(childProcess.execSync).toHaveBeenNthCalledWith(1, 'git rev-list --max-parents=0 HEAD');
    expect(childProcess.execSync).toHaveBeenNthCalledWith(
      2,
      'git log abc123..1.0.0 --pretty=format:"%s%n%b%n---COMMIT_SEPARATOR---"'
    );

    // Clear mock calls
    jest.clearAllMocks();

    // Mock again for undefined test
    childProcess.execSync
      .mockReturnValueOnce(Buffer.from('abc123'))
      .mockReturnValueOnce(Buffer.from('feat: initial commit\n\n---COMMIT_SEPARATOR---'));

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
      .mockReturnValueOnce(Buffer.from('feat: initial commit\n\n---COMMIT_SEPARATOR---'));

    const result1 = await generateChangelog('v0.9.0', 'v1.0.0');
    expect(result1).toBe(`<details>\n<summary>feat: initial commit</summary>\n</details>`);

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
          'feat: feature from dev.2\n\n---COMMIT_SEPARATOR---\n' +
            'feat: feature from dev.1\n\n---COMMIT_SEPARATOR---\n' +
            'fix: fix from dev.1\n\n---COMMIT_SEPARATOR---'
        )
      );

    const result = await generateChangelog('1.0.0-dev.2', '1.0.0');

    // Should have gotten tags to find earliest prerelease
    expect(childProcess.execSync).toHaveBeenNthCalledWith(1, 'git rev-parse --verify 1.0.0-dev.2');
    expect(childProcess.execSync).toHaveBeenNthCalledWith(2, 'git tag -l');

    // Should generate changelog from v1.0.0-dev.1 to current
    expect(childProcess.execSync).toHaveBeenNthCalledWith(
      3,
      'git log 1.0.0-dev.1..1.0.0 --pretty=format:"%s%n%b%n---COMMIT_SEPARATOR---"'
    );

    // Should include all changes since the first prerelease
    expect(result).toBe(
      '<details>\n<summary>feat: feature from dev.2</summary>\n</details>\n\n' +
        '<details>\n<summary>feat: feature from dev.1</summary>\n</details>\n\n' +
        '<details>\n<summary>fix: fix from dev.1</summary>\n</details>'
    );
  });

  test('should use provided version when not going from prerelease to stable', async () => {
    childProcess.execSync
      .mockImplementationOnce(() => Buffer.from(''))
      .mockReturnValueOnce(Buffer.from('feat: new feature\n\n---COMMIT_SEPARATOR---'));

    const _result = await generateChangelog('1.0.0', '1.1.0');

    expect(childProcess.execSync).toHaveBeenNthCalledWith(
      2,
      'git log 1.0.0..1.1.0 --pretty=format:"%s%n%b%n---COMMIT_SEPARATOR---"'
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
        'feat: add new feature\n\n---COMMIT_SEPARATOR---\n' +
          'hide: secret change\n\n---COMMIT_SEPARATOR---\n' +
          'fix: resolve bug\n\n---COMMIT_SEPARATOR---\n' +
          'BUMP VERSION: 1.0.1\n\n---COMMIT_SEPARATOR---\n' +
          'bump version to 1.0.2\n\n---COMMIT_SEPARATOR---\n' +
          'HIDE: another secret\n\n---COMMIT_SEPARATOR---'
      )
    );

    const result = await generateChangelog('v1.0.0', 'v1.1.0');

    expect(result).toBe(
      '<details>\n<summary>feat: add new feature</summary>\n</details>\n\n' +
        '<details>\n<summary>fix: resolve bug</summary>\n</details>'
    );
  });

  test('should filter out commits ending with "[hide]"', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        'feat: add new feature\n\n---COMMIT_SEPARATOR---\n' +
          'fix: a bug [hide]\n\n---COMMIT_SEPARATOR---\n' +
          'chore: another thing [HIDE]\n\n---COMMIT_SEPARATOR---\n' +
          'fix: another bug\n\n---COMMIT_SEPARATOR---'
      )
    );

    const result = await generateChangelog('v1.0.0', 'v1.1.0');

    expect(result).toBe(
      '<details>\n<summary>feat: add new feature</summary>\n</details>\n\n' +
        '<details>\n<summary>fix: another bug</summary>\n</details>'
    );
  });

  test('should handle emoji in commit messages', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        '✨ feat: add sparkles\n\n---COMMIT_SEPARATOR---\n' +
          'feat: handle emoji 🚀 in middle\n\n---COMMIT_SEPARATOR---'
      )
    );

    const result = await generateChangelog('1.0.0', '1.1.0');
    expect(result).toBe(
      '<details>\n<summary>✨ feat: add sparkles</summary>\n</details>\n\n' +
        '<details>\n<summary>feat: handle emoji 🚀 in middle</summary>\n</details>'
    );
  });

  test('should handle quotes in commit messages', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        'fix: handle "double quotes"\n\n---COMMIT_SEPARATOR---\n' +
          "feat: handle 'single quotes'\n\n---COMMIT_SEPARATOR---"
      )
    );

    const result = await generateChangelog('1.0.0', '1.1.0');
    expect(result).toBe(
      '<details>\n<summary>fix: handle "double quotes"</summary>\n</details>\n\n' +
        "<details>\n<summary>feat: handle 'single quotes'</summary>\n</details>"
    );
  });

  test('should handle multi-line commit messages', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from('fix: handle multiple\nline\ncommit message\n---COMMIT_SEPARATOR---')
    );

    const result = await generateChangelog('1.0.0', '1.1.0');
    expect(result).toBe(
      '<details>\n<summary>fix: handle multiple</summary>\n\nline\ncommit message\n\n</details>'
    );
  });

  test('should handle HTML and Markdown symbols', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from('fix: handle <html> & [markdown] symbols\n\n---COMMIT_SEPARATOR---')
    );

    const result = await generateChangelog('1.0.0', '1.1.0');
    expect(result).toBe(
      '<details>\n<summary>fix: handle <html> & [markdown] symbols</summary>\n</details>'
    );
  });

  test('should handle Unicode characters', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        'feat: handle Unicode — em dash and … ellipsis\n\n---COMMIT_SEPARATOR---\n' +
          'fix: handle backslashes \\ and slashes /\n\n---COMMIT_SEPARATOR---'
      )
    );

    const result = await generateChangelog('1.0.0', '1.1.0');
    expect(result).toBe(
      '<details>\n<summary>feat: handle Unicode — em dash and … ellipsis</summary>\n</details>\n\n' +
        '<details>\n<summary>fix: handle backslashes \\ and slashes /</summary>\n</details>'
    );
  });

  test('should handle parentheses and special characters', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        'feat(scope): handle parentheses (like this)\n\n---COMMIT_SEPARATOR---\n' +
          'fix: handle $ ^ & * special chars\n\n---COMMIT_SEPARATOR---'
      )
    );

    const result = await generateChangelog('1.0.0', '1.1.0');
    expect(result).toBe(
      '<details>\n<summary>feat(scope): handle parentheses (like this)</summary>\n</details>\n\n' +
        '<details>\n<summary>fix: handle $ ^ & * special chars</summary>\n</details>'
    );
  });

  test('should handle empty or whitespace-only commit messages', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        'feat: normal commit\n\n---COMMIT_SEPARATOR---\n' +
          '   \n\n---COMMIT_SEPARATOR---\n' +
          'feat: another commit\n\n---COMMIT_SEPARATOR---\n' +
          '\n\n---COMMIT_SEPARATOR---\n' +
          'fix: final commit\n\n---COMMIT_SEPARATOR---'
      )
    );

    const result = await generateChangelog('1.0.0', '1.1.0');

    expect(result).toBe(
      '<details>\n<summary>feat: normal commit</summary>\n</details>\n\n' +
        '<details>\n<summary>feat: another commit</summary>\n</details>\n\n' +
        '<details>\n<summary>fix: final commit</summary>\n</details>'
    );
  });

  test('should handle malformed bullet points', async () => {
    childProcess.execSync.mockReturnValue(
      Buffer.from(
        'feat: normal commit\n\n---COMMIT_SEPARATOR---\n' +
          '*feat: missing space\n\n---COMMIT_SEPARATOR---\n' +
          '** fix: double asterisk\n\n---COMMIT_SEPARATOR---\n' +
          ' * chore: leading space\n\n---COMMIT_SEPARATOR---\n' +
          '+ feat: plus instead of asterisk\n\n---COMMIT_SEPARATOR---\n' +
          'fix: normal commit\n\n---COMMIT_SEPARATOR---'
      )
    );

    const result = await generateChangelog('1.0.0', '1.1.0');

    expect(result).toBe(
      '<details>\n<summary>feat: normal commit</summary>\n</details>\n\n' +
        '<details>\n<summary>*feat: missing space</summary>\n</details>\n\n' +
        '<details>\n<summary>** fix: double asterisk</summary>\n</details>\n\n' +
        '<details>\n<summary>* chore: leading space</summary>\n</details>\n\n' +
        '<details>\n<summary>+ feat: plus instead of asterisk</summary>\n</details>\n\n' +
        '<details>\n<summary>fix: normal commit</summary>\n</details>'
    );
  });

  test('should handle single prerelease when going to stable', async () => {
    childProcess.execSync
      .mockImplementationOnce(() => Buffer.from('')) // verify tag exists
      .mockReturnValueOnce(Buffer.from('v1.0.0-dev.1\n' + 'v0.9.0'))
      .mockReturnValueOnce(
        Buffer.from(
          'feat: feature from dev.1\n\n---COMMIT_SEPARATOR---\n' +
            'fix: fix from dev.1\n\n---COMMIT_SEPARATOR---'
        )
      );

    const result = await generateChangelog('1.0.0-dev.1', '1.0.0');

    expect(childProcess.execSync).toHaveBeenNthCalledWith(1, 'git rev-parse --verify 1.0.0-dev.1');
    expect(childProcess.execSync).toHaveBeenNthCalledWith(2, 'git tag -l');

    expect(childProcess.execSync).toHaveBeenNthCalledWith(
      3,
      'git log 1.0.0-dev.1..1.0.0 --pretty=format:"%s%n%b%n---COMMIT_SEPARATOR---"'
    );

    expect(result).toBe(
      '<details>\n<summary>feat: feature from dev.1</summary>\n</details>\n\n' +
        '<details>\n<summary>fix: fix from dev.1</summary>\n</details>'
    );
  });
});
