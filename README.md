# Generate Changelog Action

[![Tests](https://github.com/Digital-Gravy/action-generate-changelog/actions/workflows/test.yml/badge.svg)](https://github.com/Digital-Gravy/action-generate-changelog/actions/workflows/test.yml)

A GitHub Action that generates a changelog between two git tags. Two modes:

- **v1 (raw)** — emits one HTML `<details>` accordion per commit. No external dependencies.
- **v2 (LLM-refined)** — feeds the commit list (and any Linear ticket metadata) to OpenAI and emits polished, user-facing release notes with a 2–3 paragraph summary on top and bullets categorized as `**New:** / **Improvement:** / **Fix:** / **Breaking:**`. Repo-specific tone and conventions come from a `RELEASE.md` at the repo root.

The mode is gated on the presence of the `OPENAI_API_KEY` environment variable:
- absent → v1 mode (raw)
- present → v2 mode (LLM-refined; falls through to v1 output on any LLM failure with a `core.warning`)

The output name (`changelog`) is the same in both modes, so v1 consumers can upgrade to v2 by adding secrets — no workflow restructuring needed.

## Usage

### Minimal (v1 mode — raw accordion output)

```yaml
- name: Generate Changelog
  uses: Digital-Gravy/action-generate-changelog@v2
  with:
    previous_version: ${{ steps.bump_version.outputs.old_version }}
```

### LLM-refined (v2 mode)

```yaml
- name: Generate Changelog
  id: changelog
  uses: Digital-Gravy/action-generate-changelog@v2
  with:
    previous_version: ${{ steps.bump_version.outputs.old_version }}
    release_config_file: ./RELEASE.md
    openai_model: gpt-5.4-mini       # or gpt-5.4 for higher quality
    openai_reasoning: ''             # 'low' | 'medium' | 'high' for gpt-5 reasoning models
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    LINEAR_API_KEY: ${{ secrets.LINEAR_API_KEY }}   # optional; enables ticket enrichment
```

The consuming workflow must check out the repo with `fetch-depth: 0` so the action can read full git history and tags:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

## Inputs

| Input | Description | Mode | Required | Default |
| --- | --- | --- | --- | --- |
| `previous_version` | Previous version tag (e.g. `1.4.17`). Accepts either bare or `v`-prefixed forms; the action resolves whichever tag exists. | both | No | — |
| `current_version` | Target version tag. Empty string = `HEAD`. | both | No | `HEAD` |
| `ticket_pattern` | Regex used to extract project-management ticket IDs from commit subjects and bodies. | v2 | No | `[A-Z]{2,10}-\d+` |
| `release_config_file` | Path (relative to repo root) of the consumer's `RELEASE.md`. Read verbatim and passed to the LLM as project guidance. | v2 | No | `./RELEASE.md` |
| `openai_model` | OpenAI model to use. | v2 | No | `gpt-5.4-mini` |
| `openai_reasoning` | Reasoning effort for gpt-5 reasoning models: `low` / `medium` / `high`. Leave empty for non-reasoning models. | v2 | No | `''` |
| `openai_max_completion_tokens` | Cap on completion tokens (includes reasoning tokens for reasoning models). Defaults: 2000 without reasoning, 16000 with reasoning. | v2 | No | `''` |

## Outputs

| Output | Description |
| --- | --- |
| `changelog` | Final changelog content. In v2 mode: polished markdown ready for a GitHub release body. In v1 mode: list of `<details>` accordion blocks. |

## Environment / secrets

| Variable | Required | Effect |
| --- | --- | --- |
| `OPENAI_API_KEY` | only for v2 | Presence selects v2 mode. Absence → v1 mode. |
| `LINEAR_API_KEY` | optional | If set in v2 mode, the action looks up referenced Linear tickets (`ETC-XXX` style IDs by default) and passes their title / description / state to the LLM. Without it, v2 still runs but with no ticket enrichment. |
| `OPENAI_MODEL` | optional | Overrides the `openai_model` input. |
| `OPENAI_REASONING` | optional | Overrides the `openai_reasoning` input. |

Permissions needed:
- **OpenAI key**: minimal restricted key with `chat.completions: Request`. Use a service-account key inside a dedicated project. Set a project-level monthly cap.
- **Linear key**: personal API key with read access to the team(s) containing your tickets. Read-only is sufficient — the action never writes.

## v2 mode: how the pipeline works

1. `git log <previous_version>..<current_version>` — gather commits.
2. Filter `[hide]`, `[ignore]`, `bump version` commits.
3. Extract ticket IDs via `ticket_pattern`.
4. If `LINEAR_API_KEY` set, fetch ticket title / description / state via GraphQL (per-ticket `Promise.allSettled` so any single failure degrades silently).
5. Read `RELEASE.md` from the consumer repo's root.
6. Build a prompt (static system prompt + dynamic project guidance + commit JSON + ticket metadata).
7. Call OpenAI with a strict `json_schema` response format — output is forced into `{ summary: string, items: [{ category, text }] }`.
8. Render to final markdown: summary paragraph(s), then bullets grouped `Breaking → New → Improvement → Fix`.

If any step in 5–8 fails (LLM timeout, schema violation, network error), the action emits a `core.warning` describing what happened and falls through to v1 output. A release is never blocked by an LLM hiccup.

## v2 mode: the `RELEASE.md` contract

`RELEASE.md` at the consuming repo's root is the project-specific style guide. It's read verbatim and passed to the LLM. There is **no required schema** — it's free-form markdown prose.

A useful `RELEASE.md` describes:
- audience (who reads these notes)
- tone (formal / casual, marketing / technical)
- category labels and ordering
- summary paragraph length
- what to call out, what to suppress
- canonical product/feature names
- inline-code rules
- ticket-ID inclusion preference
- breaking-change conventions
- transformation examples (raw commit → bullet)
- feature-flag → user-feature mapping (so flag-flip commits become bullets about the user-facing feature they gate)

The richer the `RELEASE.md`, the better the LLM output. See `eval/etch-RELEASE.md` in this repo for a real-world example.

## Commit conventions

The action understands conventional-commit-style subjects (`feat:`, `fix:`, `refactor:` etc.) and uses them as hints, but doesn't strictly require them. In v2 mode the LLM rewrites commits into user-facing bullets regardless of subject convention.

### Hidden / ignored commits

The following are dropped before the LLM (or v1 generator) sees them:

- Subjects starting with `hide:`, `ignore:`, or `bump version` (case-insensitive)
- Subjects ending with `[hide]` or `[ignore]` (case-insensitive)

Use these to suppress internal commits, doc fixes, CI changes, etc. that you don't want reaching readers.

## Special cases

### First release

Omit `previous_version` (or set it to an empty string) and the action falls back to the first commit in the repo.

### Prerelease → stable

When generating from a prerelease tag (e.g. `1.0.0-rc.1`) to a stable tag (e.g. `1.0.0`), the v1 path automatically rolls the range back to the earliest prerelease so changes since the last stable release are all included.

## Eval harness

`eval/` contains a snapshot/replay harness for iterating prompts against historical releases without burning credits unnecessarily:

- `eval/eval-runner.js --snapshot --target-repo <path>` freezes git + Linear inputs to `eval/gold/<version>/input.json`. Run once per version.
- `eval/eval-runner.js --release-config <path>` (default mode) reads frozen inputs, calls OpenAI, writes `eval/actual/<version>.md`. Hermetic. Per-run token totals printed to stderr.
- `eval/eval-judge.js` scores actual vs gold on faithfulness / categorization / conciseness / tone using a stronger judge model.

See `eval/README.md` for details.

## License

GPLv3 — see LICENSE file for details.
