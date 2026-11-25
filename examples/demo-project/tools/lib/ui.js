'use strict';
/**
 * A small builder for view.json documents, so that pages share one card pattern and
 * one way of binding. Each helper returns a plain component object in the shape the
 * Designer writes (see FORMAT-NOTES.md); build.js serialises them.
 *
 *   const { view, page, row, card, chart, label, bind } = require('../lib/ui');
 */
const design = require('../design');

const cls = (...names) => names.filter(Boolean).map(n => (n.includes('/') ? n : `Demo/${n}`)).join(' ');

// ---- bindings ---------------------------------------------------------------------------

/** Property binding. bind.prop('view.custom.data.oee.availability') */
const prop = (path, extra) => ({ binding: { config: Object.assign({ path }, extra || {}), type: 'property' } });
/** Expression binding (type "expr"). Only the subset in tools/lib/expr.js. */
const expr = expression => ({ binding: { config: { expression }, type: 'expr' } });
/** Two-way property binding, for inputs. */
const twoWay = path => prop(path, { bidirectional: true });
const bind = { prop, expr, twoWay };

/**
 * { value: bind.prop(...), 'style.classes': bind.expr(...) } -> propConfig keyed "props.value", ...
 * A key that already starts with props. / meta. / position. / custom. is kept as it is.
 */
function propConfig(bindings) {
    const out = {};
    for (const [key, value] of Object.entries(bindings || {})) {
        out[/^(props|meta|position|custom)\./.test(key) ? key : `props.${key}`] = value;
    }
    return out;
}

/** Bind several props below one data path: bindAll('view.custom.data.oee', ['availability', 'quality']) */
function bindAll(base, names) {
    const out = {};
    for (const name of names) out[name] = prop(`${base}.${name}`);
    return out;
}

// ---- components -------------------------------------------------------------------------

function component(type, name, { props, position, bindings, events, custom } = {}) {
    const node = { meta: { name }, type };
    if (position) node.position = position;
    if (props && Object.keys(props).length) node.props = props;
    const config = propConfig(bindings);
    if (Object.keys(config).length) node.propConfig = config;
    if (events) node.events = events;
    if (custom) node.custom = custom;
    return node;
}

/** style object from { classes, style } */
function styleOf({ classes, style } = {}) {
    const out = Object.assign({}, style || {});
    if (classes) out.classes = Array.isArray(classes) ? cls(...classes) : cls(...String(classes).split(' '));
    return Object.keys(out).length ? out : undefined;
}

/**
 * Flex container. Like the Designer, only non-default layout props are written
 * (defaults: direction row, wrap nowrap, justify flex-start, alignItems stretch, alignContent stretch).
 * opts: direction, wrap, justify, alignItems, alignContent, classes, style, position, bindings, events
 */
const FLEX_DEFAULTS = { direction: 'row', wrap: 'nowrap', justify: 'flex-start', alignItems: 'stretch', alignContent: 'stretch' };
function flex(name, opts, children) {
    const props = {};
    for (const [key, standard] of Object.entries(FLEX_DEFAULTS)) if (opts[key] && opts[key] !== standard) props[key] = opts[key];
    const style = styleOf(opts);
    if (style) props.style = style;
    const node = component('ia.container.flex', name, { props, position: opts.position, bindings: opts.bindings, events: opts.events });
    node.children = (children || []).filter(Boolean);
    return node;
}

/** Label. text may be a string or a binding. */
function label(name, text, opts = {}) {
    const props = {};
    const bindings = Object.assign({}, opts.bindings);
    if (text && text.binding) bindings.text = text; else props.text = text;
    const style = styleOf(opts);
    if (style) props.style = style;
    return component('ia.display.label', name, { props, position: opts.position || { basis: 'auto', grow: 0, shrink: 0 }, bindings });
}

/** Icon from an icon library: icon('Icon', 'material/dashboard', { size: 20 }) */
function icon(name, path, opts = {}) {
    const size = opts.size || 20;
    const props = { path };
    if (opts.color) props.color = opts.color;
    const style = styleOf(opts);
    if (style) props.style = style;
    return component('ia.display.icon', name, { props, position: opts.position || { basis: `${size}px`, grow: 0, shrink: 0 }, bindings: opts.bindings });
}

