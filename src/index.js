const core = require('@actions/core');
const { generateChangelog } = require('./changelogGenerator');

async function run() {
  try {
    const previousVersion = core.getInput('previous_version', { required: false });
    const currentVersion = core.getInput('current_version', { required: false });

    const changelog = await generateChangelog(previousVersion, currentVersion);

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

run();
