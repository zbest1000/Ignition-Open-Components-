The calendar is built from three small props that are normally typed rather than bound:

- `patterns`: the shift patterns, each with the weekdays it works (0 = Sunday .. 6 = Saturday);
- `crews`: which crew works which pattern;
- `dateRange`: the first and last day shown, as `YYYY-MM-DD` strings.

**A rolling four-week window.** Bind `props.dateRange` with an **Expression** binding and this script
transform (the expression only supplies the current time):

Expression: `now(0)`

```python
def transform(self, value, quality, timestamp):
    start = system.date.midnight(value)
    end = system.date.addDays(start, 27)
    return [system.date.format(start, "yyyy-MM-dd"), system.date.format(end, "yyyy-MM-dd")]
```

**Crews from a named query.** When crew assignments live in a table
(`SELECT crew_name, pattern_name FROM crew_assignments`), bind it to `props.crews`
(Return Format: dataset):

```python
def transform(self, value, quality, timestamp):
    return [
        {"crew": str(value.getValueAt(row, "crew_name")), "pattern": str(value.getValueAt(row, "pattern_name"))}
        for row in range(value.getRowCount())
    ]
```

Each `pattern` must be the `name` of an entry in `patterns`.
