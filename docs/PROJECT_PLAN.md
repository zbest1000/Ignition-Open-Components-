# Ignition Open Components — ECharts Ignition Module (Perspective-first)

## Purpose
Create an Ignition 8.3 module that provides a **large, industrial-focused component library** for **Perspective** built on **Apache ECharts**, including a **gateway-hosted theme builder** and a **theme management system** suitable for regulated / offline / air‑gapped automation networks.

This document is the **implementation plan + feature specification** and is intended to be detailed enough to drive development, testing, documentation, and long-term maintenance.

---

## Non-goals (explicit)
- Build full 1:1 parity with all third-party UI libraries beyond ECharts. (We will focus on charting + industrial visualization + a small set of non-chart industrial UI components where Perspective gaps exist.)
- Promise “Vision parity” with ECharts. Vision is Swing-based; ECharts is browser-based. Vision support is possible only as a **separate scope** with different technology choices.

---

## Target Platforms & Compatibility

### Ignition
- **Ignition 8.3.x** (SDK docs: `https://www.sdk-docs.inductiveautomation.com/docs/8.3/intro`)
- Java **17** (Ignition 8.3 baseline)
- Gateway + Designer + Perspective Session
- **Maker Edition**: should load and run; avoid license-locked APIs and avoid requiring commercial embedded runtimes.

### Browsers / Clients
- Modern Chromium/Edge + Firefox
- Mobile: Android Chrome; iOS Safari (known canvas/memory constraints)

---

## Licenses and Third-Party Notices

### Repo license
- This repository is MIT.

### ECharts license
- Apache ECharts is **Apache-2.0**.
- Requirements for distribution:
  - Include ECharts LICENSE and NOTICE (or equivalent) in the module.
  - Attribute ECharts appropriately in documentation and “About” page.

### No-CDN requirement (industrial)
Many plants are offline or filtered. The module must:
- **bundle ECharts assets locally** in the module web resources
- not rely on external CDNs for runtime functionality

---

## Primary Product Scope: Perspective Component Library

### Guiding design principle
ECharts is option-driven. To achieve “huge component library” without dozens of fragile wrappers:
- Provide **one universal ECharts renderer component** that supports **all ECharts option objects**.
- Layer on **industrial “builder components”** that generate options from Ignition-friendly data and domain-specific props.
- Provide **templates + wizards** to accelerate adoption.

---

## Vision Support (Feasibility & Options)

Vision is Swing-based. ECharts requires a browser runtime. Options:

### Option A — Vision charts via Java/Swing chart libraries (recommended if Vision is required)
- Implement a subset of chart types using a Java library (not ECharts).
- Tradeoff: not feature-parity with ECharts, but stable.

### Option B — Vision browser embedding (not recommended)
- Embed a browser engine and run the Perspective/ECharts UI inside.
- Tradeoff: licensing, footprint, security patching, and long-term support risk.

### Recommendation
Ship Perspective-first. Add Vision only if a separate phase is approved with explicit scope and acceptance criteria.

---

## Module Architecture (Ignition SDK 8.3)

### High-level components
- **Gateway module**: theme storage, REST endpoints, resource serving, module settings, validation.
- **Designer module**: palette entries, property editors, wizards, theme manager UI launchers.
- **Common module**: shared constants, schemas, validation utilities, DTOs.
- **Perspective web package**: React components, ECharts runtime, templates, and theme builder UI.

### Recommended Gradle multi-project layout
- `common/`
- `gateway/`
- `designer/`
- `web/` (npm/React build output copied into module resources)
- `buildSrc/` (optional shared Gradle logic)

### Ignition hooks (conceptual)
- `GatewayHook`: registers settings, REST routes, resource serving, default theme provisioning.
- `DesignerHook`: registers Perspective component palette entries, custom editors, and menu entries for Theme Builder/Theme Manager.
- `ModuleMeta`: name, version, vendor, descriptions, required ignition version.

> Note: exact class names/APIs depend on SDK packages. Implementation must follow the Ignition 8.3 SDK patterns for gateway/designer hooks and Perspective component registration.

---

## Build & Toolchain

### Required build tools
- Java 17 JDK
- Gradle wrapper
- Node.js LTS + npm

### Build outputs
- `.modl` module artifact containing:
  - jars for gateway/designer/common
  - web resources (Perspective component bundle, ECharts, theme builder UI)
  - third-party notices/licenses

### CI checks (recommended)
- Gradle build
- npm install + build (web)
- basic TypeScript type checks (if used)
- unit tests (validation utilities, theme validation, option sanitization)

---

## Perspective Component Suite (Feature Spec)

### Component categories
1. **Core ECharts rendering**
2. **Industrial chart builders**
3. **Industrial UI (non-chart) components**
4. **Utilities (export, diagnostics, offline tools)**

---

## Core Component: `EChart` (Universal Renderer)

### Why this exists
It is the “everything” component: any valid ECharts `option` object renders here, including future ECharts features with minimal module changes.

### Component name (proposed)
- Palette name: **ECharts Chart**
- Component type: `open.echarts.EChart` (final naming TBD)

### Properties (proposed)
#### Rendering
- `option` (object, required): ECharts option root object.
- `theme` (string | object):
  - string: theme name (built-in or gateway-managed)
  - object: inline theme JSON (advanced)
- `renderer` (`canvas` | `svg`): default `canvas`.
- `devicePixelRatio` (number | null): optional override.
- `useDirtyRect` (boolean): optional ECharts optimization.

#### Resize / lifecycle
- `autoResize` (boolean): default true.
- `resizeDebounceMs` (number): default ~100–250ms.
- `recreateOnThemeChange` (boolean): default true (themes require dispose/re-init).

#### Option update behavior
- `notMerge` (boolean): default false.
- `lazyUpdate` (boolean): default true.
- `replaceMerge` (array<string> | null): for targeted merge behavior.
- `silent` (boolean): if true, suppress event callbacks.

#### Data convenience (optional, for builder-lite use)
- `dataset` (array | dataset | null): Ignition dataset or array-of-objects.
- `encode` (object | null): map dataset to dimensions/series.
- `seriesOverrides` (array<object> | null): partial overrides applied per series.

#### Accessibility / UX
- `aria` (boolean | object): default true (where practical).
- `locale` (string | null)
- `timezone` (string | null)
- `tooltipMode` (enum): `item` / `axis` / `none` convenience
- `showLoading` (boolean)
- `loadingOptions` (object)

