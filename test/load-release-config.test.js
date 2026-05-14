const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadReleaseConfig } = require('../src/lib/load-release-config');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-config-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadReleaseConfig', () => {
  test('returns file contents when file exists', () => {
    const filePath = path.join(tmpDir, 'RELEASE.md');
    fs.writeFileSync(filePath, '# Release guidance\n\nWrite for builders.\n');
    const result = loadReleaseConfig(filePath);
    expect(result.content).toBe('# Release guidance\n\nWrite for builders.\n');
    expect(result.found).toBe(true);
  });

  test('returns empty content with found=false when file is missing', () => {
    const filePath = path.join(tmpDir, 'RELEASE.md');
    const result = loadReleaseConfig(filePath);
    expect(result.content).toBe('');
    expect(result.found).toBe(false);
  });

  test('preserves multiline whitespace and trailing newlines verbatim', () => {
    const filePath = path.join(tmpDir, 'RELEASE.md');
    const content = '## Tone\n- thing one\n- thing two\n\n## More\n\nparagraph\n\n\n';
    fs.writeFileSync(filePath, content);
    expect(loadReleaseConfig(filePath).content).toBe(content);
  });

  test('returns empty content for an empty file', () => {
    const filePath = path.join(tmpDir, 'RELEASE.md');
    fs.writeFileSync(filePath, '');
    const result = loadReleaseConfig(filePath);
    expect(result.content).toBe('');
    expect(result.found).toBe(true);
  });

  test('returns empty content when filePath is not a regular file (e.g., directory)', () => {
    const result = loadReleaseConfig(tmpDir);
    expect(result.content).toBe('');
    expect(result.found).toBe(false);
  });
});
