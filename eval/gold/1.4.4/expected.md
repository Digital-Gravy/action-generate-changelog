Etch 1.4.4 lets you insert HTML snippets from the AI chat directly into the builder canvas and adds property data attributes for third-party developer integrations. This release also removes the legacy custom block conversion logic — if you're migrating from a pre-v1 release, you'll need to follow the manual migration guide at https://docs.etchwp.com/migration-guides/v1-migration. On the bug fix side, dynamic images now always output a valid `alt` attribute, and the media picker in Gutenberg blocks correctly allows all media types.

* **New:** HTML snippets from the AI chat can now be inserted directly into the builder canvas via a dedicated insert button
* **New:** Property data attributes are now exposed on Gutenberg blocks and in the Etch builder, making it easier for third-party developers to target specific property inputs
* **Improvement:** The legacy custom block conversion logic has been removed. Users migrating from a pre-v1 release must now follow the manual migration steps documented at https://docs.etchwp.com/migration-guides/v1-migration
* **Improvement:** Plain text inputs no longer auto-wrap values in `var()` syntax — this now only applies in the CSS editor and style manager
* **Fix:** Dynamic images now always render the `alt` attribute, even when no value is set in the media library
* **Fix:** Settings no longer revert when clicking outside the settings dialog
* **Fix:** The media property picker in Gutenberg blocks now accepts all media types, not just images
