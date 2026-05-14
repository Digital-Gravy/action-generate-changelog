#!/usr/bin/env node
/**
 * Historical replay eval harness.
 *
 * Two modes for reproducibility:
 *
 *   --snapshot — for each gold/<v>/, run git-log + filter + extract-tickets
 *     + Linear fetch against a local target repo and write the frozen input
 *     to gold/<v>/input.json. Run this once (or whenever upstream commits/
 *     tickets are intentionally re-evaluated). Requires --target-repo and
 *     LINEAR_API_KEY.
 *
 *   --replay (default) — for each gold/<v>/, load input.json, rebuild the
 *     prompt, call OpenAI, write actual/<v>.md. Hermetic: no git or Linear
 *     access. Requires --release-config and OPENAI_API_KEY.
 *
 * Usage:
 *   # snapshot (writes gold/<v>/input.json)
 *   LINEAR_API_KEY=lin_... node eval/eval-runner.js \
 *     --snapshot --target-repo ~/code/etch [--only 1.4.18]
 *
 *   # replay (writes actual/<v>.md)
 *   OPENAI_API_KEY=sk-... node eval/eval-runner.js \
 *     --release-config ./eval/etch-RELEASE.md [--only 1.4.18]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { getCommits } = require('../src/lib/git-log');
const { filterCommits } = require('../src/lib/filter-commits');
const { extractTickets } = require('../src/lib/extract-tickets');
const { fetchTickets } = require('../src/lib/linear-client');
const { loadReleaseConfig } = require('../src/lib/load-release-config');
const { buildPrompt } = require('../src/lib/build-prompt');
const { callOpenAI, createClient } = require('../src/lib/openai-client');
const { validateResponse } = require('../src/lib/validate-response');
const { renderMarkdown } = require('../src/lib/render-markdown');

const DEFAULT_TICKET_PATTERN = '[A-Z]{2,10}-\\d+';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2).replace(/-/g, '_');
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function expand(p) {
  if (!p) return p;
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : path.resolve(p);
}

async function snapshotOne(versionDir, opts) {
  const meta = JSON.parse(fs.readFileSync(path.join(versionDir, 'meta.json'), 'utf8'));
  const ticketPattern = meta.ticket_pattern || DEFAULT_TICKET_PATTERN;
  const origCwd = process.cwd();
  process.chdir(opts.targetRepo);
  try {
    const raw = getCommits(meta.previous_version, meta.current_version);
    const filtered = filterCommits(raw);
    const { commits, uniqueTicketIds } = extractTickets(filtered, ticketPattern);
    let ticketMap = new Map();
    if (process.env.LINEAR_API_KEY && uniqueTicketIds.length > 0) {
      ticketMap = await fetchTickets(uniqueTicketIds, { apiKey: process.env.LINEAR_API_KEY });
    }
    const snapshot = {
      previous_version: meta.previous_version,
      current_version: meta.current_version,
      commits,
      tickets: Object.fromEntries(ticketMap),
      _meta: {
        snapshotted_at: new Date().toISOString(),
        target_repo: opts.targetRepo,
        commit_count: commits.length,
        ticket_count: ticketMap.size,
      },
    };
    fs.writeFileSync(path.join(versionDir, 'input.json'), JSON.stringify(snapshot, null, 2) + '\n');
    return snapshot._meta;
  } finally {
    process.chdir(origCwd);
  }
}

async function replayOne(versionDir, opts) {
  const inputPath = path.join(versionDir, 'input.json');
  if (!fs.existsSync(inputPath)) {
    throw new Error(`No input.json at ${inputPath} — run --snapshot first`);
  }
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const { content: releaseConfigContent } = loadReleaseConfig(opts.releaseConfig);
  const ticketMap = new Map(Object.entries(input.tickets));
  const { messages } = buildPrompt({
    releaseConfigContent,
    previousVersion: input.previous_version,
    currentVersion: input.current_version,
    commits: input.commits,
    ticketMap,
  });
  const client = createClient(process.env.OPENAI_API_KEY);
  const response = await callOpenAI({
    model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
    messages,
    client,
  });
  return renderMarkdown(validateResponse(response));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.snapshot ? 'snapshot' : 'replay';
  const only = args.only;

  const goldDir = path.join(__dirname, 'gold');
  const versions = fs
    .readdirSync(goldDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((v) => !only || v === only)
    .sort();

  if (versions.length === 0) {
    console.error(`No gold versions under ${goldDir}` + (only ? ` (filter: ${only})` : ''));
    process.exit(1);
  }

  if (mode === 'snapshot') {
    const targetRepo = expand(args.target_repo);
    if (!targetRepo) {
      console.error('--snapshot requires --target-repo <path>');
      process.exit(1);
    }
    for (const v of versions) {
      process.stderr.write(`[${v}] snapshotting... `);
      try {
        const meta = await snapshotOne(path.join(goldDir, v), { targetRepo });
        process.stderr.write(`${meta.commit_count} commits, ${meta.ticket_count} tickets\n`);
      } catch (e) {
        process.stderr.write(`FAILED: ${e.message}\n`);
      }
    }
    return;
  }

  // replay
  const releaseConfig = expand(args.release_config);
  if (!releaseConfig) {
    console.error('--replay requires --release-config <path>');
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY must be set for replay');
    process.exit(1);
  }

  const actualDir = path.join(__dirname, 'actual');
  fs.mkdirSync(actualDir, { recursive: true });

  for (const v of versions) {
    process.stderr.write(`[${v}] replaying... `);
    try {
      const output = await replayOne(path.join(goldDir, v), { releaseConfig });
      const outPath = path.join(actualDir, `${v}.md`);
      fs.writeFileSync(outPath, output);
      process.stderr.write(`wrote ${outPath}\n`);
    } catch (e) {
      process.stderr.write(`FAILED: ${e.message}\n`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
