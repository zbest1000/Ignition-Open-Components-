'use strict';
/**
 * Pages/Energy: where the site's electricity goes. Data: demo.data.energy_page(line).
 * The page is about the whole site; the line selector does not change it.
 *
 * One model feeds everything (see _energy_sample in demo.data): the Sankey, the KPI tiles, the
 * 24 h profile, the bridge and the load rings are sums of the same 30-minute samples.
 */
const { design, flex, chart, card, row, kpiTile, pageHeading, page, label, bind, bindAll, wikiExample } = require('../lib/ui');
const { color } = design;

const D = 'view.custom.data';
const DIAL_PROPS = ['value', 'unit', 'decimals', 'target', 'stages'];
const LOAD_BANDS = [{ upTo: 75, color: color.ok }, { upTo: 90, color: color.warn }, { color: color.alarm }];

// One colour per consumer, shared by the Sankey and the 24 h profile.
const CONSUMERS = [
    { key: 'lines', name: 'Lines', color: color.accent },
    { key: 'air', name: 'Compressed air', color: color.cyan },
    { key: 'chill', name: 'Chillers', color: color.violet },
    { key: 'boil', name: 'Boilers', color: color.pink },
    { key: 'hvac', name: 'HVAC', color: color.idle },
];
const FLOW_NODES = [
    { name: 'Grid import', color: color.textMuted },
    { name: 'Solar PV', color: color.text },
    // the bus label shares the middle gap with the consumer labels, so it is kept short
    { name: 'Main bus', label: 'Bus', color: color.textSecondary },
    ...['Line 1', 'Line 2', 'Line 3'].map(name => ({ name, color: color.accent })),
    { name: 'Compressed air', color: color.cyan },
    { name: 'Chillers', color: color.violet },
    { name: 'Boilers', color: color.pink },
    { name: 'HVAC & lighting', color: color.idle },
    { name: 'Useful work', color: color.ok },
    { name: 'Air leaks', color: color.warn },
    { name: 'Losses', color: color.alarm },
];

const axisText = { color: color.textMuted, fontSize: 11 };

/** Stacked area of kW by consumer on a time axis, with the contract demand as a limit line. */
function loadProfile() {
    const props = wikiExample('LineChart', 'stacked-area');
    const series = CONSUMERS.map(c => ({
        name: c.name, type: 'line', stack: 'load', symbol: 'none', smooth: 0.25,
        lineStyle: { width: 1, color: c.color }, itemStyle: { color: c.color }, areaStyle: { color: c.color, opacity: 0.55 },
        emphasis: { focus: 'series' }, data: [],
    }));
    // the limit hangs on the top band; markLine values are absolute, not stacked
    series[series.length - 1].markLine = {
        symbol: 'none', silent: true,
        lineStyle: { type: 'dashed', width: 1.5, color: color.alarm },
        label: { formatter: 'Contract {c} kW', position: 'insideEndTop', color: color.alarm, fontSize: 11 },
        data: [{ yAxis: 2400 }],
    };
    Object.assign(props.option, {
        tooltip: { trigger: 'axis' },
        legend: { bottom: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 8, itemGap: 14, textStyle: { color: color.textSecondary, fontSize: 11 } },
        grid: { left: 52, right: 18, top: 28, bottom: 56 },
        xAxis: { type: 'time', axisLabel: Object.assign({ hideOverlap: true }, axisText), axisLine: { lineStyle: { color: color.borderStrong } }, splitLine: { show: false } },
        yAxis: { type: 'value', name: 'kW', min: 0, max: 2800, interval: 700, nameTextStyle: axisText, axisLabel: axisText, splitLine: { lineStyle: { color: color.border } } },
        series,
    });
    const bindings = { 'option.series[4].markLine.data[0].yAxis': bind.prop(`${D}.load.contract`) };
    CONSUMERS.forEach((c, i) => { bindings[`option.series[${i}].data`] = bind.prop(`${D}.load.${c.key}`); });
    return chart('Chart', 'open.echarts.LineChart', props, { bindings });
}

/** Calendar heatmap of MWh per day. The theme does not style `calendar`, so the colours are set from the tokens. */
function dailyCalendar() {
    const props = wikiExample('CalendarChart', 'full-year');
    Object.assign(props.option, {
        tooltip: { formatter: '{c} MWh' },
        visualMap: {
            type: 'continuous', min: 40, max: 52, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 10, itemHeight: 160,
            text: ['more', 'MWh / day  ·  less'], textStyle: { color: color.textMuted, fontSize: 11 },
            inRange: { color: [color.cardRaised, color.accent, color.text] },
        },
    });
    Object.assign(props.option.calendar, {
        top: 26, left: 44, right: 12, bottom: 44, cellSize: ['auto', 'auto'],
        splitLine: { lineStyle: { width: 1, color: color.borderStrong } },
        itemStyle: { color: 'transparent', borderWidth: 2, borderColor: color.card },
        dayLabel: { firstDay: 1, fontSize: 10, color: color.textMuted },
        monthLabel: { fontSize: 11, color: color.textMuted },
        yearLabel: { show: false },
    });
    props.option.series[0].data = [];
    return chart('Chart', 'open.echarts.CalendarChart', props, {
        bindings: {
            'option.calendar.range': bind.prop(`${D}.calendar.range`),
            'option.series[0].data': bind.prop(`${D}.calendar.data`),
            'option.visualMap.min': bind.prop(`${D}.calendar.min`),
            'option.visualMap.max': bind.prop(`${D}.calendar.max`),
        },
    });
}

