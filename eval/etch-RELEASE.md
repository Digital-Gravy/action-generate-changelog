# Release guidance — Etch

Etch is a builder UI for WordPress. Readers are designers and agency developers building sites with Etch — assume familiarity with WordPress, Gutenberg blocks, and modern CSS/JS, but not with Etch's internal class names, namespaces, or commit conventions.

## Categories

Use exactly these four:
- **New:** new features or capabilities visible to the user
- **Improvement:** enhancements to existing functionality
- **Fix:** bug fixes
- **Breaking:** anything requiring user action (migration, config change, removed API)

Order each bullet most-impactful first. Don't group bullets under category headings — each bullet is individually prefixed.

## Summary paragraph

Open every release with a short prose summary above the bullet list — typically 1–3 short paragraphs. The summary captures the headline themes of the release: what's the most important thing shipping, why does it matter, and (for a small release) acknowledge that it's a small release. Active voice, present tense. No marketing fluff. Match the depth of the release: a one-bullet hotfix may not need a paragraph.

## Tone

- Confident but not marketing-y.
- Active voice, present tense.
- Avoid internal jargon: say "loop block" not "LoopBlock class". Say "AI chat" not "AiChatStore".
- Inline `code` for variable names, attributes, hook names, feature flags, and short symbols (e.g., `{props.x}`, `RESPECT_ACF_RETURN_FORMAT`, `@click`).
- Inline links for external references (docs, migration guides, community threads).

## Ticket IDs

Don't include ticket IDs (`ETC-XXX`) in bullet text unless the bullet specifically references a community-reported issue and the ticket gives important context. When in doubt, omit. Ticket metadata is for your understanding while writing, not for the reader.

## What to call out prominently

- Block migration, persistence, or data-loss changes — readers fear losing their work.
- Builder UI changes — users notice these immediately.
- AI Assistant changes — heavily-used surface.
- Behavioral changes behind feature flags — name the flag.

## What to suppress

Drop entirely:
- Internal refactors, namespace reorganization
- Test additions or test infrastructure
- CI changes, GitHub Actions tweaks
- Dependency bumps without user-facing impact
- ADRs, internal documentation
- Skill / tooling commits (anything in `notes/`, `.claude/`, or marked `[skip ci]`)
- Commits tagged `[hide]` or `[ignore]` (already filtered before you see them, but if any slip through, suppress)
- Code review / linter / formatter commits

## Breaking changes

When a change requires migration, surface it prominently with a `**Breaking:**` bullet at the top of the list. Include the migration hint inline:

> **Breaking:** `etch/lifecycle/update_start` hook removed — use `etch/lifecycle/upgrade` instead.

Link to the migration guide if one exists.

## Examples

Raw commit: `feat(ETC-705): add dark mode toggle to settings panel`
→ `**New:** Settings panel now includes a dark mode toggle.`

Raw commits:
- `fix(ETC-810): correct null guard in user.email`
- `fix(ETC-810): also handle empty string`
→ `**Fix:** Login no longer crashes when a user's email is unset.`

Raw commit: `refactor: extract auth middleware into a separate module`
→ Drop (internal-only).
