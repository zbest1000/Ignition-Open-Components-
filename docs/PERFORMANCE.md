# Performance

Guidelines for getting the best performance from Open ECharts in Ignition Perspective.

## Renderer Choice

| Renderer | Use Case |
|----------|----------|
| **canvas** (default) | Better performance for many data points; recommended for most charts |
| **svg** | Better quality, easier export; smaller DOM footprint; suitable for charts with fewer points |

Set the renderer via the component's `renderer` property.

## Large Datasets

ECharts can handle 100K+ points. For large datasets:

- Use **sampling** to reduce points before rendering
- Use **progressive rendering** for smoother initial load

### Relevant ECharts Options

| Option | Description |
|--------|-------------|
| `series.sampling` | `'lttb'` (Largest-Triangle-Three-Buckets), `'average'`, `'min'`, `'max'` |
| `series.large` | Enable large dataset mode |
| `series.largeThreshold` | Threshold above which large mode is used |
| `series.progressive` | Enable progressive rendering |
| `series.progressiveThreshold` | Threshold for progressive mode |

## WebGL Charts

- **ScatterGL**, **GraphGL**, **FlowGL**: Use GPU acceleration
- Handle millions of points via WebGL
- Use when canvas performance is insufficient for very large datasets

## 3D Charts

- Use the canvas renderer
- Performance depends on GPU capability
- Limit 3D chart count per view

## Resize Debounce

- Default debounce: 150ms
- Increase for complex charts to reduce resize overhead
- Set via `resizeDebounce` property

## Multiple Charts per View

- Each chart creates a canvas element
- Keep the number of charts per view reasonable
- Consider lazy loading or pagination for dashboards with many charts

## Memory

- `dispose` is called automatically on unmount by `AbstractEChartComponent`
- No manual cleanup is required for charts that are removed from the view

## Theme Switching

- Theme changes trigger dispose + reinit
- This is by design; ECharts themes require full reinitialisation
- Avoid frequent theme toggling in performance-critical views

## Best Practices

1. **Use time axis for time data** – Avoids scaling issues and improves performance.
2. **Prefer dataset over inline data** – Use `dataset` for shared data across series.
3. **Use dataZoom for exploration** – Let users zoom/pan instead of loading all data at once.
4. **Avoid deep nesting** – Keep option objects reasonably flat; deep nesting can slow down sanitisation and rendering.
5. **Use appropriate sampling** – For line charts with many points, `sampling: 'lttb'` preserves visual shape while reducing points.
