'use strict';
/**
 * Pages/Gallery: a visual index of the generic ECharts components (open.echarts.*).
 *
 * Each tile is one component with a static option, copied from docs/wiki/examples and adjusted
 * for the dark theme in gallery-options.js. Open the view in the Designer, select a chart and copy
 * its `option` prop. Four tiles are live: parts of their option are bound to demo.data.gallery_page.
 */
const { design, flex, chart, row, pageHeading, page, label, bind } = require('../lib/ui');
const { OPTIONS } = require('./gallery-options');
const { color, px, space } = design;

const D = 'view.custom.data';
const fill = { basis: '0px', grow: 1, shrink: 1 };
const fixed = { basis: 'auto', grow: 0, shrink: 0 };

/** Tile heights, one per kind of row. */
const H = { gauge: 268, chart: 318, tall: 372, network: 404, strip: 236, matrix: 428 };

let tiles = 0;

/**
 * One tile: title, a caption naming the component (and the wiki example the option comes from),
 * and the chart. opts: units (relative width in its row, default 1), bindings (live tiles).
 */
function tile(name, title, key, opts = {}) {
    const spec = OPTIONS[key];
    if (!spec) throw new Error(`gallery-options.js has no option "${key}"`);
    tiles += 1;
    return flex(name, {
        direction: 'column',
        classes: 'Card',
        style: { minWidth: '0px' },
        position: { basis: '0px', grow: opts.units || 1, shrink: 1 },
    }, [
        flex('Header', { alignItems: 'center', style: { gap: px(space.sm) }, position: fixed }, [
            label('Title', title, { classes: 'CardTitle', position: fill, style: { overflow: 'hidden', textOverflow: 'ellipsis' } }),
            opts.bindings ? label('Live', 'Live', { classes: 'Chip' }) : null,
        ]),
        label('Caption', `${spec.type}  ·  ${spec.example}`, { classes: 'CardHint', style: { marginBottom: px(space.sm) } }),
        chart('Chart', spec.type, { option: spec.option }, { bindings: opts.bindings, style: { minWidth: '0px' } }),
    ]);
}

/**
 * A group of tiles that always stay on one line. A row holds one or two groups; two groups sit
 * side by side on a wide display and under each other on a laptop, so a row of six becomes two
 * rows of three and every tile of a section keeps the same size.
 */
function group(name, height, children) {
    return flex(name, { classes: 'Row', style: { height: px(height), minWidth: '0px' }, position: { basis: '560px', grow: 1, shrink: 1 } }, children);
}

function section(name, title, note, rows) {
    return flex(name, { direction: 'column', classes: 'Row', position: fixed }, [
        flex('Heading', { alignItems: 'center', style: { gap: px(space.md), marginTop: px(space.md) }, position: fixed }, [
            label('Title', title, { style: { color: color.text, fontSize: '16px', fontWeight: '600', lineHeight: '22px', whiteSpace: 'nowrap' } }),
            label('Note', note, { classes: 'CardHint' }),
            flex('Rule', { style: { backgroundColor: color.border, height: '1px' }, position: fill }, []),
        ]),
        ...rows.map((groups, i) => row(`Row${i + 1}`, groups, { grow: 0 })),
    ]);
}

const live = path => bind.prop(`${D}.${path}`);

