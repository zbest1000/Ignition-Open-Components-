# Ignition Open Components — Open ECharts Module

An industrial-focused **Perspective component library** for **Ignition 8.3** built on [Apache ECharts](https://echarts.apache.org/). Provides a universal chart renderer, one component per ECharts / ECharts-GL chart type, industrial and scheduling charts, two built-in themes, and starter option templates.

## Quick Start

### Prerequisites

- **JDK 17** (for compilation; the runtime uses Ignition's JVM)
- Nothing else: the Gradle wrapper downloads **Gradle 9.5.1**, and the build downloads its own
  **Node.js 22** for the web bundle.

### Build

```bash
./gradlew build
```

Runs everything — `npm ci`, webpack, eslint, jest, Java compile, checkstyle, JUnit — and writes
`build/Open-ECharts.unsigned.modl`. (A browser smoke test, `npm run test:e2e` in `web/`, is
separate; see [CONTRIBUTING](.github/CONTRIBUTING.md#build-and-verify).) The version comes from `gradle.properties`
(`-PmoduleVersion=1.2.3` overrides it).

### Install

Gateway → Config → Modules → Install or Upgrade a Module, then select the `.modl`.
Requires **Ignition 8.3.7 or newer** with the Perspective module.

> An **unsigned** module only installs on a gateway started with
> `-Dignition.allowunsignedmodules=true` (development gateways). To build a signed module, put
> `signModule=true` and the `ignition.signing.*` properties in `~/.gradle/gradle.properties`
> (see [`gradle.properties.template`](gradle.properties.template)); the result is
> `build/Open-ECharts.modl`. Details: [`docs/INSTALL.md`](docs/INSTALL.md).

## Project Structure

```
├── build.gradle.kts          Root build — io.ia.sdk.modl plugin, module metadata, version check
├── settings.gradle.kts       Subprojects, IA Nexus + Node.js repositories
├── gradle.properties         Module version and build settings (no secrets)
├── gradle/libs.versions.toml Ignition SDK 8.3.7 and Node.js versions
├── common/                   Shared by gateway and Designer
│   └── src/main/resources/
│       ├── components.manifest.json   The one list of components (Java and web both read it)
│       ├── props/                     Property schemas (JSON)
│       └── events/                    Event payload schemas (JSON)
├── gateway/                  Gateway hook: registers components, serves the web bundle
├── designer/                 Designer hook: palette entries, icons
├── web/                      React/TypeScript bundle
│   ├── src/core/             Chart runtime shared by every component
│   ├── src/industrial/       Option builders for the industrial / scheduling components
│   ├── src/themes/           IgnitionIndustrialDark, IgnitionIndustrialLight
│   ├── src/templates/        23 starter option templates
│   ├── src/utils/            Option sanitiser, event payloads
│   └── e2e/                  Browser smoke test of the built bundle
└── docs/                     Guides (see Documentation below)
```

## Components

### 48 Components — Complete ECharts + ECharts-GL Suite

Every chart type from the [ECharts examples gallery](https://echarts.apache.org/examples/en/index.html) and [ECharts-GL](https://github.com/ecomfe/echarts-gl) has its own component. All share one runtime; each has its own palette entry, default size, and default option, so a component dropped from the palette starts as a working chart of that type (Map, Map 3D, Polygons 3D and Custom start empty: they need map data or a render function, see [`docs/COMPONENTS.md`](docs/COMPONENTS.md)). ECharts-GL is loaded on demand, only when one of the 11 3D / WebGL components is on screen.

#### Basic Charts

| Component | ID | Covers |
|-----------|-----|--------|
| **ECharts Chart** | `open.echarts.EChart` | Universal/advanced — any option JSON |
| **Line Chart** | `open.echarts.LineChart` | Line, area, step, stacked area |
| **Bar Chart** | `open.echarts.BarChart` | Bar, stacked, horizontal, polar, waterfall, race |
| **Pie Chart** | `open.echarts.PieChart` | Pie, donut, rose, nested |
| **Scatter Chart** | `open.echarts.ScatterChart` | Scatter, bubble |
| **Effect Scatter** | `open.echarts.EffectScatterChart` | Ripple-animated scatter markers |

#### KPI / Proportion

| Component | ID | Covers |
|-----------|-----|--------|
| **Gauge Chart** | `open.echarts.GaugeChart` | Gauge, speed, progress, ring, temperature |
| **Funnel Chart** | `open.echarts.FunnelChart` | Funnel, conversion pipeline |

#### Financial / Statistical

| Component | ID | Covers |
|-----------|-----|--------|
| **Candlestick Chart** | `open.echarts.CandlestickChart` | K-line, OHLC |
| **Boxplot Chart** | `open.echarts.BoxplotChart` | Box-and-whisker |
| **Heatmap Chart** | `open.echarts.HeatmapChart` | Cartesian, calendar, geo heatmaps |

#### Hierarchy

| Component | ID | Covers |
|-----------|-----|--------|
| **Tree Chart** | `open.echarts.TreeChart` | LR, RL, TB, BT, radial, polyline |
| **Treemap Chart** | `open.echarts.TreemapChart` | Area-proportional treemap |
| **Sunburst Chart** | `open.echarts.SunburstChart` | Radial sunburst |

#### Relations / Flow

| Component | ID | Covers |
|-----------|-----|--------|
| **Graph Chart** | `open.echarts.GraphChart` | Force, circular, grid graph |
| **Sankey Chart** | `open.echarts.SankeyChart` | Sankey flow diagrams |

#### Specialty

| Component | ID | Covers |
|-----------|-----|--------|
| **Radar Chart** | `open.echarts.RadarChart` | Radar / spider |
| **Parallel Chart** | `open.echarts.ParallelChart` | Parallel coordinates |
| **Theme River Chart** | `open.echarts.ThemeRiverChart` | Time-stream river |
| **Calendar Chart** | `open.echarts.CalendarChart` | Calendar heatmap/scatter |
| **Pictorial Bar Chart** | `open.echarts.PictorialBarChart` | Symbol-based pictorial bars |
| **Custom Chart** | `open.echarts.CustomChart` | Custom series (limited: `renderItem` cannot be set from props) |
| **Graphic Chart** | `open.echarts.GraphicChart` | Shape/text/image overlays |
| **Dataset Chart** | `open.echarts.DatasetChart` | Dataset-driven with encode/transform |

#### Geo / Map

| Component | ID | Covers |
|-----------|-----|--------|
| **Map Chart** | `open.echarts.MapChart` | Choropleth, SVG maps, geo scatter |
| **Lines Chart** | `open.echarts.LinesChart` | Flight routes, bus lines, migration flows |

Map geometry is not bundled: supply GeoJSON or SVG through the `maps` property.

#### 3D Charts (ECharts-GL)

| Component | ID | Covers |
|-----------|-----|--------|
| **Bar 3D** | `open.echarts.Bar3DChart` | 3D bar charts on grid3D |
| **Line 3D** | `open.echarts.Line3DChart` | 3D line / trajectory |
| **Scatter 3D** | `open.echarts.Scatter3DChart` | 3D scatter / point cloud |
| **Surface** | `open.echarts.SurfaceChart` | 3D mathematical surfaces |
| **Map 3D** | `open.echarts.Map3DChart` | 3D geo map with elevation |
| **Globe** | `open.echarts.GlobeChart` | 3D globe with layers |
| **Lines 3D** | `open.echarts.Lines3DChart` | 3D flight/route lines |
| **Polygons 3D** | `open.echarts.Polygons3DChart` | 3D polygon regions |

#### WebGL-Accelerated (ECharts-GL)

| Component | ID | Covers |
|-----------|-----|--------|
| **Scatter GL** | `open.echarts.ScatterGLChart` | Millions of points, WebGL |
| **Graph GL** | `open.echarts.GraphGLChart` | Large-scale graph layout, WebGL |
| **Flow GL** | `open.echarts.FlowGLChart` | Vector field flow, WebGL |

#### Industrial (Open Components / Industrial)

| Component | ID | Purpose |
|-----------|-----|---------|
| **Industrial Trend** | `open.industrial.Trend` | Time-series PV/SP with alarm limits |
| **OEE Summary** | `open.industrial.OEE` | Multi-ring OEE gauge (A/P/Q) |
| **Pareto Chart** | `open.industrial.Pareto` | Pareto bar + cumulative % line |
| **SPC Chart** | `open.industrial.SPCChart` | Individuals & Moving Range or X-bar & R, with control limits + run rules |

#### Industrial — Scheduling & Timelines (Open Components / Scheduling)

| Component | ID | Purpose |
|-----------|-----|---------|
| **State Timeline** | `open.industrial.StateTimeline` | Equipment state/alarm bars on lanes |
| **Gantt Chart** | `open.industrial.Gantt` | Task scheduling with milestones and progress |
| **Schedule Calendar** | `open.industrial.ScheduleCalendar` | Annual calendar heatmap of shift schedules |
| **Shift Calendar** | `open.industrial.ShiftCalendar` | Crew shift patterns by weekday over a date range |
| **Downtime Tracker** | `open.industrial.DowntimeTracker` | Categorised downtime events with reason codes |
| **Batch Timeline** | `open.industrial.BatchTimeline` | S88 batch phase durations on timeline lanes |
| **Resource Heatmap** | `open.industrial.ResourceHeatmap` | Equipment utilisation (resource × time) |

### Shared Properties (all components)

- `option` — ECharts option object
- `theme` — `IgnitionIndustrialDark`, `IgnitionIndustrialLight`, or empty for the ECharts default
- `renderer` — `canvas` (default) or `svg`
- `autoResize`, `resizeDebounceMs` — resize with the container
- `notMerge` — replace the whole option on update instead of merging
- `lazyUpdate` — apply updates on the next animation frame (default: true)
- `showLoading`, `loadingOptions` — built-in loading animation
- `sanitizeTooltip` — sanitise HTML, CSS and links in the option (default: true; see Security)
- `ariaLabel` — accessible label for the chart
- `maps` — GeoJSON or SVG maps for map / geo series, keyed by map name

**Events:** `onClick`, `onDoubleClick`, `onMouseOver`, `onMouseOut`, `onLegendSelectChanged`, `onDataZoom`, `onBrushSelected`. Payloads are listed in [`docs/COMPONENTS.md`](docs/COMPONENTS.md#shared-events).

## Built-in Themes

| Theme | Description |
|-------|-------------|
| `IgnitionIndustrialDark` | Dark background, high contrast, glare-readable. Designed for control rooms. |
| `IgnitionIndustrialLight` | White background, print-friendly. Designed for reports and well-lit environments. |

Both include semantic alarm/warning/OK colour ranges in gauge defaults. Themes are part of the
client bundle; there is no gateway-side theme storage.

## Option Templates

19 basic + 4 industrial starter templates:

**Basic:** `line.basic`, `line.stackedArea`, `bar.basic`, `bar.stacked`, `bar.horizontal`, `scatter.basic`, `pie.basic`, `pie.donut`, `gauge.basic`, `funnel.basic`, `heatmap.basic`, `candlestick.basic`, `boxplot.basic`, `radar.basic`, `treemap.basic`, `sunburst.basic`, `sankey.basic`, `graph.force`, `themeRiver.basic`

**Industrial:** `industrial.trend.pv`, `industrial.oee.summary`, `industrial.pareto.downtime`, `industrial.alarm.timeline`

## Security

- **Option sanitising (`sanitizeTooltip`, default on):** HTML in tooltip formatters and the
  toolbox data view is sanitised with DOMPurify, link fields only keep `http`, `https` and
  relative URLs, colour and tooltip style strings that carry markup or CSS syntax are dropped,
  and SVG maps are sanitised. This reduces the risk of script injection through an `option`
  bound to untrusted data; it is **not a sandbox**. Review any option whose content comes from tags, databases or user
  input. See [`docs/SECURITY.md`](docs/SECURITY.md).
- **Event payloads** contain only documented, JSON-safe fields.
- **No CDN dependency:** all assets are bundled in the module — works in air-gapped environments.
- **No gateway endpoints:** the module adds no REST/servlet routes; it only serves its static bundle.

## License

This repository is **MIT**. Bundled third-party software (Apache ECharts, ZRender, ECharts-GL, ClayGL, DOMPurify) is listed with its licences in [`NOTICE`](NOTICE).

## Air-Gapped Deployment

All runtime assets (ECharts, ECharts-GL, component JS/CSS, themes, templates) are bundled in the
`.modl` with no CDN or runtime network calls, so the module runs on fully isolated gateways. See
[`docs/AIR_GAPPED_DEPLOYMENT.md`](docs/AIR_GAPPED_DEPLOYMENT.md) for offline install steps, map
data, and how to build on an offline host.

## Documentation

| Document | Contents |
|----------|----------|
| [`docs/INSTALL.md`](docs/INSTALL.md) | Download, verify, install, signing, troubleshooting |
| [`docs/COMPONENTS.md`](docs/COMPONENTS.md) | Component reference: shared props, events, per-component examples |
| [`docs/THEMING.md`](docs/THEMING.md) | Built-in themes |
| [`docs/TEMPLATES.md`](docs/TEMPLATES.md) | Starter option templates |
| [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) | Large datasets, renderers, 3D |
| [`docs/SECURITY.md`](docs/SECURITY.md) | What `sanitizeTooltip` does and does not do |
| [`docs/AIR_GAPPED_DEPLOYMENT.md`](docs/AIR_GAPPED_DEPLOYMENT.md) | Offline install and offline build |
| [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md) | Build, add a component, CI, releases, signing |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history |
| [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) | Original planning document (historical) |
