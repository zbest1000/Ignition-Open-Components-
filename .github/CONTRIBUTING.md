# Contributing

## Development

### Prerequisites

- **JDK 17**. Everything else is downloaded by the build: the wrapper fetches Gradle 9.5.1
  (checksum-pinned) and the web build fetches the Node.js version set in
  `gradle/libs.versions.toml`.

### Build and verify

```bash
./gradlew build
```

One command runs `npm ci`, webpack, eslint, jest, the Java compile, checkstyle and JUnit, and
writes `build/Open-ECharts.unsigned.modl`. Useful parts on their own:

| Task | Does |
|------|------|
| `./gradlew :web:lintWeb` | eslint |
| `./gradlew :web:testWeb` | jest |
| `./gradlew test` | JUnit |
| `./gradlew :web:webpack` | web bundle only |

`npm ci` installs exactly what `web/package-lock.json` says. To change dependencies, run
`npm install <pkg>` in `web/` and commit both `package.json` and the lockfile.

### Version

The version is `version=` in the committed `gradle.properties`; override it for one build with
`-PmoduleVersion=...`. Ignition's version parser is stricter than SemVer, and a gateway refuses a
module whose version it cannot parse, so the build only accepts:

| Form | Example |
|------|---------|
| `X.Y.Z` | `1.2.0` |
| `X.Y.Z.BUILD` | `1.2.0.57` |
| `X.Y.Z-rcN`, `X.Y.Z-betaN` | `1.2.0-rc1` |
| `X.Y.Z-SNAPSHOT` | `0.1.0-SNAPSHOT` |

`1.2.0-rc.1`, `1.2.0-dev+abc1234` and similar are rejected at configuration time.

### Secrets

`gradle.properties` in the repository is committed and must never contain credentials. Signing
properties and other per-user settings go in `~/.gradle/gradle.properties`; see
`gradle.properties.template`.

## Adding a component

All components are defined in one file, `common/src/main/resources/components.manifest.json`.
The Java descriptors (gateway and Designer) and the web bundle are both generated from it, so a
component cannot exist on one side only.

1. Add an entry to the manifest: `id` (`open.echarts.*` or `open.industrial.*`; never change a
   published id), `name`, `description`, `category` (palette category), `metaName`, `schema`,
   `cssClass`, `size`, and `defaultOption` (the chart a freshly dropped component shows). Set
   `"gl": true` if it needs ECharts-GL.
2. A chart that only takes an ECharts `option` reuses `props/echart.props.json` and needs
   nothing else.
3. A component with its own domain props (like the industrial ones) also needs a prop schema in
   `common/src/main/resources/props/` and an option builder in `web/src/industrial/`, registered
   by component id in `web/src/industrial/index.ts`.
4. Document it in `docs/COMPONENTS.md`, add it to the bug-report template's component list, and
   add a `CHANGELOG.md` entry.

`./gradlew build` runs the tests that check the manifest against the schemas and the web bundle.

## CI/CD

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** (`ci.yml`) | Push to `main`, PRs to `main` | Calls *Build and verify*; dependency review on PRs |
| **Build and verify** (`build.yml`) | Called by CI and Release | `npm audit`, `./gradlew build`, module checks, SBOM, artifact upload |
| **CodeQL** (`codeql.yml`) | Push/PR to `main`, weekly | Static analysis of Java and TypeScript |
| **Release** (`release.yml`) | Tag `vX.Y.Z` or `vX.Y.Z-rcN` | Verify, sign, attest, publish a GitHub Release |

CI builds are versioned `<version from gradle.properties>.<run number>`, for example `0.1.0.57`.
All actions are pinned to commit SHAs; Dependabot keeps them current.

### Creating a release

1. On `main`, rename `## [Unreleased]` in `CHANGELOG.md` to `## [1.0.0] - YYYY-MM-DD`, add a new
   empty `## [Unreleased]`, and bump `version` in `gradle.properties` to the next
   `-SNAPSHOT`. That section becomes the release notes; the release fails without it.
2. Tag the commit on `main` and push the tag:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

Release candidates use `v1.0.0-rc1` (no dot before the number) and take their notes from
`[Unreleased]` when no `[1.0.0-rc1]` section exists. They are published as prereleases.

The release workflow:
1. Checks the tag format, that the tagged commit is on `main`, and that the changelog section exists
2. Runs the same build-and-verify pipeline as CI with the tag's version
3. In the protected `release` environment: signs that verified module if signing secrets are
   configured, otherwise publishes it as `Open-ECharts-<version>.unsigned.modl`
4. Publishes the `.modl`, its `.sha256`, a CycloneDX SBOM and a build provenance attestation

### Module signing

Ignition only installs unsigned modules on gateways started with
`-Dignition.allowunsignedmodules=true`, so production releases should be signed.

**Locally:** copy the signing lines from `gradle.properties.template` into
`~/.gradle/gradle.properties`, then `./gradlew build` also writes `build/Open-ECharts.modl`.

**In the release workflow:** add these as secrets of the `release` environment
(Settings → Environments → release):

| Secret | Description |
|--------|-------------|
| `SIGNING_KEYSTORE_BASE64` | Base64-encoded keystore (`.jks`) |
| `SIGNING_KEYSTORE_PASSWORD` | Keystore password |
| `SIGNING_CERT_FILE_BASE64` | Base64-encoded certificate chain (`.p7b` or `.pem`) |
| `SIGNING_CERT_ALIAS` | Alias of the signing key in the keystore |
| `SIGNING_CERT_PASSWORD` | Password of that key |

Encode files with `base64 -w0 keystore.jks`. With none of them set the release is published
unsigned and says so; with only some of them set it fails.

### Repository settings the workflows rely on

- Environment **`release`** with required reviewers, restricted to `v*` tags
- Tag protection / ruleset so only maintainers can push `v*` tags
- Branch protection on `main` requiring the **CI / Build** check
- Code scanning (CodeQL), the dependency graph and private vulnerability reporting enabled
