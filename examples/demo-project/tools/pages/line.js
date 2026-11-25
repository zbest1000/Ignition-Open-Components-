'use strict';
/** Pages/Line: one line in detail - where its time went, what it made, what stopped it. Data: demo.data.line_page(line). */
const { design, chart, card, row, kpiTile, pageHeading, page, label, bind, bindAll } = require('../lib/ui');
const { color } = design;

const D = 'view.custom.data';
// the same factor colours as on the Overview
const OEE_COLORS = { oee: color.accent, availability: color.cyan, performance: color.violet, quality: color.pink };
const STATUS = [color.alarm, color.warn, color.ok];

const tile = (key, props) => kpiTile(`Kpi${key[0].toUpperCase()}${key.slice(1)}`, `${D}.kpi.${key}`, props);

module.exports = {
    'Pages/Line': page('demo.data.line_page', [
        pageHeading('Selected line', 'Line Performance', bind.prop(`${D}.meta.subtitle`), [
            label('Sku', bind.prop(`${D}.meta.sku`), { classes: 'Chip' }),
            label('State', bind.prop(`${D}.meta.state`), { classes: 'Chip' }),
        ]),

        row('Kpis', [
            tile('throughput'), tile('good'), tile('downtime'),
            tile('stops', { deltaFormat: 'absolute' }), tile('mttr'), tile('mtbf'),
        ], { grow: 0 }),

        // Where the last 8 hours went and what they produced. OEE and the bridge share one window, so
        // run time / planned time is the availability ring and productive time / planned time is the OEE.
        row('Losses', [
            card('Oee', { title: 'OEE', hint: 'last 8 h  ·  target 85 %', basis: 320, minHeight: 390 },
                // the labels inside the rings need about 330 px of chart height: this row is tall on purpose
                chart('Chart', 'open.industrial.OEE', { target: 85, decimals: 1, colors: OEE_COLORS }, {
                    bindings: bindAll(`${D}.oee`, ['availability', 'performance', 'quality']),
                })),
            card('Waterfall', { title: 'Time losses', hint: 'planned to productive time  ·  last 8 h  ·  min', basis: 440, grow: 2, minHeight: 390 },
                chart('Chart', 'open.industrial.Waterfall', { orientation: 'horizontal', decreaseColor: color.alarm, increaseColor: color.ok, totalColor: color.accent }, {
                    bindings: bindAll(`${D}.waterfall`, ['steps', 'unit', 'decimals']),
                })),
            card('Hourly', { title: 'Output against plan', hint: 'good units per hour  ·  k', basis: 330, minHeight: 390 },
                chart('Chart', 'open.industrial.BulletChart', { orientation: 'vertical', color: color.accent, targetColor: color.text, statusColors: STATUS, ranges: [85, 100] }, {
                    bindings: bindAll(`${D}.hourly`, ['items', 'unit', 'decimals']),
                })),
        ]),

        // Two wide cards: the limit labels of the trend and the reason names of the Pareto need the
        // width. On a laptop the bases do not fit on one line, so each card takes a full row.
        row('Speed', [
            card('Speed', { title: 'Line speed', hint: 'against setpoint and limits  ·  last 4 h', basis: 640, grow: 1, minHeight: 290 },
                chart('Chart', 'open.industrial.Trend', { showDataZoom: false, showSetpoint: true }, {
                    bindings: bindAll(`${D}.trend`, ['data', 'limits', 'yAxisLabel']),
                })),
            card('Pareto', { title: 'Stop reasons', hint: 'unplanned stops  ·  last 24 h  ·  min', basis: 620, grow: 3, minHeight: 290 },
                chart('Chart', 'open.industrial.Pareto', { barLabel: 'Downtime (min)' }, { bindings: bindAll(`${D}.pareto`, ['categories', 'counts']) })),
        ]),

        row('Machines', [
            card('States', { title: 'Machine states', hint: 'last 8 h', basis: 540, minHeight: 290 },
                chart('Chart', 'open.industrial.StateTimeline', { title: ' ' }, { bindings: bindAll(`${D}.machines`, ['events', 'stateColors']) })),
            card('Downtime', { title: 'Downtime by machine', hint: 'unplanned stops  ·  last 24 h', basis: 540, minHeight: 290 },
                chart('Chart', 'open.industrial.DowntimeTracker', { title: ' ' }, { bindings: bindAll(`${D}.downtime`, ['events', 'categoryColors']) })),
        ]),
    ]),
};
