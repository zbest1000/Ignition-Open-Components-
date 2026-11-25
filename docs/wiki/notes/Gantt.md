`tasks` is a list of `{ name, start, end }` objects with the times in epoch milliseconds; `progress`
(0-100), `category`, `color` and `milestone` are optional.

**Work orders from a named query.**

```sql
SELECT order_no, planned_start, planned_end, percent_complete, work_center
FROM work_orders
WHERE planned_end >= :from AND planned_start <= :to
ORDER BY planned_start
```

Bind it to `props.tasks` (Return Format: dataset):

```python
def transform(self, value, quality, timestamp):
    return [
        {
            "name": str(value.getValueAt(row, "order_no")),
            "start": value.getValueAt(row, "planned_start").getTime(),
            "end": value.getValueAt(row, "planned_end").getTime(),
            "progress": value.getValueAt(row, "percent_complete"),
            "category": str(value.getValueAt(row, "work_center")),
        }
        for row in range(value.getRowCount())
    ]
```

**Milestones.** A row with `"milestone": true` is drawn as a marker at its `start` (a delivery date, an
inspection); add such rows in the transform or with a `UNION` in the query.

Set `showProgress` to `false` when the schedule has no completion figures.
