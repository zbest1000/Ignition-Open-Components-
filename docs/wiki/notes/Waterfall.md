`steps` is an ordered list of objects. A step with `"type": "total"` and a `value` sets the opening
total; steps without a type add their `value` (negative for a loss); `"type": "subtotal"` and a closing
`"type": "total"` without a value show the running total.

**Where the shift's time went, from a named query.** The query returns the losses in the order they
should appear:

```sql
SELECT loss_category AS name, SUM(minutes) AS minutes
FROM shift_losses WHERE shift_id = :shift
GROUP BY loss_category ORDER BY MIN(sort_order)
```

Bind it to `props.steps` (Return Format: dataset). The transform adds the opening and closing totals:

```python
def transform(self, value, quality, timestamp):
    steps = [{"name": "Planned time", "value": 480, "type": "total"}]
    for row in range(value.getRowCount()):
        steps.append({
            "name": str(value.getValueAt(row, "name")),
            "value": -abs(value.getValueAt(row, "minutes")),  # losses go down
        })
    steps.append({"name": "Productive time", "type": "total"})
    return steps
```

Replace the fixed `480` with a view parameter or a tag read when the planned time varies. Set `unit` to
the unit of the values (`min`, `kWh`, `EUR`).

**Budget against actual.** The same shape works for a variance bridge: an opening total (`Budget`),
positive and negative deltas, and a closing total (`Actual`). Set `orientation` to `"horizontal"` when
the step names are long.
