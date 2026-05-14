const fs = require('fs');

function loadReleaseConfig(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) return { content: '', found: false };
    return { content: fs.readFileSync(filePath, 'utf8'), found: true };
  } catch {
    return { content: '', found: false };
  }
}

module.exports = { loadReleaseConfig };
