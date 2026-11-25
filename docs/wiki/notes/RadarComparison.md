`metrics` are the axes and are usually typed once; `series` holds one object per line, shift or machine
with its `values` in the same order as `metrics`.

**Lines compared on KPIs from a named query.** With the axes typed as

```json
[
  { "name": "OEE", "unit": "%", "min": 40, "max": 100 },
  { "name": "Throughput", "unit": "u/h", "min": 600, "max": 1400 },
  { "name": "Scrap", "unit": "%", "min": 0, "max": 6, "higherIsBetter": false }
]
```

a query that returns one row per line with a column per metric

```sql
SELECT line, oee, throughput, scrap FROM line_kpis WHERE shift_id = :shift ORDER BY line
```

is bound to `props.series` (Return Format: dataset) with this transform. The column order in the list
must match the order of `metrics`:

```python
def transform(self, value, quality, timestamp):
    columns = ["oee", "throughput", "scrap"]
    return [
        {
            "name": str(value.getValueAt(row, "line")),
            "values": [value.getValueAt(row, col) for col in columns],
        }
        for row in range(value.getRowCount())
    ]
```

**Target outline.** Set `target` to `{ "name": "Target", "values": [85, 1200, 2] }`, or bind
`props.target.values` to a query or tags that hold the targets.

**Lower is better.** Give such an axis `"higherIsBetter": false` (scrap, changeover time, energy per
unit): outward is then always the better direction on every axis.
