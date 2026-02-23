/**
 * Starter option templates.  Each template is a valid ECharts option object
 * that can be dropped directly into the EChart component's `option` property.
 *
 * Organised by:
 *  1. Basic series types (one template per type)
 *  2. Industrial templates (domain-specific recipes)
 */

// ── Basic Series Templates ──────────────────────────────────────────────

export const lineBasic = {
    title: { text: 'Line Chart' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    yAxis: { type: 'value' },
    series: [{ type: 'line', data: [150, 230, 224, 218, 135, 147, 260] }]
};

export const lineStackedArea = {
    title: { text: 'Stacked Area' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['Series A', 'Series B', 'Series C'] },
    xAxis: { type: 'category', boundaryGap: false, data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    yAxis: { type: 'value' },
    series: [
        { name: 'Series A', type: 'line', stack: 'Total', areaStyle: {}, data: [120, 132, 101, 134, 90, 230, 210] },
        { name: 'Series B', type: 'line', stack: 'Total', areaStyle: {}, data: [220, 182, 191, 234, 290, 330, 310] },
        { name: 'Series C', type: 'line', stack: 'Total', areaStyle: {}, data: [150, 232, 201, 154, 190, 330, 410] },
    ]
};

export const barBasic = {
    title: { text: 'Bar Chart' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [120, 200, 150, 80, 70, 110, 130] }]
};

export const barStacked = {
    title: { text: 'Stacked Bar' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['A', 'B', 'C'] },
    xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    yAxis: { type: 'value' },
    series: [
        { name: 'A', type: 'bar', stack: 'total', data: [320, 302, 301, 334, 390] },
        { name: 'B', type: 'bar', stack: 'total', data: [120, 132, 101, 134, 90] },
        { name: 'C', type: 'bar', stack: 'total', data: [220, 182, 191, 234, 290] },
    ]
};

export const barHorizontal = {
    title: { text: 'Horizontal Bar' },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: ['Brazil', 'Indonesia', 'USA', 'India', 'China'] },
    series: [{ type: 'bar', data: [18203, 23489, 29034, 104970, 131744] }]
};

export const scatterBasic = {
    title: { text: 'Scatter Plot' },
    tooltip: { trigger: 'item' },
    xAxis: {},
    yAxis: {},
    series: [{
        type: 'scatter',
        symbolSize: 10,
        data: [[10, 8.04], [8, 6.95], [13, 7.58], [9, 8.81], [11, 8.33],
               [14, 9.96], [6, 7.24], [4, 4.26], [12, 10.84], [7, 4.82], [5, 5.68]]
    }]
};

export const pieBasic = {
    title: { text: 'Pie Chart', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
        type: 'pie', radius: '50%',
        data: [
            { value: 1048, name: 'Search Engine' },
            { value: 735,  name: 'Direct' },
            { value: 580,  name: 'Email' },
            { value: 484,  name: 'Union Ads' },
            { value: 300,  name: 'Video Ads' },
        ]
    }]
};

export const pieDonut = {
    title: { text: 'Donut Chart', left: 'center' },
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left' },
    series: [{
        type: 'pie', radius: ['40%', '70%'], avoidLabelOverlap: false,
        label: { show: false, position: 'center' },
        emphasis: { label: { show: true, fontSize: 20, fontWeight: 'bold' } },
        data: [
            { value: 1048, name: 'A' }, { value: 735, name: 'B' },
            { value: 580, name: 'C' }, { value: 484, name: 'D' },
        ]
    }]
};

export const gaugeBasic = {
    title: { text: 'Gauge' },
    series: [{
        type: 'gauge',
        detail: { valueAnimation: true },
        data: [{ value: 72, name: 'Score' }]
    }]
};

export const funnelBasic = {
    title: { text: 'Funnel' },
    tooltip: { trigger: 'item' },
    series: [{
        type: 'funnel', left: '10%', width: '80%',
        data: [
            { value: 60, name: 'Visit' }, { value: 40, name: 'Inquiry' },
            { value: 20, name: 'Order' }, { value: 80, name: 'Click' },
            { value: 100, name: 'Show' },
        ]
    }]
};

export const heatmapBasic = {
    title: { text: 'Heatmap' },
    tooltip: { position: 'top' },
    grid: { height: '50%', top: '10%' },
    xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
    yAxis: { type: 'category', data: ['Morning', 'Afternoon', 'Evening'] },
    visualMap: { min: 0, max: 10, calculable: true, orient: 'horizontal', left: 'center', bottom: '15%' },
    series: [{
        type: 'heatmap',
        data: [[0,0,5],[0,1,1],[0,2,0],[1,0,1],[1,1,3],[1,2,4],
               [2,0,7],[2,1,2],[2,2,6],[3,0,3],[3,1,6],[3,2,1],
               [4,0,1],[4,1,5],[4,2,4],[5,0,2],[5,1,4],[5,2,8],
               [6,0,9],[6,1,3],[6,2,2]],
        label: { show: true }
    }]
};

