# Open ECharts — Component Reference

Comprehensive component reference for the **Open ECharts** Ignition Perspective module, which provides 40 chart components built on Apache ECharts 5.6.0 and ECharts-GL 2.0.9.

---

## Overview

Open ECharts uses a shared architecture centered on an **AbstractEChartComponent** base class. All chart components extend this base and share the same props interface, ensuring consistent behavior and configuration across the library. Each component provides:

- **Default option** — A preconfigured ECharts option object tailored to its chart type
- **Palette category** — Determines where the component appears in the Perspective designer palette (e.g., "Open Components / ECharts", "Open Components / ECharts 3D", "Open Components / Industrial")

Components accept any valid ECharts option via the `option` prop; the default option serves as a starting point and can be fully overridden or merged.

---

## Shared Properties

All components share the following properties (from the props schema):

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `option` | object | Varies per component | ECharts option JSON. Fully configurable; default varies per component. |
| `theme` | string | `""` | Theme name. Supported values: `""`, `"IgnitionIndustrialDark"`, `"IgnitionIndustrialLight"`, or any custom registered theme. |
| `renderer` | string | `"canvas"` | Rendering backend: `"canvas"` or `"svg"`. |
| `autoResize` | boolean | `true` | When true, automatically resizes the chart when the container changes via ResizeObserver. |
| `resizeDebounceMs` | integer | `150` | Debounce delay (ms) for resize handling. |
| `notMerge` | boolean | `false` | When true, replaces the option entirely on update instead of merging. |
| `lazyUpdate` | boolean | `true` | Defers updates for better performance. |
| `showLoading` | boolean | `false` | Shows ECharts loading animation when true. |
| `loadingOptions` | object | — | ECharts loading animation options (e.g., text, color, maskColor). |
| `sanitizeTooltip` | boolean | `true` | Strips JavaScript functions from the option for security. |

---

## Shared Events

All components emit the following events with the indicated payload shapes:

| Event | Payload |
|-------|---------|
| `onClick` | `{ componentType, seriesType, seriesIndex, seriesName, name, dataIndex, value }` |
| `onDoubleClick` | Same shape as `onClick` |
| `onMouseOver` | Same shape as `onClick` |
| `onMouseOut` | Same shape as `onClick` |
| `onLegendSelectChanged` | Legend selection change payload |
| `onDataZoom` | Data zoom range payload |
| `onBrushSelected` | Brush selection payload |

---

## Component Reference

### Basic 2D

#### 1. EChart
- **Component name:** EChart
- **Component ID:** `open.echarts.EChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x400
- **Description:** Universal renderer. Accepts any valid ECharts option; no preset chart type.
- **Default option example:**
```json
{
  "title": { "text": "EChart" },
  "xAxis": { "type": "category", "data": ["A", "B", "C"] },
  "yAxis": { "type": "value" },
  "series": [{ "type": "bar", "data": [10, 20, 30] }]
}
```

#### 2. LineChart
- **Component name:** LineChart
- **Component ID:** `open.echarts.LineChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x350
- **Description:** Line, area, step, and stacked area charts.
- **Default option example:**
```json
{
  "xAxis": { "type": "category", "data": ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  "yAxis": { "type": "value" },
  "series": [{ "type": "line", "data": [120, 200, 150, 80, 70], "smooth": true }]
}
```

#### 3. BarChart
- **Component name:** BarChart
- **Component ID:** `open.echarts.BarChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x350
- **Description:** Bar, stacked bar, horizontal bar, polar bar, waterfall, and race charts.
- **Default option example:**
```json
{
  "xAxis": { "type": "category", "data": ["A", "B", "C", "D"] },
  "yAxis": { "type": "value" },
  "series": [{ "type": "bar", "data": [10, 20, 30, 40] }]
}
```

#### 4. PieChart
- **Component name:** PieChart
- **Component ID:** `open.echarts.PieChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 500x400
- **Description:** Pie, donut, rose, and nested pie charts.
- **Default option example:**
```json
{
  "series": [{
    "type": "pie",
    "radius": ["40%", "70%"],
    "data": [
      { "value": 335, "name": "A" },
      { "value": 234, "name": "B" },
      { "value": 135, "name": "C" }
    ]
  }]
}
```

