const fs = require('fs');
const path = require('path');

const SYSTEM_PROMPT_PATH = path.join(__dirname, '..', 'prompts', 'system.md');

function loadSystemPrompt() {
  return fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8');
}

function pluralize(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function attachTickets(commit, ticketMap) {
  const tickets = (commit.ticketIds || []).map((id) => {
    const t = ticketMap.get(id);
    return t || { id };
  });
  return {
    subject: commit.subject,
    body: commit.body,
    tickets,
  };
}

function buildPrompt({ releaseConfigContent, previousVersion, currentVersion, commits, ticketMap }) {
  const system = loadSystemPrompt();

  const ticketCount = ticketMap ? ticketMap.size : 0;
  const ctx = `Previous version: ${previousVersion}\nCurrent version: ${currentVersion}\nContains ${pluralize(commits.length, 'commit')} across ${pluralize(ticketCount, 'ticket')}.`;

  const commitJson = JSON.stringify(
    commits.map((c) => attachTickets(c, ticketMap || new Map())),
    null,
    2
  );

  const user =
    `<project_guidance>${releaseConfigContent}</project_guidance>\n\n` +
    `<release_context>\n${ctx}\n</release_context>\n\n` +
    `<commits>\n${commitJson}\n</commits>`;

  return {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
}

module.exports = { buildPrompt };
