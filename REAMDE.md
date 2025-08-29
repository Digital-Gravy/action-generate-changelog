# Generate Changelog Action

[![Tests](https://github.com/Digital-Gravy/action-generate-changelog/actions/workflows/test.yml/badge.svg)](https://github.com/Digital-Gravy/action-generate-changelog/actions/workflows/test.yml)

A GitHub Action that automatically generates a changelog by analyzing git commits between versions. The action uses conventional commit messages to create a clean, formatted changelog with expandable accordion sections for detailed commit information.

## Features

- Generates changelog from git commit messages
- **Accordion format** with expandable sections for commit details
- Includes both commit titles and bodies (when available)
- Supports semantic versioning (SemVer)
- Handles prerelease versions (e.g., `1.0.0-rc.1`)
- Automatically filters out internal commits (e.g., version bumps and hidden changes)
- Unified format using HTML `<details>` and `<summary>` tags
- Supports emoji, Unicode characters, and special characters in commit messages
- GitHub-compatible expandable sections in releases

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
| `changelog` | Generated changelog content in HTML accordion format |

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

## Output Format

The action generates changelogs in an accordion format using HTML `<details>` and `<summary>` tags, which are natively supported by GitHub:

### Example Output

```html
<details>
<summary>feat: add user authentication system</summary>

Implemented comprehensive user authentication including:
- JWT token management  
- Password hashing with bcrypt
- Session timeout handling
- Multi-factor authentication support

Tested across all supported browsers and devices.

</details>

<details>
<summary>fix: resolve login redirect issue</summary>
</details>

<details>
<summary>chore: update dependencies to latest versions</summary>

Updated all packages to their latest stable versions:
- express: 4.18.0 → 4.19.2
- mongoose: 6.12.0 → 7.5.0
- jsonwebtoken: 8.5.1 → 9.0.2

All tests pass with new versions.

</details>
```

### How It Appears in GitHub

- **Commits with bodies**: Expandable sections showing the title initially, with detailed information revealed when clicked
- **Commits without bodies**: Non-expandable sections showing just the title
- **Consistent formatting**: All commits use the same visual style for a professional appearance

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

### Writing Effective Commit Messages for Accordions

To take full advantage of the accordion format, structure your commits as follows:

**Commit Title (Summary):**
- Keep concise and descriptive (appears in the collapsed accordion)
- Use conventional commit format: `type: brief description`
- Example: `feat: add advanced search functionality`

**Commit Body (Details):**
- Provide detailed explanation (appears when accordion is expanded)
- Include implementation details, reasoning, or impact
- Use bullet points, lists, or paragraphs as needed
- Example:
  ```
  feat: add advanced search functionality
  
  Implemented elasticsearch integration with the following features:
  - Full-text search across all content
  - Faceted filtering by category and date
  - Auto-complete suggestions with fuzzy matching
  - Search result highlighting
  
  Performance testing shows 95% improvement in search speed.
  Breaking change: Old search API endpoints deprecated.
  ```

### Hidden Commits

Commits that start with the following prefixes will be excluded from the changelog:

- `hide:` or `HIDE:`
- `bump version` or `BUMP VERSION`

Commits that end with `[hide]` or `[HIDE]` will also be excluded.

## Special Cases

### First Release

For the first release, you can omit the `previous_version` input or set it to an empty string. The action will automatically use the first commit as the starting point.

### Prerelease to Stable

When generating a changelog from a prerelease version (e.g., `1.0.0-rc.1`) to a stable version (e.g., `1.0.0`), the action will automatically include all changes since the last stable version.

## License

GPLv3 - see LICENSE file for details
