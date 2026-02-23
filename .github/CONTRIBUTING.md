# Contributing

## Development

### Prerequisites

- Java 17 JDK
- Gradle 7.6+ (wrapper included, auto-downloads)
- Node.js 18+ (auto-downloaded by Gradle)

### Build

```bash
./gradlew clean build
```

Output: `build/Open-ECharts.unsigned.modl`

### Override version

```bash
./gradlew build -PmoduleVersion=1.2.3
```

## CI/CD

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** (`ci.yml`) | Push to `main`, PRs to `main` | Full build, artifact upload |
| **PR Check** (`pr-check.yml`) | PR open/sync | Build validation, PR comment with status |
| **Release** (`release.yml`) | Tag push `v*.*.*` | Build, optional signing, GitHub Release |

### Versioning

- Development builds: `0.1.0-dev+<sha>` (CI on main)
- PR builds: `0.0.0-pr<number>` (PR checks)
- Releases: extracted from git tag (e.g. `v1.0.0` -> `1.0.0`)

### Creating a release

```bash
git tag v1.0.0
git push origin v1.0.0
```

The release workflow will:
1. Build the module with the tagged version
2. Sign the module if signing secrets are configured
3. Create a GitHub Release with the `.modl` and SHA-256 checksum
4. Mark as prerelease if the version contains `-` (e.g. `v1.0.0-rc.1`)

### Module signing (optional)

Configure these repository secrets for signed builds:

| Secret | Description |
|--------|-------------|
| `SIGNING_KEYSTORE_BASE64` | Base64-encoded `.jks` keystore |
| `SIGNING_KEYSTORE_PASSWORD` | Keystore password |
| `SIGNING_CERT_FILE_BASE64` | Base64-encoded certificate chain `.pem` |
| `SIGNING_CERT_ALIAS` | Certificate alias in the keystore |
| `SIGNING_CERT_PASSWORD` | Certificate private key password |

Encode files with: `base64 -w0 keystore.jks`
