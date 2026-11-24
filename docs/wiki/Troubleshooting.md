## Installing

| Symptom | Cause | What to do |
|---|---|---|
| The module will not load | Ignition is older than 8.3.7 | Upgrade the gateway |
| The module is faulted | The Perspective module is missing | Install and license Perspective; it is a required dependency |
| Install rejected: module is unsigned | The gateway does not allow unsigned modules | Use a signed release, or on a development gateway start it with `-Dignition.allowunsignedmodules=true` |
| The components are not in the palette | The Designer was open during installation | Close and reopen the Designer |

## Charts

| Symptom | Cause | What to do |
|---|---|---|
| A red message where the chart should be | ECharts rejected the option; the message is its error | Correct the option, for example a series without the axes it needs. The chart redraws as soon as the option is valid |
| "No data" | A domain component (Industrial, Scheduling) has nothing to draw | Check the binding on its data prop: an empty list, or rows in the wrong shape, give this message |
| "Loading chart…" that stays | A 3D / WebGL chart is waiting for ECharts-GL, which the browser downloads from the gateway on first use | Check the browser's network tab for a blocked or failed request to the gateway |
| A 3D chart stays empty | WebGL is disabled or unavailable | Enable WebGL (hardware acceleration) in the browser, or try another browser |
| The chart is blank and there is no message | A JavaScript error | Open the browser's developer tools (F12) and look at the Console |
| A formatter or label function has no effect | Props are JSON and cannot carry JavaScript functions; function values are dropped | Use ECharts string templates: `"{b}: {c}"`, `"{value} °C"` |
| Tooltip HTML, a link or a colour disappears | `sanitizeTooltip` removed a value that failed its rules | See [Security](Security); change the value rather than turning the prop off |
| A series I removed is still there, or old parts linger | The update was merged into the previous option | `series` is always replaced, other parts are merged. Set `notMerge` to `true` to replace the whole option on every update |
| Zoom or legend selection resets | The option was re-applied in full | This happens once when `sanitizeTooltip` or a map in `maps` changes, and when `theme` or `renderer` changes (the chart is re-created) |
| The chart ignores my option on an Industrial component | Domain components build their own option | Use their domain props. A non-empty `option` replaces the generated chart entirely |
| An empty `option` still draws a chart | An option component with an empty `option` shows its sample | Give it an option, or bind one |
| Dark theme: some text is unreadable | The themes do not style `radar`, `calendar` or 3D axes | Set those colours in the option; see [Themes](Themes) |
| Updates feel slow | Large options are scanned and applied on every change | Bind data rather than the whole option, limit points at the source, use `sampling`; see [Binding Data](Binding-Data#keeping-it-fast) |

## Bindings

| Symptom | Cause | What to do |
|---|---|---|
| A time axis shows 1970, or nothing | Times are not epoch milliseconds | Convert dates in the transform: `someDate.getTime()` |
| Bars and labels do not line up | `xAxis.data` and `series[n].data` have different lengths or orders | Feed both from the same query result |
| The transform fails on `getValueAt` | The binding returns JSON (a list of row objects), not a dataset | Set the query binding's return format to dataset, or index rows as `row["column"]` |

## Asking for help

Open an issue in the [repository](https://github.com/zbest1000/Ignition-Open-Components-/issues) with the component name, the module and Ignition versions, the option
(or props) that reproduce the problem, and any message from the browser console.
