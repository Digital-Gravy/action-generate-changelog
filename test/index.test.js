const core = require('@actions/core');
const { run } = require('../src/index');

jest.mock('@actions/core');

function defaultInputs() {
  return {
    previous_version: 'v1.0.0',
    current_version: 'HEAD',
    ticket_pattern: '[A-Z]{2,10}-\\d+',
    release_config_file: './RELEASE.md',
    openai_model: 'gpt-5.4-mini',
  };
}

function setInputs(inputs) {
  core.getInput.mockImplementation((name) => inputs[name] ?? '');
}

describe('run (action entrypoint)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('v1 mode when OPENAI_API_KEY is absent: calls v1, never v2', async () => {
    setInputs(defaultInputs());
    const v1 = jest.fn().mockResolvedValue('<details>...</details>');
    const v2 = jest.fn();
    await run({ env: {}, v1, v2 });

    expect(v1).toHaveBeenCalledWith('v1.0.0', 'HEAD');
    expect(v2).not.toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith('changelog', '<details>...</details>');
    expect(core.warning).not.toHaveBeenCalled();
  });

  test('v2 mode when OPENAI_API_KEY is present: calls v2, sets output', async () => {
    setInputs(defaultInputs());
    const v2 = jest.fn().mockResolvedValue('A summary.\n\n**New:** thing');
    const v1 = jest.fn();
    await run({ env: { OPENAI_API_KEY: 'sk-test' }, v1, v2 });

    expect(v2).toHaveBeenCalledTimes(1);
    expect(v1).not.toHaveBeenCalled();
    expect(core.setOutput).toHaveBeenCalledWith('changelog', 'A summary.\n\n**New:** thing');
  });

  test('v2 throws: emits core.warning and falls back to v1 output', async () => {
    setInputs(defaultInputs());
    const v1 = jest.fn().mockResolvedValue('<details>fallback</details>');
    const v2 = jest.fn().mockRejectedValue(new Error('OpenAI 500'));
    await run({ env: { OPENAI_API_KEY: 'sk-test' }, v1, v2 });

    expect(core.warning).toHaveBeenCalled();
    expect(core.warning.mock.calls[0][0]).toMatch(/OpenAI 500/);
    expect(v1).toHaveBeenCalledWith('v1.0.0', 'HEAD');
    expect(core.setOutput).toHaveBeenCalledWith('changelog', '<details>fallback</details>');
  });

  test('passes the resolved inputs (model, ticket_pattern, release_config_file) to v2', async () => {
    setInputs({
      previous_version: 'v2.0.0',
      current_version: 'HEAD',
      ticket_pattern: 'JIRA-\\d+',
      release_config_file: 'docs/RELEASE.md',
      openai_model: 'custom-model',
    });
    const v2 = jest.fn().mockResolvedValue('out');
    await run({ env: { OPENAI_API_KEY: 'sk-test', LINEAR_API_KEY: 'lin' }, v1: jest.fn(), v2 });

    const opts = v2.mock.calls[0][0];
    expect(opts.previousVersion).toBe('v2.0.0');
    expect(opts.currentVersion).toBe('HEAD');
    expect(opts.ticketPattern).toBe('JIRA-\\d+');
    expect(opts.releaseConfigFile).toBe('docs/RELEASE.md');
    expect(opts.openaiModel).toBe('custom-model');
    expect(opts.openaiKey).toBe('sk-test');
    expect(opts.linearKey).toBe('lin');
  });

  test('uses default values when action inputs are empty strings', async () => {
    setInputs({
      previous_version: 'v1.0.0',
      current_version: '',
      ticket_pattern: '',
      release_config_file: '',
      openai_model: '',
    });
    const v2 = jest.fn().mockResolvedValue('out');
    await run({ env: { OPENAI_API_KEY: 'sk' }, v1: jest.fn(), v2 });

    const opts = v2.mock.calls[0][0];
    expect(opts.ticketPattern).toBe('[A-Z]{2,10}-\\d+');
    expect(opts.releaseConfigFile).toBe('./RELEASE.md');
    expect(opts.openaiModel).toBe('gpt-5.4-mini');
  });

  test('handles empty changelog with notice instead of info', async () => {
    setInputs(defaultInputs());
    const v1 = jest.fn().mockResolvedValue('');
    await run({ env: {}, v1, v2: jest.fn() });

    expect(core.notice).toHaveBeenCalledWith('The changelog is empty');
    expect(core.setOutput).toHaveBeenCalledWith('changelog', '');
  });

  test('setFailed is called when a non-fallback error occurs (e.g., v1 throws)', async () => {
    setInputs(defaultInputs());
    const v1 = jest.fn().mockRejectedValue(new Error('catastrophic'));
    await run({ env: {}, v1, v2: jest.fn() });

    expect(core.setFailed).toHaveBeenCalledWith('catastrophic');
  });
});
