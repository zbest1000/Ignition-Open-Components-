# Theming

Open ECharts uses Apache ECharts theming. The module registers two built-in themes, applied by setting the `theme` property on a chart component. Changing `theme` re-creates the chart.

## Built-in Themes

### IgnitionIndustrialDark

- Dark background (#1a1a2e)
- High contrast
- Optimized for glare-readable displays (HMI, shop floor)
- Suitable for control room and industrial dashboards

### IgnitionIndustrialLight

- White background
- Print-friendly
- Suitable for reports and documentation

Both themes include:

- 12-color palette
- `textStyle` defaults
- `title`, `legend`, `tooltip` styling
- All axis types: `categoryAxis`, `valueAxis`, `timeAxis`, `logAxis`
- `dataZoom`, `visualMap`, `toolbox` styling
- `line`, `bar`, `gauge` defaults
- Semantic alarm/warning/ok colors in gauge ranges

## Using a Theme

Set the `theme` property on your chart component to the theme name string:

```
theme: "IgnitionIndustrialDark"
```

or

```
theme: "IgnitionIndustrialLight"
```

## Custom Styling

Only the two built-in themes (and the ECharts default, with an empty `theme`) are available.
Themes are part of the client bundle; the module has no theme storage on the gateway and does not
currently provide a way to register additional named themes.

To style a chart beyond the built-in themes, set the same keys directly in its `option` —
`color`, `backgroundColor`, `textStyle`, and per-component styling such as `legend.textStyle` or
`xAxis.axisLine`. Values in `option` override the theme. Keeping a shared style object in a
session custom property or a project script and merging it into each option gives the effect of
a custom theme.

## Industrial Theme Design Guidelines

- **Readable under glare**: Use sufficient contrast and avoid low-contrast text on backgrounds.
- **Subtle gridlines**: Gridlines should aid reading without dominating the chart.
- **Semantic colors**: Use consistent alarm (red), warning (amber), and ok (green) colors in gauge ranges and status indicators.
