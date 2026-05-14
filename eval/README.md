# Changelog refinement eval harness

Runs v2 over historical releases of a consumer repo (e.g. etch) and compares output to human-polished gold.

## Two-mode design (snapshot + replay)

Eval is split so prompt iteration is hermetic:

- **Snapshot** runs git-log + Linear fetch against a live consumer checkout and freezes the result to `gold/<v>/input.json`. Slow, hits external services. Run once, re-run only when upstream history is deliberately re-evaluated.
- **Replay** loads `input.json`, calls OpenAI, writes `actual/<v>.md`. Fast, deterministic, no git/Linear access. This is the loop you run while iterating on prompts or `etch-RELEASE.md`.

## Adding a gold version

1. Pick a released tag of the consumer repo (e.g. `1.4.18` on etch).
2. `eval/gold/1.4.18/meta.json`:
   ```json
   {
     "previous_version": "1.4.17",
     "current_version": "1.4.18",
     "ticket_pattern": "ETC-\\d+"
   }
   ```
3. `eval/gold/1.4.18/expected.md` — copy-paste the human-polished release notes (e.g. from `https://etchwp.com/changelog/1-4-18/`).
4. Snapshot the input (see below) to produce `input.json`.

## Snapshot — generate input.json (one-time per version)

```bash
LINEAR_API_KEY=lin_... \
  node eval/eval-runner.js --snapshot \
    --target-repo ~/code/etch \
    [--only 1.4.18]
```

Writes `gold/<v>/input.json` with the frozen commit array + Linear ticket metadata. Commit this so replays months from now use identical inputs.

`LINEAR_API_KEY` optional — without it, snapshot still captures commits but `tickets` will be empty.

## Replay — iterate prompts

```bash
OPENAI_API_KEY=sk-... \
  node eval/eval-runner.js \
    --release-config ./eval/etch-RELEASE.md \
    [--only 1.4.18]
```

Writes `actual/<v>.md` for each version. Hermetic — no git/Linear access.

Override the model: `OPENAI_MODEL=gpt-5.4 node eval/eval-runner.js ...`

## Iteration loop

1. Edit `src/prompts/system.md` or `eval/etch-RELEASE.md`.
2. `node eval/eval-runner.js --release-config ./eval/etch-RELEASE.md`
3. Manual diff:
   ```
   diff -u eval/gold/1.4.18/expected.md eval/actual/1.4.18.md | less
   ```
4. Repeat.

## LLM-as-judge

For sweeping prompt changes, batch-score with a stronger model:

```bash
OPENAI_API_KEY=sk-... node eval/eval-judge.js
```

Outputs JSON with per-version scores on faithfulness / categorization / conciseness / tone.

## File layout

```
eval/
├── README.md                      # this file
├── etch-RELEASE.md                # eval-local copy of etch's RELEASE.md
├── eval-runner.js                 # snapshot + replay driver
├── eval-judge.js                  # LLM-as-judge scorer
├── gold/
│   ├── 1.4.0/
│   │   ├── meta.json              # version range + ticket regex
│   │   ├── input.json             # FROZEN commits + Linear metadata (generated)
│   │   └── expected.md            # human-polished gold (manually authored)
│   ├── 1.4.1/...
│   └── 1.4.18/...
├── actual/                        # gitignored, replay output
└── .gitignore
```
