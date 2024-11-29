const core = require('@actions/core');
const { generateChangelog } = require('./changelogGenerator');

async function run() {
  try {
    const previousVersion = core.getInput('previous-version', { required: false });
    const currentVersion = core.getInput('current-version', { required: false });

    const changelog = await generateChangelog(previousVersion, currentVersion);

    core.setOutput('changelog', changelog);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
