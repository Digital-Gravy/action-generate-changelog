Etch 1.4.15 fixes an issue with media ID props being silently rewritten to the attachment URL, and introduces support for conditions nested inside other conditions. It also includes the new {component} dynamic data scope, support for attachment IDs in dynamic SVG src, and the ability to detach a component instance.

* **New:** Dynamic SVG elements now accept a WordPress attachment ID in the `src` attribute and resolve it to the attachment URL
* **New:** Components expose a new `{component}` dynamic data scope — see the component namespace docs for what's available
* **New**: Detach a component instance from its component — breaks the link so the block becomes a regular set of elements you can edit freely
* **Improvement:** Refreshed properties panel — the component name and key now live in the panel header instead of taking up a row
* **Fix:** Condition properties nested inside another condition property now evaluate and render their children correctly
* **Fix:** Media ID properties are no longer silently rewritten to the attachment URL at resolve time
