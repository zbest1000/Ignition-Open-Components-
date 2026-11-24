`values` is a plain list of measurements; `lsl`, `usl` and `target` are the specification.

**Measurements from a named query.**

```sql
SELECT diameter FROM part_measurements
WHERE part_no = :part AND measured_at >= :from
ORDER BY measured_at
```

Bind it to `props.values` (Return Format: dataset):

```python
def transform(self, value, quality, timestamp):
    return [
        value.getValueAt(row, "diameter")
        for row in range(value.getRowCount())
        if value.getValueAt(row, "diameter") is not None
    ]
```

Keep the `ORDER BY`: with `sigmaMethod` set to `"within"` (Cp / Cpk) the variation is estimated from
consecutive values, so they must be in time order. `"overall"` (Pp / Ppk) does not depend on the order.

**Specification from tags or a recipe.** Bind `props.lsl`, `props.usl` and `props.target` to the tags
that hold the limits of the running product, e.g. `[default]Lathe3/Recipe/DiameterLSL`. For a one-sided
specification leave the other limit `null`.

Set `unit` to the unit of the measurements and `decimals` to their resolution.