export const candlestickBasic = {
    title: { text: 'Candlestick' },
    xAxis: { data: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05'] },
    yAxis: {},
    series: [{
        type: 'candlestick',
        data: [
            [20, 34, 10, 38], [40, 35, 30, 50],
            [31, 38, 33, 44], [38, 15, 5, 42], [20, 30, 12, 36]
        ]
    }]
};

export const boxplotBasic = {
    title: { text: 'Box Plot' },
    xAxis: { type: 'category', data: ['A', 'B', 'C'] },
    yAxis: { type: 'value' },
    series: [{
        type: 'boxplot',
        data: [
            [655, 850, 940, 980, 1070],
            [760, 800, 845, 885, 960],
            [780, 840, 855, 880, 940]
        ]
    }]
};

export const radarBasic = {
    title: { text: 'Radar Chart' },
    radar: {
        indicator: [
            { name: 'Sales', max: 6500 }, { name: 'Admin', max: 16000 },
            { name: 'IT', max: 30000 }, { name: 'Support', max: 38000 },
            { name: 'Dev', max: 52000 }, { name: 'Marketing', max: 25000 }
        ]
    },
    series: [{
        type: 'radar',
        data: [{ value: [4200, 3000, 20000, 35000, 50000, 18000], name: 'Budget' }]
    }]
};

export const treemapBasic = {
    title: { text: 'Treemap' },
    series: [{
        type: 'treemap',
        data: [
            { name: 'A', value: 10, children: [{ name: 'A1', value: 4 }, { name: 'A2', value: 6 }] },
            { name: 'B', value: 15, children: [{ name: 'B1', value: 8 }, { name: 'B2', value: 7 }] },
            { name: 'C', value: 8 }
        ]
    }]
};

export const sunburstBasic = {
    title: { text: 'Sunburst' },
    series: [{
        type: 'sunburst', radius: [0, '90%'],
        data: [
            { name: 'A', children: [{ name: 'A1', value: 4 }, { name: 'A2', value: 6 }] },
            { name: 'B', children: [{ name: 'B1', value: 8 }, { name: 'B2', value: 7 }] },
            { name: 'C', value: 8 }
        ]
    }]
};

export const sankeyBasic = {
    title: { text: 'Sankey Diagram' },
    series: [{
        type: 'sankey', layout: 'none',
        emphasis: { focus: 'adjacency' },
        data: [
            { name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }
        ],
        links: [
            { source: 'A', target: 'C', value: 5 },
            { source: 'A', target: 'D', value: 3 },
            { source: 'B', target: 'C', value: 8 },
            { source: 'B', target: 'E', value: 6 },
            { source: 'C', target: 'E', value: 10 },
        ]
    }]
};

export const graphForce = {
    title: { text: 'Force-Directed Graph' },
    series: [{
        type: 'graph', layout: 'force',
        force: { repulsion: 100 },
        roam: true,
        label: { show: true },
        data: [
            { name: 'Node 1', symbolSize: 30 },
            { name: 'Node 2', symbolSize: 20 },
            { name: 'Node 3', symbolSize: 25 },
            { name: 'Node 4', symbolSize: 15 },
        ],
        links: [
            { source: 'Node 1', target: 'Node 2' },
            { source: 'Node 1', target: 'Node 3' },
            { source: 'Node 2', target: 'Node 4' },
        ]
    }]
};

export const themeRiverBasic = {
    title: { text: 'Theme River' },
    singleAxis: { type: 'time', top: 50, bottom: 50 },
    series: [{
        type: 'themeRiver',
        data: [
            ['2024/01/01', 10, 'DI'], ['2024/01/01', 15, 'DO'], ['2024/01/01', 20, 'AI'],
            ['2024/02/01', 12, 'DI'], ['2024/02/01', 18, 'DO'], ['2024/02/01', 22, 'AI'],
            ['2024/03/01', 8,  'DI'], ['2024/03/01', 25, 'DO'], ['2024/03/01', 18, 'AI'],
            ['2024/04/01', 14, 'DI'], ['2024/04/01', 20, 'DO'], ['2024/04/01', 25, 'AI'],
        ]
    }]
};

// ── Industrial Templates ────────────────────────────────────────────────

export const industrialTrendProcessVariable = {
    title: { text: 'Process Variable Trend', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['PV', 'SP'], bottom: 0 },
    grid: { top: 60, bottom: 50 },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', name: '°C', nameLocation: 'end' },
    dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        { type: 'slider', start: 0, end: 100 }
    ],
    series: [
        {
            name: 'PV', type: 'line', symbol: 'none', lineStyle: { width: 2 },
            data: (function () {
                const d: [number, number][] = [];
                const base = Date.now() - 3600000;
                for (let i = 0; i < 360; i++) {
                    d.push([base + i * 10000, 72 + Math.sin(i / 20) * 5 + Math.random() * 2]);
                }
                return d;
            })()
        },
        {
            name: 'SP', type: 'line', symbol: 'none',
            lineStyle: { width: 1, type: 'dashed' },
            data: (function () {
                const d: [number, number][] = [];
                const base = Date.now() - 3600000;
                for (let i = 0; i < 360; i++) {
                    d.push([base + i * 10000, 75]);
                }
                return d;
            })()
        }
    ],
    markLine: { silent: true, data: [
        { yAxis: 80, lineStyle: { color: '#ee6666', type: 'solid' }, label: { formatter: 'Hi Alarm' } },
        { yAxis: 65, lineStyle: { color: '#fac858', type: 'solid' }, label: { formatter: 'Lo Warn' } }
    ]}
};

