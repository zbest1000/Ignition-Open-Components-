`events` is a list of `{ equipment, start, end, category }` objects with the times in epoch
milliseconds. Each `equipment` becomes a row and each `category` a colour.

**Downtime log from a named query.**

```sql
SELECT equipment, category, reason, start_time, COALESCE(end_time, CURRENT_TIMESTAMP) AS end_time
FROM downtime_events
WHERE start_time >= :from
ORDER BY equipment, start_time
```

Bind it to `props.events` (Return Format: dataset):

```python
def transform(self, value, quality, timestamp):
    return [
        {
            "equipment": str(value.getValueAt(row, "equipment")),
            "category": str(value.getValueAt(row, "category")),
            "reason": str(value.getValueAt(row, "reason")),
            "start": value.getValueAt(row, "start_time").getTime(),
            "end": value.getValueAt(row, "end_time").getTime(),
        }
        for row in range(value.getRowCount())
    ]
```

`reason` is carried along but not drawn. To react to a click on a bar, use the `onClick` event; [Events](Events)
lists what its payload contains.

**Colours per category.** Type `categoryColors`, e.g.
`{ "Mechanical": "#e05252", "Electrical": "#e6a23c", "Changeover": "#5470c6", "Material": "#73c0de" }`.
Categories not listed keep the built-in colours.

`showSummary` writes the total downtime under the title.
