# Generate Changelog Action

[![Tests](https://github.com/Digital-Gravy/action-generate-changelog/actions/workflows/test.yml/badge.svg)](https://github.com/Digital-Gravy/action-generate-changelog/actions/workflows/test.yml)

A GitHub Action that automatically generates a changelog by analyzing git commits between versions. The action uses conventional commit messages to create a clean, formatted changelog.

## Features

- Generates changelog from git commit messages
- Supports semantic versioning (SemVer)
- Handles prerelease versions (e.g., `1.0.0-rc.1`)
- Automatically filters out internal commits (e.g., version bumps and hidden changes)
- Properly formats commit messages with consistent bullet points
- Supports emoji, Unicode characters, and special characters in commit messages

## Usage

Add the following step to your workflow:

```yaml
- name: Generate Changelog
  uses: Digital-Gravy/action-generate-changelog@v1
  with:
    previous_version: ${{ github.event.inputs.previous_version }}
    current_version: ${{ github.event.inputs.current_version }}
```

### Inputs

| Input              | Description                          | Required | Default |
| ------------------ | ------------------------------------ | -------- | ------- |
| `previous_version` | Previous version tag (e.g., '1.0.0') | Yes      | -       |
| `current_version`  | New version tag (e.g., '1.1.0')      | Yes      | -       |

### Outputs

| Output      | Description                 |
| ----------- | --------------------------- |
| `changelog` | Generated changelog content |

### Example Workflow

Here's an example of a workflow that uses this action to generate a changelog:

```yaml
name: Generate Changelog

on:
  push:
    branches:
      - main

jobs:
  generate-changelog:
    uses: Digital-Gravy/action-generate-changelog@v1
    with:
      previous_version: ${{ github.event.inputs.previous_version }}
      current_version: ${{ github.event.inputs.current_version }}
```

## Commit Message Format

The action generates changelog entries from commit messages. For best results, follow these conventions:

- Regular commits: `type: message`
  - Example: `feat: add new login system`
- Scoped commits: `type(scope): message`
  - Example: `fix(auth): resolve token validation issue`

### Supported Commit Types

- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

### Hidden Commits

Commits that start with the following prefixes will be excluded from the changelog:

- `hide:` or `HIDE:`
- `bump version` or `BUMP VERSION`

## Special Cases

### First Release

For the first release, you can omit the `previous_version` input or set it to an empty string. The action will automatically use the first commit as the starting point.

### Prerelease to Stable

When generating a changelog from a prerelease version (e.g., `1.0.0-rc.1`) to a stable version (e.g., `1.0.0`), the action will automatically include all changes since the last stable version.

## License

GPLv3 - see LICENSE file for details