/** Embedded view. */
function embed(name, viewPath, params, opts = {}) {
    const props = { path: viewPath, params: params || {}, useDefaultViewWidth: false, useDefaultViewHeight: false };
    const style = styleOf(opts);
    if (style) props.style = style;
    return component('ia.display.view', name, { props, position: opts.position, bindings: opts.bindings });
}

function dropdown(name, options, opts = {}) {
    const props = { options, showClearIcon: false };
    const style = styleOf(opts);
    if (style) props.style = style;
    return component('ia.input.dropdown', name, { props, position: opts.position, bindings: opts.bindings });
}

function markdown(name, source, opts = {}) {
    const props = { source };
    const style = styleOf(opts);
    if (style) props.style = style;
    return component('ia.display.markdown', name, { props, position: opts.position || { basis: 'auto', grow: 0, shrink: 0 } });
}

/**
 * An Open ECharts component with the project's chart theme.
 *   chart('Oee', 'open.industrial.OEE', { target: 85 }, { bindings: bindAll('view.custom.data.oee', [...]) })
 * Static props go in `props`; data goes in `bindings`.
 *
 * Do not pass `option` to an industrial / scheduling component to tweak it: a non-empty option
 * replaces the chart the component builds from its own props. On the generic chart components
 * (open.echarts.*) `option` is the chart, and the theme supplies colours and background.
 */
function chart(name, type, props, opts = {}) {
    const all = Object.assign({ theme: design.chart.theme }, props || {});
    const style = styleOf(opts);
    if (style) all.style = style;
    return component(type, name, { props: all, position: opts.position || { basis: '0px', grow: 1, shrink: 1 }, bindings: opts.bindings });
}

/**
 * The props of a worked example from docs/wiki/examples/<Component>.json, as a starting point for a
 * generic chart: chart('Mix', 'open.echarts.SunburstChart', wikiExample('SunburstChart', 'monochrome'), {
 *     bindings: { 'option.series[0].data': bind.prop('view.custom.data.mix.tree') } })
 * The example's own data stays in the view as the fallback; bind over it. Examples that hard-code
 * text colours for a light background say so in their description: check the preview.
 */
function wikiExample(component, id) {
    const file = require('path').join(__dirname, '..', '..', '..', '..', 'docs', 'wiki', 'examples', `${component}.json`);
    const entry = JSON.parse(require('fs').readFileSync(file, 'utf8')).find(e => e.id === id);
    if (!entry) throw new Error(`docs/wiki/examples/${component}.json has no example "${id}"`);
    const props = JSON.parse(JSON.stringify(entry.props));
    delete props.theme; // chart() sets the project theme
    return props;
}

// ---- patterns ---------------------------------------------------------------------------

/**
 * The card: a bordered surface with a title row and one body that fills the rest.
 *   card('Oee', { title: 'OEE', hint: 'last 8 h', basis: 340, grow: 1 }, chart(...))
 * opts: title, hint (string or binding), basis (px), grow, minHeight (px), chip (string or binding)
 */
function card(name, opts, ...body) {
    const header = flex('Header', { alignItems: 'center', classes: 'CardHeader', position: { basis: 'auto', grow: 0, shrink: 0 } }, [
        label('Title', opts.title, { classes: 'CardTitle' }),
        opts.hint ? label('Hint', opts.hint, { classes: 'CardHint', position: { basis: '0px', grow: 1, shrink: 1 } }) : null,
        opts.chip ? label('Chip', opts.chip, { classes: 'Chip' }) : null,
    ]);
    return flex(name, {
        direction: 'column',
        classes: 'Card',
        style: { minHeight: design.px(opts.minHeight || design.layout.cardMinHeight), minWidth: '0px' },
        position: { basis: design.px(opts.basis || 360), grow: opts.grow === undefined ? 1 : opts.grow, shrink: 1 },
    }, [header, ...body]);
}

/**
 * One line of a hand-made legend: a colour dot, a caption and a value.
 *   stat('Availability', 'Availability', bind.expr('numberFormat({view.custom.data.oee.availability}, "0.0") + " %"'), color.cyan)
 * opts.large: the value on its own line in the large size (for the headline number).
 */