#### Security / sanitation
- `sanitizeTooltip` (boolean): default true.
- `allowRichText` (boolean): default false (HMI-friendly default).

### Events (Perspective component events)

#### ECharts → Perspective event mapping
The component subscribes to ECharts events and emits Perspective events with consistent naming and payload shape.

Supported event keys (emitted only when the underlying ECharts feature is present/configured):
- `chart.click`
- `chart.dblclick`
- `chart.mouseover`
- `chart.mouseout`
- `chart.mousemove`
- `chart.globalout`
- `chart.contextmenu`
- `chart.legendselectchanged`
- `chart.legendselected`
- `chart.legendunselected`
- `chart.legendselectall`
- `chart.legendinverseselect`
- `chart.datazoom`
- `chart.timelinechanged`
- `chart.timelineselectchanged`
- `chart.pieselectchanged`
- `chart.pieselected`
- `chart.pieunselected`
- `chart.mapselectchanged`
- `chart.mapselected`
- `chart.mapunselected`
- `chart.axisareaselected`
- `chart.brushselected`
- `chart.rendered`
- `chart.finished`

#### Standard event payload (serialized)
- `eventType` (string): e.g. `chart.click`
- `ts` (number): epoch ms
- `params` (object): best-effort JSON-safe subset of ECharts event params
- `componentPath` (string): Perspective component path/id
- `truncated` (boolean): whether size caps were applied

#### Serialization rules (must implement)
- Remove functions.
- Remove DOM/Window references.
- Cap arrays and strings to configurable maxima.
- Detect circular references and prune.

---

## Control Surface (Commands)

Perspective bindings need a stable way to “call” chart methods. We expose a command channel.

### `command` property (proposed)
- `command.name` (string)
- `command.payload` (object)
- `command.nonce` (number): increment to execute (allows repeating the same command)
- `command.result` (object, read-only): last result or `{ error: ... }`

### Supported commands (phase 1)
- `resize`: triggers `chart.resize()`
- `setOption`: applies provided option with merge flags
- `clear`: clears chart
- `exportPng`: returns base64 PNG (or triggers download if enabled)
- `exportSvg`: returns SVG string when renderer is `svg`
- `getOption`: returns current resolved option (best-effort)
- `dispatchAction`: allowlisted ECharts actions only (see later section)

---

## ECharts Runtime Integration (Web Package)

### Bundling strategy (no CDN)
- Bundle ECharts JS into the Perspective web package.
- Provide a single module-managed entry:
  - `echarts.min.js` (or ESM build) under module resources
  - optional extension bundles (maps/geojson helpers) as separate chunks

### Initialization lifecycle (must implement)
- On mount:
  - resolve theme (inline → gateway → built-in)
  - `echarts.registerTheme(name, themeJson)` if not already registered
  - `echarts.init(domNode, themeName, { renderer, devicePixelRatio, useDirtyRect })`
  - apply initial `setOption`
  - register event listeners
- On update:
  - if theme changed and `recreateOnThemeChange = true`: dispose + re-init
  - else: `setOption` with merge flags
- On unmount:
  - remove listeners
  - dispose instance

### ECharts instance methods we rely on
- `setOption(option, { notMerge, lazyUpdate, replaceMerge, silent })`
- `resize(opts?)`
- `dispatchAction(action)`
- `on(eventName, handler)`
- `off(eventName, handler)`
- `getOption()` (best-effort for diagnostics)
- `getDataURL(opts)` (for PNG export)
- `dispose()`
- `clear()`

### ECharts static methods we rely on
- `echarts.init(dom, theme?, opts?)`
- `echarts.dispose(domOrInstance)`
- `echarts.getInstanceByDom(dom)`
- `echarts.registerTheme(name, theme)`
- `echarts.registerMap(mapName, geoJson, specialAreas?)` (optional/maps)

### What we will NOT support (by default)
- User-authored JS function bodies in Designer (e.g. tooltip `formatter` as a function).
  - Rationale: security + maintainability.
  - Replacement: built-in formatter modes + template strings.

---

## ECharts Option/Object Inventory (Implementation Checklist)

This section enumerates the ECharts object model that the module must support. The universal `EChart` component supports these by forwarding option JSON; the *additional work* is around UX, validation, and safe defaults.

### 1) Root option object (`EChartsOption`)
Root keys the module must accept (grouped; see also earlier “Root Option Inventory”):

- **Global styling/behavior**: `backgroundColor`, `darkMode`, `color`, `textStyle`, `blendMode`
- **Animation/perf**: `animation*`, `stateAnimation`, `progressive*`, `universalTransition`
- **Accessibility**: `aria`
- **Components**: `title`, `legend`, `grid`, `dataset`, `transform`, `graphic`, `toolbox`, `brush`
- **Coordinates**: `xAxis`, `yAxis`, `polar`, `radiusAxis`, `angleAxis`, `radar`, `geo`, `calendar`, `singleAxis`, `parallel`, `parallelAxis`
- **Interaction**: `tooltip`, `axisPointer`, `dataZoom`, `visualMap`, `timeline`
- **Rendering**: `series`
- **Responsive**: `media`

### 2) Coordinate systems (must support)
Series can declare coordinate system usage; templates/builders must guide users.

- `cartesian2d` (via `xAxis`/`yAxis`)
- `polar` (via `polar` + `radiusAxis` + `angleAxis`)
- `radar` (via `radar`)
- `geo` (via `geo`)
- `calendar` (via `calendar`)
- `parallel` (via `parallel` + `parallelAxis`)
- `singleAxis` (via `singleAxis`)

### 3) Component option objects (must support)
For each, the universal renderer supports it; the module provides templates and (where needed) safe formatting alternatives.

- `title`: chart heading/subheading and link behavior
- `legend`: series selection UI (plain/scroll)
- `tooltip`: info popups (safe formatting modes)
- `axisPointer`: crosshair and pointer labels
- `grid`: layout container (supports arrays for multi-grid)
- `xAxis`, `yAxis`: cartesian axes (array forms supported)
- `polar`, `radiusAxis`, `angleAxis`: polar coordinate config
- `radar`: radar coordinate config
- `geo`: map/geo coordinate config
- `calendar`: calendar coordinate config
- `parallel`, `parallelAxis`: parallel coordinate config
- `singleAxis`: single axis config
- `dataZoom`: inside + slider
- `visualMap`: continuous + piecewise
- `toolbox`: built-in tools (export/restore/datazoom/etc.)
- `brush`: selection tooling
- `timeline`: time navigation component
- `dataset`: tabular data definition(s)
- `transform`: dataset transformation definitions (built-ins)
- `graphic`: arbitrary overlay graphics
- `aria`: accessibility descriptions

