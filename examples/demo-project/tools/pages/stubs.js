'use strict';
/**
 * Placeholder pages. Each one already polls its data function, so the navigation works and the
 * page shows what it will contain. Replace an entry here with a real page module (see overview.js)
 * and require that module from pages/index.js.
 */
const { flex, card, row, pageHeading, page, markdown, bind } = require('../lib/ui');

const D = 'view.custom.data';

function stub(title, eyebrow, dataFn, planned) {
    const source = [
        `**${title}** is not built yet.`,
        '',
        `Its sample data is ready: \`${dataFn}(line)\` in the project library already returns everything listed here, and this view polls it into \`view.custom.data\`.`,
        '',
        'Planned components:',
        '',
        ...planned.map(item => `- ${item}`),
    ].join('\n');
    return page(dataFn, [
        pageHeading(eyebrow, title, bind.prop(`${D}.meta.subtitle`)),
        row('Content', [
            card('Planned', { title: 'Coming next', hint: 'see CONVENTIONS.md', basis: 520, grow: 0, minHeight: 240 },
                markdown('Text', source, { classes: 'Body', position: { basis: 'auto', grow: 1, shrink: 1 } })),
            flex('Spacer', { position: { basis: '0px', grow: 1, shrink: 1 } }, []),
        ], { grow: 0 }),
    ]);
}

module.exports = {
    'Pages/Line': stub('Line Performance', 'Selected line', 'demo.data.line_page', [
        'KPI Tiles for the selected line', 'OEE Summary and Waterfall (planned time to productive time)',
        'Industrial Trend of line speed (4 h)', 'State Timeline per machine', 'Pareto and Downtime Tracker', 'Radar Comparison of the three lines',
    ]),
    'Pages/Quality': stub('Quality', 'QA lab', 'demo.data.quality_page', [
        'SPC Chart of fill volume and closure torque', 'Process Capability Histogram (Cp / Cpk)', 'Industrial Trend of fill volume with limits',
        'Flow Diagram of material losses', 'Pareto of defects by category',
    ]),
    'Pages/Energy': stub('Energy & Utilities', 'Utilities', 'demo.data.energy_page', [
        'Dial Gauges and Metric Rings for the utilities', 'Flow Diagram (Sankey) of site energy', 'Bar / line charts of hourly consumption',
        'Calendar heatmap of daily performance', 'Event Heatmap of alarm load',
    ]),
    'Pages/Schedule': stub('Scheduling', 'Planning', 'demo.data.schedule_page', [
        'Gantt Chart of production orders', 'Shift Calendar and Schedule Calendar', 'Downtime Tracker', 'Batch Timeline of the syrup room',
        'Resource Heatmap of machine utilisation',
    ]),
    'Pages/Gallery': stub('Chart Gallery', 'Reference', 'demo.data.gallery_page', [
        'Line, bar and pie charts from docs/wiki/examples', 'Sunburst and treemap of the SKU mix', 'Graph and Sankey', 'Calendar heatmap',
        '3D bar / surface (ECharts-GL)',
    ]),
};
