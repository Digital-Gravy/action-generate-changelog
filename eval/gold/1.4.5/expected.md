Etch 1.4.5 restores builder support for patterns and components that use the legacy block format, which stopped working after 1.4.4 removed the old parser. It also fixes a community-reported issue where copy/paste was being hijacked inside input fields, and adds a safeguard against accidental template content wipes. On the builder side, the command palette now supports wrapping selections in span and anchor elements.

* **New:** Wrap in span and wrap in anchor options added to the command palette (CMD-K)
* **Improvement:** AI chat responses are now faster thanks to optimized reasoning
* **Improvement:** AI chat action buttons polished with distinct icons and clearer layout
* **Fix:** Patterns and components using the legacy block format now paste and insert correctly again in the builder (ETC-530)
* **Fix:** Copy and paste now works correctly inside input fields — block-level copy/paste no longer hijacks standard text inputs (ETC-525)
* **Fix:** Templates can no longer be accidentally wiped when saving
* **Fix:** Selector mode no longer opens unexpectedly when using Cmd+Enter in AI chat
