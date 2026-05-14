Etch 1.4.6 introduces repeater prop groups, faster builder load times through lazy-loading, and a new paste collision setting. Attributes with special characters like `@click` are no longer stripped on the frontend, and several bugs around component groups, pasting, and style handling have been resolved.

* **New:** Repeater prop groups for components — toggle any group prop into a repeater to loop over its items inside the component. When using the component, add, remove, and populate as many entries as needed, each following the prop definitions of the group.
* **New:** ACF post object and relationship fields now respect the return format configured in ACF, returning IDs when set to "ID" instead of always expanding to full objects. Behind the RESPECT_ACF_RETURN_FORMAT feature flag.
* **New:** Paste behavior setting — choose whether to overwrite or preserve existing styles and components on collision (ETC-540)
* **Improvement:** Builder initial load time reduced by lazy-loading post/template data (ETC-515)
* **Improvement:** Parent JavaScript now automatically reloads when child elements are added, removing the need to refresh the page (ETC-538)
* **Improvement:** CSS editor warns about unbalanced curly braces before saving (ETC-532)
* **Fix:** Attributes containing `@`, `:`, or `.` characters (e.g. Alpine.js `@click`, `:class`, `x-on:keydown.enter`) are no longer stripped on the frontend (ETC-550)
* **Fix:** Components with groups no longer cause errors when adding classes to parent elements (ETC-541)
* **Fix:** Component instance prop values now paste correctly (ETC-539)
* **Fix:** Recently added styles no longer disappear due to a race condition when pasting in the HTML editor (ETC-534)
* **Fix:** Copy now correctly collects all instances when multiple of the same component are present
