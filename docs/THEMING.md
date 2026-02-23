# Theming

Open ECharts uses Apache ECharts theming. Themes are registered via `echarts.registerTheme` and applied by setting the `theme` property on chart components.

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

## Custom Themes

1. Create a JSON object following the ECharts theme format.
2. Use the Theme Builder at https://echarts.apache.org/en/theme-builder.html to generate or customize themes.
3. Register the theme in a script (e.g., gateway script or custom script):
   ```javascript
   echarts.registerTheme('MyTheme', themeJson);
   ```
4. Set the `theme` property on your component to the registered theme name.

## Theme JSON Structure Reference

| Key | Description |
|-----|-------------|
| `color` | Array of color strings for the palette |
| `textStyle` | Global text style (fontFamily, fontSize, color, etc.) |
| `title` | Title component styling |
| `legend` | Legend component styling |
| `tooltip` | Tooltip styling |
| `categoryAxis` | Category axis |
| `valueAxis` | Value axis |
| `timeAxis` | Time axis |
| `logAxis` | Log axis |
| `dataZoom` | Data zoom component |
| `visualMap` | Visual map component |
| `toolbox` | Toolbox component |
| `line` | Line series defaults |
| `bar` | Bar series defaults |
| `gauge` | Gauge series defaults |

## Industrial Theme Design Guidelines

- **Readable under glare**: Use sufficient contrast and avoid low-contrast text on backgrounds.
- **Subtle gridlines**: Gridlines should aid reading without dominating the chart.
- **Semantic colors**: Use consistent alarm (red), warning (amber), and ok (green) colors in gauge ranges and status indicators.
