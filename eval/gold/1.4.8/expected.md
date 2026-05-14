This release introduces **Condition Props**, a new component property type for conditionally showing or hiding groups of props, and enables **Etch Intelligence for all users** during the beta. The AI chat gains **CSS injection** with intelligent selector merging and an **HTML replace** button. Several bugs are fixed around group/repeater prop exposing, Unicode in `.toSlug()`, and the component editor UI.

* **New:** Condition Prop — a new component property type that conditionally shows or hides groups of child props based on an expression, supported in both the Etch Builder and Gutenberg.
* **New:** AI CSS injection — the AI chat can now insert CSS directly into your styles, merging intelligently with existing selectors (AI rules win on conflicts, existing rules are preserved).
* **New:** Replace with AI output — when an element is selected, a new "Replace" button lets you swap it with AI-generated HTML.
* **New:** Etch Intelligence is now enabled for all users during the beta period.
* **New:** Component Instance Inputs Redesign — refreshed look for text, group, and condition property inputs when using components. Available behind the "Component Instance Inputs V2" setting for early feedback — other prop types (select, loop, etc.) are not yet supported and may not work properly.
* **Improvement:** AI error messages from the provider now surface directly in the chat window.
* **Improvement:** Improved image paste handling in the AI panel.
* **Fix:** Group and repeater props now properly expose to the parent component, and dynamic data is no longer reverted when editing group or repeater inputs.
* **Fix:** The `.toSlug()` modifier now correctly handles Unicode characters (German umlauts, Polish letters) at the start of strings, with consistent behavior between the builder and the frontend.
* **Fix:** Images always render with an `alt` attribute, even when no value is set in the media library. Also fixed SVGs incorrectly rendering with width/height of "1".
* **Fix:** Long class names in the component editor class prop no longer overflow the UI.
* **Fix:** Third-party plugin assets no longer break in the builder iframe due to the asset queue emitting a JSON object instead of an array.
* **Fix:** Copying text from the AI chat no longer pastes block JSON into the clipboard.