### 4) Series types (must support)
The universal renderer supports all series types shipped in the bundled ECharts build. Initial list to explicitly test in a gallery project:

- **Basic**: `line`, `bar`, `scatter`, `effectScatter`, `pie`
- **KPI**: `gauge`, `funnel`
- **Financial/stat**: `candlestick`, `boxplot`
- **Density**: `heatmap`
- **Hierarchy**: `tree`, `treemap`, `sunburst`
- **Relations/flow**: `graph`, `sankey`, `lines`
- **Special**: `pictorialBar`, `themeRiver`, `custom`
- **Geo (optional)**: `map`

### 5) Common sub-objects (must support everywhere)
These appear repeatedly throughout series and components:

- text and labels: `label`, `labelLine`, `rich` (rich text is opt-in)
- styles: `itemStyle`, `lineStyle`, `areaStyle`
- states: `emphasis`, `blur`, `select`
- markers: `markPoint`, `markLine`, `markArea`
- dataset mapping: `encode`, `dimensions`, `seriesLayoutBy`
- performance: `large`, `largeThreshold`, `sampling`, `progressive*`

### 6) Data formats we must accept (Perspective-friendly)
The module must support authoring options in raw ECharts form, but also provide adapters:

- Ignition Perspective `dataset` (rows/cols)
- array-of-objects (`[{ ts, value, ... }]`)
- array-of-arrays (ECharts dataset `source`)

Adapter rules:
- preserve numeric types where possible
- preserve timestamps (ms epoch) and offer timezone display options
- provide consistent handling for nulls and bad quality (industrial trend use case)

### 7) Events (must forward)
See earlier “Events” section. We must also maintain an allowlist and a stable payload contract.

### 8) Actions (must expose safely)
We must provide an allowlisted `dispatchAction` interface for:
- highlight/select
- tooltip show/hide
- legend toggle/select
- zoom/brush
- timeline navigation (optional)

---

## Coverage Matrix: “Huge Component Library” Without 50 Wrappers

### Exposure layers
We expose ECharts functionality through 4 layers:
1. **Universal renderer** (`EChart`): supports *all* ECharts options/objects by passthrough.
2. **Templates**: curated starter options for every series type and key component.
3. **Industrial builders**: domain-specific components that generate options automatically.
4. **Advanced tools**: theme system + theme builder + import/export + diagnostics.

### ECharts feature → module surface mapping (baseline)
- **All option objects**: supported via `EChart.option` passthrough.
- **All series types**: supported via `series[].type` passthrough; templates cover each type.
- **All components** (title/legend/axes/etc.): supported via option passthrough; templates + editors help.
- **All themes**: supported via theme JSON; builder provides authoring + validation.

---

## Safe Formatting System (Industrial Default)

### Problem
ECharts uses JS function callbacks (e.g., tooltip/label `formatter`) for advanced formatting. In Ignition, letting designers paste JS is unsafe and hard to govern.

### Solution
Provide built-in, safe formatter modes:
- `none`: no formatting
- `default`: ECharts default formatting
- `valueWithUnit`: `${value} ${unit}`
- `timestampWithTimezone`: uses `locale` + `timezone`
- `engineeringFormat`: fixed decimals, thousands separators, optional SI scaling
- `qualityAware`: annotates bad quality or nulls

### Template string formatting (safe subset)
Allow string templates with variable substitution only (no code execution):
- `${seriesName}`, `${name}`, `${value}`, `${value0}`, `${value1}`, `${percent}`, `${timestamp}`

Implementation rule:
- if a user supplies a function formatter in `option`, we either:
  - reject (default), or
  - allow only when a gateway “unsafe mode” setting is enabled (advanced, discouraged)

---

## Theme System (Detailed)

### Theme scope
Themes affect:
- global palette (`color`)
- typography (`textStyle`)
- component defaults (`title`, `legend`, `tooltip`, `axis*`, `dataZoom`, `visualMap`, `toolbox`, `series` defaults)
- background and darkMode behavior

### Theme JSON keys we explicitly support/edit
Even though we passthrough any theme JSON, our builder/editor must at least handle:
- `darkMode`
- `backgroundColor`
- `color` (palette array)
- `textStyle`
- `title.textStyle`, `title.subtextStyle`
- `legend.textStyle`, `legend.inactiveColor`
- `tooltip` (background/border/text styles)
- axis defaults:
  - `axisLine.lineStyle.color`
  - `axisTick.lineStyle.color`
  - `axisLabel.color`
  - `splitLine.lineStyle.color`
  - `splitArea.areaStyle.color` (optional)
- `dataZoom` styles (handle colors, border, text)
- `visualMap` styles (text, controller, inRange/outOfRange colors)
- `toolbox` icon styles
- series defaults (common):
  - `line`, `bar`, `pie`, `gauge`, `heatmap`, `scatter` (where theme supports series defaults)

### Industrial theme design requirements (unique + usable)
- palettes must include:
  - primary series palette (6–12 colors)
  - semantic colors: `ok`, `warning`, `alarm`, `inactive`
- gridlines must be visible but subtle
- tooltip must be readable under glare conditions
- defaults must avoid excessive animation/glow

### Theme governance
- semver-ish versions (`MAJOR.MINOR.PATCH`)
- immutable history option (keep last N versions)
- rollback support
- export/import with checksum (optional) for QA traceability

---

## Theme Builder (Full Feature Specification)

### Core requirement
Include the upstream ECharts Theme Builder capabilities (`https://echarts.apache.org/en/theme-builder.html`) and make it Ignition-friendly:
- offline (gateway-hosted)
- versioned themes
- import/export through the gateway
- validation and industrial preview templates

### UI modules (screens) in the Theme Builder

#### A) Theme metadata screen
- fields:
  - `meta.name` (machine name)
  - `meta.displayName`
  - `meta.version`
  - `meta.tags`
  - `meta.recommendedBackground`
  - optional notes/changelog
- actions:
  - validate
  - save
  - save as new version

