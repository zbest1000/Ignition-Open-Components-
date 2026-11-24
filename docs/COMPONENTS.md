# Open ECharts — Component Reference

Component reference for the **Open ECharts** Ignition Perspective module: 56 chart components built on Apache ECharts 6.1.0 and ECharts-GL 2.1.0.

---

## Overview

All components share one runtime and the same base properties and events. They are defined in a single manifest (`common/src/main/resources/components.manifest.json`), which gives each one:

- **Default option** — the chart a component shows when dropped from the palette, specific to its chart type. A saved view whose `option` is empty shows it too.
- **Palette category** — *Open Components / ECharts*, *ECharts 3D*, *Industrial* or *Scheduling*
- **Default size**

The ECharts components take any valid ECharts option in `option`. The industrial and scheduling components build their option from domain properties (`tasks`, `events`, `values`, ...) instead; see [Industrial](#industrial) and [Scheduling](#scheduling). The option examples in this document are illustrative starting points, not a copy of each default.

The 11 components in *ECharts 3D* need ECharts-GL, which the browser downloads from the gateway the first time one of them is shown.

---

## Shared Properties

All components have the following properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `option` | object | Varies per component | ECharts option. Left empty (`{}`), an ECharts component draws its default option. On industrial / scheduling components it is an advanced override: when non-empty it replaces the generated chart. |
| `theme` | string | `""` | `"IgnitionIndustrialDark"`, `"IgnitionIndustrialLight"`, or `""` for the ECharts default. Changing it re-creates the chart. |
| `renderer` | string | `"canvas"` | Rendering backend: `"canvas"` or `"svg"`. |
| `autoResize` | boolean | `true` | Resize the chart when its container changes size. |
| `resizeDebounceMs` | integer | `150` | Debounce delay (ms) for resize handling. |
| `notMerge` | boolean | `false` | `true`: every update replaces the whole option. `false`: updates are merged into the current option, except `series`, which is replaced — a series removed from the option disappears from the chart. |
| `lazyUpdate` | boolean | `true` | Applies an update on the next animation frame; of several changes within a frame only the latest is applied (after 500 ms if the tab gets no frame). `false` applies each change immediately. |
| `showLoading` | boolean | `false` | Shows the ECharts loading animation. |
| `loadingOptions` | object | `{}` | Loading animation options (text, color, maskColor, ...). |
| `sanitizeTooltip` | boolean | `true` | Sanitises tooltip and data-view HTML, link URLs, colour and tooltip style strings, and SVG maps. Not a sandbox; see [SECURITY.md](SECURITY.md). Toggling it re-applies the whole option, which resets zoom once. |
| `ariaLabel` | string | `""` | Accessible label announced by screen readers. |
| `maps` | object | `{}` | Maps for `map`, `geo`, `map3D` and `geo3D`, keyed by map name. See [Maps](#maps). |

### Maps

ECharts ships no map geometry. Put each map in `maps` under a name and refer to that name in the
option (`series.map`, `geo.map`, `geo3D.map`). A value is one of:

- a GeoJSON FeatureCollection (regions are matched to data by `properties.name`)
- `{ "geoJSON": <FeatureCollection>, "specialAreas": { ... } }`
- `{ "svg": "<svg ...>...</svg>" }` (for `map` / `geo`; sanitised while `sanitizeTooltip` is `true`)

```json
{
  "maps": {
    "plant": {
      "type": "FeatureCollection",
      "features": [
        { "type": "Feature", "properties": { "name": "North" },
          "geometry": { "type": "Polygon", "coordinates": [[[0, 2], [3, 2], [3, 3], [0, 3], [0, 2]]] } },
        { "type": "Feature", "properties": { "name": "South" },
          "geometry": { "type": "Polygon", "coordinates": [[[0, 0], [3, 0], [3, 1], [0, 1], [0, 0]]] } }
      ]
    }
  },
  "option": {
    "visualMap": { "min": 0, "max": 100 },
    "series": [{ "type": "map", "map": "plant", "data": [{ "name": "North", "value": 80 }, { "name": "South", "value": 35 }] }]
  }
}
```

Map names are global to the browser page, not to a component: two components that register
different maps under the same name overwrite each other, so give each map a unique name.
Malformed entries are ignored. Changing a map re-applies the option in full, which resets zoom once.

A chart whose option cannot be drawn shows the ECharts error message in place of the chart and
redraws when the option is corrected. The 3D / WebGL components show "Loading chart…" while
ECharts-GL downloads.

Accessibility: ECharts' generated chart description (`aria.enabled`) is on by default; set `aria` in the option to configure or disable it.

---

## Shared Events

All components emit the following events. Payloads contain only these fields, as plain JSON values; a field is omitted when ECharts does not supply it.

| Event | Payload fields |
|-------|----------------|
| `onClick`, `onDoubleClick`, `onMouseOver`, `onMouseOut` | `componentType`, `seriesType`, `seriesIndex`, `seriesName`, `name`, `dataIndex`, `data`, `dataType`, `value`, `color`, `percent` |
| `onLegendSelectChanged` | `name` (the legend item toggled), `selected` (map of series name to boolean) |
| `onDataZoom` | `start`, `end` (percent), `startValue`, `endValue`, `dataZoomId`, and `batch`: a list of entries with the same fields when the zoom came from a mouse/touch action |
| `onBrushSelected` | `batch`: a list of entries with `brushId`, `brushIndex`, `brushName`, `areas`, `selected` |

Two parts are bounded because payloads travel to the gateway. In mouse events, `data` is the data
item without its `children` (for tree, treemap and sunburst nodes). In `onBrushSelected`, each
`selected[]` entry's `dataIndex` holds at most the first 1000 selected indices and `dataIndexCount`
the total; the event fires at most once per 100 ms while the brush moves, with the latest selection.

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
- **Limitation:** a `custom` series needs a `renderItem` JavaScript function. Perspective
  properties are JSON and cannot hold functions (a function written as a string is not
  executed), so this component cannot currently draw custom series from the Designer. Use
  `GraphicChart` for static shapes.

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
- **Needs map data:** supply it in the [`maps`](#maps) property; the component drops with a
  placeholder title until then.
- **Default option example** (with a map named `plant` in `maps`):
```json
{
  "geo": { "map": "plant", "roam": true },
  "series": [{
    "type": "scatter",
    "coordinateSystem": "geo",
    "data": [[1.5, 2.5, 100], [1.5, 0.5, 80]]
  }]
}
```

#### 26. LinesChart
- **Component name:** LinesChart
- **Component ID:** `open.echarts.LinesChart`
- **Palette category:** Open Components / ECharts
- **Default size:** 700x500
- **Description:** Lines on geo (flight paths, migration, etc.). The default draws routes on a
  cartesian grid, which needs no map.
- **Default option example** (on a map named `plant` in [`maps`](#maps)):
```json
{
  "geo": { "map": "plant" },
  "series": [{
    "type": "lines",
    "coordinateSystem": "geo",
    "data": [
      { "coords": [[0.5, 0.5], [2.5, 2.5]] }
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
    "data": [[0, 0, 0], [1, 0, 1], [2, 0, 0], [0, 1, 1], [1, 1, 2], [2, 1, 1], [0, 2, 0], [1, 2, 1], [2, 2, 0]]
  }]
}
```

#### 31. Map3DChart
- **Component name:** Map3DChart
- **Component ID:** `open.echarts.Map3DChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 700x500
- **Description:** 3D map visualization.
- **Needs map data:** supply it in the [`maps`](#maps) property; the component drops with a
  placeholder title until then.
- **Default option example** (with a map named `plant` in `maps`):
```json
{
  "series": [{ "type": "map3D", "map": "plant", "regionHeight": 3 }]
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
  "globe": { "baseColor": "#3b6cb5", "shading": "color" },
  "series": [{
    "type": "scatter3D",
    "coordinateSystem": "globe",
    "data": [[-0.13, 51.5, 0], [139.7, 35.7, 0]]
  }]
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
  "globe": { "baseColor": "#3b6cb5", "shading": "color" },
  "series": [{
    "type": "lines3D",
    "coordinateSystem": "globe",
    "data": [[[-0.13, 51.5], [55.3, 25.2]]]
  }]
}
```

#### 34. Polygons3DChart
- **Component name:** Polygons3DChart
- **Component ID:** `open.echarts.Polygons3DChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 700x500
- **Description:** 3D polygon visualization on `geo3D`.
- **Needs map data:** `geo3D` needs a map from the [`maps`](#maps) property; the component drops
  with a placeholder title until then. Give each polygon a `height`.
- **Default option example** (with a map named `plant` in `maps`):
```json
{
  "geo3D": { "map": "plant" },
  "series": [{
    "type": "polygons3D",
    "coordinateSystem": "geo3D",
    "data": [{ "name": "Zone", "height": 5, "coords": [[[1, 1.2], [2, 1.2], [2, 1.8], [1, 1.8], [1, 1.2]]] }]
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
    "type": "scatterGL",
    "symbolSize": 4,
    "data": [[1, 2], [3, 4], [5, 6]]
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
    "type": "graphGL",
    "symbolSize": 20,
    "itemStyle": { "color": "#5470c6", "opacity": 1 },
    "nodes": [{ "name": "A", "x": 0, "y": 0 }, { "name": "B", "x": 100, "y": 0 }, { "name": "C", "x": 50, "y": 80 }],
    "edges": [{ "source": 0, "target": 1 }, { "source": 1, "target": 2 }],
    "forceAtlas2": { "steps": 1, "maxSteps": 1 }
  }]
}
```

#### 37. FlowGLChart
- **Component name:** FlowGLChart
- **Component ID:** `open.echarts.FlowGLChart`
- **Palette category:** Open Components / ECharts 3D
- **Default size:** 700x500
- **Description:** WebGL flow visualization (e.g., wind, particle flow). `data` is a regular grid of `[x, y, vx, vy]` rows.
- **Default option example:**
```json
{
  "xAxis": { "type": "value" },
  "yAxis": { "type": "value" },
  "series": [{
    "type": "flowGL",
    "data": [[0, 0, 1, 0], [1, 0, 1, 1], [0, 1, 0, 1], [1, 1, -1, 1]]
  }]
}
```

---

### Industrial

Palette category: **Open Components / Industrial**

These components build their chart from the properties listed here (in addition to the [shared properties](#shared-properties)). Setting a non-empty `option` replaces the generated chart. A chart with nothing to draw shows "No data".

#### 38. Industrial Trend
- **Component ID:** `open.industrial.Trend`
- **Default size:** 800x350
- **Description:** Time-series PV/SP trend with alarm limits and data zoom.

| Property | Type | Description |
|----------|------|-------------|
| `data` | object | `{ pvData, spData, timeField, valueField }`. `pvData` / `spData` are arrays of `[time, value]` pairs or of objects read through `timeField` / `valueField` (defaults `"t"` / `"v"`). Drops with sample data. |
| `limits` | object | `{ hiAlarm, hiWarning, loWarning, loAlarm }`: numbers (or null) drawn as horizontal markLines. |
| `yAxisLabel` | string | Label for the Y axis (e.g. unit of measurement). |
| `showSetpoint` | boolean | Whether to show the setpoint line. |
| `showDataZoom` | boolean | Whether to show the data zoom slider. |

#### 39. OEE Summary
- **Component ID:** `open.industrial.OEE`
- **Default size:** 400x400
- **Description:** Overall Equipment Effectiveness rings with A/P/Q inputs: OEE and its factors as concentric rings with their names and values in the middle. Names, colours, thresholds, a target marker and the factors themselves can be customised; for rings that are not OEE at all, use Metric Rings.

| Property | Type | Description |
|----------|------|-------------|
| `availability` | number | Availability in percent (0-100). |
| `performance` | number | Performance in percent (0-100). |
| `quality` | number | Quality in percent (0-100). |
| `oeeOverride` | number / null | Overrides the calculated OEE, in percent; clamped to 0-100. When null, OEE is computed as A*P*Q/10000. |
| `showLabels` | boolean | Show the names and values in the middle of the rings. |
| `labels` | object | Ring names, e.g. for another language: `{ "oee": "GAE", "availability": "Verfügbarkeit", "performance": "Leistung", "quality": "Qualität" }`. Missing keys keep the English names. |
| `colors` | object / array | Ring colours as `{ oee, availability, performance, quality }`, or as an array in ring order starting with OEE (for use with `metrics`). Rings without a colour use the theme palette. |
| `thresholds` | array | Colours every ring by its value, overriding `colors`: `[{ "upTo": 60, "color": "#e05252" }, { "upTo": 85, "color": "#e6a23c" }, { "color": "#3ba272" }]`. A value takes the colour of the first band, in ascending order of `upTo`, whose `upTo` is greater than it; a band without `upTo` takes everything above. |
| `target` | number / null | OEE target in percent (e.g. 85 for world class), drawn as a marker on the OEE ring. |
| `decimals` | integer / null | Decimal places of all values. Null shows the factors as given and the calculated OEE as a whole percent. |
| `metrics` | array | Optional factors `{ name, value, color, target }`, values in percent. When non-empty they replace availability, performance and quality, and OEE is their product, e.g. A x P x Q x a fourth loss factor. Up to four factors are labelled in the middle; with more, only OEE is. |

Example: four factors, a world-class target and traffic-light colours.

```json
{
  "metrics": [
    { "name": "Availability", "value": 92 },
    { "name": "Performance", "value": 95 },
    { "name": "Quality", "value": 97 },
    { "name": "Loading", "value": 88, "target": 90 }
  ],
  "target": 85,
  "decimals": 1,
  "thresholds": [
    { "upTo": 60, "color": "#e05252" },
    { "upTo": 85, "color": "#e6a23c" },
    { "color": "#3ba272" }
  ]
}
```

#### 40. Pareto Chart
- **Component ID:** `open.industrial.Pareto`
- **Default size:** 700x400
- **Description:** Pareto analysis with categories, counts, and cumulative percentage.

| Property | Type | Description |
|----------|------|-------------|
| `categories` | array | Category labels. Bars are drawn sorted by count, largest first. |
| `counts` | array | Count for each category, in the same order as categories. Negative or non-numeric counts count as 0. |
| `showCumulativeLine` | boolean | Show the cumulative percentage line. |
| `show80PercentLine` | boolean | Show the 80% threshold markLine. |
| `barLabel` | string | Label for the bar series. |
| `lineLabel` | string | Label for the cumulative line series. |

#### 41. SPC Chart
- **Component ID:** `open.industrial.SPCChart`
- **Default size:** 800x500
- **Description:** Statistical Process Control — Individuals and Moving Range with run rules.

| Property | Type | Description |
|----------|------|-------------|
| `values` | array | Measurements in time order. Bind to your sample data. |
| `subgroupSize` | integer | 1 = Individuals & Moving Range; 2–10 = X-bar & R on consecutive subgroups. |
| `showUCL` | boolean | Show the Upper Control Limit (UCL) markline. |
| `showLCL` | boolean | Show the Lower Control Limit (LCL) markline. |
| `showCenterLine` | boolean | Show the Center Line (process mean) markline. |
| `showMRChart` | boolean | Show the MR (or R) chart below the main chart. |
| `showRunRules` | boolean | Highlight points that violate Western Electric rules 1 and 4. |
| `title` | string | Chart title. Leave blank for the default title. |

---

### Scheduling

Palette category: **Open Components / Scheduling**

These components build their chart from the properties listed here (in addition to the [shared properties](#shared-properties)). Setting a non-empty `option` replaces the generated chart.

#### 42. State Timeline
- **Component ID:** `open.industrial.StateTimeline`
- **Default size:** 900x300
- **Description:** Equipment state/alarm timeline with colour-coded event bars on lanes.

| Property | Type | Description |
|----------|------|-------------|
| `events` | array | State events as objects: { lane, start (epoch ms), end (epoch ms), state, color? }. Bind to your equipment-state history. |
| `stateColors` | object | Map of state name to colour, e.g. { "Running": "#91cc75" }. Merged over the built-in defaults. |
| `title` | string | Chart title. Leave blank for the default title. |

#### 43. Gantt Chart
- **Component ID:** `open.industrial.Gantt`
- **Default size:** 900x400
- **Description:** Task scheduling with bars, milestones, and progress.

| Property | Type | Description |
|----------|------|-------------|
| `tasks` | array | Gantt tasks: { name, start (epoch ms), end (epoch ms), progress?, category?, color?, milestone? }. Bind to your schedule data. |
| `showProgress` | boolean | Overlay each task's progress (percent, 0-100) on its bar. |
| `title` | string | Chart title. Leave blank for the default title. |

#### 44. Schedule Calendar
- **Component ID:** `open.industrial.ScheduleCalendar`
- **Default size:** 900x250
- **Description:** Annual calendar heatmap for shift schedules and resource allocation.

| Property | Type | Description |
|----------|------|-------------|
| `year` | string | Period to render: a year ("2025") or a month ("2025-03"). Leave blank to use the current year. |
| `entries` | array | Schedule entries: { date, shift, crew? } with date as a YYYY-MM-DD string. value and color are reserved and currently have no effect. Bind to your shift schedule. |
| `shiftColors` | object | Map of shift name to colour. Merged over the built-in defaults. |
| `showLegend` | boolean | Show the shift colour legend. |
| `title` | string | Chart title. Leave blank for the default title. |

#### 45. Shift Calendar
- **Component ID:** `open.industrial.ShiftCalendar`
- **Default size:** 900x300
- **Description:** Crew shift patterns by weekday across a date range.

| Property | Type | Description |
|----------|------|-------------|
| `patterns` | array | Shift patterns: { name, color, days } where days lists the weekdays worked (0 = Sunday .. 6 = Saturday). |
| `crews` | array | Crew assignments: { crew, pattern } where pattern is the name of a shift pattern. startDate and rotationDays are reserved and currently unused. |
| `dateRange` | array | Inclusive [startDate, endDate] as YYYY-MM-DD strings. |
| `title` | string | Chart title. Leave blank for the default title. |

#### 46. Downtime Tracker
- **Component ID:** `open.industrial.DowntimeTracker`
- **Default size:** 900x350
- **Description:** Categorised downtime events on equipment timeline with reason codes.

| Property | Type | Description |
|----------|------|-------------|
| `events` | array | Downtime events: { equipment, start (epoch ms), end (epoch ms), category, reason? }. reason is not charted. Bind to your downtime log. |
| `categoryColors` | object | Map of downtime category to colour. Merged over the built-in defaults. |
| `showSummary` | boolean | Show total downtime under the title. |
| `title` | string | Chart title. Leave blank for the default title. |

#### 47. Batch Timeline
- **Component ID:** `open.industrial.BatchTimeline`
- **Default size:** 900x350
- **Description:** Batch recipe phase durations (S88 model) on timeline lanes.

| Property | Type | Description |
|----------|------|-------------|
| `phases` | array | Batch phases (S88): { batch, phase, start (epoch ms), end (epoch ms), status? }. status is not charted. Bind to your batch records. |
| `phaseColors` | object | Map of phase name to colour. Merged over the built-in defaults. |
| `title` | string | Chart title. Leave blank for the default title. |

#### 48. Resource Heatmap
- **Component ID:** `open.industrial.ResourceHeatmap`
- **Default size:** 800x400
- **Description:** Equipment utilisation percentage as heatmap (resource x time).

| Property | Type | Description |
|----------|------|-------------|
| `resources` | array | Resource names (Y axis rows). |
| `timeSlots` | array | Time-slot labels (X axis columns). |
| `utilization` | array | Utilization matrix: one row of numbers per resource, one number per time slot (0 to maxValue). An empty matrix shows "No data". Bind to your data. |
| `maxValue` | number | Maximum value for the colour scale (e.g. 100 for percent). |
| `title` | string | Chart title. Leave blank for the default title. |

---

### KPI & Analysis

Domain charts in the *Open Components / Industrial* palette category. Like the other industrial components they are driven by plain props you can bind to tags or query results; a non-empty `option` replaces the generated chart.

#### 49. Metric Rings
- **Component ID:** `open.industrial.MetricRings`
- **Default size:** 400x400
- **Description:** Concentric progress rings for any set of metrics, with targets, thresholds and a centre summary. One ring per metric, each on its own scale if needed (utilities load, tank levels, batch quality attributes, progress against plan). Rings scale with the component; one to six read best, at most 12 are drawn.

| Property | Type | Description |
|----------|------|-------------|
| `metrics` | array | One ring per metric, outermost first: `{ name, value, min, max, target, color, unit, decimals, thresholds }`. Only `name` and `value` are needed; the rest override the shared props for that ring. A metric without a usable value stays as an empty ring showing "–". |
| `min` | number | Start of the scale for metrics without their own `min` (default 0). |
| `max` | number | End of the scale, a full ring, for metrics without their own `max` (default 100). Values outside the scale fill or empty the ring; the displayed number is not clamped. |
| `unit` | string | Unit written after the values (default `%`). |
| `decimals` | integer | Decimal places of the values. |
| `centerTitle` | string | Caption below the value in the centre. |
| `centerValue` | number / string / null | A number (formatted with `decimals` and `unit`) or a text shown in the centre instead of the calculated summary. |
| `summary` | string | Centre value: `product` (multiplies the fill of the rings as fractions and gives a percentage, the OEE rule), `average`, `min`, `max`, `sum` (of the values as given), or `none`. |
| `thresholds` | array | Colours rings by value, overriding metric colours: `[{ "upTo": 60, "color": "#e05252" }, { "upTo": 85, "color": "#e6a23c" }, { "color": "#3ba272" }]`. A value takes the colour of the first band, in ascending order of `upTo`, whose `upTo` is greater than it; a band without `upTo` takes everything above. |
| `showLabels` | boolean | List the value and name of every metric beside the rings. |
| `labelPosition` | string | `bottom` (default) or `right` (for a wide component). |
| `showTargets` | boolean | Mark each metric's `target` on its ring. |
| `ringThickness` | number | Thickness of all rings together in percent of the outer radius (5-90); 0 chooses it from the number of rings. |
| `ringGap` | number | Space between rings in percent of the room one ring has (0-90). |
| `startAngle` | number | Where the rings start, in degrees: 90 is the top. The rings run clockwise. |
| `sweep` | number | Angle a full ring covers (30-360). `startAngle` 225 with `sweep` 270 gives a gauge open at the bottom. |

Example: three utilities on their own scales, as a 270° gauge.

```json
{
  "metrics": [
    { "name": "Compressed air", "value": 6.8, "max": 10, "unit": "bar", "decimals": 1, "target": 7 },
    { "name": "Steam", "value": 11.2, "max": 16, "unit": "bar", "decimals": 1 },
    { "name": "Chilled water", "value": 7.5, "min": 4, "max": 14, "unit": "°C", "decimals": 1, "target": 6 }
  ],
  "summary": "none",
  "centerTitle": "Utilities",
  "startAngle": 225,
  "sweep": 270
}
```

Bind a ring to a tag with a property binding on `props.metrics[0].value`.

#### 50. Bullet Chart
- **Component ID:** `open.industrial.BulletChart`
- **Default size:** 600x300
- **Description:** Actual versus target per item on qualitative bands (Stephen Few bullet graphs): a bar for the actual value, a marker for the target, and shaded poor / acceptable / good bands behind them. Made for "production vs plan per line". Scales start at zero.

| Property | Type | Description |
|----------|------|-------------|
| `items` | array | One bullet per item: `{ name, value, target, max, ranges, color }`. `max` is the end of the item's scale (default 120 % of the target, extended if the value is larger); `ranges` are the item's band boundaries in the units of the value, e.g. `[600, 900]`. At most 60 items are drawn. |
| `title` | string | Chart title. Leave blank for none. |
| `orientation` | string | `horizontal` (default, one row per item) or `vertical`. |
| `unit` | string | Unit written after the values. |
| `decimals` | integer | Decimal places of the values. |
| `percentOfTarget` | boolean | Draw every item as a percentage of its own target, so that all targets line up at 100 % and items with different targets or units compare directly. Labels keep the real values. |
| `ranges` | array | Band boundaries in percent of the target, for items without their own `ranges`. Default `[75, 95]`. |
| `bandColors` | array | Band colours from the lowest band to the highest. The default translucent greys work on light and dark themes. |
| `color` | string | Bar colour, for items without their own `color`. |
| `statusColors` | array | Optional. When set, a bar takes the colour of the band its value is in, lowest first, e.g. `["#e05252", "#e6a23c", "#3ba272"]`. |
| `targetColor` | string | Colour of the target markers (drawn with a thin light outline). On a dark theme `#ffffff` gives a solid light marker. |
| `showValues` | boolean | Write each value, and its percentage of the target, beside its bar. |

Example: attainment per line, coloured by status.

```json
{
  "items": [
    { "name": "Line 1", "value": 1180, "target": 1200 },
    { "name": "Line 2", "value": 860, "target": 1000 },
    { "name": "Line 3", "value": 1320, "target": 1250 }
  ],
  "unit": "pcs",
  "percentOfTarget": true,
  "statusColors": ["#e05252", "#e6a23c", "#3ba272"]
}
```

#### 51. KPI Tile
- **Component ID:** `open.industrial.KpiTile`
- **Default size:** 260x150
- **Description:** One big number with its unit and a caption, the change versus the previous period or a target (arrow, amount and good/bad colour), and a sparkline of recent values. Drawn entirely by ECharts, so it follows the chart theme. Text sizes are fixed so that the tile reads from 160x100 upwards; in a larger tile the sparkline takes the extra room.

| Property | Type | Description |
|----------|------|-------------|
| `title` | string | Caption above the value. |
| `value` | number / null | The number shown. When null, the last point of `history` is shown. |
| `unit` | string | Unit written after the value. |
| `decimals` | integer | Decimal places of the value. |
| `previous` | number / null | Value of the previous period. When set, the change is measured against it. |
| `target` | number / null | Target value. The change is measured against it when `previous` is null; it is also drawn as a dashed line in the sparkline when it lies near the history. |
| `deltaFormat` | string | `percent` (default, of the reference) or `absolute` (difference in the unit of the value). A reference of 0 always gives the difference. |
| `deltaLabel` | string | Text after the change, e.g. `vs last shift`. Blank gives "vs previous" / "vs target". |
| `higherIsBetter` | boolean | True colours an increase as good; false colours a decrease as good (scrap, downtime, energy). |
| `history` | array | Recent values, oldest first: numbers, `[time, value]` pairs, or objects with a `value`. At least two points draw a sparkline. |
| `showSparkline` | boolean | Draw the history below the numbers. |
| `color` | string | Sparkline colour. |
| `goodColor` | string | Colour of a change in the wanted direction. |
| `badColor` | string | Colour of a change in the unwanted direction. |

Example: scrap rate against a target, where lower is better.

```json
{
  "title": "Scrap rate",
  "value": 3.42,
  "unit": "%",
  "decimals": 2,
  "previous": null,
  "target": 2.5,
  "deltaFormat": "absolute",
  "higherIsBetter": false,
  "history": [2.1, 2.3, 2.2, 2.6, 2.9, 2.7, 3.1, 3.0, 3.3, 3.42]
}
```

#### 52. Waterfall Chart
- **Component ID:** `open.industrial.Waterfall`
- **Default size:** 700x400
- **Description:** Bridge chart: an opening total, a sequence of increases and decreases, optional subtotals, and a closing total. Use it for OEE loss bridges, energy balances, cost variance or yield loss through process steps.

| Property | Type | Description |
|----------|------|-------------|
| `steps` | array | Steps in order, as objects: { name, value, type? }. `type` is `"delta"` (default: adds `value` to the running total), `"subtotal"` (shows the running total; `value` is ignored) or `"total"` (shows the running total; a numeric `value` first sets it — use this for the opening total). Rows without a usable value are skipped. |
| `title` | string | Chart title. Leave blank for no title. |
| `unit` | string | Unit of the values, shown on the value axis and in tooltips. |
| `decimals` | integer | Decimal places of value labels and tooltips (0–10). |
| `increaseColor` | string | Colour of increases (positive deltas). |
| `decreaseColor` | string | Colour of decreases (negative deltas). |
| `totalColor` | string | Colour of total and subtotal bars. |
| `showValues` | boolean | Label each bar with its value; deltas carry a sign (+12 / −38). |
| `showConnectors` | boolean | Thin lines carrying the running total from bar to bar. |
| `orientation` | string | `vertical` (default) or `horizontal` (steps run top to bottom; suits long step names). |
| `startAtZero` | boolean | Start the value axis at zero. Turn off to zoom in on small changes of a large total (total bars are then cut off at the axis). Ignored when the running total reaches or crosses zero. |

The running total starts at 0 and may go negative: bars that cross zero are drawn correctly on both sides of the axis. With more than 8 steps the category labels are rotated instead of wrapped.

Example — OEE time-loss bridge (the default):

```json
[
  { "name": "Planned time", "value": 480, "type": "total" },
  { "name": "Breakdowns", "value": -38 },
  { "name": "Changeover", "value": -27 },
  { "name": "Run time", "type": "subtotal" },
  { "name": "Minor stops", "value": -31 },
  { "name": "Reduced speed", "value": -42 },
  { "name": "Scrap & rework", "value": -14 },
  { "name": "Productive time", "type": "total" }
]
```

#### 53. Process Capability Histogram
- **Component ID:** `open.industrial.CapabilityHistogram`
- **Default size:** 700x420
- **Description:** Histogram of measurements with specification limits, a fitted normal curve and capability statistics. The companion of the SPC Chart: SPC shows whether the process is stable, this shows whether it fits the tolerance.

| Property | Type | Description |
|----------|------|-------------|
| `values` | array | Measurements. Non-numeric entries are ignored. Keep them in time order when `sigmaMethod` is `within`. |
| `lsl` | number / null | Lower specification limit; null for none. |
| `usl` | number / null | Upper specification limit; null for none. One-sided specifications are supported. |
| `target` | number / null | Target (nominal) value; null for none. |
| `bins` | string / integer | Number of bins (1–200), or `"auto"`: Freedman–Diaconis rule (Sturges when the interquartile range is 0, at most 60 bins), with the bin width rounded up to 1, 2 or 5 × 10^k and edges aligned to it. |
| `showNormalCurve` | boolean | Overlay the normal distribution fitted to the mean and the selected sigma, scaled to the histogram (n × bin width × density). |
| `showStats` | boolean | Show the readout: n, mean, sigma, capability indices, values out of spec. |
| `sigmaMethod` | string | `overall` (default): sample standard deviation of all values; indices are reported as **Pp / Ppk**. `within`: average moving range ÷ 1.128, the short-term estimate the SPC Chart uses for its limits; indices are reported as **Cp / Cpk**. |
| `decimals` | integer | Decimal places of the mean and bin edges (0–10); sigma is shown with one more. |
| `unit` | string | Unit of the measurements (axis, readout, tooltips). |
| `title` | string | Chart title. Leave blank for no title. |
| `barColor` | string | Colour of the histogram inside the limits. |
| `outOfSpecColor` | string | Colour of the part of the histogram outside the limits. |
| `curveColor` | string | Colour of the normal curve and the mean line. |
| `limitColor` | string | Colour of the LSL / USL lines. |
| `targetColor` | string | Colour of the target line. |

Statistics: Pp = (USL − LSL) / 6σ, Ppk = min((USL − x̄) / 3σ, (x̄ − LSL) / 3σ) with the overall σ; Cp / Cpk are the same formulas with the within σ. With one limit only, Pp/Cp are omitted and Ppk/Cpk is the index of the existing side (marked "USL only" / "LSL only"). Indices are omitted when σ is 0 or there are fewer than two values. A value exactly on a limit counts as in spec.

Bins contain their lower edge and exclude their upper edge; the last bin contains both. The histogram is split exactly at LSL and USL, so a bin that straddles a limit is drawn in two colours by position; the exact number of out-of-spec values is in the readout. If LSL is greater than USL the two are swapped.

Example — shaft diameter, 25 ± 0.05 mm:

```json
{ "values": [25.011, 24.994, 25.009, 25.027, "…"], "lsl": 24.95, "usl": 25.05, "target": 25, "unit": "mm", "decimals": 3 }
```

#### 54. Flow Diagram (Sankey)
- **Component ID:** `open.industrial.FlowDiagram`
- **Default size:** 800x450
- **Description:** Sankey diagram of energy, material or product flow, built from source / target / value rows.

Bind `flows` to a named query or dataset with one row per flow; the nodes are derived from the names in the rows. Duplicate rows are summed, rows with a zero, negative or non-numeric value are skipped. A Sankey diagram cannot draw loops, so flows that close a loop (including a node flowing into itself) are left out, chosen deterministically (the link that leads back to a node already on the path from the sources), and a note under the title says how many were left out. Labels point towards the middle of the diagram so they are never cut off at the edge; tooltips show values with `unit` and `decimals`, inflow and outflow separately where a node does not balance, and each link's share of its source.

| Property | Type | Description |
|----------|------|-------------|
| `flows` | array | One row per flow: { source, target, value }. Nodes are created from the names used here. Rows with the same source and target are summed; rows whose value is not a positive number are skipped. A Sankey diagram cannot show loops: flows that close a loop (and flows from a node to itself) are left out and counted in a note under the title. |
| `nodes` | array | Optional per-node overrides: { name, color, label }. name must match a name used in flows; color sets the node colour, label the text shown instead of the name. Nodes without an entry use the theme palette and their own name. |
| `title` | string | Chart title. Leave blank for no title. |
| `unit` | string | Unit written after every value, e.g. kWh, t, pcs. |
| `decimals` | integer | Decimal places of the values in labels and tooltips (0 to 6). |
| `orientation` | string | Direction of flow: horizontal (left to right) or vertical (top to bottom). One of: `horizontal`, `vertical`. |
| `nodeAlign` | string | Column placement of nodes: justify puts end nodes in the last column, left packs nodes towards the start, right towards the end. One of: `justify`, `left`, `right`. |
| `showValues` | boolean | Write each node's throughput next to its name. Turn off for small components. |
| `linkColor` | string | Colour of the links: that of the source node, of the target node, or a gradient from one to the other. One of: `source`, `target`, `gradient`. |
| `emphasis` | string | What is highlighted on hover: adjacency (the node or link and its direct neighbours), trajectory (everything up- and downstream), or none. One of: `adjacency`, `trajectory`, `none`. |
| `nodeWidth` | number | Thickness of the node bars in pixels. |
| `nodeGap` | number | Gap between neighbouring nodes of a column in pixels. |
| `maxLabelLength` | integer | Node names longer than this many characters are shortened with an ellipsis in labels (tooltips show the full name). 0 = never shorten. |
| `colors` | array | Node colour palette, used in order of first appearance. Leave empty to use the palette of the theme. Colours set in nodes take precedence. |

Example `flows` (a named query returning `source`, `target`, `value` columns works as is):

```json
[
  { "source": "Grid", "target": "Main bus", "value": 820 },
  { "source": "Solar PV", "target": "Main bus", "value": 310 },
  { "source": "Main bus", "target": "Production lines", "value": 540 },
  { "source": "Production lines", "target": "Useful work", "value": 430 },
  { "source": "Production lines", "target": "Losses", "value": 110 }
]
```

Optional `nodes` overrides: `[{ "name": "Losses", "color": "#9aa0a6", "label": "Heat losses" }]`. For components smaller than about 450 px wide, turn `showValues` off.

#### 55. Event Heatmap
- **Component ID:** `open.industrial.EventHeatmap`
- **Default size:** 760x380
- **Description:** When does it happen? Event counts by hour of day and day of week (alarms, downtime starts, rejects).

Two ways to feed it: bind `cells` to pre-aggregated counts (`GROUP BY` weekday and hour in the database), or bind `timestamps` to the raw event times and let the component bucket them (100,000 timestamps are handled in one pass). Cells with no events are drawn in neutral grey, outside the colour ramp, so "nothing" is never confused with "a little". Bars above and to the right show the totals per hour and per day.

**Time zone.** Hours and weekdays of raw timestamps depend on the clock they are read on. The component never uses the time zone of the browser or gateway (two clients in different zones would show different charts); set `utcOffsetMinutes` instead. It applies to epoch milliseconds and to ISO strings that carry a zone (`Z`, `+02:00`). ISO strings without a zone (`2025-01-06T13:45:00`) are bucketed exactly as written. A fixed offset does not follow daylight saving time: for data that spans a DST change, aggregate in the database and bind `cells`.

| Property | Type | Description |
|----------|------|-------------|
| `cells` | array | Pre-aggregated counts, one row per cell: { day, hour, value }. day is 1 = Monday .. 7 = Sunday (0 is also Sunday, so JavaScript getDay() and PostgreSQL dow values work) or an English day name / one of dayLabels; hour is 0..23. Rows for the same cell are summed; invalid rows are skipped. Ignored while timestamps has entries. Clear this when you bind timestamps, otherwise the sample data shows whenever the binding returns no events. |
| `timestamps` | array | Raw event times, bucketed by the component: epoch milliseconds, or ISO 8601 strings. Epoch values and strings with a zone (Z, +02:00) are instants and are shifted by utcOffsetMinutes; strings without a zone are taken as local wall-clock time exactly as written. Rows { timestamp \| t_stamp \| t, weight } are accepted too. When non-empty, replaces cells. |
| `weights` | array | Optional weight of each timestamp, in the same order (e.g. downtime minutes, reject quantity). Leave empty to count every event as 1. When set, events without a valid non-negative weight are skipped. |
| `utcOffsetMinutes` | number | Offset from UTC, in minutes, of the clock the hours and weekdays are read on (e.g. 60 for UTC+1, -300 for UTC-5). Applied to epoch and zoned timestamps. The zone of the browser or gateway is deliberately not used, so every client shows the same chart. A fixed offset does not follow daylight saving time: for data spanning a DST change, aggregate in the database and bind cells. |
| `weekStart` | string | First day of the week (top row). One of: `monday`, `sunday`. |
| `dayLabels` | array | Seven day labels, always Monday first (weekStart only changes the row order). |
| `hourStep` | integer | Width of a column in hours: 1, 2, 3, 4 or 6. One of: `1`, `2`, `3`, `4`, `6`. |
| `colors` | array | Colour ramp from low to high counts (two or more colours). The default is one hue with rising opacity, so it reads low-to-high on light and dark themes alike. Cells with no events are always drawn in neutral grey, outside this ramp. |
| `showValues` | boolean | Write the count in each cell. Best with larger components or a coarser hourStep. |
| `showTotals` | boolean | Show bars with the total per hour (above) and per day (right). |
| `showLegend` | boolean | Show the colour scale below the chart. |
| `max` | number | Count that gets the last colour of the ramp. 0 = automatic (the largest cell). Set a fixed value to keep colours comparable between periods. |
| `valueLabel` | string | What is being counted, written after values in tooltips and the legend (e.g. alarms, stops, rejects). |
| `title` | string | Chart title. Leave blank for no title. |

Example `cells` (PostgreSQL: `SELECT EXTRACT(isodow FROM t_stamp) AS day, EXTRACT(hour FROM t_stamp) AS hour, COUNT(*) AS value ... GROUP BY 1, 2`):

```json
[
  { "day": 1, "hour": 6, "value": 25 },
  { "day": 1, "hour": 14, "value": 13 },
  { "day": "Fri", "hour": 13, "value": 17 }
]
```

`day` is 1 = Monday .. 7 = Sunday; 0 is also read as Sunday. MySQL `DAYOFWEEK()` and SQL Server `DATEPART(weekday, ...)` number Sunday as 1: use `WEEKDAY(t) + 1` (MySQL) or map the value in the query.

Example `timestamps` with `utcOffsetMinutes: 60`: `[1736143200000, "2025-01-06T07:12:00Z", "2025-01-07T14:03:10+01:00"]`, optionally with `weights` (e.g. downtime minutes) `[12, 3.5, 40]`.

#### 56. Radar Comparison
- **Component ID:** `open.industrial.RadarComparison`
- **Default size:** 560x460
- **Description:** Compares lines, shifts, machines or suppliers across metrics with different units on one radar.

Every axis is scaled to its own range (`min`..`max` of the metric, or derived from the data with 20 % padding when missing), so percentages, rates and durations can share one chart. **Outward is always better:** metrics with `higherIsBetter: false` (scrap, changeover time, energy per unit) are inverted so their lowest value lies on the rim. The range under each axis name is written from the centre value to the rim value. Tooltips show the real values with units, not the normalised positions. An optional `target` is drawn as a dashed outline. A radar needs at least three metrics; with fewer the component shows a notice instead.

| Property | Type | Description |
|----------|------|-------------|
| `metrics` | array | The axes, at least three: { name, min, max, higherIsBetter, unit } (or just a name). Each axis is scaled to its own min..max, so metrics with different units can be compared; values outside the range are drawn at its ends. A missing min or max is taken from the data with some padding. Outward is always better: axes with higherIsBetter false are inverted, so their lowest value is at the rim. unit is written after values. |
| `series` | array | The entities to compare (lines, shifts, machines, suppliers): { name, values }, with values in the same order as metrics, in real units. Extra values are ignored; a missing value is drawn at the centre and shown as a dash in the tooltip. |
| `target` | object | Optional reference drawn as a dashed outline: { name, values, color } with values in the same order as metrics. Leave empty for none. |
| `fill` | boolean | Fill the area of each series (the fill gets lighter as the number of series grows). |
| `shape` | string | Shape of the grid. One of: `polygon`, `circle`. |
| `showRange` | boolean | Write the range of each axis under its name, from the centre value to the rim value. |
| `showLegend` | boolean | Show the legend. |
| `decimals` | integer | Maximum decimal places of values in tooltips and axis ranges (0 to 6). |
| `colors` | array | Series colours in order. Leave empty to use the palette of the theme. |
| `title` | string | Chart title. Leave blank for no title. |

Example:

```json
{
  "metrics": [
    { "name": "OEE", "unit": "%", "min": 40, "max": 100 },
    { "name": "Scrap", "unit": "%", "min": 0, "max": 6, "higherIsBetter": false },
    { "name": "Changeover", "unit": "min", "higherIsBetter": false }
  ],
  "series": [
    { "name": "Line 1", "values": [78, 1.8, 24] },
    { "name": "Line 2", "values": [64, 3.9, 41] }
  ],
  "target": { "name": "Target", "values": [85, 2, 20] }
}
```

---

## Summary Table

| # | Component | ID | Palette | Size |
|---|-----------|-----|---------|------|
| 1 | ECharts Chart | open.echarts.EChart | ECharts | 600x400 |
| 2 | Line Chart | open.echarts.LineChart | ECharts | 600x350 |
| 3 | Bar Chart | open.echarts.BarChart | ECharts | 600x350 |
| 4 | Pie Chart | open.echarts.PieChart | ECharts | 500x400 |
| 5 | Scatter Chart | open.echarts.ScatterChart | ECharts | 600x400 |
| 6 | Effect Scatter Chart | open.echarts.EffectScatterChart | ECharts | 600x400 |
| 7 | Gauge Chart | open.echarts.GaugeChart | ECharts | 400x350 |
| 8 | Funnel Chart | open.echarts.FunnelChart | ECharts | 500x400 |
| 9 | Candlestick Chart | open.echarts.CandlestickChart | ECharts | 700x400 |
| 10 | Boxplot Chart | open.echarts.BoxplotChart | ECharts | 600x400 |
| 11 | Heatmap Chart | open.echarts.HeatmapChart | ECharts | 600x400 |
| 12 | Tree Chart | open.echarts.TreeChart | ECharts | 600x500 |
| 13 | Treemap Chart | open.echarts.TreemapChart | ECharts | 600x500 |
| 14 | Sunburst Chart | open.echarts.SunburstChart | ECharts | 500x500 |
| 15 | Graph Chart | open.echarts.GraphChart | ECharts | 600x500 |
| 16 | Sankey Chart | open.echarts.SankeyChart | ECharts | 600x500 |
| 17 | Radar Chart | open.echarts.RadarChart | ECharts | 500x450 |
| 18 | Parallel Chart | open.echarts.ParallelChart | ECharts | 700x400 |
| 19 | Theme River Chart | open.echarts.ThemeRiverChart | ECharts | 700x400 |
| 20 | Calendar Chart | open.echarts.CalendarChart | ECharts | 800x200 |
| 21 | Pictorial Bar Chart | open.echarts.PictorialBarChart | ECharts | 600x400 |
| 22 | Custom Chart | open.echarts.CustomChart | ECharts | 600x400 |
| 23 | Graphic Chart | open.echarts.GraphicChart | ECharts | 600x400 |
| 24 | Dataset Chart | open.echarts.DatasetChart | ECharts | 600x400 |
| 25 | Map Chart | open.echarts.MapChart | ECharts | 700x500 |
| 26 | Lines Chart | open.echarts.LinesChart | ECharts | 700x500 |
| 27 | Bar 3D Chart | open.echarts.Bar3DChart | ECharts 3D | 700x500 |
| 28 | Line 3D Chart | open.echarts.Line3DChart | ECharts 3D | 700x500 |
| 29 | Scatter 3D Chart | open.echarts.Scatter3DChart | ECharts 3D | 700x500 |
| 30 | Surface Chart | open.echarts.SurfaceChart | ECharts 3D | 700x500 |
| 31 | Map 3D Chart | open.echarts.Map3DChart | ECharts 3D | 700x500 |
| 32 | Globe Chart | open.echarts.GlobeChart | ECharts 3D | 700x600 |
| 33 | Lines 3D Chart | open.echarts.Lines3DChart | ECharts 3D | 700x500 |
| 34 | Polygons 3D Chart | open.echarts.Polygons3DChart | ECharts 3D | 700x500 |
| 35 | Scatter GL Chart | open.echarts.ScatterGLChart | ECharts 3D | 600x400 |
| 36 | Graph GL Chart | open.echarts.GraphGLChart | ECharts 3D | 600x500 |
| 37 | Flow GL Chart | open.echarts.FlowGLChart | ECharts 3D | 700x500 |
| 38 | Industrial Trend | open.industrial.Trend | Industrial | 800x350 |
| 39 | OEE Summary | open.industrial.OEE | Industrial | 400x400 |
| 40 | Pareto Chart | open.industrial.Pareto | Industrial | 700x400 |
| 41 | SPC Chart | open.industrial.SPCChart | Industrial | 800x500 |
| 42 | State Timeline | open.industrial.StateTimeline | Scheduling | 900x300 |
| 43 | Gantt Chart | open.industrial.Gantt | Scheduling | 900x400 |
| 44 | Schedule Calendar | open.industrial.ScheduleCalendar | Scheduling | 900x250 |
| 45 | Shift Calendar | open.industrial.ShiftCalendar | Scheduling | 900x300 |
| 46 | Downtime Tracker | open.industrial.DowntimeTracker | Scheduling | 900x350 |
| 47 | Batch Timeline | open.industrial.BatchTimeline | Scheduling | 900x350 |
| 48 | Resource Heatmap | open.industrial.ResourceHeatmap | Scheduling | 800x400 |
| 49 | Metric Rings | open.industrial.MetricRings | Industrial | 400x400 |
| 50 | Bullet Chart | open.industrial.BulletChart | Industrial | 600x300 |
| 51 | KPI Tile | open.industrial.KpiTile | Industrial | 260x150 |
| 52 | Waterfall Chart | open.industrial.Waterfall | Industrial | 700x400 |
| 53 | Process Capability Histogram | open.industrial.CapabilityHistogram | Industrial | 700x420 |
| 54 | Flow Diagram (Sankey) | open.industrial.FlowDiagram | Industrial | 800x450 |
| 55 | Event Heatmap | open.industrial.EventHeatmap | Industrial | 760x380 |
| 56 | Radar Comparison | open.industrial.RadarComparison | Industrial | 560x460 |
