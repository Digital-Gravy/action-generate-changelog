const { execSync } = require('child_process');
const semver = require('semver');

function isPrerelease(version) {
  return version && semver.prerelease(version) !== null;
}

function isStableVersion(version) {
  return version && semver.valid(version) && !isPrerelease(version);
}

function validateVersion(version) {
  // Skip validation for empty/undefined versions (they're handled elsewhere)
  if (!version) return;

  // Clean the version string (removes 'v' prefix if present)
  const cleaned = semver.clean(version);

  if (!semver.valid(cleaned)) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return cleaned;
}

function findLastStableVersion() {
  const tags = execSync('git tag -l').toString().trim().split('\n');
  return tags
    .filter((tag) => {
      const cleaned = semver.clean(tag);
      return cleaned && !isPrerelease(cleaned);
    })
    .sort((a, b) => {
      // Use semver compare for proper version sorting
      return semver.rcompare(semver.clean(a), semver.clean(b));
    })[0];
}

function validateVersionOrder(previous, current) {
  // Skip validation if using HEAD or first commit
  if (!previous || !current || current === 'HEAD') return;

  if (semver.gt(previous, current)) {
    throw new Error(`Previous version (${previous}) is newer than current version (${current})`);
  }
}

async function generateChangelog(previousVersion, currentVersion) {
  try {
    // Validate and clean versions if provided
    const cleanedPrevious = previousVersion ? validateVersion(previousVersion) : null;
    const cleanedCurrent = currentVersion ? validateVersion(currentVersion) : null;

    // Validate version order
    validateVersionOrder(cleanedPrevious, cleanedCurrent);

    // Use HEAD if currentVersion is empty/undefined/null
    const targetRef = cleanedCurrent || 'HEAD';

    // Get first commit hash if previousVersion is empty/undefined/null
    let fromRef = cleanedPrevious;
    if (fromRef) {
      try {
        // Verify the tag exists
        execSync(`git rev-parse --verify ${fromRef}`);

        // If going from prerelease to stable, use last stable version instead
        if (isPrerelease(fromRef) && isStableVersion(targetRef)) {
          const lastStable = findLastStableVersion();
          if (lastStable) {
            fromRef = lastStable;
          }
        }
      } catch (error) {
        // Check if this is the first release
        const existingTags = execSync('git tag -l').toString().trim();
        const tagList = existingTags.split('\n').filter((tag) => tag);

        // If there are other tags (excluding current version), this is an error
        if (tagList.length > 0 && !(tagList.length === 1 && tagList[0] === currentVersion)) {
          throw new Error(
            `Previous version ${fromRef} not found, and this is not the first release`
          );
        }

        // First release - use first commit
        fromRef = execSync('git rev-list --max-parents=0 HEAD').toString().trim();
      }
    } else {
      fromRef = execSync('git rev-list --max-parents=0 HEAD').toString().trim();
    }

    // Add bullet points in the git log command format
    const gitLogCommand = `git log ${fromRef}..${targetRef} --pretty=format:"* %s"`;
    const changelog = execSync(gitLogCommand).toString();

    // Filter out unwanted commits and empty lines
    const filteredChangelog = changelog
      .split('\n')
      .filter((line) => line.trim()) // Remove empty lines
      .filter((line) => {
        const lowerLine = line.toLowerCase();
        return !lowerLine.startsWith('* hide:') && !lowerLine.startsWith('* bump version');
      })
      .reduce((acc, line) => {
        line = line.trim();

        // Standardize bullet points
        if (line.startsWith('**')) line = line.substring(1); // Remove extra asterisk
        if (line.startsWith('+')) line = '*' + line.substring(1); // Replace + with *

        // If line doesn't start with *, it's a continuation of the previous line
        if (!line.startsWith('*')) {
          if (acc.length > 0) {
            acc[acc.length - 1] += ' ' + line;
          }
          return acc;
        }

        // Ensure space after asterisk
        if (!line.startsWith('* ')) {
          line = line.replace('*', '* ');
        }

        // Only add non-empty bullet points
        if (line.trim() !== '*' && line.trim() !== '* ') {
          acc.push(line);
        }

        return acc;
      }, [])
      .join('\n');

    return filteredChangelog;
  } catch (error) {
    if (
      error.message.includes('Invalid version format') ||
      error.message.includes('not the first release') ||
      error.message.includes('is newer than current version')
    ) {
      throw error;
    }
    return '';
  }
}

module.exports = { generateChangelog };