#### B) Global appearance screen
Writes to:
- `echartsTheme.darkMode`
- `echartsTheme.backgroundColor`
- `echartsTheme.color`
- `echartsTheme.textStyle`

Controls:
- dark mode toggle
- background color picker
- palette editor:
  - add/remove/reorder
  - copy/paste hex list
  - generate palette variants (tint/shade)
- typography:
  - font family
  - base font size
  - base text color

#### C) Components screen (title/legend/tooltip)
Writes to:
- `echartsTheme.title.textStyle`
- `echartsTheme.title.subtextStyle`
- `echartsTheme.legend.textStyle`
- `echartsTheme.legend.inactiveColor`
- `echartsTheme.tooltip.*`

Controls:
- title/subtitle colors
- legend text/inactive colors
- tooltip background, border, text color, border radius

#### D) Axes & grid screen
Writes to:
- `echartsTheme.categoryAxis.*`
- `echartsTheme.valueAxis.*`
- `echartsTheme.logAxis.*`
- `echartsTheme.timeAxis.*`

And/or (depending on ECharts theme conventions):
- axisLine/splitLine defaults used by ECharts for axes

Controls:
- axis line color
- tick color
- label color
- split line color + opacity
- split area colors (optional)

#### E) Interaction components screen (dataZoom/visualMap/toolbox/brush)
Writes to:
- `echartsTheme.dataZoom.*`
- `echartsTheme.visualMap.*`
- `echartsTheme.toolbox.*`
- `echartsTheme.brush.*` (if applicable)

Controls:
- slider handle colors and text
- visualMap ramp presets (industrial safe ramps)
- toolbox icon color and emphasis

#### F) Series defaults screen
Writes to:
- `echartsTheme.line.*`
- `echartsTheme.bar.*`
- `echartsTheme.pie.*`
- `echartsTheme.gauge.*`
- `echartsTheme.scatter.*`
- `echartsTheme.heatmap.*`

Controls:
- line width, symbol size, area opacity
- bar radius defaults
- gauge axis/tick/label defaults
- heatmap label/blur defaults

#### G) Preview gallery screen
Previews:
- baseline chart templates for each series type
- industrial templates:
  - IndustrialTrend with limits
  - SPC
  - AlarmTimeline
  - OEE donut

Preview controls:
- switch dataset size (small/medium/large)
- switch background mode (light/dark)
- toggle “HMI safe defaults”

#### H) Import/export screen
Import formats:
- raw ECharts theme JSON (object)
- module ThemeDefinition JSON (wrapper)

Export formats:
- module ThemeDefinition JSON
- raw ECharts theme JSON

#### I) Gateway integration screen
- list themes available on gateway
- load selected theme
- save current theme to gateway (create/update)
- delete theme (admin only)

### Theme Builder implementation note
We do not need to literally clone the upstream hosted site; we need to replicate its functional capability in an Ignition-friendly package. If upstream assets are reused, ensure licensing compliance and remove any external calls.

---

## Gateway Module (Ignition SDK 8.3) — Detailed Plan

### Responsibilities
- Serve module web resources (Perspective bundle + theme builder + built-in templates).
- Store and manage themes (CRUD + history + export/import).
- Provide validation services (theme validation, option lint helpers if needed).
- Provide module settings (guardrails for performance and security).

### Settings (proposed, gateway-scoped)
Security/safety:
- `openEcharts.allowUnsafeJs` (boolean, default false)
- `openEcharts.sanitizeTooltip` (boolean, default true)
- `openEcharts.maxOptionBytes` (int, default e.g. 1–5 MB)
- `openEcharts.maxEventArrayItems` (int, default e.g. 500)
- `openEcharts.maxEventStringChars` (int, default e.g. 20_000)

Performance:
- `openEcharts.defaultRenderer` (`canvas`|`svg`, default `canvas`)
- `openEcharts.maxPointsPerSeriesSoft` (int)
- `openEcharts.maxPointsPerSeriesHard` (int)
- `openEcharts.enableSamplingDefaults` (boolean)

Theme governance:
- `openEcharts.themeHistoryDepth` (int, default e.g. 10)
- `openEcharts.defaultThemeName` (string, default `IgnitionIndustrialDark`)

### Theme storage model
Implement `ThemeRepository` with operations:
- list metas
- load by name
- save (create/update)
- delete
- list versions (optional)
- load version (optional)
- rollback (optional)

File-based layout (recommended initially):
- `data/open-echarts/themes/<themeName>/<version>/theme.json`
- `data/open-echarts/themes/<themeName>/latest.json` (or symlink-like pointer)

### REST API contract (admin/designer)
All endpoints:
- require authenticated gateway user
- require role/permission checks
- validate JSON and return structured errors

Endpoints (proposed):
- `GET /system/open-echarts/themes`
  - returns `[ { name, displayName, version, tags, updatedAt } ]`
- `GET /system/open-echarts/themes/{name}`
  - returns full ThemeDefinition
- `POST /system/open-echarts/themes`
  - body: ThemeDefinition
  - creates new theme (or rejects if exists)
- `PUT /system/open-echarts/themes/{name}`
  - body: ThemeDefinition
  - updates theme (version rules apply)
- `DELETE /system/open-echarts/themes/{name}`
  - deletes theme (optionally keep history)
- `POST /system/open-echarts/themes/import`
  - body: raw `echartsTheme` or ThemeDefinition
  - auto-detect and validate; returns created/updated meta
- `GET /system/open-echarts/themes/{name}/export`
  - returns ThemeDefinition JSON download

Session-consumable read-only endpoint (Perspective sessions):
- `GET /res/open-echarts/themes/{name}.json`
  - returns `echartsTheme` only (or full wrapper if desired)
  - cache headers enabled (ETag) for performance

### Auditing and logs
- Log theme CRUD with user identity and timestamp.
- Optionally integrate with Ignition auditing if available/desired.

---

## Designer Module (Ignition SDK 8.3) — Detailed Plan

### Responsibilities
- Register Perspective component descriptors/palette entries.
- Provide Designer property editors and wizards.
- Provide menu items/launchers for Theme Builder and Theme Manager.

### Palette entries
Organize into categories:
- `Open Components / ECharts`
- `Open Components / Industrial`

### Property editors (high priority)

#### 1) `option` editor (JSON + templates)
Features:
- JSON editor with validation
- template picker:
  - basic templates for every series type
  - industrial templates (trend, SPC, alarm timeline, OEE)
