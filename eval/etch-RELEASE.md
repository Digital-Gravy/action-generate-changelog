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

## Feature flag → user-feature decoder

Etch ships some features behind feature flags. When a release flips a flag on (e.g., `chore: turn ENABLE_X on`), the user-visible release is the *feature*, not the flag flip. Translate flag flips using this table — **emit one bullet per listed feature**, not one bullet per flag.

`PROPS_PANEL_REDESIGN` gates these user-facing features (one bullet each):
- **Improvement:** Refreshed properties panel — the component name and key now live in the panel header instead of taking up a row.
- **Improvement:** Property inputs (Media, Class, Object, Select, Loop, Group, Condition) redesigned with a vertically-stacked layout.

`ENABLE_COMPONENT_NAMESPACE` gates these user-facing features (one bullet each):
- **New:** Components expose a new `{component}` dynamic data scope.
- **New:** Detach a component instance from its component — breaks the link so the block becomes a regular set of elements you can edit freely.

`ENABLE_AI_TOOL_CALLS_DISPLAY` gates:
- **Improvement:** AI Assistant tool calls now appear in chat.

`RESPECT_ACF_RETURN_FORMAT` gates:
- **New:** ACF post object and relationship fields now respect the return format configured in ACF (returns IDs when set to "ID" instead of always expanding to full objects).

`ENABLE_CLEAR_BUFFER_IN_STREAM_REQUEST` gates an opt-in workaround:
- **Fix:** Some hosts' PHP output buffering causes the AI Assistant's response to come back empty — enable `ENABLE_CLEAR_BUFFER_IN_STREAM_REQUEST` if you're seeing this. **Mention the flag name in the bullet** — users have to enable it manually.

**Critical:** emit the decoder bullets above ONLY if a commit in THIS release's commit list flips the flag on (commit subject contains the flag name and "on" / "enable" / "turn on"). Do not emit the bullets just because a flag appears in this decoder — features behind flags ship in the release where the flag is flipped, not in releases that merely touch flag-related code. When in doubt, search the provided commits for the exact flag name; if you don't find a flip-on commit for that flag, don't emit those bullets.

When a release commit ADDS a flag without flipping it on, drop it — the feature isn't shipping yet.

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

#### Do NOT write bullets like these — these are the AI plumbing items you must drop, no matter how the commit subject phrases them:

- ❌ "AI Assistant now negotiates supported client tools with the server."
- ❌ "AI Assistant now negotiates supported client capabilities so newer tool schemas can be enabled."
- ❌ "AI Assistant now supports `supported_client_capabilities` negotiation."
- ❌ "AI Assistant tool-call results stream through the middleware with the supported tool set."
- ❌ "AI Assistant now keeps streamed reasoning and tool-call details in the order they arrive."
- ❌ "AI Assistant now recovers final streamed content from `done` events."
- ❌ "`create_posts` now requires an explicit `post_type` and validates input." — `create_posts` is an internal AI tool name; never name AI tools in bullets. The user-facing bullet for "AI can create posts of any post type" is fine, but the validation/required-fields detail is implementation, not user-observable.
- ❌ "`list_loop_definitions` is now available as a tool." — internal AI tool name. Drop or rephrase as the user-observable capability ("AI can list your loop definitions") if and only if it materially changes what the user can ask the AI to do.
- ❌ "Etch now converts `etch/condition` blocks through the new PHP Gutenberg↔Etch pipeline."

**Naming rule for AI tools:** never use the snake_case tool name (`create_posts`, `list_loop_definitions`, `list_post_types`, `find_media`) in a bullet. These are how the model addresses tools internally. The user-facing form is the capability ("AI can create posts", "AI can list your post types"). If the only thing being described is "the tool was made stricter", drop the bullet — it's plumbing.

A change in this area is user-facing only when a user reports a visible problem (empty AI responses, dropped text mid-stream) and the bullet describes the **observable outcome from the user's seat** — not the protocol-level fix.

Good rewrites of those plumbing items, when they fix a user-observable bug:

