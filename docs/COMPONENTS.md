# Open ECharts — Component Reference

Component reference for the **Open ECharts** Ignition Perspective module: 48 chart components built on Apache ECharts 6.1.0 and ECharts-GL 2.1.0.

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
- **Description:** Overall Equipment Effectiveness gauge with A/P/Q inputs.

| Property | Type | Description |
|----------|------|-------------|
| `availability` | number | Availability in percent (0-100). |
| `performance` | number | Performance in percent (0-100). |
| `quality` | number | Quality in percent (0-100). |
| `oeeOverride` | number / null | Overrides the calculated OEE, in percent; clamped to 0-100. When null, OEE is computed as A*P*Q/10000. |
| `showLabels` | boolean | Show A/P/Q/OEE labels on the gauge. |

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
