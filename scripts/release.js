#!/usr/bin/env node

/* eslint-disable no-console */

const { execSync } = require('child_process');
const { exit } = require('process');

// Get version from command line argument
const version = process.argv[2];

// Validate version format
if (!version || !/^v\d+\.\d+\.\d+$/.test(version)) {
  console.error('Please provide a valid version number (e.g., v1.0.0)');
  exit(1);
}

// Extract major version (v1.0.0 -> v1)
const majorVersion = version.match(/^(v\d+)/)[1];

// Helper to run commands
function run(command) {
  console.log(`\n> ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error('Command failed');
    exit(1);
  }
}

console.log('\n🚀 Starting release process...');

// Run tests and checks
console.log('\n📋 Running checks...');
run('npm run lint');
run('npm test');

// Build the action
console.log('\n🔨 Building action...');
run('npm run build');

// Commit dist
console.log('\n📦 Committing build...');
run('git add dist/');
run(`git commit -m "Build for ${version}" || true`);
run('git push');

// Create and push tags
console.log('\n🏷️  Creating tags...');
run(`git tag -a ${version} -m "Release ${version}"`);
run(`git tag -fa ${majorVersion} -m "Update ${majorVersion} tag"`);

console.log('\n📤 Pushing tags...');
run(`git push origin ${version}`);
run(`git push origin ${majorVersion} --force`);

console.log('\n✅ Release process complete!');
console.log('\nNext steps:');
console.log('1. Go to GitHub repository');
console.log('2. Navigate to Releases');
console.log('3. Create a new release using the pushed tag');
console.log(`4. Add release notes for ${version}\n`);
