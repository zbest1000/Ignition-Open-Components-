# Security

What Open ECharts does to protect Perspective sessions when a chart `option` contains data from
tags, databases or user input — and what it does not do.

## Option sanitising (`sanitizeTooltip`)

`sanitizeTooltip` is `true` by default. ECharts treats almost every option value as plain data,
but some values reach the page as HTML, CSS or a URL. Those are what the sanitiser changes. The
rules go by property name, so they apply at every level of the option (global, series, data
item, ...). A value that fails a rule is removed, not repaired.

| Option value | Treatment |
|--------------|-----------|
| Tooltip HTML: `formatter` / `content` of a `tooltip` object, a `tooltip` given as a string, and the toolbox data view's `title` / `lang` | Sanitised with [DOMPurify](https://github.com/cure53/DOMPurify): scripts and event-handler attributes are removed, as are `<style>`, forms and form controls. A `style` attribute that could fetch something is removed. A URL attribute containing a template variable (`{b}`, `{c}`, ...) is removed unless the text before the variable already fixes scheme and host (`/icons/{b}.png` is kept, `https://{b}/x` is removed). |
| `link` / `sublink` (title, treemap and sunburst nodes, series, levels) | Kept only if `http`, `https` or relative |
| Colours: every property with `color` in its name, `fill`, `stroke` — as a string or in a palette array | Must be a single CSS value: dropped if it contains `<`, `>`, `;`, `{`, `}`, quotes, or anything that fetches (`url(...)` etc.). ECharts 6.1 writes tooltip colours into a `style` attribute without escaping them. |
| Text and box style: `fontFamily`, `fontSize`, `fontWeight`, `padding`, `borderRadius`, `borderWidth`, ..., and any other string inside a `tooltip` object (except `className` and `appendTo`) | Same single-CSS-value rule (`fontFamily` may contain quotes) |
| `tooltip.extraCssText` | Dropped if it could fetch an external resource or contains `@`, a backslash or a comment |
| SVG maps in the `maps` property | Sanitised with DOMPurify's SVG profile before they are registered |
| Function values | Dropped (props arriving from the gateway are JSON and cannot contain them anyway) |

Left exactly as given: `dataset.source`, and data rows that are plain value tuples such as
`[x, y]`. ECharts HTML-escapes data values, names and categories itself when it puts them into a
tooltip, including through `{a}` / `{b}` / `{c}` templates. Nothing is truncated.

A tooltip with `renderMode: "richText"` is drawn on the canvas, so its formatters are left as
written; the component re-creates the chart if such an option follows one with an HTML tooltip.

Turning `sanitizeTooltip` on or off re-applies the whole option (a zoom or legend selection made
in the chart is reset once).

### What it is not

It is **not a sandbox**, and it does not make an untrusted `option` safe in general:

- It does not judge the *content* of a chart. Whoever controls the option controls what the
  chart shows, including text that looks like part of your UI and links to any http(s) site.
- Remote images are allowed: formatter HTML may contain `<img src="https://...">`, and an option
  can use image URLs as symbols or graphic elements. The browser requests them, which tells that
  server a session is open.
- `tooltip.className` and `tooltip.appendTo` are not checked.
- A very large or deeply nested option can still make the browser slow; no size limits are applied.

If option content can be influenced by someone you do not trust, build the option in a script or
binding you control and insert only the data values, rather than binding a whole `option` (or a
formatter string) to that source.

### Turning it off

`sanitizeTooltip=false` passes the option, and SVG maps, to ECharts unchanged. Only do this when
every part of the option comes from sources you control.

## Event payloads

Events passed to Perspective scripts contain only a fixed set of documented fields per event
(see [COMPONENTS.md](COMPONENTS.md#shared-events)), copied as plain JSON data. DOM nodes,
functions and ECharts internals are never included, and the parts that grow with the data are
bounded (no `children` subtree in mouse events, at most 1000 indices per series in
`onBrushSelected`).

## Gateway surface

The module adds no REST or servlet endpoints to the gateway and stores nothing on it. It serves
its static JavaScript/CSS bundle through Perspective's resource mechanism. Themes are part of
that bundle.

## No CDN dependency

All chart libraries are bundled in the module; nothing is loaded from external hosts at runtime.

## Verifying a release

Each release provides a `.sha256` checksum, a CycloneDX SBOM of the bundled JavaScript libraries,
and a GitHub build provenance attestation. Production gateways should run a signed module. See
[INSTALL.md](INSTALL.md#2-download).