export const industrialOeeSummary = {
    title: { text: 'OEE Summary', left: 'center' },
    tooltip: { trigger: 'item' },
    series: [
        {
            type: 'gauge', startAngle: 90, endAngle: -270,
            pointer: { show: false },
            progress: { show: true, overlap: false, roundCap: true, clip: false },
            axisLine: { lineStyle: { width: 30 } },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            detail: { width: 40, height: 14, fontSize: 14, color: 'inherit', formatter: '{value}%' },
            data: [
                { value: 85, name: 'OEE',          title: { offsetCenter: ['0%', '-35%'] }, detail: { offsetCenter: ['0%', '-20%'] } },
                { value: 92, name: 'Availability',  title: { offsetCenter: ['0%',   '0%'] }, detail: { offsetCenter: ['0%',  '15%'] } },
                { value: 95, name: 'Performance',   title: { offsetCenter: ['0%',  '35%'] }, detail: { offsetCenter: ['0%',  '50%'] } },
                { value: 97, name: 'Quality',       title: { offsetCenter: ['0%',  '70%'] }, detail: { offsetCenter: ['0%',  '85%'] } },
            ]
        }
    ]
};

export const industrialParetoDowntime = {
    title: { text: 'Downtime Pareto', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { data: ['Count', 'Cumulative %'], bottom: 0 },
    grid: { top: 60, bottom: 50 },
    xAxis: { type: 'category', data: ['Mechanical', 'Electrical', 'Operator', 'Material', 'Changeover', 'Other'] },
    yAxis: [
        { type: 'value', name: 'Count' },
        { type: 'value', name: '%', max: 100, axisLabel: { formatter: '{value}%' } }
    ],
    series: [
        { name: 'Count', type: 'bar', data: [42, 28, 18, 12, 8, 5] },
        {
            name: 'Cumulative %', type: 'line', yAxisIndex: 1,
            data: [37, 62, 78, 89, 96, 100],
            markLine: { data: [{ yAxis: 80, label: { formatter: '80%' } }] }
        }
    ]
};

export const industrialAlarmTimeline = {
    title: { text: 'Alarm Timeline', left: 'center' },
    tooltip: {},
    xAxis: { type: 'time' },
    yAxis: { type: 'category', data: ['Reactor A', 'Pump B', 'Conveyor C'] },
    series: [{
        type: 'custom',
        renderItem: undefined,
        encode: { x: [1, 2], y: 0 },
        data: [
            ['Reactor A',  Date.now() - 7200000, Date.now() - 5400000, 'High Temp'],
            ['Pump B',     Date.now() - 6000000, Date.now() - 4800000, 'Vibration'],
            ['Conveyor C', Date.now() - 3600000, Date.now() - 1800000, 'Jam'],
        ]
    }]
};

// ── Template Registry ───────────────────────────────────────────────────

export const TEMPLATES: Record<string, object> = {
    'line.basic':             lineBasic,
    'line.stackedArea':       lineStackedArea,
    'bar.basic':              barBasic,
    'bar.stacked':            barStacked,
    'bar.horizontal':         barHorizontal,
    'scatter.basic':          scatterBasic,
    'pie.basic':              pieBasic,
    'pie.donut':              pieDonut,
    'gauge.basic':            gaugeBasic,
    'funnel.basic':           funnelBasic,
    'heatmap.basic':          heatmapBasic,
    'candlestick.basic':      candlestickBasic,
    'boxplot.basic':          boxplotBasic,
    'radar.basic':            radarBasic,
    'treemap.basic':          treemapBasic,
    'sunburst.basic':         sunburstBasic,
    'sankey.basic':           sankeyBasic,
    'graph.force':            graphForce,
    'themeRiver.basic':       themeRiverBasic,
    'industrial.trend.pv':    industrialTrendProcessVariable,
    'industrial.oee.summary': industrialOeeSummary,
    'industrial.pareto.downtime': industrialParetoDowntime,
    'industrial.alarm.timeline':  industrialAlarmTimeline,
};
