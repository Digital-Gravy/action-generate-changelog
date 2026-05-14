const DROP_PREFIXES = ['hide:', 'ignore:', 'bump version'];
const DROP_SUFFIXES = ['[hide]', '[ignore]'];

function shouldDrop(subject) {
  const trimmed = subject.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  if (DROP_PREFIXES.some((p) => lower.startsWith(p))) return true;
  if (DROP_SUFFIXES.some((s) => lower.endsWith(s))) return true;
  return false;
}

function filterCommits(commits) {
  return commits.filter((c) => !shouldDrop(c.subject));
}

module.exports = { filterCommits };
