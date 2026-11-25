'use strict';
/** Pages/Quality: fill volume, closure torque and rejects of the selected line. Data: demo.data.quality_page(line). */
const { design, chart, card, row, kpiTile, pageHeading, page, label, bind, bindAll, wikiExample } = require('../lib/ui');
const { color } = design;

const D = 'view.custom.data';
const tile = (key, props) => kpiTile(`Kpi${key[0].toUpperCase()}${key.slice(1)}`, `${D}.kpi.${key}`, props);
const axisText = { color: color.textSecondary, fontSize: 11 };

/** Box plot of closure torque per capper head, from the "outliers" example of the wiki. */
function torqueOption() {
    const { option } = wikiExample('BoxplotChart', 'outliers');
    option.grid = { left: 56, right: 54, top: 34, bottom: 30 };
    option.xAxis.axisLabel = axisText;
    option.yAxis = { type: 'value', nameTextStyle: { color: color.textMuted, fontSize: 11, align: 'left' }, axisLabel: axisText, splitLine: { lineStyle: { color: color.border } } };
    const [box, outliers] = option.series;
    box.name = 'Torque';
    box.itemStyle = { color: color.accentSoft, borderColor: color.accent, borderWidth: 1.5 };
    box.markLine.lineStyle = { type: 'dashed', color: color.alarm };
    box.markLine.label = { formatter: '{b}', color: color.alarm, fontSize: 11 };
    outliers.itemStyle = { color: color.violet };
    outliers.symbolSize = 6;
    return { option };
}

/** Heat map of rejects by defect type and hour, from the "piecewise" example with a one-hue ramp. */
function defectOption() {
    const { option } = wikiExample('HeatmapChart', 'piecewise');
    option.grid = { left: 104, right: 12, top: 6, bottom: 28 };
    option.xAxis = { type: 'category', data: [], axisLabel: axisText, axisTick: { show: false }, axisLine: { show: false }, splitArea: { show: false } };
    option.yAxis = { type: 'category', data: [], inverse: true, axisLabel: axisText, axisTick: { show: false }, axisLine: { show: false } };
    option.visualMap = { type: 'continuous', show: false, min: 0, max: 100, inRange: { color: [color.cardRaised, color.accent] } };
    option.series[0].name = 'Rejects';
    option.series[0].label = { show: true, color: color.text, fontSize: 11 };
    option.series[0].itemStyle = { borderColor: color.card, borderWidth: 2, borderRadius: 3 };
    option.series[0].emphasis = { itemStyle: { borderColor: color.text, borderWidth: 1 } };
    return { option };
}

/** Treemap of rejects by category and defect type, from the "parent-labels" example. */
function mixOption() {
    const { option } = wikiExample('TreemapChart', 'parent-labels');
    option.color = design.chart.palette;
    option.tooltip = { formatter: '{b}: {c} rejects' };
    const [tree] = option.series;
    Object.assign(tree, { name: 'Rejects', top: 2, left: 0, right: 0, bottom: 4, visibleMin: 0 });
    tree.label = { show: true, formatter: '{b}\n{c}', fontSize: 11, lineHeight: 15, color: color.text, overflow: 'break' };
    tree.upperLabel = { show: true, height: 22, formatter: '{b}  {c}', color: color.text, fontSize: 11, fontWeight: 600 };
    tree.itemStyle = { borderColor: color.card };
    tree.levels = [
        { itemStyle: { borderWidth: 0, gapWidth: 6, borderColor: color.card }, upperLabel: { show: false } },
        { itemStyle: { borderWidth: 3, gapWidth: 2, borderColorSaturation: 0.5 } },
        { colorSaturation: [0.3, 0.45] },
    ];
    return { option };
}

