# Open ECharts — Installation Guide

Installation guide for the **Open ECharts** Ignition 8.3 Perspective module, which provides 56 ECharts charting components.

---

## 1. Prerequisites

| Requirement | Details |
|-------------|---------|
| **Ignition** | 8.3.7 or newer (the SDK version the module is built and tested against) |
| **Perspective module** | Must be installed and licensed on the gateway |
| **Browser** | Modern browser with JavaScript enabled; WebGL support required for 3D charts |

The module requires the Perspective module (`com.inductiveautomation.perspective`). If Perspective is not installed, the gateway faults this module instead of loading it.

---

## 2. Download

### From GitHub Releases

1. Go to the [GitHub Releases](https://github.com/zbest1000/Ignition-Open-Components-/releases) page.
2. Download `Open-ECharts-<version>.modl` and its `.sha256` file. A release whose module is
   named `Open-ECharts-<version>.unsigned.modl` is not signed; see [Module Signing](#9-module-signing).
3. Verify the download (run next to the downloaded files):

   ```bash
   sha256sum -c Open-ECharts-<version>.modl.sha256
   gh attestation verify Open-ECharts-<version>.modl --repo zbest1000/Ignition-Open-Components-
   ```

   The second command (GitHub CLI) checks the build provenance attestation: that the file was
   built by this repository's release workflow. Each release also includes a CycloneDX SBOM
   (`.sbom.cdx.json`) of the bundled JavaScript libraries.

### Build from Source

See [Build from Source](#3-build-from-source) below.

---

## 3. Build from Source

| Requirement | Details |
|-------------|---------|
| **Java** | JDK 17 |
| **Gradle** | 9.5.1, downloaded by the included wrapper |
| **Node.js** | 22, downloaded by the build |

```bash
git clone https://github.com/zbest1000/Ignition-Open-Components-.git
cd Ignition-Open-Components-
./gradlew build
```

**Output location:** `build/Open-ECharts.unsigned.modl`

The version comes from `gradle.properties`. To override it:

```bash
./gradlew build -PmoduleVersion=1.2.3
```

Only versions Ignition can parse are accepted (`1.2.3`, `1.2.3.45`, `1.2.3-rc1`,
`1.2.3-SNAPSHOT`); see [CONTRIBUTING.md](../.github/CONTRIBUTING.md#version).

---

## 4. Install on Gateway

1. Log in to the Ignition Gateway web UI.
2. Go to **Config** → **Modules**.
3. Click **Install or Upgrade a Module**.
4. Select the `.modl` file (or drag and drop).
5. Click **Install**.
6. Restart the gateway if prompted.

---

## 5. Verify Installation

### Gateway status page

1. Go to **Config** → **Status**.
2. Under **Modules**, confirm **Open ECharts** is listed and shows a green status.

### Designer

1. Open Ignition Designer.
2. Create or open a Perspective view.
3. In the component palette, look for these categories:
   - **Open Components / ECharts** — 2D charts (line, bar, pie, scatter, gauge, etc.)
   - **Open Components / ECharts 3D** — 3D and WebGL charts (Bar 3D, Globe, Scatter GL, etc.)
   - **Open Components / Industrial** — Industrial Trend, OEE Summary, Pareto Chart, SPC Chart, Metric Rings, Bullet Chart, KPI Tile, Waterfall Chart, Capability Histogram, Flow Diagram, Event Heatmap, Radar Comparison
   - **Open Components / Scheduling** — State Timeline, Gantt, calendars, Downtime Tracker,
     Batch Timeline, Resource Heatmap

If these categories appear with components, installation is successful.

---

## 6. Upgrade

Upgrading uses the same process as installation:

1. **Config** → **Modules** → **Install or Upgrade a Module**.
2. Select the new `.modl` file.
3. The module upgrades in place; existing views and components continue to work.
4. Restart if prompted.

---

## 7. Uninstall

1. Go to **Config** → **Modules**.
2. Find **Open ECharts** in the list.
3. Click **Uninstall**.
4. Restart the gateway if prompted.

**Note:** Views that use Open ECharts components will show placeholder errors until the module is reinstalled or the components are replaced.

---

## 8. Air-Gapped / Offline Environments

All assets (ECharts library, themes, templates) are bundled inside the `.modl` file. No internet connection is required at runtime. The module works in fully air-gapped environments; see [AIR_GAPPED_DEPLOYMENT.md](AIR_GAPPED_DEPLOYMENT.md), including how to supply map data.

---

## 9. Module Signing

| Type | File name | Use case |
|------|-----------|----------|
| **Unsigned** | `Open-ECharts.unsigned.modl` | Development, testing |
| **Signed** | `Open-ECharts.modl` | Production deployments |

A gateway refuses to install an unsigned module unless it was started with
`-Dignition.allowunsignedmodules=true` (add it as a `wrapper.java.additional.N` entry in
`ignition.conf` and restart). Do this on development gateways only.

To sign the module when building from source, put `signModule=true` and the
`ignition.signing.*` properties in `~/.gradle/gradle.properties` — not in the repository's
`gradle.properties`, which is committed. `gradle.properties.template` lists them, and
[CONTRIBUTING.md](../.github/CONTRIBUTING.md#module-signing) covers the release workflow's
signing secrets.

---

## 10. Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Module won't load | Ignition version too old | Upgrade to Ignition 8.3.7 or newer |
| Module faulted | Perspective missing | Perspective is a required dependency: install and license the Perspective module |
| Components not in palette | Designer not restarted | Close and reopen Designer after installing the module |
| Blank charts in view | JavaScript error | Open browser DevTools (F12) → Console; check for errors |
| Red message in place of the chart | ECharts rejected the option | The message is the ECharts error; correct the `option` (for example a series without the axes it needs) and the chart redraws |
| Empty map chart | No map data | Put GeoJSON or SVG in the `maps` property and set `series.map` / `geo.map` to its key |
| 3D charts not rendering | WebGL disabled | Enable WebGL in the browser; try a different browser |
| Install rejected: module is unsigned | Gateway does not allow unsigned modules | Use a signed release, sign locally, or (development only) allow unsigned modules; see [Module Signing](#9-module-signing) |
| Install rejected: invalid version | Module built with a version Ignition cannot parse | Rebuild with a version such as `1.2.3` or `1.2.3-rc1` |

---
