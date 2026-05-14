const SCHEMA = {
  type: 'object',
  required: ['summary', 'items'],
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['category', 'text'],
        additionalProperties: false,
        properties: {
          category: { type: 'string', enum: ['Breaking', 'New', 'Improvement', 'Fix'] },
          text: { type: 'string' },
        },
      },
    },
  },
};

const RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'changelog_response',
    strict: true,
    schema: SCHEMA,
  },
};

function createClient(apiKey, { timeout = 60_000 } = {}) {
  const OpenAI = require('openai');
  const ctor = OpenAI.default || OpenAI;
  return new ctor({ apiKey, timeout });
}

async function callOpenAI({ model, messages, client, reasoningEffort, maxCompletionTokens, returnMeta }) {
  // Reasoning tokens count against max_completion_tokens, so bump the default
  // when reasoning is enabled. Medium reasoning on a 20-50 commit release can
  // burn 5-10k tokens before producing the final JSON.
  const defaultMax = reasoningEffort ? 16000 : 2000;
  const params = {
    model,
    messages,
    response_format: RESPONSE_FORMAT,
    max_completion_tokens: maxCompletionTokens || defaultMax,
  };
  if (reasoningEffort) {
    params.reasoning_effort = reasoningEffort;
  }
  const response = await client.chat.completions.create(params);
  if (!response || !response.choices || !response.choices.length) {
    throw new Error('callOpenAI: empty response from OpenAI');
  }
  const content = response.choices[0].message && response.choices[0].message.content;
  if (typeof content !== 'string') {
    throw new Error('callOpenAI: response message had no string content');
  }
  const parsed = JSON.parse(content);
  if (returnMeta) {
    return { content: parsed, usage: response.usage };
  }
  return parsed;
}

module.exports = { callOpenAI, createClient, SCHEMA, RESPONSE_FORMAT };