module.exports = {
    'Pages/Quality': page('demo.data.quality_page', [
        pageHeading('QA lab', 'Quality', bind.prop(`${D}.meta.subtitle`), [
            label('Sku', bind.prop(`${D}.meta.sku`), { classes: 'Chip' }),
            label('Control', bind.prop(`${D}.fill.state`), { classes: 'Chip' }),
        ]),

        row('Kpis', [
            tile('fpy', { deltaFormat: 'absolute' }), tile('rejects'), tile('ppk', { deltaFormat: 'absolute' }), tile('cpk', { deltaFormat: 'absolute' }),
            tile('torque', { deltaFormat: 'absolute' }), tile('holds', { deltaFormat: 'absolute' }),
        ], { grow: 0 }),

        // One set of measurements in both cards: the centre line of the chart is the mean of the histogram.
        row('Fill', [
            card('Spc', { title: 'Fill volume', hint: 'X-bar & R  ·  5 containers every 10 min  ·  last 4 h', basis: 640, grow: 2, minHeight: 460 },
                chart('Chart', 'open.industrial.SPCChart', { title: ' ' }, { bindings: bindAll(`${D}.fill`, ['values', 'subgroupSize']) })),
            card('Capability', { title: 'Fill capability', hint: bind.prop(`${D}.fill.specHint`), basis: 440, minHeight: 460 },
                chart('Chart', 'open.industrial.CapabilityHistogram', { sigmaMethod: 'overall', barColor: color.accent, outOfSpecColor: color.alarm, curveColor: color.cyan, limitColor: color.alarm, targetColor: color.ok }, {
                    bindings: bindAll(`${D}.fill`, ['values', 'lsl', 'usl', 'target', 'unit', 'decimals']),
                })),
        ]),

        row('Closure', [
            card('Torque', { title: 'Closure torque by capper head', hint: '24 closures per head  ·  last 4 h', basis: 520, grow: 2, minHeight: 360 },
                chart('Chart', 'open.echarts.BoxplotChart', torqueOption(), {
                    bindings: {
                        'option.xAxis.data': bind.prop(`${D}.torque.heads`),
                        'option.yAxis.name': bind.prop(`${D}.torque.axisName`),
                        'option.yAxis.min': bind.prop(`${D}.torque.min`),
                        'option.yAxis.max': bind.prop(`${D}.torque.max`),
                        'option.series[0].data': bind.prop(`${D}.torque.boxes`),
                        'option.series[0].markLine.data': bind.prop(`${D}.torque.limits`),
                        'option.series[1].data': bind.prop(`${D}.torque.outliers`),
                    },
                })),
            card('Radar', { title: 'Lines compared', hint: 'outward is better  ·  dashed: target', basis: 420, minHeight: 360 },
                chart('Chart', 'open.industrial.RadarComparison', { decimals: 2, colors: [color.accent, color.pink, color.cyan] }, {
                    bindings: bindAll(`${D}.radar`, ['metrics', 'series', 'target']),
                })),
        ]),

        row('Defects', [
            card('Mix', { title: 'Rejects by defect', hint: bind.prop(`${D}.defects.hint`), basis: 360, minHeight: 300 },
                chart('Chart', 'open.echarts.TreemapChart', mixOption(), {
                    bindings: { 'option.series[0].data': bind.prop(`${D}.defects.tree`) },
                })),
            card('ByHour', { title: 'Defects by hour', hint: 'rejects per defect type and clock hour (UTC)  ·  last 12 h', basis: 560, grow: 2, minHeight: 300 },
                chart('Chart', 'open.echarts.HeatmapChart', defectOption(), {
                    bindings: {
                        'option.xAxis.data': bind.prop(`${D}.defects.hours`),
                        'option.yAxis.data': bind.prop(`${D}.defects.types`),
                        'option.visualMap.max': bind.prop(`${D}.defects.max`),
                        'option.series[0].data': bind.prop(`${D}.defects.cells`),
                    },
                })),
            // last in the row: on a laptop it wraps and gets the full width its 24 columns like
            card('Pattern', { title: 'Reject pattern', hint: 'by weekday and hour (UTC)  ·  last 4 weeks  ·  thousands', basis: 480, minHeight: 300 },
                chart('Chart', 'open.industrial.EventHeatmap', { showLegend: false, hourStep: 1 }, { bindings: bindAll(`${D}.heatmap`, ['cells', 'valueLabel']) })),
        ]),
    ]),
};
