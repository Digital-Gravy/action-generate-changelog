This update introduces **Group Properties**, **AI chat streaming**, new commands in the CMD+K menu, and **Alt-click deep folding**. It also includes multiple fixes and improvements, particularly around style handling and copy/paste behavior.

* New: Group Property to group properties together
* New: AI chat now streams responses
* New: Wrap words in <span> and add "Wrap in" commands to Cmd+K
* New: Alt+click to deep fold/unfold single structure panel items
* Improvement: Include custom media definitions in copy/paste
* Improvement: Selector search no longer requires . or # prefix
* Improvement: Render up to the render limit and abort further rendering (performance)
* Improvement: Remove undo/redo toggle from settings
* Improvement: Remove experimental custom media definitions toggle from settings
* Fix: Copy/paste of class props
* Fix: Prevent BEM classes from being applied to children of hidden or readonly blocks
* Fix: Custom media stylesheet not created until reload
* Fix: to-rem not substituted in custom media definitions
* Fix: Ensure partial classes are cleaned up
* Fix: Ensure blocks have the correct parent reference on undo/redo
