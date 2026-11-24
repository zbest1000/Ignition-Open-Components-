# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing has been released yet; this section describes the first release as it will ship.
"Changed", "Fixed" and "Removed" are relative to earlier development builds.

### Added
- 56 Perspective components on one shared runtime:
  - 26 in *Open Components / ECharts*: the universal `EChart` renderer plus 25 2D chart types
  - 11 in *Open Components / ECharts 3D*: 8 3D types (Bar3D, Line3D, Scatter3D, Surface, Map3D,
    Globe, Lines3D, Polygons3D) and 3 WebGL types (ScatterGL, GraphGL, FlowGL)
  - 12 in *Open Components / Industrial*: Trend, OEE, Pareto, SPC, and eight KPI and analysis
    charts built from plain row data:
    - Metric Rings: concentric progress rings for any metrics, with per-ring range, unit and
      target, value thresholds, and a centre summary (product, average, min, max, sum)
    - Bullet Chart: actual versus target on qualitative bands
    - KPI Tile: a big number with change versus previous or target and a sparkline
    - Waterfall: bridge of increases, decreases, subtotals and totals; correct across zero
    - Capability Histogram: histogram with LSL / USL / target, fitted normal curve and
      Pp/Ppk (overall sigma) or Cp/Cpk (within sigma)
    - Flow Diagram: Sankey from source/target/value rows; circular flows are dropped with a note
    - Event Heatmap: event counts by hour of day and day of week, from cells or raw timestamps
    - Radar Comparison: entities compared across metrics with different units, each axis
      normalised to its own range, real values in tooltips
- OEE Summary is customisable: `labels`, `colors`, `thresholds`, `target`, `decimals`, and a
  `metrics` list that replaces the three fixed factors. Existing props are unchanged.
  - 7 in *Open Components / Scheduling*: State Timeline, Gantt, Schedule Calendar, Shift Calendar,
    Downtime Tracker, Batch Timeline, Resource Heatmap
- `maps` prop on every component: GeoJSON or SVG maps keyed by map name, so `map`, `geo`, `map3D`
  and `geo3D` series can draw regions. Map names are global to the page and must be unique.
- `ariaLabel` prop on every component; ECharts' generated chart description (`aria`) is enabled
  by default unless the option configures `aria` itself.
- 2 built-in themes (`IgnitionIndustrialDark`, `IgnitionIndustrialLight`), part of the client bundle.
- 23 starter option templates.
- `common/src/main/resources/components.manifest.json`: the single definition of all components,
  read by the Java descriptors and by the web bundle, so the two cannot drift apart.
- A headless-Chromium smoke test of the built bundle (`npm run test:e2e` in `web/`; needs
  Playwright, not part of `./gradlew build`).
- Release pipeline: CI build with lint and tests, CodeQL, optional dependency review, `npm audit`,
  tag-triggered releases with optional signing, `.sha256` checksum, CycloneDX SBOM and build
  provenance attestation.

### Changed
- Apache ECharts upgraded from 5.6.0 to 6.1.0.
- ECharts-GL is loaded on demand as a separate chunk, only when one of the 11 3D / WebGL
  components is used; views without them no longer download it. The entry bundle is about
  1.2 MB plus a 0.6 MB ECharts-GL chunk (previously one 1.74 MB file).
- Each chart type now drops from the palette with its own default option, populated with sample
  data (Map, Map 3D, Polygons 3D and Custom start with a hint instead: they need map data or a
  render function). Previously every component started as the same bar chart. A saved view with
  an empty `option` on an ECharts component renders that default.
- Industrial components: Pareto sorts categories by count, largest first; SPC draws X-bar & R
  for `subgroupSize` 2–10 and scales both value axes to the data and control limits; OEE clamps
  its factors to 0–100; Trend accepts rows of objects (`data.timeField` / `data.valueField`,
  default `t` / `v`) and uses LTTB sampling; the timeline components count overlapping intervals
  once; empty charts show "No data". Trend, Schedule Calendar, Shift Calendar and Resource Heatmap
  drop with sample data.
- With `lazyUpdate=true` the component itself defers `setOption` to the next animation frame and
  applies only the latest option (after 500 ms in a tab that gets no frames).
- Toggling `sanitizeTooltip` or changing a map re-applies the option in full, resetting zoom once.
- Event payloads are now defined per event: click-type events (`onClick`, `onDoubleClick`,
  `onMouseOver`, `onMouseOut`) carry the series and data fields (`seriesName`, `seriesIndex`,
  `name`, `dataIndex`, `value`, `data`, ...); `onLegendSelectChanged` carries `name` and
  `selected`; `onDataZoom` carries `start`, `end`, `startValue`, `endValue` and `batch`;
  `onBrushSelected` carries `batch`. Mouse-event `data` omits a node's `children`;
  `onBrushSelected` sends at most the first 1000 selected indices per series plus
  `dataIndexCount`, and fires at most once per 100 ms.
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
- Gantt `showProgress` / `progress`, Downtime Tracker `showSummary` and the State Timeline event
  `color` now have an effect.
- A chart that failed on a bad option is drawn again once the option is corrected.
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
- `sanitizeTooltip` (default `true`) sanitises tooltip and toolbox data-view HTML with DOMPurify,
  keeps only `http`, `https` and relative URLs in `link` / `sublink`, drops colour and tooltip
  style strings that are not a single CSS value (ECharts 6.1 writes tooltip colours unescaped
  into a `style` attribute), and sanitises SVG maps. Remote images in formatter HTML are still
  allowed. It is not a sandbox: options bound to untrusted data should still be reviewed. See
  `docs/SECURITY.md`.
- Removing the theme REST endpoints removes the module's only gateway-side network surface.

### Technical details
- Ignition SDK 8.3.7, Java 17
- Apache ECharts 6.1.0, ECharts-GL 2.1.0, DOMPurify 3
- Gradle 9.5.1, `io.ia.sdk.modl` 0.5.0, Node.js 22, TypeScript, webpack 5