- ✅ "AI Assistant no longer drops streamed content under certain timing conditions." (covers ordering / done-event recovery / streaming bugs from the user's perspective)
- ✅ "Newly AI-created custom post types are now properly visible in Content Hub." (covers `create_posts` / post_type validation issues from the user's perspective)

### Block / format conversion — always internal

Etch ships pipelines that convert between Gutenberg blocks, Etch blocks, and JSON. Commits touching the conversion code (e.g., "convert `etch/condition` through the JSON pipeline", "write block metadata only when block name present") are infrastructure migrations, not user-facing changes. Drop them unless they fix a visible parse error or migration bug in the editor.

## Breaking changes

When a change requires migration, surface it prominently with a `**Breaking:**` bullet at the top of the list. Include the migration hint inline:

> **Breaking:** `etch/lifecycle/update_start` hook removed — use `etch/lifecycle/upgrade` instead.

Link to the migration guide if one exists.

## Small user-facing capabilities to keep

The following kinds of changes are *small but real* user-facing capabilities and should produce their own bullets — don't bundle them into a generic "UI polish" line and don't drop them as internal:

- New dynamic-data modifiers (e.g., `replace`, `replaceAll`, `toSlug`)
- New dynamic-data scopes (e.g., `{component}`)
- New component-system primitives (e.g., detach component instance, condition-in-condition, new property type)
- New right-click / context-menu options (e.g., "Wrap in div / loop / condition")
- New keyboard shortcuts and CMD+K commands
- New `data-*` attributes exposed to third-party integrations
- AI Assistant new tools / capabilities (e.g., "create posts", "list post types", "find media")
- UI panel refreshes and redesigns

## Specificity examples (Etch-flavored)

Always pin the concrete observable detail. Etch-relevant examples of the specificity rule:

- Bad: "Nested components now show the actual content instead of raw dynamic keys."
- Good: "Components nested in slots now display their content preview instead of raw `{props.x}` placeholders."

- Bad: "Dynamic data comparison modifiers now handle some edge cases better."
- Good: "Data comparison modifiers (equal, less, greater, etc.) now correctly handle `null` values."

## Etch-specific examples

Raw commit: `feat(ETC-705): add dark mode toggle to settings panel`
→ `**New:** Settings panel now includes a dark mode toggle.`

Raw commits:
- `fix(ETC-810): correct null guard in user.email`
- `fix(ETC-810): also handle empty string`
→ `**Fix:** Login no longer crashes when a user's email is unset.`

Raw commit: `refactor: extract auth middleware into a separate module`
→ Drop (internal-only).

Raw commit: `chore: turn ENABLE_AI_TOOL_CALLS_DISPLAY flag on`
→ Rollout flag flip, not a user-facing change *by itself*. If a corresponding feature is being shipped in the same release, the bullet describes that feature ("**Improvement:** AI Assistant tool calls now appear in chat"), not the flag flip. If no associated user-visible feature, drop.

Raw commits:
- `feat(ai-chat): add SSE frame parser with tests`
- `feat(ai-chat): SSE AiProviderInterface stream function`
- `feat(ai-chat): OpenAiProvider SSE response method`
- `feat(ai-chat): AiRoutes stream endpoint and handler`
- `feat(ai-chat): stream AI responses via Server-Sent Events (#256)`
→ One bullet: `**New:** AI Assistant now streams responses as the model generates them.` Four "feat" commits are implementation steps; the user only sees one new behavior. No mention of `SSE`, `AiProviderInterface`, `OpenAiProvider`, or `AiRoutes` in the bullet text.

Raw commit: `feat: add web search as fallback when RAG is unavailable`
→ `**Improvement:** AI Assistant falls back to web search when its knowledge base is unavailable.` No internal symbol (`RAG`) in the user-facing text.

Raw commit: `feat: Components expose a new `{component}` dynamic data scope`
→ `**New:** Components expose a new `{component}` dynamic data scope — see the component namespace docs for what's available.` This is a small but distinct user-facing capability; don't merge it into a generic "props panel improvements" line.

Raw commit: `feat: Detach a component instance from its component`
→ `**New:** Detach a component instance from its component — breaks the link so the block becomes a regular set of elements you can edit freely.` Distinct, user-visible builder primitive — own bullet.
