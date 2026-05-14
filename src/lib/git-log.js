const { execSync } = require('child_process');

const FS = '\x1f';
const RS = '\x1e';
const FORMAT = `%H${FS}%an${FS}%aI${FS}%s${FS}%b${RS}`;

function getCommits(previousVersion, currentVersion) {
  if (!previousVersion) {
    throw new Error('getCommits: previousVersion is required');
  }
  const target = currentVersion && currentVersion.trim() ? currentVersion : 'HEAD';
  const range = `${previousVersion}..${target}`;
  const cmd = `git log ${range} --pretty=format:${JSON.stringify(FORMAT)}`;
  const output = execSync(cmd).toString();
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
