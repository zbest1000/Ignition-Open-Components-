# Templates

Templates are starter ECharts option objects you can copy into the `option` property of chart components. Each template provides a working configuration you can customize.

## Template Categories

### Line

| Key | Description |
|-----|-------------|
| `line.basic` | Simple line chart |
| `line.stackedArea` | Stacked area chart |

### Bar

| Key | Description |
|-----|-------------|
| `bar.basic` | Basic vertical bar chart |
| `bar.stacked` | Stacked bar chart |
| `bar.horizontal` | Horizontal bar chart |

### Scatter

| Key | Description |
|-----|-------------|
| `scatter.basic` | Basic scatter plot |

### Pie

| Key | Description |
|-----|-------------|
| `pie.basic` | Basic pie chart |
| `pie.donut` | Donut chart |

### Gauge and Funnel

| Key | Description |
|-----|-------------|
| `gauge.basic` | Basic gauge |
| `funnel.basic` | Basic funnel chart |

### Heatmap

| Key | Description |
|-----|-------------|
| `heatmap.basic` | Basic heatmap |

### Financial

| Key | Description |
|-----|-------------|
| `candlestick.basic` | Candlestick chart |
| `boxplot.basic` | Box plot |

### Radar and Tree

| Key | Description |
|-----|-------------|
| `radar.basic` | Basic radar chart |
| `treemap.basic` | Basic treemap |
| `sunburst.basic` | Basic sunburst chart |

### Flow and Sankey

| Key | Description |
|-----|-------------|
| `sankey.basic` | Basic sankey diagram |
| `graph.force` | Force-directed graph |
| `themeRiver.basic` | Theme river |

### Industrial

| Key | Description |
|-----|-------------|
| `industrial.trend.pv` | PV/SP trend with alarm markLines |
| `industrial.oee.summary` | Multi-ring gauge for OEE summary |
| `industrial.pareto.downtime` | Pareto chart: bar + cumulative % line for downtime |
| `industrial.alarm.timeline` | Custom series placeholder for alarm timeline |

## How to Use

1. Copy the template object for your chart type into the component's `option` property.
2. Modify the `data` arrays and other series/config to match your data.
3. Adjust labels, colors, and axis settings as needed.

## More Options

See the ECharts examples gallery for additional configurations and advanced usage patterns:

https://echarts.apache.org/examples/en/index.html
