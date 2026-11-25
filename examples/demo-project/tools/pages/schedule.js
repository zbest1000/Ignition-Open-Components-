'use strict';
/**
 * Pages/Schedule: the week's production plan. Data: demo.data.schedule_page(line).
 * The plan covers all three lines; the line selector chooses the line of the campaign calendar.
 *
 * One order book feeds the Gantt, the bullet chart, the KPI tiles and the calendar (see
 * _schedule_line_week in demo.data), so an order has the same progress wherever it appears.
 */
const { design, flex, chart, card, row, kpiTile, pageHeading, page, label, bind, bindAll } = require('../lib/ui');
const { color } = design;

const D = 'view.custom.data';

// The colours the order book uses (SCHEDULE_COLORS in demo.data), for the hand-made Gantt legend.
const GANTT_LEGEND = [
    ['Line1', 'Line 1', color.accent], ['Line2', 'Line 2', color.cyan], ['Line3', 'Line 3', color.violet],
    ['Maintenance', 'Maintenance', color.idle], ['Done', 'Completed part', 'rgba(0, 0, 0, 0.45)'],
];
const PHASE_COLORS = { Charge: color.accent, Dissolve: color.cyan, Blend: color.violet, 'QA hold': color.warn, Transfer: color.pink, CIP: color.idle };

function legendItem(name, text, swatch) {
    return flex(name, { alignItems: 'center', style: { gap: '6px' }, position: { basis: 'auto', grow: 0, shrink: 0 } }, [
        flex('Swatch', { style: { backgroundColor: swatch, borderRadius: '2px', height: '8px', border: `1px solid ${color.borderStrong}` }, position: { basis: '14px', grow: 0, shrink: 0 } }, []),
        label('Text', text, { classes: 'CardHint' }),
    ]);
}

const tile = (key, props) => kpiTile(`Kpi${key[0].toUpperCase()}${key.slice(1)}`, `${D}.kpi.${key}`, props);

module.exports = {
    'Pages/Schedule': page('demo.data.schedule_page', [
        pageHeading('Planning', 'Scheduling', bind.prop(`${D}.meta.subtitle`), [
            label('Orders', bind.prop(`${D}.plan.orders`), { classes: 'Chip' }),
            label('Running', bind.prop(`${D}.plan.running`), { classes: 'Chip' }),
        ]),

        row('Kpis', [
            tile('adherence'),
            tile('due', { deltaFormat: 'absolute' }),
            tile('late', { deltaFormat: 'absolute' }),
            tile('changeover', { deltaFormat: 'absolute' }),
            tile('output'),
        ], { grow: 0 }),

        row('Plan', [
            card('Gantt', { title: 'Production orders', hint: 'this week  ·  hours from Monday 00:00 UTC', basis: 680, grow: 3, minHeight: 500 },
                flex('Legend', { wrap: 'wrap', alignItems: 'center', style: { gap: '4px 16px', marginTop: '2px' }, position: { basis: 'auto', grow: 0, shrink: 0 } },
                    GANTT_LEGEND.map(item => legendItem(...item))),
                // title ' ': the component draws "Gantt Chart" when the prop is empty
                chart('Chart', 'open.industrial.Gantt', { title: ' ', showProgress: true }, { bindings: bindAll(`${D}.gantt`, ['tasks']) })),
            card('Completion', { title: 'Order completion', hint: 'k units against plan to date', basis: 380, minHeight: 500 },
                chart('Chart', 'open.industrial.BulletChart', { color: color.accent, targetColor: color.text, statusColors: [color.alarm, color.warn, color.ok], ranges: [90, 97] }, {
                    bindings: bindAll(`${D}.bullet`, ['items', 'unit', 'decimals']),
                })),
        ], { grow: 3 }),

        row('Load', [
            card('Resources', { title: 'Machine utilisation', hint: 'percent of the hour at rated speed  ·  last 12 h', basis: 600, grow: 2, minHeight: 340 },
                chart('Chart', 'open.industrial.ResourceHeatmap', { title: ' ' }, { bindings: bindAll(`${D}.resources`, ['resources', 'timeSlots', 'utilization', 'maxValue']) })),
            card('Batches', { title: 'Syrup room batches', hint: 'minutes per phase  ·  last 5 batches', basis: 420, minHeight: 340 },
                chart('Chart', 'open.industrial.BatchTimeline', { title: ' ', phaseColors: PHASE_COLORS }, { bindings: bindAll(`${D}.batches`, ['phases']) })),
        ], { grow: 2 }),

        row('Calendars', [
            card('Shifts', { title: 'Crew rota', hint: 'four weeks from this Monday', basis: 480, minHeight: 320 },
                chart('Chart', 'open.industrial.ShiftCalendar', { title: ' ' }, { bindings: bindAll(`${D}.shifts`, ['patterns', 'crews', 'dateRange']) })),
            card('Campaigns', { title: 'Campaign calendar', hint: 'product planned per day  ·  this year', chip: bind.prop(`${D}.plan.campaign`), basis: 600, grow: 2, minHeight: 320 },
                chart('Chart', 'open.industrial.ScheduleCalendar', { title: ' ' }, { bindings: bindAll(`${D}.calendar`, ['year', 'entries', 'shiftColors']) })),
        ], { grow: 2 }),
    ]),
};
