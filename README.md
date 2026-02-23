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

### ECharts Chart (`open.echarts.EChart`)

Universal renderer that accepts **any valid ECharts option JSON**. Supports all 20 chart types and all coordinate systems.

**Key properties:**
- `option` — ECharts option object (series, axes, tooltip, legend, etc.)
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
