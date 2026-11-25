Charts often show data that comes from tags, databases or operators. This page explains, in plain words,
what the `sanitizeTooltip` prop does about that and what it does not do.

## The short version

- `sanitizeTooltip` is **on by default**. Leave it on.
- It removes the parts of an option that could run code in the session's browser or quietly fetch
  something from another server.
- It is **not a sandbox**. Whoever controls a chart's `option` still controls what the chart says.

## Why an option can be risky at all

ECharts treats almost every value in an option as plain data: numbers, names, categories. It escapes
those itself when it writes them into a tooltip. A few values, though, reach the page as HTML, CSS or a
link. If such a value came from an untrusted source (a free-text field in a database, say), it could
carry a script.

## What `sanitizeTooltip` changes

A value that fails a rule is removed, not repaired.

| In the option | What happens to it |
|---|---|
| Tooltip HTML (`tooltip.formatter`, `tooltip.content`, a tooltip given as a string) and the toolbox data view's texts | Cleaned with DOMPurify: scripts, event-handler attributes, `<style>`, forms and form controls are removed |
| Links (`link`, `sublink`) | Kept only when they are `http`, `https` or relative |
| Colours (`color`, `fill`, `stroke`, ...) and text / box style values | Must be a single plain CSS value; anything containing markup or something that fetches (`url(...)`) is dropped |
| `tooltip.extraCssText` | Dropped if it could fetch an external resource |
| SVG maps in the `maps` prop | Cleaned before they are registered |
| JavaScript functions | Dropped (props are JSON and cannot carry functions anyway) |

Data rows such as `[x, y]` and `dataset.source` are left exactly as given, and nothing is truncated.

## What it does not do

- It does not judge content. An option can still show misleading text or link to any `http(s)` site.
- It allows remote images: tooltip HTML may contain `<img src="https://...">`, and options can use image
  URLs as symbols. The browser requests them, which tells that server a session is open.
- It does not check `tooltip.className` or `tooltip.appendTo`.
- It sets no size limits: a huge or deeply nested option can still make a browser slow.

## Recommendations

- If someone you do not trust can influence the data, do not bind a whole `option` or a formatter string
  to it. Build the option in a script or binding you control and insert only the data values
  ([Binding Data](Binding-Data) shows the pattern).
- Turn `sanitizeTooltip` off only when every part of the option comes from sources you control. Off means
  the option, and SVG maps, are passed to ECharts unchanged.
- Toggling the prop re-applies the whole option, which resets zoom and legend selection once.

## Other facts worth knowing

- The module adds no web endpoints to the gateway and stores nothing on it.
- Everything is bundled in the module; nothing is loaded from a CDN at runtime, so it works on air-gapped
  networks.
- Scripts receive event payloads with a fixed set of documented fields only ([Events](Events)).

The full rules are in [docs/SECURITY.md](https://github.com/zbest1000/Ignition-Open-Components-/blob/main/docs/SECURITY.md) in the repository.
