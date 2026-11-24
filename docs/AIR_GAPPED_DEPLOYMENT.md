# Air-Gapped Deployment

This module is designed to run on Ignition gateways with **no internet access**. All runtime
assets — the Apache ECharts engine, ECharts-GL, the component JavaScript/CSS, themes, and option
templates — are bundled inside the `.modl`. Nothing is fetched from a CDN or any external service
at runtime.

There are two separate concerns: **running** the module air-gapped (always supported) and
**building** the module air-gapped (requires pre-seeded caches, because a normal build downloads
its toolchain and dependencies).

---

## 1. Runtime (air-gapped gateway) — supported out of the box

### What is bundled
- `OpenECharts.js` / `OpenECharts.css` (served from `/res/open-echarts/…`): the compiled
  components, **Apache ECharts 6.1.0** and DOMPurify.
- **ECharts-GL 2.1.0** as a separate chunk (`OpenECharts.echarts-gl.<hash>.js`) in the same
  module, fetched from the gateway (not the internet) the first time a 3D / WebGL component is
  shown.
- `OpenECharts.js.LICENSE.txt`: the licence notices of the bundled libraries.
- The two built-in themes and all option templates.
- React, React-DOM, and `@inductiveautomation/perspective-client` are **not** bundled — they are
  provided by the Perspective module already present on the gateway.

### No runtime network calls
The module loads nothing from a CDN or any other external host. Charts render from bundled code
plus the `option` you provide. (An `option` can itself reference external URLs, for example an
image symbol; that is under your control.)

### Installing on an isolated gateway
1. Copy the `.modl` and its `.sha256` to the gateway host by your approved transfer method and
   verify it: `sha256sum -c Open-ECharts-<version>.modl.sha256`.
2. Gateway → **Config → Modules → Install or Upgrade a Module** → select the `.modl`.
3. **Signing:** gateways only install **signed** modules by default. Either:
   - use a signed release, or sign your own build (`signModule=true` plus the
     `ignition.signing.*` properties in `~/.gradle/gradle.properties`; see
     [`INSTALL.md`](INSTALL.md#9-module-signing)), or
   - for a development/lab gateway only, allow unsigned modules by adding
     `-Dignition.allowunsignedmodules=true` to `ignition.conf` (`wrapper.java.additional.N`) and
     restarting the gateway.

### Map data
ECharts ships no map geometry and the module bundles none. Map, geo and geo3D series draw the
maps you put in the component's `maps` property (GeoJSON or SVG, keyed by map name; see
[COMPONENTS.md](COMPONENTS.md#maps)). The data travels as a normal Perspective property, for
example from a project script or a named query, so nothing is fetched from outside. `Globe`
needs no map data; a surface texture, if you want one, is an image you supply. All other
components need no external data.

---

## 2. Build (offline build host) — requires pre-seeded caches

A normal build downloads from:

| Source | What |
|--------|------|
| `services.gradle.org` | The Gradle 9.5.1 distribution (via the wrapper, checksum-verified) |
| `plugins.gradle.org`, Maven Central | Gradle plugins and their dependencies |
| `nexus.inductiveautomation.com` | The `io.ia.sdk.modl` plugin, the Ignition SDK artifacts, and the Java test/checkstyle dependencies |
| `api.foojay.io` | A JDK 17 toolchain — only if JDK 17 is not already installed |
| `nodejs.org` | The Node.js version pinned in `gradle/libs.versions.toml` |
| npm registry | The JavaScript dependencies in `web/package-lock.json` |

To build offline:

1. Install **JDK 17** on the offline host (so no toolchain download is attempted).
2. On a connected machine with the same OS and CPU architecture, check out the same commit and
   run `./gradlew build` once.
3. Copy two directories from that machine's home directory to the offline host's:
   - `~/.gradle` — the Gradle distribution, plugins, Java dependencies and the Node.js archive
   - `~/.npm` — npm's download cache
4. On the offline host:

   ```bash
   npm_config_offline=true ./gradlew build --offline
   ```

Copying `web/node_modules` instead does **not** work: the build runs `npm ci`, which deletes
`node_modules` and reinstalls from the lockfile, so the packages must be in npm's cache (or in an
internal registry configured in `~/.npmrc`). Organisations with internal mirrors can instead point
`settings.gradle.kts` (repositories) and `gradle/wrapper/gradle-wrapper.properties`
(`distributionUrl`) at them.

This affects only the **build host**; the resulting module runs on a fully air-gapped gateway as
described in section 1.
