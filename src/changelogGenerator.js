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

function findEarliestPrerelease(version) {
  const baseVersion = version.split('-')[0]; // Get the base version without prerelease
  const tags = execSync('git tag -l').toString().trim().split('\n');
  return tags
    .filter((tag) => {
      const cleaned = semver.clean(tag);
      return cleaned && isPrerelease(cleaned) && cleaned.startsWith(baseVersion);
    })
    .sort((a, b) => {
      // Use semver compare for proper version sorting
      return semver.compare(semver.clean(a), semver.clean(b));
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

        // If going from prerelease to stable, use earliest prerelease instead
        if (isPrerelease(fromRef) && isStableVersion(targetRef)) {
          const earliestPrerelease = findEarliestPrerelease(targetRef);
          if (earliestPrerelease) {
            fromRef = semver.clean(earliestPrerelease);
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

    // Get commit data including both subject and body
    const gitLogCommand = `git log ${fromRef}..${targetRef} --pretty=format:"%s%n%b%n---COMMIT_SEPARATOR---"`;
    const commitData = execSync(gitLogCommand).toString();

    // Parse commits from the git log output
    const commits = commitData
      .split('---COMMIT_SEPARATOR---')
      .filter((commit) => commit.trim())
      .map((commit) => {
        const lines = commit.trim().split('\n');
        const subject = lines[0] || '';
        const body = lines.slice(1).join('\n').trim();
        return { subject, body };
      })
      .filter((commit) => {
        const lowerSubject = commit.subject.toLowerCase();
        return (
          commit.subject.trim() &&
          !lowerSubject.startsWith('hide:') &&
          !lowerSubject.startsWith('bump version') &&
          !lowerSubject.endsWith('[hide]')
        );
      });

    // Generate changelog with unified accordion format
    const filteredChangelog = commits
      .map((commit) => {
        const subject = commit.subject.trim();
        const body = commit.body.trim();

        // Use accordion format for all commits
        if (!body) {
          // Empty body - just show the summary without expandable content
          return `<details>
<summary>${subject}</summary>
</details>`;
        }

        // Commit with body - full accordion format
        return `<details>
<summary>${subject}</summary>

${body}

</details>`;
      })
      .join('\n\n');

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
