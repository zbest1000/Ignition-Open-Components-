**Value and comparison from tags.**

| Property | Binding (example) |
|---|---|
| `props.value` | Tag binding: `[default]Line1/Production/RatePerHour` |
| `props.previous` | Tag binding: `[default]Line1/Production/RatePerHourLastShift` |
| `props.target` | Tag binding: `[default]Line1/Production/RateTarget` |

The change is measured against `previous`; when `previous` is `null` it is measured against `target`.
For a KPI where lower is better (scrap, downtime, energy) set `higherIsBetter` to `false`.

**Sparkline from tag history.** Put a **Tag History** binding on `props.history` (the same tag, for
example the last 8 hours with about 50 points) and add this transform. The list must be oldest first,
which is the order tag history returns:

```python
def transform(self, value, quality, timestamp):
    # value: dataset from the Tag History binding: t_stamp, then the tag's column
    return [
        value.getValueAt(row, 1)
        for row in range(value.getRowCount())
        if value.getValueAt(row, 1) is not None
    ]
```

When `value` is `null` the tile shows the last point of `history`, so a tile can be driven by the
history binding alone.

**Hourly totals from a named query.** A query returning one row per hour
(`SELECT hour_start, good_count FROM hourly_production ... ORDER BY hour_start`) bound to
`props.history` uses the same transform with `"good_count"` as the column.
