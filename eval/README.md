# Changelog refinement eval harness

Iterates v2 over historical etch (or other consumer) releases and compares to human-polished gold.

## Adding a gold version

1. Pick a released tag of the consumer repo (e.g. `v1.4.18` on etch).
2. Make a directory: `eval/gold/v1.4.18/`
3. Write `eval/gold/v1.4.18/meta.json`:
   ```json
   {
     "previous_version": "v1.4.17",
     "current_version": "v1.4.18"
   }
   ```
4. Write `eval/gold/v1.4.18/expected.md` — copy-paste the human-polished release notes (e.g. from https://etchwp.com/changelog).

Optional fields in `meta.json`:
- `ticket_pattern` — regex override for ticket extraction.

## Running

```bash
OPENAI_API_KEY=sk-... LINEAR_API_KEY=lin_... \
  node eval/eval-runner.js \
    --target-repo ~/code/etch \
    --release-config ~/code/etch/RELEASE.md
```

Outputs land in `eval/actual/<version>.md` (gitignored).

Filter to one version with `--only v1.4.18`.

## Manual review

`diff -u eval/gold/v1.4.18/expected.md eval/actual/v1.4.18.md | less`

## LLM-as-judge

For sweeping prompt changes, batch-score with `gpt-5.4`:

```bash
OPENAI_API_KEY=sk-... node eval/eval-judge.js
```

Prints JSON with per-version scores on four axes (faithfulness, categorization, conciseness, tone) plus one-sentence rationales.
