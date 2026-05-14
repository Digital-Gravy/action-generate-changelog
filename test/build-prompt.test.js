const fs = require('fs');
const path = require('path');
const { buildPrompt } = require('../src/lib/build-prompt');

const SAMPLE_COMMITS = [
  {
    hash: 'abc',
    subject: 'feat(ETC-1): add login',
    body: 'closes ETC-1',
    ticketIds: ['ETC-1'],
  },
  {
    hash: 'def',
    subject: 'fix: handle empty state',
    body: '',
    ticketIds: [],
  },
];

const SAMPLE_TICKETS = new Map([
  ['ETC-1', { id: 'ETC-1', title: 'Add login', description: 'desc', state: 'Done' }],
]);

function callBuild(overrides = {}) {
  return buildPrompt({
    releaseConfigContent: 'Project guidance here.\n\nAudience: builders.',
    previousVersion: 'v1.2.3',
    currentVersion: 'HEAD',
    commits: SAMPLE_COMMITS,
    ticketMap: SAMPLE_TICKETS,
    ...overrides,
  });
}

describe('buildPrompt', () => {
  test('returns a messages array with system then user role', () => {
    const { messages } = callBuild();
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  test('system content matches the bundled system.md', () => {
    const fs = require('fs');
    const path = require('path');
    const expected = fs.readFileSync(
      path.join(__dirname, '..', 'src', 'prompts', 'system.md'),
      'utf8'
    );
    const { messages } = callBuild();
    expect(messages[0].content).toBe(expected);
  });

  test('user content wraps project guidance in <project_guidance> tags', () => {
    const { messages } = callBuild();
    expect(messages[1].content).toContain('<project_guidance>');
    expect(messages[1].content).toContain('Project guidance here.');
    expect(messages[1].content).toContain('Audience: builders.');
    expect(messages[1].content).toContain('</project_guidance>');
  });

  test('user content wraps release context in <release_context> tags', () => {
    const { messages } = callBuild();
    expect(messages[1].content).toMatch(/<release_context>[\s\S]*<\/release_context>/);
    expect(messages[1].content).toContain('v1.2.3');
  });

  test('release context includes commit and ticket counts', () => {
    const { messages } = callBuild();
    const ctx = messages[1].content.match(/<release_context>([\s\S]*?)<\/release_context>/)[1];
    expect(ctx).toMatch(/2 commits/);
    expect(ctx).toMatch(/1 ticket/);
  });

  test('user content wraps commits as JSON in <commits> tags', () => {
    const { messages } = callBuild();
    const block = messages[1].content.match(/<commits>([\s\S]*?)<\/commits>/);
    expect(block).not.toBeNull();
    const parsed = JSON.parse(block[1]);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  test('commit JSON includes attached ticket details from ticketMap', () => {
    const { messages } = callBuild();
    const block = messages[1].content.match(/<commits>([\s\S]*?)<\/commits>/)[1];
    const parsed = JSON.parse(block);
    expect(parsed[0].tickets).toEqual([
      { id: 'ETC-1', title: 'Add login', description: 'desc', state: 'Done' },
    ]);
  });

  test('commits without ticket IDs serialize with empty tickets array', () => {
    const { messages } = callBuild();
    const parsed = JSON.parse(messages[1].content.match(/<commits>([\s\S]*?)<\/commits>/)[1]);
    expect(parsed[1].tickets).toEqual([]);
  });

  test('commit ticketIds without a Linear match get a tickets entry with just the id', () => {
    const { messages } = callBuild({
      commits: [{ subject: 'feat: x', body: '', ticketIds: ['ETC-999'] }],
      ticketMap: new Map(),
    });
    const parsed = JSON.parse(messages[1].content.match(/<commits>([\s\S]*?)<\/commits>/)[1]);
    expect(parsed[0].tickets).toEqual([{ id: 'ETC-999' }]);
  });

  test('handles empty RELEASE.md content gracefully', () => {
    const { messages } = callBuild({ releaseConfigContent: '' });
    expect(messages[1].content).toContain('<project_guidance></project_guidance>');
  });

  test('handles empty commits list', () => {
    const { messages } = callBuild({ commits: [], ticketMap: new Map() });
    const parsed = JSON.parse(messages[1].content.match(/<commits>([\s\S]*?)<\/commits>/)[1]);
    expect(parsed).toEqual([]);
  });

  // REGRESSION: when bundled via esbuild, __dirname becomes dist/ so the original
  // path ../prompts/system.md resolves to <repo>/prompts/system.md (wrong — the file
  // is at <repo>/src/prompts/system.md). The action loader must accept either layout.
  test('REGRESSION: loads system.md from both src/lib and dist relative layouts', () => {
    const srcLibPath = path.join(__dirname, '..', 'src', 'lib', 'build-prompt.js');
    const buildPromptSrc = fs.readFileSync(srcLibPath, 'utf8');

    // Find the candidate list in the source — must include at least two entries
    // covering BOTH the src/lib-relative and the dist-relative path.
    const hasSrcLibLayout = /\.\.\/prompts\/system\.md/.test(buildPromptSrc) || /'\.\.', 'prompts'/.test(buildPromptSrc);
    const hasDistLayout = /\.\.\/src\/prompts\/system\.md/.test(buildPromptSrc) || /'\.\.', 'src', 'prompts'/.test(buildPromptSrc);

    expect(hasSrcLibLayout).toBe(true);
    expect(hasDistLayout).toBe(true);
  });
});
