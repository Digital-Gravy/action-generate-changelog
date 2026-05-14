const { callOpenAI } = require('../src/lib/openai-client');

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

  test('uses a low temperature and a max_completion_tokens cap', async () => {
    const client = fakeClient();
    await callOpenAI({ model: 'gpt-5.4-mini', messages: MESSAGES, client });
    const args = client.chat.completions.create.mock.calls[0][0];
    expect(args.temperature).toBeLessThanOrEqual(0.5);
    expect(args.max_completion_tokens).toBeGreaterThan(0);
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
