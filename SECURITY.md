# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest release | Yes |

## Reporting a Vulnerability

If you discover a security vulnerability in this module, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Use GitHub's [private vulnerability reporting](https://github.com/zbest1000/Ignition-Open-Components-/security/advisories/new)

## Security Architecture

### Option sanitising
`sanitizeTooltip` is on by default. It sanitises the parts of an ECharts option that ECharts
treats as HTML, CSS or URLs:
- HTML in tooltip formatter strings is sanitised with DOMPurify
- link fields keep only `http`, `https` and relative URLs
- unsafe CSS and colour strings in tooltip styling are dropped

It is **not a sandbox** and does not validate the rest of the option. If an `option` is bound to
data an attacker could influence (tags, database rows, user input), review what that data can
reach. Details and limits: [`docs/SECURITY.md`](docs/SECURITY.md).

### No external network access
The module bundles all assets locally. No CDN calls, no external fetches at runtime.

### No gateway endpoints
The module registers no REST or servlet routes on the gateway; it only serves its static
JavaScript/CSS bundle through Perspective's resource mechanism.

### Module signing and release integrity
Releases publish a `.sha256` checksum, a CycloneDX SBOM and a GitHub build provenance
attestation. Production gateways need a **signed** `.modl`; whether a release is signed is
stated in its notes and visible in the file name (`.unsigned.modl` otherwise). See
[`docs/INSTALL.md`](docs/INSTALL.md).

## Dependencies

| Dependency | License | Notes |
|------------|---------|-------|
| Apache ECharts 6.1.0 | Apache-2.0 | Bundled in module |
| ECharts-GL 2.1.0 | BSD-3-Clause | Bundled in module, loaded on demand |
| DOMPurify 3 | Apache-2.0 / MPL-2.0 | Bundled in module |
| Ignition SDK 8.3.7 | Proprietary | Compile-only, provided by gateway |
