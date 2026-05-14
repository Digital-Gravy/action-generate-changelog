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

async function callOpenAI({ model, messages, client }) {
  const response = await client.chat.completions.create({
    model,
    messages,
    response_format: RESPONSE_FORMAT,
    temperature: 0.3,
    max_completion_tokens: 2000,
  });
  if (!response || !response.choices || !response.choices.length) {
    throw new Error('callOpenAI: empty response from OpenAI');
  }
  const content = response.choices[0].message && response.choices[0].message.content;
  if (typeof content !== 'string') {
    throw new Error('callOpenAI: response message had no string content');
  }
  return JSON.parse(content);
}

module.exports = { callOpenAI, createClient, SCHEMA, RESPONSE_FORMAT };
