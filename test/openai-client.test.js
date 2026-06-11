const mockOpenAICtor = jest.fn();
jest.mock('openai', () => mockOpenAICtor, { virtual: true });

const { callOpenAI, createClient } = require('../src/lib/openai-client');

function fakeClient(returnContent = '{"summary":"s","items":[]}') {
  return {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: returnContent } }],
        }),
      },
    },
  };
}

const MESSAGES = [
  { role: 'system', content: 'sys' },
  { role: 'user', content: 'usr' },
];

describe('callOpenAI', () => {
  test('returns parsed JSON from response content', async () => {
    const client = fakeClient('{"summary":"hello","items":[{"category":"New","text":"x"}]}');
    const out = await callOpenAI({ model: 'gpt-5.4-mini', messages: MESSAGES, client });
    expect(out).toEqual({ summary: 'hello', items: [{ category: 'New', text: 'x' }] });
  });

  test('passes model and messages through to the client', async () => {
    const client = fakeClient();
    await callOpenAI({ model: 'gpt-5.4-mini', messages: MESSAGES, client });
    const args = client.chat.completions.create.mock.calls[0][0];
    expect(args.model).toBe('gpt-5.4-mini');
    expect(args.messages).toEqual(MESSAGES);
  });

  test('requests JSON-schema response_format with strict mode', async () => {
    const client = fakeClient();
    await callOpenAI({ model: 'gpt-5.4-mini', messages: MESSAGES, client });
    const args = client.chat.completions.create.mock.calls[0][0];
    expect(args.response_format.type).toBe('json_schema');
    expect(args.response_format.json_schema.strict).toBe(true);
    expect(args.response_format.json_schema.schema.required).toEqual(['summary', 'items']);
    expect(args.response_format.json_schema.schema.properties.items.items.properties.category.enum)
      .toEqual(['Breaking', 'New', 'Improvement', 'Fix']);
  });

  test('caps completion length via max_completion_tokens', async () => {
    const client = fakeClient();
    await callOpenAI({ model: 'gpt-5.4-mini', messages: MESSAGES, client });
    const args = client.chat.completions.create.mock.calls[0][0];
    expect(args.max_completion_tokens).toBeGreaterThan(0);
  });

  test('does not send temperature (gpt-5 reasoning models reject it)', async () => {
    const client = fakeClient();
    await callOpenAI({ model: 'gpt-5.4-mini', messages: MESSAGES, client });
    const args = client.chat.completions.create.mock.calls[0][0];
    expect(args.temperature).toBeUndefined();
  });

  test('passes reasoning_effort when provided', async () => {
    const client = fakeClient();
    await callOpenAI({
      model: 'gpt-5.4',
      messages: MESSAGES,
      client,
      reasoningEffort: 'medium',
    });
    const args = client.chat.completions.create.mock.calls[0][0];
    expect(args.reasoning_effort).toBe('medium');
  });

  test('omits reasoning_effort when not provided', async () => {
    const client = fakeClient();
    await callOpenAI({ model: 'gpt-5.4-mini', messages: MESSAGES, client });
    const args = client.chat.completions.create.mock.calls[0][0];
    expect(args).not.toHaveProperty('reasoning_effort');
  });

  test('returns parsed content alongside usage metadata when available', async () => {
    const client = {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: '{"summary":"s","items":[]}' } }],
            usage: { prompt_tokens: 1234, completion_tokens: 567, total_tokens: 1801 },
          }),
        },
      },
    };
    const result = await callOpenAI({
      model: 'gpt-5.4',
      messages: MESSAGES,
      client,
      returnMeta: true,
    });
    expect(result.content).toEqual({ summary: 's', items: [] });
    expect(result.usage).toEqual({
      prompt_tokens: 1234,
      completion_tokens: 567,
      total_tokens: 1801,
    });
  });

  test('returns content directly when returnMeta is not set (back-compat)', async () => {
    const client = fakeClient();
    const result = await callOpenAI({ model: 'gpt-5.4-mini', messages: MESSAGES, client });
    expect(result).toEqual({ summary: 's', items: [] });
  });

  test('propagates errors from the client (caller handles fallback)', async () => {
    const client = {
      chat: { completions: { create: jest.fn().mockRejectedValue(new Error('boom')) } },
    };
    await expect(
      callOpenAI({ model: 'gpt-5.4-mini', messages: MESSAGES, client })
    ).rejects.toThrow('boom');
  });

  test('throws when response content is not valid JSON', async () => {
    const client = fakeClient('not json {');
    await expect(
      callOpenAI({ model: 'gpt-5.4-mini', messages: MESSAGES, client })
    ).rejects.toThrow();
  });

  test('throws when response has no choices', async () => {
    const client = {
      chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [] }) } },
    };
    await expect(
      callOpenAI({ model: 'gpt-5.4-mini', messages: MESSAGES, client })
    ).rejects.toThrow();
  });
});

describe('createClient', () => {
  beforeEach(() => mockOpenAICtor.mockClear());

  test('defaults timeout to 60000ms when no options given', () => {
    createClient('sk-test');
    expect(mockOpenAICtor).toHaveBeenCalledWith({ apiKey: 'sk-test', timeout: 60000 });
  });

  test('passes through a custom timeout', () => {
    createClient('sk-test', { timeout: 120000 });
    expect(mockOpenAICtor).toHaveBeenCalledWith({ apiKey: 'sk-test', timeout: 120000 });
  });
});
