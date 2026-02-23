# Ignition Open Components — Open ECharts Module

An industrial-focused **Perspective component library** for **Ignition 8.3** built on [Apache ECharts](https://echarts.apache.org/). Provides a universal chart renderer, industrial builder components, built-in themes, and a comprehensive option templates library.

## Quick Start

### Prerequisites

- **Java 17** JDK (for compilation; runtime uses Ignition's JVM)
- **Gradle 7.6+** (wrapper included)
- **Node.js 18+** and npm (downloaded automatically by Gradle)

### Build

```bash
./gradlew build
```

Output: `build/Open-ECharts.unsigned.modl`

### Install

Copy the `.modl` file to your Ignition gateway → Config → Modules → Install or Upgrade a Module.

> For signed modules, configure `sign.props` and set `signModule=true` in `gradle.properties`.

## Project Structure

```
├── build.gradle.kts          Root build — io.ia.sdk.modl plugin, module metadata
├── settings.gradle.kts       Subproject layout, IA Nexus + Node.js repos
├── gradle/libs.versions.toml Ignition SDK 8.3.0 dependency catalog
├── common/                   Shared Java: constants, component descriptors, utilities
│   └── src/main/
│       ├── java/             OpenEChartsConstants, EChart descriptor, schema loaders
│       └── resources/        Property schemas (JSON), event schemas
├── gateway/                  Gateway scope: GatewayHook, component registration
│   └── src/main/java/        OpenEChartsGatewayHook
├── designer/                 Designer scope: DesignerHook, palette entries
│   └── src/main/
│       ├── java/             OpenEChartsDesignerHook
│       └── resources/        i18n bundle, SVG icons
├── web/                      React/TypeScript: ECharts components, themes, templates
│   ├── src/
│   │   ├── components/       EChart.tsx — universal renderer
│   │   ├── themes/           IgnitionIndustrialDark, IgnitionIndustrialLight
│   │   ├── templates/        23 starter option templates
│   │   ├── utils/            Option sanitiser, event serialiser
│   │   └── css/              Component styles
│   ├── package.json          ECharts 5.6.0, perspective-client, webpack
│   └── webpack.config.js     Bundles to OpenECharts.js + OpenECharts.css
└── docs/
    └── PROJECT_PLAN.md       Full implementation plan & resource library
```

## Components

### 40 Components — Complete ECharts + ECharts-GL Suite

Every chart type from the [ECharts examples gallery](https://echarts.apache.org/examples/en/index.html) and [ECharts-GL](https://github.com/ecomfe/echarts-gl) has its own focused component. All share the same runtime but each provides its own default option, palette entry, and default size.

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
| **Custom Chart** | `open.echarts.CustomChart` | Custom renderItem series |
| **Graphic Chart** | `open.echarts.GraphicChart` | Shape/text/image overlays |
| **Dataset Chart** | `open.echarts.DatasetChart` | Dataset-driven with encode/transform |

#### Geo / Map

| Component | ID | Covers |
|-----------|-----|--------|
| **Map Chart** | `open.echarts.MapChart` | Choropleth, SVG maps, geo scatter |
| **Lines Chart** | `open.echarts.LinesChart` | Flight routes, bus lines, migration flows |

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

### Shared Properties (all components)

- `option` — ECharts option object
- `theme` — Theme name (`IgnitionIndustrialDark`, `IgnitionIndustrialLight`, or custom)
- `renderer` — `canvas` (default) or `svg`
- `autoResize` — Automatic resize on container change
- `showLoading` — Built-in loading animation
- `sanitizeTooltip` — Strip unsafe content (default: true)

**Events:** `onClick`, `onDoubleClick`, `onMouseOver`, `onMouseOut`, `onLegendSelectChanged`, `onDataZoom`, `onBrushSelected`

## Built-in Themes

| Theme | Description |
|-------|-------------|
| `IgnitionIndustrialDark` | Dark background, high contrast, glare-readable. Designed for control rooms. |
| `IgnitionIndustrialLight` | White background, print-friendly. Designed for reports and well-lit environments. |

Both include semantic alarm/warning/OK colour ranges in gauge defaults.

## Option Templates

19 basic + 4 industrial starter templates:

**Basic:** `line.basic`, `line.stackedArea`, `bar.basic`, `bar.stacked`, `bar.horizontal`, `scatter.basic`, `pie.basic`, `pie.donut`, `gauge.basic`, `funnel.basic`, `heatmap.basic`, `candlestick.basic`, `boxplot.basic`, `radar.basic`, `treemap.basic`, `sunburst.basic`, `sankey.basic`, `graph.force`, `themeRiver.basic`

**Industrial:** `industrial.trend.pv`, `industrial.oee.summary`, `industrial.pareto.downtime`, `industrial.alarm.timeline`

## Security

- **Function stripping:** By default, JavaScript function values in option JSON are stripped before reaching ECharts (prevents code injection).
- **Event sanitisation:** Event payloads are serialised with circular-reference detection, array capping, and string truncation.
- **No CDN dependency:** All assets are bundled locally in the module — works in air-gapped environments.

## License

This repository is **MIT**. Apache ECharts is **Apache-2.0** (bundled with attribution).

## Documentation

See [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) for the full implementation plan, feature specification, and comprehensive component resource library.
