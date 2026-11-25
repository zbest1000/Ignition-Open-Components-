The trend reads everything from `data`: `pvData` (process value) and `spData` (setpoint) are lists of
`[time, value]` pairs with the time in epoch milliseconds, oldest first. Lists of objects work too; the
keys are then named by `data.timeField` / `data.valueField` (defaults `"t"` and `"v"`).

**Process value from tag history.** Put a **Tag History** binding on `props.data.pvData` (one tag, a
time range such as the last 8 hours, a sample size your screen can show) and add this script transform:

```python
def transform(self, value, quality, timestamp):
    # value: dataset from the Tag History binding: t_stamp, then the tag's column
    return [
        [value.getValueAt(row, 0).getTime(), value.getValueAt(row, 1)]
        for row in range(value.getRowCount())
        if value.getValueAt(row, 1) is not None
    ]
```

Do the same for the setpoint tag on `props.data.spData`, or set `showSetpoint` to `false`.

**Process value from a named query.** A query such as
`SELECT t_stamp, temperature FROM furnace_log WHERE t_stamp > :start ORDER BY t_stamp` bound to
`props.data.pvData` (Return Format: dataset) uses the same transform.

**Alarm limits from tags.** Bind each limit straight to its tag, no transform needed:

| Property | Tag binding (example) |
|---|---|
| `props.limits.hiAlarm` | `[default]Furnace1/Temperature/HiAlarmSP` |
| `props.limits.hiWarning` | `[default]Furnace1/Temperature/HiWarnSP` |
| `props.limits.loWarning` | `[default]Furnace1/Temperature/LoWarnSP` |
| `props.limits.loAlarm` | `[default]Furnace1/Temperature/LoAlarmSP` |

A limit that is `null` (or missing) draws no line. Set `yAxisLabel` to the engineering unit, e.g. `°C`.
