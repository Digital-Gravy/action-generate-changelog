const core = require('@actions/core');
const { generateChangelog: generateV1 } = require('./changelogGenerator');
const { getCommits } = require('./lib/git-log');
const { filterCommits } = require('./lib/filter-commits');
const { extractTickets } = require('./lib/extract-tickets');
const { loadReleaseConfig } = require('./lib/load-release-config');
const { fetchTickets } = require('./lib/linear-client');
const { buildPrompt } = require('./lib/build-prompt');
const { callOpenAI, createClient } = require('./lib/openai-client');
const { validateResponse } = require('./lib/validate-response');
const { renderMarkdown } = require('./lib/render-markdown');

const DEFAULT_TICKET_PATTERN = '[A-Z]{2,10}-\\d+';
const DEFAULT_RELEASE_CONFIG = './RELEASE.md';
const DEFAULT_MODEL = 'gpt-5.4-mini';

async function generateV2({
  previousVersion,
  currentVersion,
  ticketPattern,
  releaseConfigFile,
  openaiModel,
  openaiReasoning,
  openaiMaxCompletionTokens,
  openaiKey,
  linearKey,
  openaiClient,
}) {
  const rawCommits = getCommits(previousVersion, currentVersion);
  const filtered = filterCommits(rawCommits);
  if (filtered.length === 0) return '';

  const { commits, uniqueTicketIds } = extractTickets(filtered, ticketPattern);
  const { content: releaseConfigContent, found } = loadReleaseConfig(releaseConfigFile);
  if (!found) core.warning(`RELEASE.md not found at ${releaseConfigFile}; proceeding without project guidance.`);

  const ticketMap =
    linearKey && uniqueTicketIds.length > 0
      ? await fetchTickets(uniqueTicketIds, { apiKey: linearKey })
      : new Map();

  const { messages } = buildPrompt({
    releaseConfigContent,
    previousVersion,
    currentVersion: currentVersion || 'HEAD',
    commits,
    ticketMap,
  });

  const client = openaiClient || createClient(openaiKey);
  const response = await callOpenAI({
    model: openaiModel,
    messages,
    client,
    reasoningEffort: openaiReasoning || undefined,
    maxCompletionTokens: openaiMaxCompletionTokens ? Number(openaiMaxCompletionTokens) : undefined,
  });
  const validated = validateResponse(response);
  return renderMarkdown(validated);
}

async function run({ env = process.env, v1 = generateV1, v2 = generateV2 } = {}) {
  try {
    const previousVersion = core.getInput('previous_version', { required: false });
    const currentVersion = core.getInput('current_version', { required: false });
    const ticketPattern = core.getInput('ticket_pattern') || DEFAULT_TICKET_PATTERN;
    const releaseConfigFile = core.getInput('release_config_file') || DEFAULT_RELEASE_CONFIG;
    const openaiModel = core.getInput('openai_model') || DEFAULT_MODEL;
    const openaiReasoning = core.getInput('openai_reasoning') || '';
    const openaiMaxCompletionTokens = core.getInput('openai_max_completion_tokens') || '';
    const openaiKey = env.OPENAI_API_KEY;
    const linearKey = env.LINEAR_API_KEY;

    let changelog;
    if (openaiKey) {
      try {
        changelog = await v2({
          previousVersion,
          currentVersion,
          ticketPattern,
          releaseConfigFile,
          openaiModel,
          openaiReasoning,
          openaiMaxCompletionTokens,
          openaiKey,
          linearKey,
        });
      } catch (e) {
        core.warning(
          `v2 changelog refinement failed (${e.message}); falling back to v1 output.`
        );
        changelog = await v1(previousVersion, currentVersion);
      }
    } else {
      changelog = await v1(previousVersion, currentVersion);
    }

    core.info('Here is the generated changelog');
    core.info('═══════════════════════════════');
    if ('' === changelog) {
      core.notice('The changelog is empty');
    } else {
      core.info(changelog);
    }
    core.setOutput('changelog', changelog);
  } catch (error) {
    core.setFailed(error.message);
  }
}

if (require.main === module) {
  run();
}

module.exports = { run, generateV2 };
