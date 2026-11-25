Every component emits the same seven events. In the Designer, right-click the component, choose
**Configure Events**, and add a **Script** action under the component event you want. The script receives
the payload as `event`:

```python
def runAction(self, event):
    system.perspective.print(event.name)
```

Payloads contain only the fields listed here, as plain values. A field is left out when ECharts does not
supply it for the element in question, so read optional fields defensively (see the examples).

## Mouse events

`onClick`, `onDoubleClick`, `onMouseOver` and `onMouseOut` fire for chart elements (a bar, a point, a pie
slice, a graph node) and share one payload:

| Field | Type | Meaning |
|---|---|---|
| `componentType` | string | ECharts component the element belongs to, e.g. `series`, `markPoint`, `xAxis` |
| `seriesType` | string | Series type, e.g. `bar`, `line`, `pie` (when `componentType` is `series`) |
| `seriesIndex` | integer | Index of the series in `option.series` |
| `seriesName` | string | Name of the series |
| `name` | string | Name of the data item, or the category name |
| `dataIndex` | integer | Index of the data item within the series |
| `data` | any | The raw data item as given in the option. For tree, treemap and sunburst nodes it comes without its `children` |
| `dataType` | string | For series with more than one kind of data, which one: `node` or `edge` in a graph |
| `value` | any | Value of the item: a number, or a list for multi-dimensional data |
| `color` | any | Colour of the item: a CSS colour string, or a gradient object |
| `percent` | number | Share of the total in percent (pie, funnel and similar series) |

**Example: remember what was clicked.** On a bar chart of downtime reasons, store the clicked reason in a
view custom property that other components are bound to:

```python
def runAction(self, event):
    # event.name is the category under the clicked bar, event.value its number
    self.view.custom.selectedReason = event.name
    system.perspective.print("clicked %s = %s (series %s)" % (event.name, event.value, event.seriesName))
```

**Example: only react to data points.** A click can also land on a mark line or an axis label when those
are set to trigger events:

```python
def runAction(self, event):
    if event.componentType != "series":
        return
    self.custom.lastPoint = {"series": event.seriesIndex, "index": event.dataIndex}
```

`self.custom` is the clicked component's own custom properties; `self.view.custom` belongs to the view.

## onLegendSelectChanged

Fires when a legend item is toggled.

| Field | Type | Meaning |
|---|---|---|
| `name` | string | Name of the legend item that was toggled |
| `selected` | object | Selected state of every legend item, keyed by name: `{ "Line 1": true, "Line 2": false }` |

```python
def runAction(self, event):
    visible = [name for name in event.selected.keys() if event.selected[name]]
    self.view.custom.visibleSeries = visible
```

## onDataZoom

Fires when the zoom range changes (slider, mouse wheel or drag).

| Field | Type | Meaning |
|---|---|---|
| `start`, `end` | number | Zoom window in percent (0-100) |
| `startValue`, `endValue` | number / string | Zoom window as axis values; only present when the zoom was set by value |
| `dataZoomId` | string | Id of the `dataZoom` component that changed |
| `batch` | list | One entry with the same fields per `dataZoom` component, when the change came from a mouse or touch zoom or a dispatched action. The top-level fields may then be absent |

```python
def runAction(self, event):
    zoom = event.batch[0] if "batch" in event.keys() and len(event.batch) > 0 else event
    self.view.custom.zoom = {"start": zoom.start, "end": zoom.end}
```

Binding another chart's `option.dataZoom[0].start` / `.end` to that custom property keeps two charts on
the same window.

## onBrushSelected

Fires when a brush selection changes, at most once per 100 ms while the brush moves, with the latest
selection.

| Field | Type | Meaning |
|---|---|---|
| `batch` | list | One entry per brush component |
| `batch[].brushId`, `brushIndex`, `brushName` | string / integer / string | Which brush component |
| `batch[].areas` | list | The brushed areas: brush type, range and coordinate range of each |
| `batch[].selected` | list | Per series: `seriesIndex`, `seriesName`, `dataIndex` (indices of the items inside the areas, at most the first 1000) and `dataIndexCount` (the total, larger than the list when it was cut) |

```python
def runAction(self, event):
    for series in event.batch[0].selected:
        system.perspective.print("%s: %d points selected" % (series.seriesName, series.dataIndexCount))
```

## Notes

- `onMouseOver` and `onMouseOut` fire often. Keep their scripts light, or prefer `onClick`.
- Event payloads travel from the browser to the gateway. That is why they are limited to documented
  fields and why the large parts are bounded.
- Tooltips, highlighting and zooming happen in the browser without any event script.