#### 5. ScatterChart
- **Component name:** ScatterChart
- **Component ID:** `open.echarts.ScatterChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x400
- **Description:** Scatter and bubble charts.
- **Default option example:**
```json
{
  "xAxis": {},
  "yAxis": {},
  "series": [{
    "type": "scatter",
    "symbolSize": 10,
    "data": [[10, 20], [15, 25], [20, 15], [25, 30]]
  }]
}
```

#### 6. EffectScatterChart
- **Component name:** EffectScatterChart
- **Component ID:** `open.echarts.EffectScatterChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x400
- **Description:** Ripple-animated scatter charts.
- **Default option example:**
```json
{
  "xAxis": {},
  "yAxis": {},
  "series": [{
    "type": "effectScatter",
    "effectType": "ripple",
    "data": [[10, 20], [15, 25], [20, 15]]
  }]
}
```

---

### KPI

#### 7. GaugeChart
- **Component name:** GaugeChart
- **Component ID:** `open.echarts.GaugeChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 400x350
- **Description:** Gauge, speed, progress, ring, and clock gauges.
- **Default option example:**
```json
{
  "series": [{
    "type": "gauge",
    "progress": { "show": true },
    "detail": { "valueAnimation": true },
    "data": [{ "value": 70 }]
  }]
}
```

#### 8. FunnelChart
- **Component name:** FunnelChart
- **Component ID:** `open.echarts.FunnelChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 500x400
- **Description:** Funnel and conversion pipeline charts.
- **Default option example:**
```json
{
  "series": [{
    "type": "funnel",
    "data": [
      { "value": 100, "name": "Stage 1" },
      { "value": 60, "name": "Stage 2" },
      { "value": 30, "name": "Stage 3" }
    ]
  }]
}
```

---

### Financial / Statistical

