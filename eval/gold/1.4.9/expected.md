Etch 1.4.9 adds `replace` and `replaceAll` modifiers for dynamic content. It also includes an early preview of redesigned component instance inputs — available behind the component editor redesign setting for those who want to try it out and share feedback. Additionally, this release fixes an HTML editor scrolling issue and adds JetEngine custom storage support.

* **New:** Add `replace` and `replaceAll` modifiers for dynamic content
* **New:** Early preview of redesigned component instance inputs (boolean, select, media, repeater) — available behind the component editor redesign setting, more input types coming soon
* **Improvement:** CSS reset now uses `scrollbar-gutter: stable` to prevent layout shift and `100svh` for more accurate mobile viewport height
* **Fix:** Typing into the HTML editor no longer triggers an incorrect scroll to the wrong component
* **Fix:** JetEngine custom post types now support custom storage
