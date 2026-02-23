# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in this module, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email the maintainers or use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)

## Security Architecture

### Option Sanitisation
By default, all ECharts option objects are sanitised before reaching the chart instance:
- JavaScript function values are stripped (prevents code injection via tooltip formatters, label callbacks, etc.)
- Circular references are detected and pruned
- Arrays are capped at 5,000 items; strings at 50,000 characters
- DOM and window references are removed from event payloads

### No External Network Access
The module bundles all assets locally. No CDN calls, no external fetches at runtime. Safe for air-gapped and regulated networks.

### Module Signing
Production deployments should use signed `.modl` files. See `.github/CONTRIBUTING.md` for signing configuration.

## Dependencies

| Dependency | License | Notes |
|------------|---------|-------|
| Apache ECharts 5.6.0 | Apache-2.0 | Bundled in module |
| ECharts-GL 2.0.9 | BSD-2-Clause | Bundled in module |
| Ignition SDK 8.3.0 | Proprietary | Compile-only, provided by gateway |
