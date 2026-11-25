`values` is a plain list of measurements in time order, oldest first. The component calculates the
centre line and control limits itself.

**Last 50 measurements from a named query.**

```sql
SELECT diameter FROM (
    SELECT TOP 50 diameter, measured_at FROM part_measurements
    WHERE part_no = :part ORDER BY measured_at DESC
) latest ORDER BY measured_at
```

(`TOP 50` is SQL Server syntax; other databases use `LIMIT 50` at the end of the inner query.)
Bind it to `props.values` (Return Format: dataset) with this transform:

```python
def transform(self, value, quality, timestamp):
    return [
        value.getValueAt(row, "diameter")
        for row in range(value.getRowCount())
        if value.getValueAt(row, "diameter") is not None
    ]
```

**From tag history.** A **Tag History** binding on `props.values` for the measurement tag works with the
same idea; the value is in the second column:

```python
def transform(self, value, quality, timestamp):
    return [value.getValueAt(row, 1) for row in range(value.getRowCount())]
```

**Subgroups.** For an X-bar & R chart set `subgroupSize` to the number of parts measured per sample
(2-10); consecutive values are grouped, so the list must hold whole subgroups in order.
