# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 40 Perspective components covering the full ECharts + ECharts-GL suite
  - 27 2D chart types matching every ECharts gallery category
  - 8 3D chart types (Bar3D, Line3D, Scatter3D, Surface, Map3D, Globe, Lines3D, Polygons3D)
  - 3 WebGL-accelerated types (ScatterGL, GraphGL, FlowGL)
  - 3 industrial components (IndustrialTrend, OEE, Pareto)
  - 1 universal EChart renderer for advanced/custom usage
- AbstractEChartComponent shared base: lifecycle, ResizeObserver, event bridging, option sanitisation
- 2 built-in industrial themes (IgnitionIndustrialDark, IgnitionIndustrialLight)
- 23 starter option templates for quick chart creation
- Option sanitiser: strips JS functions, circular refs, caps array/string sizes
- Event serialiser: safe payload extraction for click, dblclick, zoom, brush, legend events
- Gateway-hosted module resources (no CDN — air-gap safe)
- Enterprise CI/CD: build, PR validation, tag-triggered release with optional signing
- Comprehensive PROJECT_PLAN.md with resource library

### Technical Details
- Ignition SDK 8.3.0
- Java 17
- Apache ECharts 5.6.0
- ECharts-GL 2.0.9
- Gradle 7.6.4 with io.ia.sdk.modl plugin 0.3.0
- TypeScript + Webpack 5
