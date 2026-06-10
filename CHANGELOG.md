# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 48 Perspective components covering the full ECharts + ECharts-GL suite
  - 25 2D chart types matching every ECharts gallery category
  - 8 3D chart types (Bar3D, Line3D, Scatter3D, Surface, Map3D, Globe, Lines3D, Polygons3D)
  - 3 WebGL-accelerated types (ScatterGL, GraphGL, FlowGL)
  - 11 industrial components (Trend, OEE, Pareto, SPC, State Timeline, Gantt, Schedule Calendar, Shift Calendar, Downtime Tracker, Batch Timeline, Resource Heatmap)
  - 1 universal EChart renderer for advanced/custom usage
- AbstractEChartComponent shared base: lifecycle, ResizeObserver, event bridging, option sanitisation
- 2 built-in industrial themes (IgnitionIndustrialDark, IgnitionIndustrialLight)
- 23 starter option templates for quick chart creation
- Option sanitiser: strips JS functions, circular refs, caps array/string sizes
- Event serialiser: safe payload extraction for click, dblclick, zoom, brush, legend events
- Gateway-hosted module resources (no CDN — air-gap safe)
- Enterprise CI/CD: build, PR validation, tag-triggered release with optional signing
- Comprehensive PROJECT_PLAN.md with resource library

### Fixed
- Industrial components (SPC, State Timeline, Gantt, Schedule Calendar, Shift Calendar,
  Downtime Tracker, Batch Timeline, Resource Heatmap) now bind to dedicated property schemas
  so their domain props (e.g. `tasks`, `phases`, `values`, `events`, `utilization`) are
  settable/bindable in the Designer. Previously they shared the generic schema
  (`additionalProperties: false`) and those props could not be configured.
- All seven chart events are now declared on the component descriptors. Previously only
  `onClick`/`onDoubleClick` were declared while `onMouseOver`, `onMouseOut`,
  `onLegendSelectChanged`, `onDataZoom`, and `onBrushSelected` were fired but could not be
  bound in Perspective.

### Changed
- Gateway build now declares the Perspective platform libraries as `compileOnly` (was
  `implementation`), so platform classes are no longer bundled into the `.modl` (avoids
  classloader conflicts at runtime).
- ECharts now mounts on an inner child element; the `emit()` root element no longer carries a
  `ref`, per the Perspective SDK guidance.
- Webpack now fails the build (instead of warning) if the JS/CSS bundle is missing when copying
  to the mounted-resources folder, preventing a silently empty resource bundle.
- Removed unused `mobx`/`mobx-react` webpack externals.

### Security
- Theme REST API: `save` and `delete` are restricted to `POST`, and theme names are validated
  (rejected with `400` unless already filesystem-safe) to prevent silent file collisions/
  overwrites. Path traversal was already prevented by name sanitisation.

### Documentation
- Added `docs/AIR_GAPPED_DEPLOYMENT.md` (offline install, map GeoJSON caveat, offline build).

### Technical Details
- Ignition SDK 8.3.0
- Java 17
- Apache ECharts 5.6.0
- ECharts-GL 2.0.9
- Gradle 7.6.4 with io.ia.sdk.modl plugin 0.3.0
- TypeScript + Webpack 5
