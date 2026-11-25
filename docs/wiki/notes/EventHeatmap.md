There are two ways to feed the heatmap. Use `timestamps` when you have the raw events, `cells` when the
database does the counting. `cells` is ignored while `timestamps` has entries, so clear the one you do
not use (a freshly dropped component has sample `cells`).

**Raw alarm times from a named query.**

```sql
SELECT eventtime FROM alarm_events
WHERE eventtype = 0 AND eventtime >= :from
```

Bind it to `props.timestamps` (Return Format: dataset) and convert the dates to epoch milliseconds:

```python
def transform(self, value, quality, timestamp):
    return [value.getValueAt(row, 0).getTime() for row in range(value.getRowCount())]
```

Epoch values are instants, so set `utcOffsetMinutes` to the offset of the plant's clock (e.g. `60` for
UTC+1, `-300` for UTC-5); the browser's time zone is deliberately not used.

**Counted by the database.** Let the query group by weekday and hour and bind it to `props.cells`
(PostgreSQL syntax shown; its `DOW` is 0 for Sunday, which the component accepts):

```sql
SELECT EXTRACT(DOW FROM start_time) AS day, EXTRACT(HOUR FROM start_time) AS hour, COUNT(*) AS value
FROM downtime_events
WHERE start_time >= :from
GROUP BY 1, 2
```

```python
def transform(self, value, quality, timestamp):
    return [
        {
            "day": int(value.getValueAt(row, "day")),    # 0 or 7 = Sunday, 1 = Monday
            "hour": int(value.getValueAt(row, "hour")),  # 0..23
            "value": value.getValueAt(row, "value"),
        }
        for row in range(value.getRowCount())
    ]
```

The hours are then whatever the database's clock says, and `utcOffsetMinutes` is not applied.

**Weighted events.** To show lost minutes rather than the number of stops, fill `weights` with one number
per timestamp, in the same order, or use `SUM(minutes) AS value` in the grouped query. Set `valueLabel`
to what is counted (`stops`, `min`, `rejects`).