#### 9. CandlestickChart
- **Component name:** CandlestickChart
- **Component ID:** `open.echarts.CandlestickChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 700x400
- **Description:** K-line and OHLC candlestick charts.
- **Default option example:**
```json
{
  "xAxis": { "type": "category", "data": ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  "yAxis": { "type": "value", "scale": true },
  "series": [{
    "type": "candlestick",
    "data": [[20, 34, 10, 38], [40, 35, 30, 50], [31, 38, 33, 44]]
  }]
}
```

#### 10. BoxplotChart
- **Component name:** BoxplotChart
- **Component ID:** `open.echarts.BoxplotChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x400
- **Description:** Box-and-whisker plots.
- **Default option example:**
```json
{
  "xAxis": { "type": "category", "data": ["A", "B", "C"] },
  "yAxis": { "type": "value" },
  "series": [{
    "type": "boxplot",
    "data": [[850, 810, 830, 880, 870], [700, 730, 710, 750, 720], [900, 920, 910, 950, 930]]
  }]
}
```

#### 11. HeatmapChart
- **Component name:** HeatmapChart
- **Component ID:** `open.echarts.HeatmapChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x400
- **Description:** Cartesian, calendar, and geo heatmaps.
- **Default option example:**
```json
{
  "xAxis": { "type": "category", "data": ["a", "b", "c"] },
  "yAxis": { "type": "category", "data": ["1", "2", "3"] },
  "visualMap": { "min": 0, "max": 10 },
  "series": [{
    "type": "heatmap",
    "data": [[0, 0, 5], [1, 0, 8], [2, 0, 3], [0, 1, 7], [1, 1, 2], [2, 1, 9]]
  }]
}
```

---

### Hierarchy

#### 12. TreeChart
- **Component name:** TreeChart
- **Component ID:** `open.echarts.TreeChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x500
- **Description:** Tree layouts: LR, RL, TB, BT, radial, and polyline.
- **Default option example:**
```json
{
  "series": [{
    "type": "tree",
    "data": [{
      "name": "Root",
      "children": [
        { "name": "Child 1" },
        { "name": "Child 2", "children": [{ "name": "Grandchild" }] }
      ]
    }],
    "orient": "TB"
  }]
}
```

#### 13. TreemapChart
- **Component name:** TreemapChart
- **Component ID:** `open.echarts.TreemapChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x500
- **Description:** Area-proportional treemap.
- **Default option example:**
```json
{
  "series": [{
    "type": "treemap",
    "data": [
      { "value": 100, "name": "A", "children": [{ "value": 60, "name": "A1" }, { "value": 40, "name": "A2" }] },
      { "value": 80, "name": "B" }
    ]
  }]
}
```

#### 14. SunburstChart
- **Component name:** SunburstChart
- **Component ID:** `open.echarts.SunburstChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 500x500
- **Description:** Radial sunburst hierarchy.
- **Default option example:**
```json
{
  "series": [{
    "type": "sunburst",
    "data": [{
      "name": "Root",
      "children": [
        { "value": 10, "name": "A" },
        { "value": 20, "name": "B", "children": [{ "value": 5, "name": "B1" }] }
      ]
    }]
  }]
}
```

---

### Relations / Flow

#### 15. GraphChart
- **Component name:** GraphChart
- **Component ID:** `open.echarts.GraphChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x500
- **Description:** Force, circular, and grid network graphs.
- **Default option example:**
```json
{
  "series": [{
    "type": "graph",
    "layout": "force",
    "data": [
      { "id": "1", "name": "Node 1" },
      { "id": "2", "name": "Node 2" },
      { "id": "3", "name": "Node 3" }
    ],
    "links": [
      { "source": "1", "target": "2" },
      { "source": "2", "target": "3" }
    ]
  }]
}
```

#### 16. SankeyChart
- **Component name:** SankeyChart
- **Component ID:** `open.echarts.SankeyChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x500
- **Description:** Sankey flow diagrams.
- **Default option example:**
```json
{
  "series": [{
    "type": "sankey",
    "data": [
      { "name": "A" }, { "name": "B" }, { "name": "C" }
    ],
    "links": [
      { "source": "A", "target": "B", "value": 10 },
      { "source": "B", "target": "C", "value": 5 }
    ]
  }]
}
```

---

### Specialty

#### 17. RadarChart
- **Component name:** RadarChart
- **Component ID:** `open.echarts.RadarChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 500x450
- **Description:** Radar/spider charts for multi-dimensional comparison.
- **Default option example:**
```json
{
  "radar": {
    "indicator": [
      { "name": "A", "max": 100 },
      { "name": "B", "max": 100 },
      { "name": "C", "max": 100 }
    ]
  },
  "series": [{
    "type": "radar",
    "data": [{ "value": [80, 70, 90], "name": "Series 1" }]
  }]
}
```

#### 18. ParallelChart
- **Component name:** ParallelChart
- **Component ID:** `open.echarts.ParallelChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 700x400
- **Description:** Parallel coordinates for multi-dimensional data.
- **Default option example:**
```json
{
  "parallelAxis": [
    { "dim": 0, "name": "Dim 1" },
    { "dim": 1, "name": "Dim 2" },
    { "dim": 2, "name": "Dim 3" }
  ],
  "series": [{
    "type": "parallel",
    "data": [[1, 2, 3], [2, 3, 4], [3, 4, 5]]
  }]
}
```

#### 19. ThemeRiverChart
- **Component name:** ThemeRiverChart
- **Component ID:** `open.echarts.ThemeRiverChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 700x400
- **Description:** Theme river / streamgraph for event flow over time.
- **Default option example:**
```json
{
  "singleAxis": { "type": "time" },
  "series": [{
    "type": "themeRiver",
    "data": [
      ["2020-01-01", 10, "A"],
      ["2020-01-02", 15, "A"],
      ["2020-01-01", 5, "B"]
    ]
  }]
}
```

#### 20. CalendarChart
- **Component name:** CalendarChart
- **Component ID:** `open.echarts.CalendarChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 800x200
- **Description:** Calendar heatmap for date-based data.
- **Default option example:**
```json
{
  "calendar": { "range": "2024-01" },
  "series": [{
    "type": "heatmap",
    "coordinateSystem": "calendar",
    "data": [["2024-01-01", 5], ["2024-01-02", 10], ["2024-01-03", 8]]
  }]
}
```

#### 21. PictorialBarChart
- **Component name:** PictorialBarChart
- **Component ID:** `open.echarts.PictorialBarChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x400
- **Description:** Pictorial bar charts with custom symbols.
- **Default option example:**
```json
{
  "xAxis": { "type": "category", "data": ["A", "B", "C"] },
  "yAxis": { "type": "value" },
  "series": [{
    "type": "pictorialBar",
    "symbol": "rect",
    "data": [10, 20, 30]
  }]
}
```

#### 22. CustomChart
- **Component name:** CustomChart
- **Component ID:** `open.echarts.CustomChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x400
- **Description:** Custom series for user-defined rendering logic.
- **Default option example:**
```json
{
  "xAxis": {},
  "yAxis": {},
  "series": [{
    "type": "custom",
    "renderItem": "function (params, api) { return { type: 'rect', shape: api.coord([0, 0], [1, 1]) }; }",
    "data": [[0, 0, 1, 1]]
  }]
}
```

#### 23. GraphicChart
- **Component name:** GraphicChart
- **Component ID:** `open.echarts.GraphicChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x400
- **Description:** Graphic elements (rect, circle, image, text) for annotations and overlays.
- **Default option example:**
```json
{
  "graphic": [
    { "type": "rect", "left": 10, "top": 10, "shape": { "width": 100, "height": 50 }, "style": { "fill": "#ccc" } },
    { "type": "text", "left": 20, "top": 25, "style": { "text": "Label" } }
  ]
}
```

#### 24. DatasetChart
- **Component name:** DatasetChart
- **Component ID:** `open.echarts.DatasetChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 600x400
- **Description:** Dataset-driven charts; data and series defined via dataset.
- **Default option example:**
```json
{
  "dataset": {
    "source": [
      ["product", "sales"],
      ["A", 43],
      ["B", 83],
      ["C", 86]
    ]
  },
  "xAxis": { "type": "category" },
  "yAxis": {},
  "series": [{ "type": "bar" }]
}
```

---

### Geo / Map

#### 25. MapChart
- **Component name:** MapChart
- **Component ID:** `open.echarts.MapChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 700x500
- **Description:** Geo maps with scatter, heatmap, and region series.
- **Default option example:**
```json
{
  "geo": { "map": "china", "roam": true },
  "series": [{
    "type": "scatter",
    "coordinateSystem": "geo",
    "data": [[116.4, 39.9, 100], [121.5, 31.2, 80]]
  }]
}
```

#### 26. LinesChart
- **Component name:** LinesChart
- **Component ID:** `open.echarts.LinesChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 700x500
- **Description:** Lines on geo (flight paths, migration, etc.).
- **Default option example:**
```json
{
  "geo": { "map": "china" },
  "series": [{
    "type": "lines",
    "coordinateSystem": "geo",
    "data": [
      { "coords": [[116.4, 39.9], [121.5, 31.2]], "lineStyle": {} }
    ]
  }]
}
```

---

### 3D (ECharts-GL)

Palette category: **Open Components / ECharts 3D**

#### 27. Bar3DChart
- **Component name:** Bar3DChart
- **Component ID:** `open.echarts.Bar3DChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 700x500
- **Description:** 3D bar charts.
- **Default option example:**
```json
{
  "xAxis3D": { "type": "category", "data": ["A", "B", "C"] },
  "yAxis3D": { "type": "category", "data": ["1", "2", "3"] },
  "zAxis3D": { "type": "value" },
  "grid3D": {},
  "series": [{
    "type": "bar3D",
    "data": [[0, 0, 5], [1, 0, 8], [0, 1, 7]]
  }]
}
```

#### 28. Line3DChart
- **Component name:** Line3DChart
- **Component ID:** `open.echarts.Line3DChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 700x500
- **Description:** 3D line charts.
- **Default option example:**
```json
{
  "xAxis3D": {},
  "yAxis3D": {},
  "zAxis3D": {},
  "grid3D": {},
  "series": [{
    "type": "line3D",
    "data": [[0, 0, 0], [1, 1, 1], [2, 2, 2]]
  }]
}
```

#### 29. Scatter3DChart
- **Component name:** Scatter3DChart
- **Component ID:** `open.echarts.Scatter3DChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 700x500
- **Description:** 3D scatter plots.
- **Default option example:**
```json
{
  "xAxis3D": {},
  "yAxis3D": {},
  "zAxis3D": {},
  "grid3D": {},
  "series": [{
    "type": "scatter3D",
    "data": [[1, 2, 3], [2, 3, 4], [3, 4, 5]]
  }]
}
```

#### 30. SurfaceChart
- **Component name:** SurfaceChart
- **Component ID:** `open.echarts.SurfaceChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 700x500
- **Description:** 3D surface plots.
- **Default option example:**
```json
{
  "xAxis3D": {},
  "yAxis3D": {},
  "zAxis3D": {},
  "grid3D": {},
  "series": [{
    "type": "surface",
    "data": []
  }]
}
```

#### 31. Map3DChart
- **Component name:** Map3DChart
- **Component ID:** `open.echarts.Map3DChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 700x500
- **Description:** 3D map visualization.
- **Default option example:**
```json
{
  "geo3D": { "map": "china", "boxHeight": 10 },
  "series": [{
    "type": "scatter3D",
    "coordinateSystem": "geo3D",
    "data": [[116.4, 39.9, 100]]
  }]
}
```

#### 32. GlobeChart
- **Component name:** GlobeChart
- **Component ID:** `open.echarts.GlobeChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 700x600
- **Description:** 3D globe visualization.
- **Default option example:**
```json
{
  "globe": {
    "baseTexture": "",
    "heightTexture": "",
    "displacementScale": 0.1
  },
  "series": []
}
```

#### 33. Lines3DChart
- **Component name:** Lines3DChart
- **Component ID:** `open.echarts.Lines3DChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 700x500
- **Description:** 3D lines (e.g., flight paths on globe).
- **Default option example:**
```json
{
  "globe": {},
  "series": [{
    "type": "lines3D",
    "coordinateSystem": "globe",
    "data": []
  }]
}
```

#### 34. Polygons3DChart
- **Component name:** Polygons3DChart
- **Component ID:** `open.echarts.Polygons3DChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 700x500
- **Description:** 3D polygon visualization.
- **Default option example:**
```json
{
  "xAxis3D": {},
  "yAxis3D": {},
  "zAxis3D": {},
  "grid3D": {},
  "series": [{
    "type": "polygons3D",
    "data": []
  }]
}
```

---

### WebGL-Accelerated

Palette category: **Open Components / ECharts 3D**

#### 35. ScatterGLChart
- **Component name:** ScatterGLChart
- **Component ID:** `open.echarts.ScatterGLChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 600x400
- **Description:** WebGL-accelerated scatter for large datasets.
- **Default option example:**
```json
{
  "xAxis": {},
  "yAxis": {},
  "series": [{
    "type": "scatter",
    "large": true,
    "largeThreshold": 500,
    "data": []
  }]
}
```

#### 36. GraphGLChart
- **Component name:** GraphGLChart
- **Component ID:** `open.echarts.GraphGLChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 600x500
- **Description:** WebGL-accelerated graph for large networks.
- **Default option example:**
```json
{
  "series": [{
    "type": "graph",
    "layout": "none",
    "data": [],
    "links": [],
    "emphasis": { "focus": "adjacency" }
  }]
}
```

#### 37. FlowGLChart
- **Component name:** FlowGLChart
- **Component ID:** `open.echarts.FlowGLChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 700x500
- **Description:** WebGL flow visualization (e.g., wind, particle flow).
- **Default option example:**
```json
{
  "geo": { "map": "china" },
  "series": [{
    "type": "flowGL",
    "coordinateSystem": "geo",
    "data": []
  }]
}
```

---

### Industrial

Palette category: **Open Components / Industrial**

#### 38. IndustrialTrend
- **Component name:** IndustrialTrend
- **Component ID:** `open.industrial.Trend`
- **Palette category:** Open Components / Industrial
- **Default size:** 800x350
- **Description:** Time-series trend with PV/SP (process variable / setpoint) and alarm limits.
- **Default option example:**
```json
{
  "xAxis": { "type": "time" },
  "yAxis": { "type": "value" },
  "series": [
    { "type": "line", "name": "PV", "data": [] },
    { "type": "line", "name": "SP", "data": [] },
    { "type": "line", "name": "High Limit", "lineStyle": { "type": "dashed" }, "data": [] },
    { "type": "line", "name": "Low Limit", "lineStyle": { "type": "dashed" }, "data": [] }
  ]
}
```

#### 39. IndustrialOEE
- **Component name:** IndustrialOEE
- **Component ID:** `open.industrial.OEE`
- **Palette category:** Open Components / Industrial
- **Default size:** 400x400
- **Description:** Multi-ring OEE gauge (Availability, Performance, Quality).
- **Default option example:**
```json
{
  "series": [
    { "type": "gauge", "radius": "90%", "detail": { "formatter": "{value}%", "offsetCenter": [0, "-30%"] }, "data": [{ "value": 85, "name": "Availability" }] },
    { "type": "gauge", "radius": "70%", "detail": { "formatter": "{value}%", "offsetCenter": [0, "-20%"] }, "data": [{ "value": 92, "name": "Performance" }] },
    { "type": "gauge", "radius": "50%", "detail": { "formatter": "{value}%", "offsetCenter": [0, "-10%"] }, "data": [{ "value": 98, "name": "Quality" }] }
  ]
}
```

#### 40. IndustrialPareto
- **Component name:** IndustrialPareto
- **Component ID:** `open.industrial.Pareto`
- **Palette category:** Open Components / Industrial
- **Default size:** 700x400
- **Description:** Pareto chart: bar series with cumulative percentage line.
- **Default option example:**
```json
{
  "xAxis": { "type": "category", "data": ["Defect A", "Defect B", "Defect C", "Defect D"] },
  "yAxis": [
    { "type": "value", "name": "Count" },
    { "type": "value", "name": "Cumulative %", "max": 100, "axisLabel": { "formatter": "{value}%" } }
  ],
  "series": [
    { "type": "bar", "data": [50, 30, 15, 5] },
    { "type": "line", "yAxisIndex": 1, "data": [50, 80, 95, 100] }
  ]
}
```

---

## Summary Table

| # | Component | ID | Palette | Size |
|---|-----------|-----|---------|------|
| 1 | EChart | open.echarts.EChart | ECharts | 600x400 |
| 2 | LineChart | open.echarts.LineChart | ECharts | 600x350 |
| 3 | BarChart | open.echarts.BarChart | ECharts | 600x350 |
| 4 | PieChart | open.echarts.PieChart | ECharts | 500x400 |
| 5 | ScatterChart | open.echarts.ScatterChart | ECharts | 600x400 |
| 6 | EffectScatterChart | open.echarts.EffectScatterChart | ECharts | 600x400 |
| 7 | GaugeChart | open.echarts.GaugeChart | ECharts | 400x350 |
| 8 | FunnelChart | open.echarts.FunnelChart | ECharts | 500x400 |
| 9 | CandlestickChart | open.echarts.CandlestickChart | ECharts | 700x400 |
| 10 | BoxplotChart | open.echarts.BoxplotChart | ECharts | 600x400 |
| 11 | HeatmapChart | open.echarts.HeatmapChart | ECharts | 600x400 |
| 12 | TreeChart | open.echarts.TreeChart | ECharts | 600x500 |
| 13 | TreemapChart | open.echarts.TreemapChart | ECharts | 600x500 |
| 14 | SunburstChart | open.echarts.SunburstChart | ECharts | 500x500 |
| 15 | GraphChart | open.echarts.GraphChart | ECharts | 600x500 |
| 16 | SankeyChart | open.echarts.SankeyChart | ECharts | 600x500 |
| 17 | RadarChart | open.echarts.RadarChart | ECharts | 500x450 |
| 18 | ParallelChart | open.echarts.ParallelChart | ECharts | 700x400 |
| 19 | ThemeRiverChart | open.echarts.ThemeRiverChart | ECharts | 700x400 |
| 20 | CalendarChart | open.echarts.CalendarChart | ECharts | 800x200 |
| 21 | PictorialBarChart | open.echarts.PictorialBarChart | ECharts | 600x400 |
| 22 | CustomChart | open.echarts.CustomChart | ECharts | 600x400 |
| 23 | GraphicChart | open.echarts.GraphicChart | ECharts | 600x400 |
| 24 | DatasetChart | open.echarts.DatasetChart | ECharts | 600x400 |
| 25 | MapChart | open.echarts.MapChart | ECharts | 700x500 |
| 26 | LinesChart | open.echarts.LinesChart | ECharts | 700x500 |
| 27 | Bar3DChart | open.echarts.Bar3DChart | ECharts 3D | 700x500 |
| 28 | Line3DChart | open.echarts.Line3DChart | ECharts 3D | 700x500 |
| 29 | Scatter3DChart | open.echarts.Scatter3DChart | ECharts 3D | 700x500 |
| 30 | SurfaceChart | open.echarts.SurfaceChart | ECharts 3D | 700x500 |
| 31 | Map3DChart | open.echarts.Map3DChart | ECharts 3D | 700x500 |
| 32 | GlobeChart | open.echarts.GlobeChart | ECharts 3D | 700x600 |
| 33 | Lines3DChart | open.echarts.Lines3DChart | ECharts 3D | 700x500 |
| 34 | Polygons3DChart | open.echarts.Polygons3DChart | ECharts 3D | 700x500 |
| 35 | ScatterGLChart | open.echarts.ScatterGLChart | ECharts 3D | 600x400 |
| 36 | GraphGLChart | open.echarts.GraphGLChart | ECharts 3D | 600x500 |
| 37 | FlowGLChart | open.echarts.FlowGLChart | ECharts 3D | 700x500 |
| 38 | IndustrialTrend | open.industrial.Trend | Industrial | 800x350 |
| 39 | IndustrialOEE | open.industrial.OEE | Industrial | 400x400 |
| 40 | IndustrialPareto | open.industrial.Pareto | Industrial | 700x400 |
