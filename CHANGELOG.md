# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing has been released yet; this section describes the first release as it will ship.
"Changed", "Fixed" and "Removed" are relative to earlier development builds.

### Added
- 48 Perspective components on one shared runtime:
  - 26 in *Open Components / ECharts*: the universal `EChart` renderer plus 25 2D chart types
  - 11 in *Open Components / ECharts 3D*: 8 3D types (Bar3D, Line3D, Scatter3D, Surface, Map3D,
    Globe, Lines3D, Polygons3D) and 3 WebGL types (ScatterGL, GraphGL, FlowGL)
  - 4 in *Open Components / Industrial*: Trend, OEE, Pareto, SPC
  - 7 in *Open Components / Scheduling*: State Timeline, Gantt, Schedule Calendar, Shift Calendar,
    Downtime Tracker, Batch Timeline, Resource Heatmap
- `ariaLabel` prop on every component; ECharts' generated chart description (`aria`) is enabled
  by default unless the option configures `aria` itself.
- 2 built-in themes (`IgnitionIndustrialDark`, `IgnitionIndustrialLight`), part of the client bundle.
- 23 starter option templates.
- `common/src/main/resources/components.manifest.json`: the single definition of all components,
  read by the Java descriptors and by the web bundle, so the two cannot drift apart.
- Release pipeline: CI build with lint and tests, CodeQL, dependency review, `npm audit`,
  tag-triggered releases with optional signing, `.sha256` checksum, CycloneDX SBOM and build
  provenance attestation.

### Changed
- Apache ECharts upgraded from 5.6.0 to 6.1.0.
- ECharts-GL is loaded on demand as a separate chunk, only when one of the 11 3D / WebGL
  components is used; views without them no longer download it.
- Each chart type now drops from the palette with its own default option. Previously every
  component started as the same bar chart.
- Event payloads are now defined per event: click-type events (`onClick`, `onDoubleClick`,
  `onMouseOver`, `onMouseOut`) carry the series and data fields (`seriesName`, `seriesIndex`,
  `name`, `dataIndex`, `value`, `data`, ...); `onLegendSelectChanged` carries `name` and
  `selected`; `onDataZoom` carries `start`, `end`, `startValue`, `endValue` and `batch`;
  `onBrushSelected` carries `batch`.
- With `notMerge=false`, series are replaced rather than merged on update, so a series removed
  from the option disappears from the chart.
- `sanitizeTooltip` no longer truncates arrays or strings in the option.
- The module declares Perspective as a *required* dependency and `freeModule=true`, and requires
  Ignition 8.3.7 (the SDK version it is built and tested against).
- Build: Gradle 9.5.1 wrapper with a pinned distribution checksum, `io.ia.sdk.modl` 0.5.0,
  Node.js 22 with `npm ci`; `./gradlew build` now also runs eslint and jest. The module version
  lives in the committed `gradle.properties`, and the build fails on a version Ignition cannot
  parse.
- Platform libraries are `compileOnly`, so no Ignition classes are bundled into the `.modl`.

### Fixed
- Industrial and scheduling components bind to their own property schemas, so their domain props
  (`tasks`, `phases`, `values`, `events`, `utilization`, ...) can be set and bound in the Designer.
- All seven chart events are declared on the component descriptors and can be bound in
  Perspective. Previously only `onClick` and `onDoubleClick` were.
- A fresh clone no longer builds a module with `<version>unspecified</version>`, which gateways
  reject; CI and prerelease versions now use forms Ignition accepts (`0.1.0.57`, `1.0.0-rc1`).
- `module.xml` no longer declares `freeModule=false` while the gateway hook reports a free module.
- The release workflow published the unsigned module even when signing succeeded, and wrote a
  checksum file that `sha256sum -c` could not verify.

### Removed
- The gateway theme REST endpoints (`/system/data/open-echarts/themes`) and gateway-side theme
  storage. They were unauthenticated and nothing used them; themes are client-side.

### Security
- Apache ECharts 6.1.0 fixes advisory GHSA-fgmj-fm8m-jvvx.
- `sanitizeTooltip` (default `true`) sanitises HTML in tooltip formatter strings with DOMPurify
  and keeps only `http`, `https` and relative URLs in link fields. It is not a sandbox: options
  bound to untrusted data should still be reviewed. See `docs/SECURITY.md`.
- Removing the theme REST endpoints removes the module's only gateway-side network surface.

### Technical details
- Ignition SDK 8.3.7, Java 17
- Apache ECharts 6.1.0, ECharts-GL 2.1.0, DOMPurify 3
- Gradle 9.5.1, `io.ia.sdk.modl` 0.5.0, Node.js 22, TypeScript, webpack 5
