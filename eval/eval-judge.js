#!/usr/bin/env node
/**
 * LLM-as-judge scorer.
 *
 * For each gold/<version>/, compares eval/actual/<version>.md against
 * eval/gold/<version>/expected.md by asking a stronger model to score
 * the actual on four axes (faithfulness, categorization, conciseness,
 * tone) on a 1-5 scale, with a one-sentence rationale per axis.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node eval/eval-judge.js [--only v1.4.18]
 *
 * The judge model is configurable via JUDGE_MODEL env (default: gpt-5.4).
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('../src/lib/openai-client');

const JUDGE_MODEL = process.env.JUDGE_MODEL || 'gpt-5.4';

const JUDGE_SCHEMA = {
  type: 'object',
  required: ['faithfulness', 'categorization', 'conciseness', 'tone'],
  additionalProperties: false,
  properties: {
    faithfulness: scoreAxis('No hallucinated features; no user-facing items missing.'),
    categorization: scoreAxis('Each item is placed in the right Breaking/New/Improvement/Fix bucket.'),
    conciseness: scoreAxis('Bullets are one tight sentence; summary is 2-3 paragraphs of substance.'),
    tone: scoreAxis('Voice and audience match the human-polished expected output.'),
  },
};

function scoreAxis(desc) {
  return {
    type: 'object',
    required: ['score', 'rationale'],
    additionalProperties: false,
    properties: {
      score: { type: 'integer', minimum: 1, maximum: 5, description: desc },
      rationale: { type: 'string' },
    },
  };
}

function buildJudgeMessages(expected, actual) {
  return [
    {
      role: 'system',
      content:
        'You are a release-notes editor evaluating an AI-generated changelog. ' +
        'Compare it to a human-polished gold version and score it on four axes, ' +
        '1 (poor) to 5 (excellent), with a one-sentence rationale per axis. ' +
        'Be strict; reserve 5 for output that is genuinely as good as the gold.',
    },
    {
      role: 'user',
      content:
        `<expected>\n${expected}\n</expected>\n\n` +
        `<actual>\n${actual}\n</actual>`,
    },
  ];
}

async function judge(expected, actual, client) {
  const response = await client.chat.completions.create({
    model: JUDGE_MODEL,
    messages: buildJudgeMessages(expected, actual),
    temperature: 0,
    max_completion_tokens: 1500,
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'judgment', strict: true, schema: JUDGE_SCHEMA },
    },
  });
  return JSON.parse(response.choices[0].message.content);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2).replace(/-/g, '_');
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const only = args.only;

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY must be set');
    process.exit(1);
  }

  const goldDir = path.join(__dirname, 'gold');
  const actualDir = path.join(__dirname, 'actual');

  const versions = fs
    .readdirSync(goldDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((v) => !only || v === only)
    .sort();

  const client = createClient(process.env.OPENAI_API_KEY);
  const summary = [];

  for (const version of versions) {
    const expectedPath = path.join(goldDir, version, 'expected.md');
    const actualPath = path.join(actualDir, `${version}.md`);
    if (!fs.existsSync(actualPath)) {
      process.stderr.write(`[${version}] skipped (no actual)\n`);
      continue;
    }
    const expected = fs.readFileSync(expectedPath, 'utf8');
    const actual = fs.readFileSync(actualPath, 'utf8');
    process.stderr.write(`[${version}] judging... `);
    try {
      const verdict = await judge(expected, actual, client);
      summary.push({ version, ...verdict });
      const avg =
        (verdict.faithfulness.score +
          verdict.categorization.score +
          verdict.conciseness.score +
          verdict.tone.score) /
        4;
      process.stderr.write(`avg ${avg.toFixed(2)}\n`);
    } catch (e) {
      process.stderr.write(`FAILED: ${e.message}\n`);
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
