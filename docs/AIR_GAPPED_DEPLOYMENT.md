# Air-Gapped Deployment

This module is designed to run on Ignition gateways with **no internet access**. All runtime
assets — the Apache ECharts engine, ECharts-GL, the component JavaScript/CSS, themes, and option
templates — are bundled inside the `.modl`. Nothing is fetched from a CDN or any external service
at runtime.

There are two separate concerns: **running** the module air-gapped (always supported) and
**building** the module air-gapped (requires a one-time offline mirror, because the build pulls
from the Inductive Automation Nexus, nodejs.org, and npm).

---

## 1. Runtime (air-gapped gateway) — supported out of the box

### What is bundled
- `OpenECharts.js` / `OpenECharts.css` (served from `/res/open-echarts/…`), containing the
  compiled React components, **Apache ECharts 5.6.0**, and **ECharts-GL 2.0.9**.
- The two built-in themes and all option templates.
- React, React-DOM, and `@inductiveautomation/perspective-client` are **not** bundled — they are
  provided by the Perspective module already present on the gateway (correct and intended).

### Verified: no runtime network calls
The web sources contain no `fetch`, CDN URLs, `XMLHttpRequest`, or remote font loads. Charts
render entirely from bundled code plus the `option` you provide.

### Installing on an isolated gateway
1. Copy `Open-ECharts.modl` to the gateway host by your approved offline transfer method.
2. Gateway → **Config → Modules → Install or Upgrade a Module** → select the `.modl`.
3. **Signing:** production gateways require **signed** modules. Either:
   - Sign the module at build time (configure `sign.props` and build with `-PsignModule=true`), or
   - For a development/lab gateway only, allow unsigned modules by adding
     `-Dignition.allowunsignedmodules=true` to `ignition.conf` (`wrapper.java.additional.N`) and
     restarting the gateway.

### Map / Map 3D / Globe caveat (the one thing not self-contained)
The `Map`, `Map 3D`, and `Globe` components render geography from **GeoJSON map data that you must
provide** — ECharts ships no map data. In an air-gapped system there is no online map source, so:
- Register your GeoJSON before the component renders, e.g. from a Perspective script or by passing
  a fully-formed `option` that references a map you have registered via
  `echarts.registerMap(name, geoJson)`.
- Bundle the GeoJSON with your project/resources; do not rely on any online map service.

All other components require no external data and work fully offline.

---

## 2. Build (offline build host) — requires a one-time mirror

A normal build reaches the network for three things:
- **Inductive Automation Nexus** (`https://nexus.inductiveautomation.com/repository/public/`) — the
  Ignition SDK plugin (`io.ia.sdk.modl`) and all `compileOnly` Ignition artifacts.
- **nodejs.org** (`https://nodejs.org/dist/`) — the Node toolchain (`web` build downloads Node
  22.6.0 / npm 10.8.2 via the Gradle Node plugin).
- **npm registry** — the JS dependencies (`echarts`, `echarts-gl`, `react`, `perspective-client`, …).

To build on an air-gapped host, pre-seed each of these once:

1. **Ignition + Gradle artifacts** — on a connected machine, run a full build to populate the
   Gradle cache, then copy `~/.gradle/caches` to the offline host, or publish the required
   artifacts to an internal Maven mirror and point `settings.gradle.kts` repositories at it
   (`mavenLocal()` is already consulted first).
2. **Node toolchain** — install Node 22.6.0 on the offline host and disable the download by setting
   `node { download.set(false) }` in `web/build.gradle.kts` (or pre-place the distribution where the
   Gradle Node plugin expects it).
3. **npm dependencies** — commit/transfer `web/node_modules` (or a private npm registry / offline
   cache) and use `npm ci --offline` so no registry access is attempted.

After mirroring, `./gradlew build` produces `build/Open-ECharts.unsigned.modl` with no network
access. This affects only the **build host**; the resulting module runs on a fully air-gapped
gateway as described in section 1.
