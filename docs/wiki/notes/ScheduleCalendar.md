`entries` is a list of `{ date, shift }` objects with `date` as a `YYYY-MM-DD` string; `year` selects the
period, a year (`"2025"`) or a month (`"2025-03"`).

**Shift plan from a named query.**

```sql
SELECT shift_date, shift_name, crew FROM shift_plan
WHERE shift_date BETWEEN :from AND :to
ORDER BY shift_date
```

Bind it to `props.entries` (Return Format: dataset). The transform formats the date as the string the
component expects:

```python
def transform(self, value, quality, timestamp):
    return [
        {
            "date": system.date.format(value.getValueAt(row, "shift_date"), "yyyy-MM-dd"),
            "shift": str(value.getValueAt(row, "shift_name")),
            "crew": str(value.getValueAt(row, "crew")),
        }
        for row in range(value.getRowCount())
    ]
```

**Always the current year or month.** Bind `props.year` with an **Expression** binding:
`dateFormat(now(0), "yyyy")` for the year, `dateFormat(now(0), "yyyy-MM")` for the month. A blank `year`
also means the current year.

**Colours per shift.** Type `shiftColors`, e.g. `{ "Day": "#5470c6", "Night": "#3a3f6b", "Off": "#e0e0e0" }`.
