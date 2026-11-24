`flows` is a list of `{ source, target, value }` rows; the nodes are created from the names used in it.
A node that appears as a `target` in one row and as a `source` in another sits in the middle of the diagram.

**Energy balance from a named query.**

```sql
SELECT from_node, to_node, SUM(kwh) / 1000.0 AS mwh
FROM energy_flows
WHERE day = :day
GROUP BY from_node, to_node
```

Bind it to `props.flows` (Return Format: dataset):

```python
def transform(self, value, quality, timestamp):
    return [
        {
            "source": str(value.getValueAt(row, "from_node")),
            "target": str(value.getValueAt(row, "to_node")),
            "value": value.getValueAt(row, "mwh"),
        }
        for row in range(value.getRowCount())
    ]
```

Rows with the same source and target are added up, and rows whose value is not a positive number are
skipped, so the query needs no special cases for idle meters.

**A fixed diagram fed by meters.** Type the flows once and bind each `props.flows[n].value` to its
meter tag, e.g. `[default]Energy/Grid/ImportMWhToday`.

**Material yield.** The same shape shows where material goes: `Raw material -> Good product`,
`Raw material -> Scrap`, `Scrap -> Regrind`. Set `unit` to `t` or `pcs`.

Colours and display names of individual nodes are set in `nodes`
(`{ "name": "Losses", "color": "#9aa0a6" }`); they are usually typed, not bound.
