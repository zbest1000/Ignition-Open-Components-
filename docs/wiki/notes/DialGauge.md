**One tag.** Bind `props.value` to the tag; nothing else needs a binding:

| Property | Binding (example) |
|---|---|
| `props.value` | Tag binding: `[default]Pump7/Bearing/Temperature` |
| `props.target` | Tag binding: `[default]Pump7/Bearing/TempHighSP` (or type a number, or `null` for no marker) |

A value that is not a number (a bad-quality tag that yields `null`) draws an empty dial with a dash.

**Scale from the tag's engineering range.** Bind `props.min` and `props.max` to the tag's `engLow` and
`engHigh` properties (`[default]Pump7/Bearing/Temperature.engLow`), and `props.unit` to
`[default]Pump7/Bearing/Temperature.engUnit`, so the dial follows the tag configuration.

**Stages.** `stages` colours the dial by value bands and is usually typed. Each stage ends at its
`upTo`; the last one, without `upTo`, takes everything above:

```json
[
  { "upTo": 80, "color": "#3ba272", "name": "Normal" },
  { "upTo": 100, "color": "#e6a23c", "name": "High" },
  { "color": "#e05252", "name": "Critical" }
]
```

To follow alarm setpoints, bind `props.stages[0].upTo` and `props.stages[1].upTo` to the setpoint tags.

**Looks.** `variant` chooses the dial: `progress` (a filled arc), `stages` (a coloured band with a
needle), `grade` (a thin band with the stage names) or `minimal` (arc and value only, for small tiles).