function dial(name, key, props) {
    return chart(name, 'open.industrial.DialGauge', Object.assign({ color: color.accent }, props), {
        position: { basis: '0px', grow: 1, shrink: 1 },
        style: { minWidth: '0px' },
        bindings: bindAll(`${D}.dials.${key}`, DIAL_PROPS),
    });
}
const dialRow = (name, grow, dials) => flex(name, { style: { gap: '8px' }, position: { basis: '0px', grow, shrink: 1 } }, dials);

const TILES = ['power', 'intensity', 'solar', 'peak', 'air', 'energy'];

module.exports = {
    'Pages/Energy': page('demo.data.energy_page', [
        pageHeading('Utilities', 'Energy & Utilities', bind.prop(`${D}.meta.subtitle`), [
            label('Total', bind.prop(`${D}.balance.total`), { classes: 'Chip' }),
            label('Useful', bind.prop(`${D}.balance.useful`), { classes: 'Chip' }),
        ]),

        row('Kpis', TILES.map(key => kpiTile(`Kpi${key[0].toUpperCase()}${key.slice(1)}`, `${D}.kpi.${key}`)), { grow: 0 }),

        row('Balance', [
            card('Flow', { title: 'Energy balance', hint: 'grid and solar to useful work and losses  ·  last 24 h  ·  MWh', basis: 640, grow: 3, minHeight: 430 },
                chart('Chart', 'open.industrial.FlowDiagram', { nodes: FLOW_NODES, nodeWidth: 14, nodeGap: 14, linkColor: 'gradient', emphasis: 'trajectory' }, {
                    bindings: bindAll(`${D}.flow`, ['flows', 'unit', 'decimals']),
                })),
            card('Headers', { title: 'Headers', hint: 'pressure and temperature  ·  live', basis: 400, minHeight: 430 },
                dialRow('Pressures', 3, [
                    dial('Air', 'air', { variant: 'stages', title: 'Air header', min: 5, max: 9 }),
                    dial('Steam', 'steam', { variant: 'stages', title: 'Steam header', min: 6, max: 11 }),
                ]),
                dialRow('Temperatures', 3, [
                    dial('Chilled', 'chilled', { variant: 'grade', title: 'Chilled water', min: 0, max: 10 }),
                    dial('Hot', 'hot', { variant: 'grade', title: 'Hot water loop', min: 70, max: 95 }),
                ])),
        ], { grow: 3 }),

        row('Demand', [
            card('Profile', { title: 'Power by consumer', hint: 'kW  ·  last 24 h (UTC)', basis: 480, grow: 2, minHeight: 300 }, loadProfile()),
            card('Bridge', { title: 'Energy bridge', hint: 'previous 24 h to last 24 h', basis: 320, minHeight: 300 },
                chart('Chart', 'open.industrial.Waterfall', { orientation: 'horizontal', startAtZero: false, increaseColor: color.alarm, decreaseColor: color.ok, totalColor: color.accent }, {
                    bindings: bindAll(`${D}.bridge`, ['steps', 'unit', 'decimals']),
                })),
            card('Capacity', { title: 'Load against capacity', hint: 'live  ·  limit 85 %', basis: 280, minHeight: 300 },
                chart('Chart', 'open.industrial.MetricRings', { unit: '%', decimals: 0, centerTitle: 'Highest', summary: 'max', labelPosition: 'right', thresholds: LOAD_BANDS }, {
                    bindings: bindAll(`${D}.rings`, ['metrics']),
                })),
        ], { grow: 2 }),

        row('History', [
            card('Daily', { title: 'Daily energy', hint: 'site  ·  MWh per day  ·  last 26 weeks', basis: 600, grow: 2, minHeight: 260 }, dailyCalendar()),
            card('Peaks', { title: 'Demand peaks', hint: 'half hours above 90 % of contract  ·  4 weeks', basis: 440, minHeight: 260 },
                chart('Chart', 'open.industrial.EventHeatmap', { showLegend: false, hourStep: 1 }, {
                    bindings: bindAll(`${D}.peaks`, ['cells', 'valueLabel', 'utcOffsetMinutes']),
                })),
        ], { grow: 2 }),
    ]),
};