- import/export option JSON
- diagnostics:
  - size warnings
  - unsafe JS detection (formatter functions) with clear remediation

#### 2) Theme selector/editor
Features:
- theme dropdown populated from gateway + built-ins
- open theme builder button (opens gateway-hosted tool)
- import/export theme JSON
- preview button (renders sample charts with selected theme)

#### 3) Data mapping helper (optional but valuable)
For dataset-driven templates/builders:
- choose time column
- choose value columns
- auto-generate series configs

### Theme Manager (Designer UI, phase 2+)
Optional Designer panel for:
- listing themes
- setting default theme for a project
- importing/exporting themes

---

## Perspective Web Package — Detailed Plan

### Responsibilities
- Implement all Perspective components (React).
- Bundle ECharts and module assets.
- Provide dataset adapters, safe formatting utilities, option sanitization, and diagnostics.

### Suggested web package structure
- `web/src/components/EChart/`
  - ECharts instance wrapper + event bridge + command channel
- `web/src/components/builders/`
  - IndustrialTrend, SPCChart, ParetoChart, StateTimeline, AlarmTimeline, OEE…
- `web/src/theme/`
  - theme resolver, built-in themes, validators
- `web/src/templates/`
  - option templates (one per series type + industrial recipes)
- `web/src/utils/`
  - dataset adapters, time formatting, safe template formatter
- `web/src/themeBuilder/`
  - Theme Builder SPA UI

### Dataset adapter details (Perspective)
Input types:
- Perspective `dataset` (rows/columns)
- array-of-objects
- array-of-arrays

Conversion options:
- keep timestamps as epoch ms (recommended)
- allow ISO8601 string inputs (convert in adapter)
- provide quality-aware formats (optional, via `{value, quality, ts}` conventions)

### Option sanitization rules
If `allowUnsafeJs` is false:
- reject options containing function values
- reject tooltip formatter functions
- reject custom series renderItem functions unless explicitly enabled (advanced)

---

## Templates Library (Must Cover Every ECharts Series Type)

Goal: users can create any ECharts chart quickly without writing options from scratch.

### Template set (baseline)
Provide at least one starter template for each supported series type:
- `line.basic`, `line.stackedArea`, `line.step`, `line.multiAxis`
- `bar.basic`, `bar.stacked`, `bar.horizontal`, `bar.pictorial` (if pictorialBar)
- `scatter.basic`, `scatter.bubble`, `effectScatter.basic`
- `pie.basic`, `pie.donut`, `pie.rose`
- `gauge.basic`, `gauge.kpi`, `gauge.multiRing` (if desired)
- `funnel.basic`
- `candlestick.basic` (+ optional MA overlays)
- `boxplot.basic`
- `heatmap.basic`, `heatmap.calendar`
- `tree.basic`
- `treemap.basic`
- `sunburst.basic`
- `graph.force`, `graph.circular`
- `sankey.basic`
- `lines.basic` (flow lines)
- `themeRiver.basic`
- `custom.example` (advanced; behind unsafe toggle if needed)
- `map.basic` (only if maps enabled + geojson provided)

### Industrial templates (baseline)
- `industrial.trend.processVariable`
- `industrial.trend.setpointVsPv`
- `industrial.spc.individualsMr`
- `industrial.pareto.downtimeReasons`
- `industrial.timeline.alarmDuration`
- `industrial.timeline.state`
- `industrial.oee.summary`

---

## Industrial Builder Components (Expanded Specs)

### `IndustrialTrend` (priority)
Properties (proposed):
- `data.source` (dataset | array)
- `data.timeField` (string)
- `data.series` (array): `{ name, field, unit, axis: 0|1, color?, style? }`
- `time.window` (object): `{ mode: 'fixed'|'relative', start?, end?, durationMs? }`
- `time.timezone` (string | null)
- `axes` (object): engineering ranges, units, label formats
- `limits` (array): hi/lo/warn bands as markLine/markArea
- `quality` (object): `{ badBreaksLine, showBadMarkers }`
- `interaction` (object): `{ enableZoom, enableBrush, cursorMode }`

Events:
- click point → outputs `{ ts, seriesName, value }`
- brush selection → outputs `{ startTs, endTs }`

### `SPCChart`
Properties:
- `data.values` (array | dataset)
- `mode` (`individualsMr` initially)
- `limits` (auto-compute or provided)
- `rules` (enable/disable standard rule checks)

### `ParetoChart`
Properties:
- `data.categories` + `data.counts` (or dataset mapping)
- `otherBucketThreshold` (optional)

### `AlarmTimeline` / `StateTimeline`
Properties:
- `data.events` (start/end/state/priority)
- `lanes` configuration
- filtering and grouping

### `OEE`
Properties:
- A/P/Q inputs
- time range
- comparison mode (shift/day/week)

---

## Maker Edition Notes
- Avoid dependencies that require commercial licensing or platform-specific installation steps.
- Keep web assets bundled; do not require external services.
- Provide “lite defaults” for small gateways (lower point caps, fewer previews loaded).

---

## Testing & Verification Plan

### Automated tests (recommended)
- Theme validation (schema, size, contrast heuristics)
- Safe formatter/template substitution
- Option sanitization (function detection)
- Dataset adapter conversions (dataset → source)

### Manual verification (must do before releases)
- Install module in Ignition 8.3 gateway
- Designer loads palette entries
- Session renders:
  - at least one instance of each series type template
  - industrial builders with realistic datasets
- Theme Builder:
  - create theme, preview, save to gateway, load in Designer, apply in session
- Offline test:
  - gateway with no internet still works

---

## Documentation Plan (Repo Structure)

Planned docs (Markdown):
- `docs/INSTALL.md`: build + install module
- `docs/COMPONENTS.md`: component index
- `docs/components/EChart.md`
- `docs/components/IndustrialTrend.md`
- `docs/THEMING.md`: theme system + theme builder guide
- `docs/TEMPLATES.md`: template catalog
- `docs/SECURITY.md`: unsafe JS policy, sanitization, limits
- `docs/PERFORMANCE.md`: point caps, sampling, best practices

---

## Risks & Mitigations
- **Huge datasets freeze sessions**
  - mitigate with caps + sampling + guidance
- **Unsafe JS injection**
  - mitigate by default blocking functions and sanitizing tooltip content
