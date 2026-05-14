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
- Avoid internal jargon: say "loop block" not "LoopBlock class". Say "AI Assistant" (canonical user-facing name) — never "AI chat", "AiChatStore", "AI service".
- Inline `code` for things the user actually types or configures (attributes, modifier names, dynamic-data scopes). Do NOT inline-code internal symbol names (class names, event names, store names, tool schemas) — drop or rephrase those entirely.
- Feature-flag names appear in bullets ONLY when the user must flip the flag to opt in (e.g., a workaround flag like `ENABLE_CLEAR_BUFFER_IN_STREAM_REQUEST`). Internal rollout flags (e.g., `ENABLE_AI_TOOL_CALLS_DISPLAY` being turned on in production) are an implementation detail — rephrase as the user-observable outcome ("tool calls now appear in chat"), don't mention the flag.
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

### AI Assistant plumbing — always internal

These topics show up in commits but are NOT user-facing, even when the commit messages mention AI Assistant:

- Tool / capability negotiation between plugin and middleware (e.g., "supported_client_capabilities", "tool schema negotiation", "client capability handshake")
- Wire-protocol details (SSE frames, JSON payload shape, streaming-event ordering for `delta`/`done`/`reasoning` events, retry / buffer / backpressure handling)
- Middleware routing changes, `/retrieve`, `/health`, or other internal endpoints
- Tool schema registrations, mocked tool results, fallback wiring
- Provider abstraction changes (e.g., `OpenAiProvider`, `AiProviderInterface`)
- Reasoning enable/disable, default model swaps, internal request flags

A change in this area is user-facing only if it produces a behavior the user would notice in chat (e.g., "AI Assistant no longer drops streamed content" describes a visible bug fix). If you can't describe it in terms of what the user sees, drop it.

### Block / format conversion — always internal

Etch ships pipelines that convert between Gutenberg blocks, Etch blocks, and JSON. Commits touching the conversion code (e.g., "convert `etch/condition` through the JSON pipeline", "write block metadata only when block name present") are infrastructure migrations, not user-facing changes. Drop them unless they fix a visible parse error or migration bug in the editor.

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
