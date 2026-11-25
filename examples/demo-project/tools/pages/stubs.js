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
};
