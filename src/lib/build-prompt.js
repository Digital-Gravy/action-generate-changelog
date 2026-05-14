const fs = require('fs');
const path = require('path');

// Try both layouts:
// - running from source (__dirname = src/lib): ../prompts/system.md
// - running from bundled dist (__dirname = dist): ../src/prompts/system.md
const SYSTEM_PROMPT_CANDIDATES = [
  path.join(__dirname, '..', 'prompts', 'system.md'),
  path.join(__dirname, '..', 'src', 'prompts', 'system.md'),
];

function loadSystemPrompt() {
  for (const candidate of SYSTEM_PROMPT_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, 'utf8');
    }
  }
  throw new Error(
    `system.md not found in any of: ${SYSTEM_PROMPT_CANDIDATES.join(', ')}`
  );
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
