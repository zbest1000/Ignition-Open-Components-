`categories` and `counts` are two lists of the same length. The component sorts the bars itself, so the
query does not need an `ORDER BY`.

**Downtime reasons from a named query.** Bind the query once to a custom property of the view
(`view.custom.reasons`, Return Format: dataset):

```sql
SELECT reason, COUNT(*) AS stops
FROM downtime_events
WHERE line = :line AND start_time >= :from
GROUP BY reason
```

Then put a **Property** binding to `view.custom.reasons` on each of the two props, with these transforms.

`props.categories`:

```python
def transform(self, value, quality, timestamp):
    return [str(value.getValueAt(row, "reason")) for row in range(value.getRowCount())]
```

`props.counts`:

```python
def transform(self, value, quality, timestamp):
    return [value.getValueAt(row, "stops") for row in range(value.getRowCount())]
```

To rank by lost minutes instead of the number of stops, select `SUM(minutes)` and set `barLabel` to
`"Minutes"`.

**From counter tags.** For a fixed set of reject causes kept in tags, leave `categories` as typed and
bind each element of `counts` (`props.counts[0]`, `props.counts[1]`, ...) to its counter tag.
