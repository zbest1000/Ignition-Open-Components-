`phases` is a list of `{ batch, phase, start, end }` objects with the times in epoch milliseconds. Each
`batch` becomes a row and each `phase` a colour.

**Batch records from a named query.**

```sql
SELECT batch_id, phase_name, phase_start, COALESCE(phase_end, CURRENT_TIMESTAMP) AS phase_end
FROM batch_phases
WHERE batch_id IN (SELECT TOP 5 batch_id FROM batches WHERE unit = :unit ORDER BY started_at DESC)
ORDER BY batch_id, phase_start
```

Bind it to `props.phases` (Return Format: dataset):

```python
def transform(self, value, quality, timestamp):
    return [
        {
            "batch": str(value.getValueAt(row, "batch_id")),
            "phase": str(value.getValueAt(row, "phase_name")),
            "start": value.getValueAt(row, "phase_start").getTime(),
            "end": value.getValueAt(row, "phase_end").getTime(),
        }
        for row in range(value.getRowCount())
    ]
```

**Colours per phase.** Type `phaseColors`, e.g.
`{ "Charge": "#5470c6", "Heat": "#e05252", "React": "#e6a23c", "Cool": "#73c0de", "Transfer": "#3ba272" }`.
Use the same names as the query returns; phases not listed keep the built-in colours.
