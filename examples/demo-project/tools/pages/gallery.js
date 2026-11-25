'use strict';
/**
 * Pages/Gallery: a visual index of the generic ECharts components (open.echarts.*).
 *
 * Each tile is one component with a static option, copied from docs/wiki/examples and adjusted
 * for the dark theme in gallery-options.js. Open the view in the Designer, select a chart and copy
 * its `option` prop. Four tiles are live: parts of their option are bound to demo.data.gallery_page.
 * The 3D and WebGL charts are on their own page (pages/threed.js): browsers limit the number of
 * WebGL contexts per page.
 */
const { design, page, pageHeading, label, bind } = require('../lib/ui');
const { OPTIONS } = require('./gallery-options');
const { tiles } = require('./tiles');
const GL_CHARTS = Object.keys(require('./threed-options').OPTIONS).length;

const D = 'view.custom.data';

/** Tile heights, one per kind of row. */
const H = { gauge: 268, chart: 318, tall: 372, network: 404, strip: 236, matrix: 428 };

const { tile, group, section, count } = tiles(OPTIONS);

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

    section('Floor', 'Plant Floor & Schematics', 'a GeoJSON floor plan in the maps prop (no geography)  ·  graphic elements  ·  ripple markers', [[
        group('A', H.network, [
            tile('FloorMap', 'Zone temperatures on the floor plan', 'floorTemps'),
            tile('Routes', 'Material routes', 'floorRoutes'),
        ]),
        group('B', H.network, [
            tile('Mimic', 'Process mimic', 'mimic'),
            tile('Alarms', 'Active alarms on a reliability map', 'alarmRipples'),
        ]),
    ]]),

    section('AnyOption', 'Any Option', 'EChart renders any ECharts option; so does every generic component', [[
        group('A', H.chart, [tile('Universal', 'Datasets, bars, a line and a donut in one option', 'datasetTile')]),
        group('B', H.chart, [tile('Intervals', 'Intervals without renderItem', 'intervals')]),
    ]]),
];

module.exports = {
    'Pages/Gallery': page('demo.data.gallery_page', [
        pageHeading('Reference', 'Chart Gallery',
            'The generic ECharts components, one option each: select a chart in the Designer and copy its option prop.', [
                label('Count', `${count()} charts`, { classes: 'Chip' }),
                label('More', `+ ${GL_CHARTS} on 3D & WebGL`, { classes: 'Chip' }),
                label('Theme', design.chart.theme, { classes: 'Chip' }),
            ]),
        ...sections,
    ], { height: 4000 }),
};
