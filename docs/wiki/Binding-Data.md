A chart shows what is in its props. To show live data you bind the parts of the props that hold data and
leave the rest (axes, colours, titles) as static configuration.

- On an **option component** the data is inside `option`, for example `props.option.series[0].data`.
  Expand `option` in the Property Editor down to that property and put the binding there.
- On a **domain component** (Industrial, Scheduling) the data is in props of its own, such as
  `props.values` or `props.events`. Each component's page lists them with worked examples.

Binding only the data keeps updates small. Binding the whole `option` works too and is the right choice
when the structure of the chart changes with the data ([see below](#building-the-whole-option-in-a-script)).

## The shapes ECharts expects

| Where | Shape | Example |
|---|---|---|
| `xAxis.data` (category axis) | list of labels | `["Mon", "Tue", "Wed"]` |
| `series[n].data` on a category axis | list of numbers, one per label | `[120, 200, 150]` |
| `series[n].data` on a time or value axis | list of `[x, y]` rows; time as epoch milliseconds | `[[1735718400000, 30.0], [1735718700000, 31.8]]` |
| `series[n].data` of a pie, funnel, treemap | list of objects | `[{ "name": "Good", "value": 90 }, { "name": "Scrap", "value": 10 }]` |
| `series[n].data[0].value` of a gauge | a number | `72.4` |
| `dataset.source` | table: list of rows, header row first | `[["shift", "good", "scrap"], ["A", 410, 12], ["B", 388, 9]]` |

Times are safest as epoch milliseconds (a plain number). In a script, `someDate.getTime()` or
`system.date.toMillis(someDate)` gives that number.

## A single value from a tag

A gauge needs one number. Put a **Tag** binding on `props.option.series[0].data[0].value` and select the
tag. No transform is needed. An **Expression** binding does the same with scaling, e.g.
`{[default]Line1/Speed} / 60`.

The same goes for any single number or text in an option: an axis `max`, a `markLine` position, a title.

## Tag history as a time series

1. Give the chart a time axis: `"xAxis": { "type": "time" }`, and a series without data:
   `"series": [{ "type": "line", "showSymbol": false, "data": [] }]`.
2. Put a **Tag History** binding on `props.option.series[0].data`: choose the tag and a time range. Keep
   the number of returned points near what the chart can show (a few hundred to a few thousand).
3. Add a **Script** transform that turns the dataset into `[time, value]` rows:

```python
def transform(self, value, quality, timestamp):
    # value: dataset from the Tag History binding: t_stamp, then one column per tag
    return [
        [value.getValueAt(row, 0).getTime(), value.getValueAt(row, 1)]
        for row in range(value.getRowCount())
        if value.getValueAt(row, 1) is not None
    ]
```

For several tags, add one series per tag and bind each `series[n].data` the same way, reading column
`n + 1`.

## A named query as categories and values

A query such as

```sql
SELECT reason, COUNT(*) AS stops FROM downtime_events
WHERE start_time >= :from GROUP BY reason ORDER BY stops DESC
```

feeds two properties: the labels and the numbers. Running it twice (one binding per property) works but
doubles the load. Run it once instead:

1. Add a custom property to the view, e.g. `view.custom.reasons`, and put the **Query** binding on it
   (Return Format: dataset).
2. Bind `props.option.xAxis.data` with a **Property** binding to `view.custom.reasons` and this transform:

```python
def transform(self, value, quality, timestamp):
    return [str(value.getValueAt(row, "reason")) for row in range(value.getRowCount())]
```

3. Bind `props.option.series[0].data` the same way with:

```python
def transform(self, value, quality, timestamp):
    return [value.getValueAt(row, "stops") for row in range(value.getRowCount())]
```

For a pie, one binding on `series[0].data` is enough:

```python
def transform(self, value, quality, timestamp):
    return [
        {"name": str(value.getValueAt(row, "reason")), "value": value.getValueAt(row, "stops")}
        for row in range(value.getRowCount())
    ]
```

## One binding for several series: `dataset`

With an ECharts `dataset`, one table feeds every series and the axis, so a single binding is enough.
Static part of the option:

```json
{
  "dataset": { "source": [] },
  "xAxis": { "type": "category" },
  "yAxis": {},
  "legend": {},
  "series": [{ "type": "bar" }, { "type": "bar" }]
}
```

Bind `props.option.dataset.source` to a query that returns the label column first and one numeric column
per series, with this transform:

```python
def transform(self, value, quality, timestamp):
    columns = list(value.getColumnNames())
    rows = [columns]  # the header row names the series
    for row in range(value.getRowCount()):
        rows.append([value.getValueAt(row, col) for col in range(len(columns))])
    return rows
```

The [Dataset Chart](Dataset-Chart) component starts with an option of this kind.

## Building the whole option in a script

When the number of series depends on the data, build the option in one place. Bind `props.option` to the
data and return a dictionary from the transform:

```python
def transform(self, value, quality, timestamp):
    # value: dataset with columns line, hour, units
    lines, hours, cells = [], [], {}
    for row in range(value.getRowCount()):
        line, hour = str(value.getValueAt(row, "line")), str(value.getValueAt(row, "hour"))
        if line not in lines:
            lines.append(line)
        if hour not in hours:
            hours.append(hour)
        cells[(line, hour)] = value.getValueAt(row, "units")
    return {
        "tooltip": {"trigger": "axis"},
        "legend": {},
        "xAxis": {"type": "category", "data": hours},
        "yAxis": {"type": "value", "name": "units"},
        "series": [
            {"type": "line", "name": line, "data": [cells.get((line, hour)) for hour in hours]}
            for line in lines
        ],
    }
```

Keep such a function in a project library script when several views use it.

If part of the data comes from people or systems you do not fully trust, this is also the safe pattern:
the script fixes the structure and inserts only data values. See [Security](Security).

## How updates are applied

Two props control what happens when a bound value changes.

| Prop | Default | Effect |
|---|---|---|
| `notMerge` | `false` | `false`: the new option is merged into the chart, except `series`, which is replaced, so a series you remove disappears. `true`: every update replaces the whole option. |
| `lazyUpdate` | `true` | The update is applied on the next animation frame; of several changes within one frame only the latest is drawn (in a background tab, after 500 ms). `false` applies every change immediately. |

Leave both at their defaults for charts that update often. Set `notMerge` to `true` when an update should
start from scratch, for example when the same component switches between unrelated options and parts of
the old one (an extra axis, a `visualMap`) must not linger.

## Keeping it fast

- Bind data, not configuration. With `sanitizeTooltip` on, the option is scanned on every change; rows of
  plain values such as `[x, y]` and `dataset.source` are skipped, static configuration is not.
- Limit points at the source: a tag history binding that returns a fixed number of points, or an
  aggregating query, is better than sending everything to the browser.
- For long line series set `"sampling": "lttb"` on the series; for very large scatter data `"large": true`.
- Give users a `dataZoom` rather than a longer time range.
- Charts in the *ECharts 3D* group download ECharts-GL the first time one is shown and need WebGL;
  keep their number per view small.

More detail: [docs/PERFORMANCE.md](https://github.com/zbest1000/Ignition-Open-Components-/blob/main/docs/PERFORMANCE.md) in the repository.
