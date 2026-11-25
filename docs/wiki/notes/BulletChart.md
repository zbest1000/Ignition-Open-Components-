`items` is a list with one object per bullet: `name`, `value` and `target`; `max`, `ranges` and `color`
are optional.

**Production against plan from a named query.**

```sql
SELECT line AS name, SUM(good_count) AS value, MAX(planned_count) AS target
FROM shift_production
WHERE shift_id = :shift
GROUP BY line ORDER BY line
```

Bind it to `props.items` (Return Format: dataset) with this transform:

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

**A fixed set of lines from tags.** Type the items and their targets, then bind each
`props.items[n].value` to the line's counter tag, e.g. `[default]Line1/Production/GoodCount`.

**Items with different units.** Set `percentOfTarget` to `true`: every bar is drawn as a percentage of
its own target, so all targets line up, while the labels keep the real values.

**Status colours.** Set `statusColors` to `["#e05252", "#e6a23c", "#3ba272"]` to colour each bar by the
band its value falls in (the bands are set by `ranges`, in percent of the target).
