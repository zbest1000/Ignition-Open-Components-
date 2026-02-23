# Security

Open ECharts applies security measures to protect Perspective sessions from XSS and code injection when options are supplied from external or untrusted sources.

## Option Sanitisation

Option sanitisation removes or limits dangerous content from ECharts option objects before they are passed to the chart engine.

### What It Does

- **Strips functions**: All function-type values are removed recursively from the option tree.
- **Caps sizes**: Arrays, strings, and nesting depth are limited to prevent DoS or memory exhaustion.

### Why It Matters

ECharts options can contain JavaScript functions (e.g., formatters, callbacks). If options come from tags, databases, or user input, they could be used to inject and execute arbitrary code in the browser. Sanitisation prevents this in Perspective sessions.

### Default Behavior

`sanitizeTooltip` is `true` by default. This strips all function-type values recursively from the option object before it is used.

### What Gets Stripped

- Tooltip formatter functions
- Label callbacks
- `renderItem` functions
- Any function anywhere in the option tree

### Size Caps

| Type | Limit |
|------|-------|
| Arrays | 5,000 items |
| Strings | 50,000 characters |
| Nesting depth | 20 levels |

### Circular Reference Detection

Circular references in option objects are detected and handled to prevent infinite loops during sanitisation.

### Event Payload Sanitisation

Event payloads from ECharts are sanitised before being passed to Perspective scripts:

- Only whitelisted keys are extracted
- DOM and window references are excluded

## When to Disable

Advanced users who fully control their option sources (e.g., options from trusted gateway scripts only) can set `sanitizeTooltip=false` to allow functions in options. This should only be done when:

- Options are not derived from tags, databases, or user input
- You understand the security implications

## No CDN Dependency

All ECharts assets are bundled in the module. No external network calls are made for chart libraries. This reduces supply-chain and network-related risks.

## Module Signing

For production deployments, signing the module is recommended. See CONTRIBUTING.md for details.