- **Theme drift and governance**
  - mitigate with versioning + history + export/import + validation warnings
- **Map assets size**
  - mitigate by requiring user-provided geojson and shipping no heavy defaults

---

## Open Decisions (to settle during Phase 0)
- Theme storage backend choice (file vs persistence utilities).
- Whether to ship TypeScript or plain JS for web package.
- Whether to include optional 3D (`echarts-gl`) as a separate opt-in extension.

---

## Component Resources & Reference Library

This section serves as a comprehensive resource catalog for ECharts, web components, data visualization, and industrial open-source projects. Use it as a reference when designing components, selecting dependencies, or exploring integration patterns.

---

### Apache ECharts — Official Resources

| Resource | URL | Description |
|----------|-----|-------------|
| **Examples Gallery** | https://echarts.apache.org/examples/en/index.html | Hundreds of interactive examples covering every chart type, coordinate system, and feature. The primary reference for option authoring. |
| **Feature Overview** | https://echarts.apache.org/en/feature.html | High-level tour of ECharts capabilities: rendering, interaction, accessibility, datasets, and more. |
| **Theme Builder** | https://echarts.apache.org/en/theme-builder.html | Online visual theme editor. Our gateway-hosted Theme Builder replicates this functionality for offline/air-gapped environments. |
| **GitHub Repository** | https://github.com/apache/echarts | Source code, issues, and release notes. Apache-2.0 license. |
| **Awesome ECharts** | https://github.com/ecomfe/awesome-echarts | Community-curated list of extensions, wrappers, tools, and learning resources. |
| **API Reference** | https://echarts.apache.org/en/api.html | Full JavaScript API documentation for `echarts` global and instance methods. |
| **Option Reference** | https://echarts.apache.org/en/option.html | Exhaustive documentation for every option key, sub-object, and series type. |
| **Handbook / Tutorial** | https://echarts.apache.org/handbook/en/get-started/ | Step-by-step guides for beginners and intermediate users. |
| **Cheat Sheet** | https://echarts.apache.org/en/cheat-sheet.html | Visual quick reference for common option structures. |
| **Changelog** | https://github.com/apache/echarts/blob/master/CHANGELOG.md | Release history and breaking changes to track when upgrading the bundled version. |

---

### ECharts Official Extensions

These are maintained under the Apache ECharts umbrella and can be optionally bundled or offered as opt-in extensions.

| Extension | Repository / Link | Description |
|-----------|-------------------|-------------|
| **ECharts GL** | https://github.com/ecomfe/echarts-gl | 3D charts (bar3D, scatter3D, surface, globe), WebGL-accelerated rendering. Large bundle; ship as opt-in. |
| **Word Cloud** | https://github.com/ecomfe/echarts-wordcloud | Word cloud layouts with image mask support. |
| **Liquid Fill** | https://github.com/ecomfe/echarts-liquidfill | Animated liquid-fill gauge for single-value KPIs. Useful for industrial dashboards. |
| **echarts-stat** | https://github.com/ecomfe/echarts-stat | Statistical transforms: histogram, clustering, regression, and more. |
| **echarts-graph-modularity** | https://github.com/ecomfe/echarts-graph-modularity | Community detection plugin for graph/network visualizations. |
| **echarts-bar-racing** | https://github.com/apache/echarts-bar-racing | Tool for generating animated bar-racing charts. |
| **echarts-from-mermaid** | https://github.com/apache/echarts-from-mermaid | Converts Mermaid-like syntax to ECharts options; useful for LLM-generated charts. |

#### Map Provider Extensions

| Extension | Repository / Link | Description |
|-----------|-------------------|-------------|
| **Baidu Map** | https://github.com/apache/echarts/tree/master/extension-src/bmap | Baidu Maps integration for geo-based charts. |
| **AMap (Gaode)** | https://github.com/plainheart/echarts-extension-amap | AMap integration. |
| **Leaflet** | https://github.com/gnijuohz/echarts-leaflet | Leaflet.js integration for open-source map tiles. Relevant for air-gapped deployments with self-hosted tiles. |
| **Mapbox GL** | https://github.com/lzxue/echarts-mapboxgl | Mapbox GL JS integration. |

---

### ECharts Framework Wrappers & Integrations

Reference implementations for how other frameworks wrap ECharts. Useful for design patterns and API inspiration.

| Library | Repository | Framework | Notes |
|---------|------------|-----------|-------|
| **echarts-for-react** | https://github.com/hustcc/echarts-for-react | React | Most popular React wrapper (~4k stars). Study its lifecycle management and option diffing. |
| **vue-echarts** | https://github.com/ecomfe/vue-echarts | Vue 2/3 | Official Vue integration. Good reference for reactive option binding. |
| **ngx-echarts** | https://github.com/xieziyu/ngx-echarts | Angular | Angular directive wrapper. |
| **pyecharts** | https://github.com/pyecharts/pyecharts | Python | Python-to-ECharts bridge. Demonstrates server-side option generation patterns. |
| **echarts4r** | https://github.com/JohnCoene/echarts4r | R | R wrapper; relevant if Ignition pipelines generate chart configs server-side. |

---

### Open-Source Data Visualization Libraries

Peer libraries for reference, competitive analysis, and potential interoperability. Understanding their APIs and design choices informs our own component design.

#### High-Level Charting Libraries

| Library | Repository / Site | License | Strengths |
|---------|-------------------|---------|-----------|
| **Chart.js** | https://github.com/chartjs/Chart.js | MIT | Lightweight (~60 KB), beginner-friendly, canvas-based. Good baseline for simple chart comparisons. |
| **Recharts** | https://github.com/recharts/recharts | MIT | Composable React charting (~12M weekly downloads). Study its declarative API design. |
| **Nivo** | https://github.com/plouc/nivo | MIT | React + D3, fully declarative, server-side rendering support. Rich theming system worth studying. |
| **Plotly.js** | https://github.com/plotly/plotly.js | MIT | Scientific/statistical visualization. 40+ chart types including 3D. Large bundle. |
| **Visx** | https://github.com/airbnb/visx | MIT | Low-level React + D3 primitives by Airbnb. Small bundles, maximum flexibility. |
| **Victory** | https://github.com/FormidableLabs/victory | MIT | React + React Native charting. Modular, good animation support. |
| **ApexCharts** | https://github.com/apexcharts/apexcharts.js | MIT | Interactive charts with built-in annotations, zoom, and export. |
| **Frappe Charts** | https://github.com/frappe/charts | MIT | Simple, modern SVG charts with zero dependencies. |
| **uPlot** | https://github.com/leeoniya/uPlot | MIT | Ultra-fast time-series plotting (~35 KB). Handles millions of points. Relevant benchmark for our performance targets. |
| **Dygraphs** | https://github.com/danvk/dygraphs | MIT | Dense time-series data with zoom/pan. Long-standing industrial use. |

