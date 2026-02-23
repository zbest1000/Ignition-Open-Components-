# Open ECharts — Installation Guide

Installation guide for the **Open ECharts** Ignition 8.3 Perspective module, which provides 40 ECharts charting components.

---

## 1. Prerequisites

| Requirement | Details |
|-------------|---------|
| **Ignition** | 8.3.0 or newer |
| **Perspective module** | Must be installed and licensed on the gateway |
| **Browser** | Modern browser with JavaScript enabled; WebGL support required for 3D charts |

The module depends on the Perspective module (`com.inductiveautomation.perspective`). If Perspective is not installed, the module will not load.

---

## 2. Download

### From GitHub Releases

1. Go to the [GitHub Releases](https://github.com/opencomponents/echarts/releases) page.
2. Download the latest `Open-ECharts-<version>.modl` (or `Open-ECharts-<version>.unsigned.modl`).
3. Optionally verify the SHA-256 checksum from the release notes.

### Build from Source

See [Build from Source](#3-build-from-source) below.

---

## 3. Build from Source

| Requirement | Details |
|-------------|---------|
| **Java** | JDK 17 |
| **Gradle** | 7.6+ (wrapper included) |
| **Node.js** | 18+ (auto-downloaded by Gradle) |

```bash
git clone https://github.com/opencomponents/echarts.git
cd echarts
./gradlew clean build
```

**Output location:** `build/Open-ECharts.unsigned.modl`

To override the version:

```bash
./gradlew build -PmoduleVersion=1.2.3
```

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
   - **Open Components / Industrial** — Industrial Trend, OEE Summary, Pareto Chart

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

All assets (ECharts library, themes, templates) are bundled inside the `.modl` file. No internet connection is required at runtime. The module works in fully air-gapped environments.

---

## 9. Module Signing

| Type | File name | Use case |
|------|-----------|----------|
| **Unsigned** | `Open-ECharts.unsigned.modl` | Development, testing |
| **Signed** | `Open-ECharts.modl` | Production deployments |

Unsigned modules load on most gateways. Some environments require signed modules for security policy compliance.

To sign the module when building from source, configure signing in `gradle.properties` and set `signModule=true`. See [CONTRIBUTING.md](../.github/CONTRIBUTING.md#module-signing-optional) for keystore setup and CI/CD signing configuration.

---

## 10. Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| Module won't load | Ignition version too old | Upgrade to Ignition 8.3.0 or newer |
| Module won't load | Missing dependency | Ensure the Perspective module is installed and licensed |
| Components not in palette | Perspective not installed | Install the Perspective module on the gateway |
| Components not in palette | Designer not restarted | Close and reopen Designer after installing the module |
| Blank charts in view | JavaScript error | Open browser DevTools (F12) → Console; check for errors |
| Blank charts in view | Invalid option JSON | Verify the `option` property has valid ECharts JSON; check for syntax errors |
| 3D charts not rendering | WebGL disabled | Enable WebGL in the browser; try a different browser |
| Module shows as unsigned | Using development build | Use a signed release from GitHub, or sign locally (see [Module Signing](#9-module-signing)) |

---
