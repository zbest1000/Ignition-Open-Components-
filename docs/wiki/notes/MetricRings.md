`metrics` is a list with one object per ring, outermost first. Only `name` and `value` are needed.

**One tag per ring.** Type the metrics in the Property Editor (or paste the JSON below onto `metrics`),
then bind each `value` to its tag: `props.metrics[0].value`, `props.metrics[1].value`, ...

```json
[
  { "name": "Power", "value": 0, "target": 80 },
  { "name": "Steam", "value": 0, "target": 75 },
  { "name": "Chilled water", "value": 0, "target": 70 }
]
```

| Property | Tag binding (example) |
|---|---|
| `props.metrics[0].value` | `[default]Utilities/Power/LoadPct` |
| `props.metrics[1].value` | `[default]Utilities/Steam/LoadPct` |
| `props.metrics[2].value` | `[default]Utilities/ChilledWater/LoadPct` |

**Rings on different scales.** Give a metric its own `min`, `max` and `unit`, e.g. tank levels in litres:

```json
[
  { "name": "Tank 1", "value": 8200, "max": 12000, "unit": "L" },
  { "name": "Tank 2", "value": 3100, "max": 5000, "unit": "L" }
]
```

Set `summary` to `"none"` or type a `centerValue` when an average of such values would mean nothing.

**All rings from a named query.** For a variable number of rings, bind `props.metrics` to a query that
returns `name`, `value` and `target` columns (Return Format: dataset):

```python
def transform(self, value, quality, timestamp):
    return [
        {
            "name": str(value.getValueAt(row, "name")),
            "value": value.getValueAt(row, "value"),
            "target": value.getValueAt(row, "target"),
        }
        for row in range(value.getRowCount())
    ]
```
