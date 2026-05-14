#!/usr/bin/env node
/**
 * Historical replay eval harness.
 *
 * Iterates over eval/gold/<version>/ directories, runs the v2 pipeline
 * against a local etch (or other) checkout for each version range, writes
 * results to eval/actual/<version>.md, and prints a side-by-side diff
 * summary versus the human-polished expected.md.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... LINEAR_API_KEY=lin_... \
 *     node eval/eval-runner.js \
 *       --target-repo ~/code/etch \
 *       --release-config ~/code/etch/RELEASE.md \
 *       [--only v1.4.18]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateV2 } = require('../src/index');

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

function expand(p) {
  if (!p) return p;
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : path.resolve(p);
}

async function runOne(versionDir, opts) {
  const meta = JSON.parse(fs.readFileSync(path.join(versionDir, 'meta.json'), 'utf8'));
  const origCwd = process.cwd();
  process.chdir(opts.targetRepo);
  try {
    return await generateV2({
      previousVersion: meta.previous_version,
      currentVersion: meta.current_version,
      ticketPattern: meta.ticket_pattern || '[A-Z]{2,10}-\\d+',
      releaseConfigFile: opts.releaseConfig,
      openaiModel: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
      openaiKey: process.env.OPENAI_API_KEY,
      linearKey: process.env.LINEAR_API_KEY,
    });
  } finally {
    process.chdir(origCwd);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targetRepo = expand(args.target_repo || args.etch_repo);
  const releaseConfig = expand(args.release_config);
  const only = args.only;

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY must be set');
    process.exit(1);
  }
  if (!targetRepo) {
    console.error('--target-repo <path> is required');
    process.exit(1);
  }
  if (!releaseConfig) {
    console.error('--release-config <path> is required');
    process.exit(1);
  }

  const goldDir = path.join(__dirname, 'gold');
  const actualDir = path.join(__dirname, 'actual');
  fs.mkdirSync(actualDir, { recursive: true });

  const versions = fs
    .readdirSync(goldDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((v) => !only || v === only)
    .sort();

  if (versions.length === 0) {
    console.error(`No gold versions found under ${goldDir}` + (only ? ` (filter: ${only})` : ''));
    process.exit(1);
  }

  for (const version of versions) {
    process.stderr.write(`[${version}] running... `);
    try {
      const output = await runOne(path.join(goldDir, version), { targetRepo, releaseConfig });
      const outPath = path.join(actualDir, `${version}.md`);
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
