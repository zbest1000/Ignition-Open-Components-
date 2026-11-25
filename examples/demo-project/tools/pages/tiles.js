'use strict';
/**
 * The tile layout shared by the Chart Gallery (pages/gallery.js) and the 3D page (pages/threed.js):
 * sections with a heading and a rule, rows of groups, and tiles that show one generic chart each.
 *
 *   const { tile, group, section, count } = tiles(OPTIONS);
 *
 * OPTIONS.<key> = { type, example, option, props? }; `props` are further static props of the
 * component (for example `maps`).
 */
const { design, flex, chart, row, label } = require('../lib/ui');
const { color, px, space } = design;

const fill = { basis: '0px', grow: 1, shrink: 1 };
const fixed = { basis: 'auto', grow: 0, shrink: 0 };

function tiles(OPTIONS) {
    let count = 0;

    /**
     * One tile: title, a caption naming the component (and the wiki example the option comes from),
     * and the chart. opts: units (relative width in its row, default 1), bindings (live tiles).
     */
    function tile(name, title, key, opts = {}) {
        const spec = OPTIONS[key];
        if (!spec) throw new Error(`no tile option "${key}"`);
        count += 1;
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
            chart('Chart', spec.type, Object.assign({ option: spec.option }, spec.props || {}), { bindings: opts.bindings, style: { minWidth: '0px' } }),
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

    return { tile, group, section, count: () => count };
}

module.exports = { tiles };
