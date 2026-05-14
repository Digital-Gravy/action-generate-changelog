const { execFileSync } = require('child_process');

const FS = '\x1f';
const RS = '\x1e';
const FORMAT = `%H${FS}%an${FS}%aI${FS}%s${FS}%b${RS}`;

function refExists(ref) {
  try {
    execFileSync('git', ['rev-parse', '--verify', ref], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function resolveRef(ref) {
  if (!ref || ref === 'HEAD') return ref;
  if (refExists(ref)) return ref;
  const toggled = ref.startsWith('v') ? ref.slice(1) : `v${ref}`;
  if (refExists(toggled)) return toggled;
  return ref;
}

function getCommits(previousVersion, currentVersion) {
  if (!previousVersion) {
    throw new Error('getCommits: previousVersion is required');
  }
  const target = currentVersion && currentVersion.trim() ? currentVersion : 'HEAD';
  const from = resolveRef(previousVersion);
  const to = resolveRef(target);
  const range = `${from}..${to}`;
  const output = execFileSync('git', ['log', range, `--pretty=format:${FORMAT}`]).toString();
  return parseGitOutput(output);
}

function parseGitOutput(output) {
  if (!output) return [];
  return output
    .split(RS)
    .map((rec) => rec.trim())
    .filter((rec) => rec.length > 0)
    .map((rec) => {
      const [hash, author, date, subject, ...bodyParts] = rec.split(FS);
      return {
        hash: hash || '',
        author: author || '',
        date: date || '',
        subject: subject || '',
        body: (bodyParts.join(FS) || '').trim(),
      };
    });
}

module.exports = { getCommits, parseGitOutput };
