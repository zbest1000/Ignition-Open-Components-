`events` is a list of `{ lane, start, end, state }` objects, with `start` and `end` in epoch
milliseconds. Each `lane` becomes a row.

**Machine states from a named query.**

```sql
SELECT machine, state, start_time, COALESCE(end_time, CURRENT_TIMESTAMP) AS end_time
FROM machine_states
WHERE start_time >= :from
ORDER BY machine, start_time
```

Bind it to `props.events` (Return Format: dataset):

```python
def transform(self, value, quality, timestamp):
    return [
        {
            "lane": str(value.getValueAt(row, "machine")),
            "state": str(value.getValueAt(row, "state")),
            "start": value.getValueAt(row, "start_time").getTime(),
            "end": value.getValueAt(row, "end_time").getTime(),
        }
        for row in range(value.getRowCount())
    ]
```

The `COALESCE` gives the state that is still running an end time, so it is drawn up to now.

**Colours per state.** Type `stateColors`; states not listed keep the built-in colours:

```json
{ "Running": "#3ba272", "Idle": "#e6a23c", "Faulted": "#e05252", "Maintenance": "#73c0de" }
```

**States from a tag's history.** For a state tag stored in the historian, query its history (a **Tag
History** binding, or `system.tag.queryTagHistory` in a script) and turn each change into an event that
ends where the next one starts:

```python
def transform(self, value, quality, timestamp):
    # value: dataset from a Tag History binding on a state tag: t_stamp, state
    names = {0: "Stopped", 1: "Running", 2: "Faulted"}
    events = []
    for row in range(value.getRowCount()):
        start = value.getValueAt(row, 0).getTime()
        last = row == value.getRowCount() - 1
        end = system.date.toMillis(system.date.now()) if last else value.getValueAt(row + 1, 0).getTime()
        events.append({
            "lane": "Filler",
            "state": names.get(value.getValueAt(row, 1), "Unknown"),
            "start": start,
            "end": end,
        })
    return events
```