#### Low-Level / Foundational

| Library | Repository / Site | License | Strengths |
|---------|-------------------|---------|-----------|
| **D3.js** | https://github.com/d3/d3 | ISC | The foundational visualization grammar (~112k stars). Maximum flexibility; steep learning curve. |
| **Observable Plot** | https://github.com/observablehq/plot | ISC | Concise, modern grammar-of-graphics layer atop D3. |
| **Vega / Vega-Lite** | https://github.com/vega/vega-lite | BSD-3 | Declarative JSON grammar for visualization. Interesting comparison for our JSON-driven approach. |

---

### Open-Source Web Component Libraries

General-purpose UI component libraries built as framework-agnostic Web Components or for specific frameworks. Relevant for non-chart industrial UI components where Perspective has gaps.

#### Framework-Agnostic (Web Components / Custom Elements)

| Library | Repository / Site | License | Notes |
|---------|-------------------|---------|-------|
| **Lit** | https://lit.dev / https://github.com/lit/lit | BSD-3 | Lightweight (~5 KB) web component framework. Excellent for building interoperable custom elements. |
| **Shoelace / Web Awesome** | https://shoelace.style / https://github.com/shoelace-style/shoelace | MIT | Polished, accessible web components with dark theme, localization, and framework adapters. |
| **FAST (Microsoft)** | https://github.com/microsoft/fast | MIT | Adaptive UI system with web components. Good design token and theming patterns. |
| **Vaadin** | https://github.com/vaadin/web-components | Apache-2.0 | Enterprise-grade components (grid, form, upload). Strong accessibility guarantees. |
| **Spectrum Web Components (Adobe)** | https://github.com/adobe/spectrum-web-components | Apache-2.0 | Adobe's design system as web components. High-quality accessibility and theming. |
| **Carbon Web Components (IBM)** | https://github.com/carbon-design-system/carbon-web-components | Apache-2.0 | IBM's Carbon design system. Enterprise/industrial design language. |
| **Lion (ING)** | https://github.com/ing-bank/lion | MIT | White-label web components focused on accessibility and extensibility. |
| **Patternfly Elements (Red Hat)** | https://github.com/patternfly/patternfly-elements | MIT | Enterprise UI components following Red Hat's PatternFly design. |

#### React-Specific (Reference for Perspective Component Design)

| Library | Repository / Site | License | Notes |
|---------|-------------------|---------|-------|
| **Radix UI** | https://github.com/radix-ui/primitives | MIT | Unstyled, accessible primitives. Study for accessible component patterns. |
| **shadcn/ui** | https://github.com/shadcn-ui/ui | MIT | Copy-paste React components built on Radix + Tailwind. Modern design patterns. |
| **Ant Design** | https://github.com/ant-design/ant-design | MIT | Enterprise UI with comprehensive component set. Strong data table and form components. |
| **Mantine** | https://github.com/mantinedev/mantine | MIT | Full-featured React library with hooks, theming, and 100+ components. |
| **Material UI (MUI)** | https://github.com/mui/material-ui | MIT | Most popular React UI library. Rich theming and layout system. |
| **Blueprint (Palantir)** | https://github.com/palantir/blueprint | Apache-2.0 | Data-dense enterprise UI. Excellent table, tree, and form components for industrial apps. |
| **Tremor** | https://github.com/tremorlabs/tremor | Apache-2.0 | React dashboard components (KPI cards, charts, tables). Directly relevant to industrial dashboards. |

---

### Open-Source Industrial & SCADA/HMI Components

Components and platforms specifically targeting industrial automation, SCADA, HMI, and process visualization.

#### Visualization Platforms

| Project | Repository / Site | License | Description |
|---------|-------------------|---------|-------------|
| **FUXA** | https://github.com/frangoteam/FUXA | MIT | Web-based SCADA/HMI/Dashboard. Angular frontend, Node.js backend. Supports Modbus, S7, OPC-UA, MQTT, BACnet. Rich SVG-based HMI editor. |
| **Grafana** | https://github.com/grafana/grafana | AGPL-3.0 | Industry-standard dashboarding for time-series data. Extensive plugin ecosystem. Study its panel architecture and alerting patterns. |
| **Node-RED** | https://github.com/node-red/node-red | Apache-2.0 | Flow-based programming for IoT/industrial data pipelines. Dashboard nodes provide basic HMI capability. |
| **Node-RED Dashboard 2.0** | https://github.com/FlowFuse/node-red-dashboard | Apache-2.0 | Next-gen dashboard UI for Node-RED using Vue 3. |
| **Thingsboard** | https://github.com/thingsboard/thingsboard | Apache-2.0 | IoT platform with device management, data collection, and visualization dashboards. |
| **United Manufacturing Hub** | https://github.com/united-manufacturing-hub/united-manufacturing-hub | Apache-2.0 | Open-source IT/OT integration platform using MQTT, Kafka, TimescaleDB, and Grafana. |

#### Industrial Component & Symbol Libraries

| Project | Repository / Site | License | Description |
|---------|-------------------|---------|-------------|
| **SVG-Schematic** | https://github.com/nicholasgasior/svg-schematic | MIT | SVG-based schematic/electrical diagram components. |
| **OpenPLC** | https://github.com/thiagoralves/OpenPLC_v3 | GPL-3.0 | Open-source PLC runtime with web-based editor. Reference for industrial control UI patterns. |
| **P&ID Symbols (Various)** | Search GitHub for "pid symbols svg" | Various | Community P&ID symbol sets in SVG format for process diagrams. |
| **ControlsFX** | https://github.com/controlsfx/controlsfx | BSD-3 | JavaFX UI controls; relevant for Vision-side component patterns. |

#### Industrial Data & Protocol Libraries

