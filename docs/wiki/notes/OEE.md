**Three tags.** Bind the factors straight to tags that hold percentages (0-100); OEE is calculated as
A x P x Q:

| Property | Tag binding (example) |
|---|---|
| `props.availability` | `[default]Line1/OEE/Availability` |
| `props.performance` | `[default]Line1/OEE/Performance` |
| `props.quality` | `[default]Line1/OEE/Quality` |

If your tags hold fractions (0.92 rather than 92) use an **Expression** binding instead:
`{[default]Line1/OEE/Availability} * 100`.

**OEE calculated elsewhere.** When an MES already reports OEE, bind `props.oeeOverride` to that tag; the
OEE ring then shows it instead of the product. Leave it `null` to calculate.

**From a named query.** A query that returns one row, e.g.
`SELECT availability, performance, quality FROM oee_shift WHERE line = :line AND shift_id = :shift`,
bound to a custom property of the view (`view.custom.oee`, Return Format: json) gives a list with one
row object. Put a **Property** binding to `view.custom.oee` on each factor, with a transform that picks
its column:

```python
def transform(self, value, quality, timestamp):
    # value: view.custom.oee, a list with one row object
    return value[0]["availability"] if value else None
```

**Target and traffic-light colours.** Type these in the Property Editor; they rarely need a binding:
`target`: `85`, and `thresholds`:

```json
[{ "upTo": 60, "color": "#e05252" }, { "upTo": 85, "color": "#e6a23c" }, { "color": "#3ba272" }]
```