const sections = [
    section('Gauges', 'Gauges & KPIs', 'one series type, six looks', [[
        group('A', H.gauge, [
            tile('Temperature', 'Progress arc', 'gaugeTemperature', {
                bindings: { 'option.series[0].data[0].value': live('live.temperature.value'), 'option.series[1].data[0].value': live('live.temperature.value') },
            }),
            tile('Speed', 'Speed dial', 'gaugeSpeed', {
                bindings: { 'option.series[0].data[0].value': live('live.speed.value'), 'option.series[0].max': live('live.speed.max') },
            }),
            tile('Ring', 'Concentric rings', 'gaugeRing'),
        ]),
        group('B', H.gauge, [
            tile('Stage', 'Staged band', 'gaugeStage'),
            tile('Grade', 'Grade rating', 'gaugeGrade'),
            tile('MultiTitle', 'Three pointers', 'gaugeMultiTitle'),
        ]),
    ]]),

    section('Comparison', 'Comparison', 'bars, lines, radar, pictorial bars and funnel', [
        [
            group('A', H.chart, [
                tile('Mixed', 'Bars and line on two axes', 'barMixed', {
                    bindings: {
                        'option.xAxis.data': live('hourly.labels'),
                        'option.series[0].data': live('hourly.electricity'),
                        'option.series[1].data': live('hourly.gas'),
                        'option.series[2].data': live('hourly.water'),
                    },
                }),
                tile('StackedArea', 'Stacked area', 'lineStackedArea'),
            ]),
            group('B', H.chart, [
                tile('Polar', 'Polar bars', 'barPolar', {
                    bindings: { 'option.radiusAxis.data': live('live.machines.names'), 'option.series.data': live('live.machines.values') },
                }),
                tile('Radar', 'Radar on a round grid', 'radarCircle'),
            ]),
        ],
        [
            group('A', H.chart, [
                tile('Tanks', 'Tank levels', 'pictorialTanks'),
                tile('Segments', 'Segmented bars', 'pictorialSegments'),
            ]),
            group('B', H.chart, [
                tile('Progress', 'Progress bars', 'barProgress'),
                tile('Funnel', 'Funnel, plan against actual', 'funnelCompare'),
            ]),
        ],
    ]),

    section('Composition', 'Composition', 'parts of a whole, also over time', [[
        group('A', H.tall, [tile('Timeline', 'Timeline: bars and pie per year', 'barTimeline')]),
        group('B', H.tall, [
            tile('Nested', 'Nested pies', 'pieNested'),
            tile('Rose', 'Nightingale rose', 'pieRose'),
        ]),
    ]]),

    section('Hierarchy', 'Hierarchy', 'sunburst, treemap and tree', [[
        group('A', H.tall, [
            tile('Wheel', 'Sunburst wheel', 'sunburstWheel'),
            tile('Mono', 'Sunburst in one hue', 'sunburstMono'),
        ]),
        group('B', H.tall, [
            tile('Treemap', 'Treemap with group headers', 'treemapParents'),
            tile('Tree', 'Tree, left to right', 'treeLeftRight'),
        ]),
    ]]),

    section('Flow', 'Flow & Networks', 'sankey and graph', [[
        group('A', H.network, [tile('Sankey', 'Sankey with a colour per stage', 'sankeyLevels')]),
        group('B', H.network, [
            tile('Circular', 'Circular network', 'graphCircular'),
            tile('States', 'State machine', 'graphStates'),
        ]),
    ]]),

    section('Statistics', 'Distribution & Statistics', 'boxplot, scatter, parallel axes and heatmap', [[
        group('A', H.chart, [
            tile('Boxplot', 'Boxplot with outliers', 'boxplotOutliers'),
            tile('Bubble', 'Bubble chart', 'scatterBubble'),
        ]),
        group('B', H.chart, [
            tile('Parallel', 'Parallel coordinates', 'parallelQuality'),
            tile('Thermal', 'Thermal heatmap', 'heatmapThermal'),
        ]),
    ]]),

    section('Time', 'Time', 'calendars, small multiples, streams and candles', [
        [group('A', H.strip, [tile('Year', 'A year of days', 'calendarYear')])],
        [
            group('A', H.matrix, [tile('Matrix', 'Sparkline matrix', 'matrixSparklines')]),
            group('B', H.matrix, [
                tile('MonthPies', 'A pie per day', 'pieCalendar'),
                tile('Limits', 'Limits and operating bands', 'lineLimits'),
            ]),
        ],
        [
            group('A', H.tall, [tile('River', 'Theme river', 'themeRiver')]),
            group('B', H.tall, [tile('Candles', 'Candlesticks with volume and zoom', 'candlestick')]),
        ],
    ]),

    section('ThreeD', '3D', 'ECharts-GL  ·  loaded on demand as a separate chunk  ·  drag to rotate', [
        [
            group('A', H.network, [
                tile('Bar3D', '3D bars', 'bar3D'),
                tile('Surface', 'Surface', 'surface'),
            ]),
            group('B', H.network, [tile('ScatterGL', 'WebGL scatter, 6,000 points', 'scatterGL')]),
        ],
    ]),
];

module.exports = {
    'Pages/Gallery': page('demo.data.gallery_page', [
        pageHeading('Reference', 'Chart Gallery',
            'The generic ECharts components. Every chart is one component with one option: select it in the Designer and copy its option prop.', [
                label('Count', `${tiles} charts`, { classes: 'Chip' }),
                label('Theme', design.chart.theme, { classes: 'Chip' }),
            ]),
        ...sections,
    ], { height: 3600 }),
};