| Library | Repository / Site | License | Description |
|---------|-------------------|---------|-------------|
| **node-opcua** | https://github.com/node-opcua/node-opcua | MIT | OPC-UA client/server in Node.js. Reference for data connectivity patterns. |
| **Eclipse Milo** | https://github.com/eclipse/milo | EPL-2.0 | Java OPC-UA stack. Directly relevant for Ignition module gateway-side integrations. |
| **Sparkplug** | https://github.com/eclipse/tahu | EPL-2.0 | MQTT Sparkplug B reference implementation. Standard in Ignition ecosystems. |

---

### Dashboard, Table & Data Grid Components

Data tables and grids are among the most requested industrial UI components. These are reference implementations.

| Library | Repository / Site | License | Notes |
|---------|-------------------|---------|-------|
| **AG Grid** | https://github.com/ag-grid/ag-grid | MIT (Community) | Feature-rich data grid. Enterprise edition is commercial. |
| **TanStack Table** | https://github.com/TanStack/table | MIT | Headless table logic for React/Vue/Solid/Svelte. |
| **Tabulator** | https://github.com/olifolkerd/tabulator | MIT | Framework-agnostic interactive table. |
| **Handsontable** | https://github.com/handsontable/handsontable | Custom (free for eval) | Spreadsheet-like data grid. |
| **Glide Data Grid** | https://github.com/glideapps/glide-data-grid | MIT | High-performance React canvas-based grid. Handles millions of cells. |

---

### Gauge, KPI & Specialty Visualization Components

Specialty components commonly needed in industrial dashboards.

| Library | Repository / Site | License | Notes |
|---------|-------------------|---------|-------|
| **canvas-gauges** | https://github.com/nicholasgasior/canvas-gauges | MIT | Customizable radial and linear gauges. |
| **GaugeJS** | https://github.com/bernii/gauge.js | MIT | Animated JavaScript gauges. |
| **JustGage** | https://github.com/toorshia/justgage | MIT | SVG-powered gauges using Raphael. |
| **Keen Slider** | https://github.com/rcbyr/keen-slider | MIT | Touch-friendly slider/carousel; useful for dashboard navigation. |
| **Rough Notation** | https://github.com/rough-stuff/rough-notation | MIT | Hand-drawn annotation overlays; creative for highlighting alarm states. |

---

### Industrial Fonts, Icon Sets & Design Systems

Visual assets relevant for building HMI/SCADA-style UIs.

| Resource | Repository / Site | License | Description |
|----------|-------------------|---------|-------------|
| **Material Symbols** | https://github.com/google/material-design-icons | Apache-2.0 | Massive icon set with filled/outlined/rounded variants. |
| **Lucide** | https://github.com/lucide-icons/lucide | ISC | Fork of Feather Icons with 1000+ icons. Clean, modern. |
| **Phosphor Icons** | https://github.com/phosphor-icons/homepage | MIT | Flexible icon family with 6 weights per icon. |
| **Tabler Icons** | https://github.com/tabler/tabler-icons | MIT | 4000+ SVG icons, open-source. |
| **Inter** | https://github.com/rsms/inter | OFL-1.1 | Highly readable UI typeface, ideal for dashboards and HMI. |
| **JetBrains Mono** | https://github.com/JetBrains/JetBrainsMono | OFL-1.1 | Monospace font for data-heavy displays and engineering values. |
| **IBM Plex** | https://github.com/IBM/plex | OFL-1.1 | IBM's open typeface family; industrial feel, excellent legibility. |

---

### Reference Architectures & Learning Resources

| Resource | URL | Description |
|----------|-----|-------------|
| **ECharts Examples Gallery** | https://echarts.apache.org/examples/en/index.html | Browsable, filterable examples with live editor. Primary reference for option patterns. |
| **ECharts Handbook** | https://echarts.apache.org/handbook/en/get-started/ | Official tutorial and concept guide. |
| **Awesome ECharts** | https://github.com/ecomfe/awesome-echarts | Curated extensions, tools, articles, and community projects. |
| **Awesome Visualization** | https://github.com/AlanIsrworthy/awesome-dataviz | Broad data visualization resource collection. |
| **Awesome Web Components** | https://github.com/web-padawan/awesome-web-components | Curated list of web component resources, frameworks, and patterns. |
| **Awesome React Components** | https://github.com/brillout/awesome-react-components | Extensive catalog of React components for every category. |
| **MING Stack (IoT)** | https://github.com/ibenim/MING-Stack | Mosquitto + InfluxDB + Node-RED + Grafana reference architecture for industrial IoT. |
| **Open Source SCADA list** | https://github.com/topics/scada | GitHub topic page for SCADA projects. |
| **Ignition SDK Docs** | https://www.sdk-docs.inductiveautomation.com/docs/8.3/intro | Official Ignition 8.3 module SDK documentation. |
| **Inductive Automation Exchange** | https://inductiveautomation.com/exchange | Community-contributed Ignition modules, templates, and resources. |

---

### Design & Color Palette Resources

Industrial-specific palette and accessibility resources for theme design.

| Resource | URL | Description |
|----------|-----|-------------|
| **ColorBrewer** | https://colorbrewer2.org | Cartography-driven palettes with colorblind-safe options. Useful for sequential, diverging, and qualitative series palettes. |
| **Coolors** | https://coolors.co | Palette generator with contrast checking and export. |
| **Colour Contrast Analyser** | https://www.tpgi.com/color-contrast-checker/ | WCAG contrast ratio verification. Critical for glare-condition readability. |
| **Viz Palette** | https://projects.susielu.com/viz-palette | Palette tool designed for data visualization; checks for colorblind safety and name confusion. |
| **Data Color Picker** | https://www.learnui.design/tools/data-color-picker.html | Generate evenly-spaced palettes optimized for charts. |

---

### How to Use This Resource Library

1. **Building new components**: Check the industrial and web component sections for prior art before designing from scratch.
2. **Authoring ECharts options**: Start from the Examples Gallery, then refine using the Option Reference and Handbook.
3. **Theming**: Use the ECharts Theme Builder as a starting point, then validate with ColorBrewer and contrast tools.
4. **Performance benchmarking**: Compare against uPlot and Dygraphs for time-series performance targets.
5. **Accessibility compliance**: Reference Radix, Shoelace, and Carbon for accessible component patterns.
6. **Industrial standards**: Study FUXA, Grafana, and the MING stack for real-world industrial deployment patterns.
7. **Extension evaluation**: Before building custom functionality, check Awesome ECharts and the official extensions for existing solutions.
