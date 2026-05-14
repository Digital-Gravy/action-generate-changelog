A small fix release while we're heads-down on 1.5.0's big-ticket items — the third-party API and expanded AI capabilities. This release ships UI fixes (combobox reactivity, the boolean property toggle is back, dynamic image placeholders) and an opt-in flag for hosts where PHP output buffering was making AI responses come back empty.

* **Improvement:** Boolean props use a standard toggle again instead of the cycling tri-state button — the toggle disables itself when the value is a dynamic reference
* **Fix:** Comboboxes keep reactivity after you type in them — external value updates are reflected back into the displayed value
* **Fix:** Some hosts' PHP output buffering causes the AI assistant's response to come back empty — enable ENABLE_CLEAR_BUFFER_IN_STREAM_REQUEST if you're seeing this
* **Fix:** Dynamic image placeholders now preserve classes and attributes set on the block, so they style consistently with the resolved image
* **Fix:** Select property options textarea now grows up to 10 lines (was capped at 3)
