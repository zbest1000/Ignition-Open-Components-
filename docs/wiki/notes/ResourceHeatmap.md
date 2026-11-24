Three props belong together: `resources` (the rows), `timeSlots` (the columns) and `utilization`, a
matrix with one list per resource holding one number per time slot.

**Utilisation per line and hour from a named query.** Bind the query once to a custom property of the
view (`view.custom.util`, Return Format: dataset):

```sql
SELECT line, hour_label, utilization_pct
FROM hourly_utilization
WHERE day = :day
ORDER BY line, hour_label
```

Then put a **Property** binding to `view.custom.util` on each prop. A shared helper in a project
library script (here `charts.pivot`) keeps the three transforms in step:

```python
# Project library script "charts"
def pivot(ds, rowCol, colCol, valueCol):
    rows, cols, cells = [], [], {}
    for r in range(ds.getRowCount()):
        row, col = str(ds.getValueAt(r, rowCol)), str(ds.getValueAt(r, colCol))
        if row not in rows:
            rows.append(row)
        if col not in cols:
            cols.append(col)
        cells[(row, col)] = ds.getValueAt(r, valueCol)
    matrix = [[cells.get((row, col), 0) for col in cols] for row in rows]
    return rows, cols, matrix
```

| Property | Script transform body |
|---|---|
| `props.resources` | `return charts.pivot(value, "line", "hour_label", "utilization_pct")[0]` |
| `props.timeSlots` | `return charts.pivot(value, "line", "hour_label", "utilization_pct")[1]` |
| `props.utilization` | `return charts.pivot(value, "line", "hour_label", "utilization_pct")[2]` |

Set `maxValue` to the top of the scale: `100` for percent, or the shift length when the cells hold minutes.
