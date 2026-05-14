This release adds target-click population for boolean and loop component props, persists the open/closed state of component prop accordions across reloads, and moves the "Create component" action into the Element Settings header.

* **New:** Populate boolean component props by target-clicking a block on the canvas or in the structure panel — the block is wrapped in `{#if props.boolProp}`.
* **New:** Populate loop component props the same way — the targeted block is wrapped in `{#loop props.loopProp as item}`.
* **New:** A "Create component" button in the Element Settings header converts the selected element into a component in one click.
* **New:** Component prop group and repeater accordions now remember their open/closed state across reloads and navigation, scoped per component, and shared between editor and instance views.
* **New:** Pasting a CSS rule into the style editor now replaces the rule body when the pasted selector matches; non-matching selectors and multi-rule pastes are blocked.
* **Improvement:** Tooltips on key buttons now show the keyboard shortcut next to the label, slightly dimmed.
* **Improvement:** The HTML code editor header no longer shows redundant Duplicate and Delete icons.
* **Improvement:** Empty component prop inputs show "Default" instead of "Value" as placeholder text.
* **Improvement:** The Add Attributes button has moved into the attributes panel.
* **Fix:** The "edit component" keyboard shortcut now works on macOS when Option is held.
