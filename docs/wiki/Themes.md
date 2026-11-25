Every component has a `theme` prop. It takes one of three values:

| `theme` | Look |
|---|---|
| `""` (empty, the default) | The standard ECharts look: transparent background, dark text. Suits light views. |
| `"IgnitionIndustrialDark"` | Dark background (`#1a1a2e`), high contrast. Made for control-room and shop-floor displays. |
| `"IgnitionIndustrialLight"` | White background, print-friendly. Suits reports. |

Type the name into `theme`, or bind it, for example to a session custom property so that a whole project
switches at once. Changing `theme` re-creates the chart, so avoid toggling it frequently on busy views.

Both built-in themes define a 12-colour palette, text defaults, and the styling of title, legend,
tooltip, all axis types, `dataZoom`, `visualMap` and `toolbox`, plus defaults for line, bar and gauge
series, with semantic alarm / warning / ok colours in gauge ranges.

## What the themes do not cover

The themes do not style `radar`, `calendar` or the 3D axes of the ECharts-GL charts. On the dark theme,
set those colours in the option yourself, for example `radar.splitArea`, `calendar.itemStyle`, or
`xAxis3D.axisLabel.textStyle.color`.

An example that hard-codes text colours or a `backgroundColor` in its option keeps them under any theme.
The example pages say so where that is the case.

## Styling beyond the themes

Only these two themes exist; the module has no way to register more. To go further, set the same keys in
the `option`: `color` (the palette), `backgroundColor`, `textStyle`, and per-component styling such as
`legend.textStyle` or `xAxis.axisLine`. Values in the option override the theme.

To reuse a house style, keep it as an object in a session custom property or a project library script and
merge it into each option, for instance in the script transform that builds the option:

```python
def transform(self, value, quality, timestamp):
    option = {
        "xAxis": {"type": "category", "data": ["A", "B", "C"]},
        "yAxis": {"type": "value"},
        "series": [{"type": "bar", "data": value}],
    }
    option.update(self.session.custom.chartStyle)  # e.g. {"color": ["#005f9e", "#7ab800"], "textStyle": {...}}
    return option
```

## Design advice for plant displays

- Keep contrast high; avoid thin grey text on mid-tone backgrounds.
- Let gridlines help reading without dominating.
- Use red, amber and green consistently for alarm, warning and ok, and for nothing else.
