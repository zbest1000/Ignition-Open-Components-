# Security

What Open ECharts does to protect Perspective sessions when a chart `option` contains data from
tags, databases or user input — and what it does not do.

## Option sanitising (`sanitizeTooltip`)

`sanitizeTooltip` is `true` by default. ECharts treats almost every option value as plain data,
but a few values are used as HTML, CSS or URLs. Those are what the sanitiser changes:

| Option value | Treatment |
|--------------|-----------|
| `tooltip.formatter` / `tooltip.content` strings (at any level: global, axis, series, data item) and the data view's `title` / `lang` | HTML sanitised with [DOMPurify](https://github.com/cure53/DOMPurify): scripts, event-handler attributes, forms and embedded stylesheets are removed |
| `link` / `sublink` (title, treemap and sunburst nodes) | Kept only if `http`, `https` or relative; otherwise dropped |
| `tooltip.extraCssText` | Dropped if it could load an external resource |
| Colour strings | Dropped if they contain markup or CSS syntax |
| Function values | Dropped (props arriving from the gateway are JSON and cannot contain them anyway) |

Nothing else is modified, and nothing is truncated.

### What it is not

It is **not a sandbox**, and it does not make an untrusted `option` safe in general:

- It does not judge the *content* of a chart. Whoever controls the option controls what the
  chart shows, including text that looks like part of your UI and links to any http(s) site.
- An option can reference external images (for example as symbols), which makes the browser
  request them.
- A very large or deeply nested option can still make the browser slow; no size limits are applied.

If option content can be influenced by someone you do not trust, build the option in a script or
binding you control and insert only the data values, rather than binding a whole `option` (or a
formatter string) to that source.

### Turning it off

`sanitizeTooltip=false` passes the option to ECharts unchanged. Only do this when every part of
the option comes from sources you control.

## Event payloads

Events passed to Perspective scripts contain only a fixed set of documented fields per event
(see [COMPONENTS.md](COMPONENTS.md#shared-events)), copied as plain JSON data. DOM nodes,
functions and ECharts internals are never included.

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