function stat(name, caption, value, dotColor, opts = {}) {
    const dot = dotColor ? flex('Dot', { style: { backgroundColor: dotColor, borderRadius: '50%', height: '8px' }, position: { basis: '8px', grow: 0, shrink: 0 } }, []) : null;
    if (opts.large) {
        return flex(name, { direction: 'column', position: { basis: 'auto', grow: 0, shrink: 0 } }, [
            flex('Caption', { alignItems: 'center', classes: 'Stat', position: { basis: 'auto', grow: 0, shrink: 0 } }, [dot, label('Label', caption, { classes: 'StatLabel' })]),
            label('Value', value, { classes: 'StatValueLarge' }),
        ]);
    }
    return flex(name, { alignItems: 'center', classes: 'Stat', position: { basis: 'auto', grow: 0, shrink: 0 } }, [
        dot,
        label('Label', caption, { classes: 'StatLabel', position: { basis: '0px', grow: 1, shrink: 1 } }),
        label('Value', value, { classes: 'StatValue' }),
    ]);
}

/** A row of cards that wraps on narrow screens and shares spare height on tall ones. */
function row(name, children, opts = {}) {
    return flex(name, {
        wrap: 'wrap',
        classes: 'Row',
        position: { basis: 'auto', grow: opts.grow === undefined ? 1 : opts.grow, shrink: 0 },
    }, children);
}

/** A KPI Tile in its tile surface. data: path of one entry of demo.data.kpis() */
function kpiTile(name, data, props = {}) {
    return flex(name, {
        direction: 'column',
        classes: 'Tile',
        style: { height: design.px(design.layout.tileHeight), minWidth: '0px' },
        position: { basis: '172px', grow: 1, shrink: 1 },
    }, [
        chart('Kpi', 'open.industrial.KpiTile', Object.assign({ color: design.color.accent, goodColor: design.color.ok, badColor: design.color.alarm }, props), {
            bindings: bindAll(data, ['title', 'value', 'unit', 'decimals', 'previous', 'target', 'higherIsBetter', 'deltaLabel', 'history']),
        }),
    ]);
}

/** Page heading: eyebrow, title, subtitle on the left; anything in `right` on the right. */
function pageHeading(eyebrow, title, subtitle, right) {
    return flex('Heading', { alignItems: 'flex-end', classes: 'Row', position: { basis: 'auto', grow: 0, shrink: 0 } }, [
        flex('Titles', { direction: 'column', classes: 'Stack', position: { basis: '0px', grow: 1, shrink: 1 } }, [
            label('Eyebrow', eyebrow, { classes: 'Eyebrow' }),
            label('Title', title, { classes: 'PageTitle' }),
            subtitle ? label('Subtitle', subtitle, { classes: 'PageSubtitle' }) : null,
        ]),
        ...(right || []),
    ]);
}

/**
 * A page view: view.custom.data is filled by one polling runScript() call and the root is a
 * scrolling column. dataFn: 'demo.data.overview' (it receives the selected line).
 */
function page(dataFn, children, opts = {}) {
    const doc = {
        custom: { data: {} },
        params: {},
        propConfig: {},
        props: { defaultSize: { height: opts.height || 1024, width: opts.width || 1712 } },
        root: flex('root', { direction: 'column', classes: 'Page' }, children),
    };
    if (dataFn) {
        doc.propConfig['custom.data'] = Object.assign(expr(`runScript("${dataFn}", ${opts.pollMs || 5000}, {session.custom.line})`), { persistent: false });
    } else {
        delete doc.custom.data;
    }
    return doc;
}

/** A view that is not a page (docks, embedded views). */
function view(root, opts = {}) {
    return {
        custom: opts.custom || {},
        params: opts.params || {},
        propConfig: opts.propConfig || {},
        props: { defaultSize: { height: opts.height || 300, width: opts.width || 400 } },
        root,
    };
}

module.exports = { design, cls, bind, bindAll, component, flex, label, icon, embed, dropdown, markdown, chart, wikiExample, card, row, stat, kpiTile, pageHeading, page, view };
