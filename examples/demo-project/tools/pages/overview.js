'use strict';
/** Pages/Overview: the plant at a glance. Data: demo.data.overview(line). */
const { design, flex, chart, card, row, stat, kpiTile, pageHeading, page, label, bind, bindAll } = require('../lib/ui');
const { color } = design;

const D = 'view.custom.data';
const OEE_COLORS = { oee: color.accent, availability: color.cyan, performance: color.violet, quality: color.pink };
const percent = path => bind.expr(`numberFormat({${path}}, "0.0") + " %"`);
const STATUS_BANDS = [{ upTo: 65, color: color.alarm }, { upTo: 80, color: color.warn }, { color: color.ok }];

function dial(name, key) {
    return chart(name, 'open.industrial.DialGauge', { variant: 'progress', showScale: false, color: color.accent }, {
        position: { basis: '0px', grow: 1, shrink: 1 },
        style: { minWidth: '0px' },
        bindings: bindAll(`${D}.${key}`, ['title', 'value', 'unit', 'min', 'max', 'decimals', 'target', 'stages']),
    });
}

module.exports = {
    'Pages/Overview': page('demo.data.overview', [
        pageHeading('Plant overview', 'Meridian Bottling Plant', bind.prop(`${D}.meta.subtitle`), [
            label('Sku', bind.prop(`${D}.meta.sku`), { classes: 'Chip' }),
            label('State', bind.prop(`${D}.meta.state`), { classes: 'Chip' }),
        ]),

        row('Kpis', ['oee', 'throughput', 'good', 'scrap', 'downtime', 'energy'].map(key =>
            kpiTile(`Kpi${key[0].toUpperCase()}${key.slice(1)}`, `${D}.kpi.${key}`)), { grow: 0 }),

        row('Performance', [
            card('Oee', { title: 'OEE', hint: 'selected line  ·  last 8 h', basis: 300 },
                flex('Body', { alignItems: 'center', style: { gap: '8px' }, position: { basis: '0px', grow: 1, shrink: 1 } }, [
                    // The ring labels are off: they need about 330 px of height. The legend beside it carries the numbers.
                    chart('Chart', 'open.industrial.OEE', { target: 85, showLabels: false, colors: OEE_COLORS }, {
                        position: { basis: '0px', grow: 1, shrink: 1 },
                        style: { minWidth: '0px', alignSelf: 'stretch' },
                        bindings: bindAll(`${D}.oee`, ['availability', 'performance', 'quality']),
                    }),
                    flex('Legend', { direction: 'column', justify: 'center', style: { gap: '10px', paddingRight: '8px' }, position: { basis: '166px', grow: 0, shrink: 0 } }, [
                        stat('Oee', 'OEE', percent(`${D}.oee.oee`), OEE_COLORS.oee, { large: true }),
                        stat('Availability', 'Availability', percent(`${D}.oee.availability`), OEE_COLORS.availability),
                        stat('Performance', 'Performance', percent(`${D}.oee.performance`), OEE_COLORS.performance),
                        stat('Quality', 'Quality', percent(`${D}.oee.quality`), OEE_COLORS.quality),
                    ]),
                ])),
            card('Throughput', { title: 'Throughput', hint: 'line speed against setpoint  ·  last 2 h', basis: 480, grow: 2 },
                chart('Chart', 'open.industrial.Trend', { showDataZoom: false, showSetpoint: true }, {
                    // no `limits` here: their labels need a chart wider than this card is on a laptop
                    bindings: bindAll(`${D}.trend`, ['data', 'yAxisLabel']),
                })),
            card('Lines', { title: 'OEE by line', hint: 'last 8 h  ·  target 85 %', basis: 280 },
                chart('Chart', 'open.industrial.MetricRings', { unit: '%', decimals: 0, centerTitle: 'Plant', summary: 'average', labelPosition: 'right', thresholds: STATUS_BANDS }, {
                    bindings: bindAll(`${D}.rings`, ['metrics']),
                })),
        ]),

        row('Availability', [
            card('States', { title: 'Line states', hint: 'all lines  ·  last 8 h', basis: 480 },
                // title ' ': the component falls back to its own "State Timeline" title when the prop is empty
                chart('Chart', 'open.industrial.StateTimeline', { title: ' ' }, { bindings: bindAll(`${D}.states`, ['events', 'stateColors']) })),
            card('Pareto', { title: 'Downtime by category', hint: 'plant  ·  last 24 h  ·  minutes', basis: 520 },
                chart('Chart', 'open.industrial.Pareto', { barLabel: 'Downtime (min)' }, { bindings: bindAll(`${D}.pareto`, ['categories', 'counts']) })),
        ]),

        row('Plant', [
            card('Plan', { title: 'Output against plan', hint: 'this shift  ·  k units', basis: 300 },
                chart('Chart', 'open.industrial.BulletChart', { unit: 'k', decimals: 1, color: color.accent, targetColor: color.text, statusColors: [color.alarm, color.warn, color.ok] }, {
                    bindings: bindAll(`${D}.bullet`, ['items']),
                })),
            card('Alarms', { title: 'Alarm load', hint: 'by weekday and hour (UTC)  ·  last 4 weeks', basis: 440, grow: 2 },
                chart('Chart', 'open.industrial.EventHeatmap', { valueLabel: 'alarms', showLegend: false, hourStep: 1 }, { bindings: bindAll(`${D}.heatmap`, ['cells']) })),
            card('Utilities', { title: 'Utilities', hint: 'live', basis: 340 },
                flex('Dials', { classes: 'Row', style: { gap: '4px' }, position: { basis: '0px', grow: 1, shrink: 1 } }, [
                    dial('Air', 'air'), dial('Chilled', 'chilled'), dial('Steam', 'steam'),
                ])),
        ]),
    ]),
};
