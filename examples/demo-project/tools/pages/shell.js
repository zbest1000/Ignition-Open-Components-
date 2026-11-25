'use strict';
/** The shell: the header (top dock) and the navigation rail (left dock). */
const { design, flex, label, icon, dropdown, bind, view } = require('../lib/ui');
const { color, layout } = design;

/** The pages of the project, in navigation order. build.js writes page-config from this list. */
const PAGES = [
    { url: '/', view: 'Pages/Overview', title: 'Overview', icon: 'material/dashboard', group: 'Monitor' },
    { url: '/line', view: 'Pages/Line', title: 'Line Performance', icon: 'material/timeline', group: 'Monitor' },
    { url: '/quality', view: 'Pages/Quality', title: 'Quality', icon: 'material/verified_user', group: 'Monitor' },
    { url: '/energy', view: 'Pages/Energy', title: 'Energy & Utilities', icon: 'material/flash_on', group: 'Monitor' },
    { url: '/schedule', view: 'Pages/Schedule', title: 'Scheduling', icon: 'material/event', group: 'Plan' },
    { url: '/gallery', view: 'Pages/Gallery', title: 'Chart Gallery', icon: 'material/apps', group: 'Reference' },
];

const LINE_OPTIONS = [
    { label: 'Line 1  ·  Glass 330 mL', value: 'L1' },
    { label: 'Line 2  ·  PET 1.5 L', value: 'L2' },
    { label: 'Line 3  ·  Cans 500 mL', value: 'L3' },
];

const fixed = basis => ({ basis, grow: 0, shrink: 0 });

const header = view(
    flex('root', { alignItems: 'center', classes: 'Header' }, [
        flex('BrandMark', { alignItems: 'center', justify: 'center', classes: 'BrandMark', style: { height: '30px' }, position: fixed('30px') }, [
            icon('Icon', 'material/bubble_chart', { size: 20, color: '#ffffff' }),
        ]),
        flex('Brand', { direction: 'column', justify: 'center', position: fixed('auto') }, [
            label('Plant', 'Meridian Bottling Plant', { classes: 'HeaderBrand' }),
            label('Product', 'Open ECharts Demo', { classes: 'HeaderMeta' }),
        ]),
        flex('Spacer', { position: { basis: '0px', grow: 1, shrink: 1 } }, []),
        label('LineLabel', 'Line', { classes: 'Eyebrow' }),
        dropdown('LineSelector', LINE_OPTIONS, {
            position: fixed('230px'),
            style: { height: '34px' },
            bindings: { value: bind.twoWay('session.custom.line') },
        }),
        flex('Clock', { direction: 'column', alignItems: 'flex-end', justify: 'center', style: { marginLeft: '8px' }, position: fixed('auto') }, [
            label('Time', bind.expr('dateFormat(now(1000), "HH:mm:ss")'), { classes: 'HeaderClock' }),
            label('Date', bind.expr('dateFormat(now(30000), "EEE d MMM yyyy")'), { classes: 'HeaderMeta' }),
        ]),
    ]),
    { height: layout.headerHeight, width: 1920 },
);

function navItem(page) {
    const active = `{page.props.path} = "${page.url}"`;
    return flex(`Nav${page.view.split('/').pop()}`, {
        alignItems: 'center',
        classes: 'NavItem',
        style: { height: '40px' },
        position: fixed('40px'),
        bindings: { 'style.classes': bind.expr(`if(${active}, "Demo/NavItem Demo/NavItemActive", "Demo/NavItem")`) },
        events: { dom: { onClick: { config: { page: page.url }, scope: 'C', type: 'nav' } } },
    }, [
        icon('Icon', page.icon, { size: 20, bindings: { color: bind.expr(`if(${active}, "${color.accent}", "${color.textMuted}")`) } }),
        label('Label', page.title, { position: { basis: '0px', grow: 1, shrink: 1 } }),
    ]);
}

function rail() {
    const children = [];
    let group = null;
    for (const page of PAGES) {
        if (page.group !== group) {
            group = page.group;
            children.push(label(`Group${group}`, group, { classes: 'Eyebrow', style: { padding: `${children.length ? 18 : 2}px 12px 6px` } }));
        }
        children.push(navItem(page));
    }
    children.push(flex('Spacer', { position: { basis: '0px', grow: 1, shrink: 1 } }, []));
    children.push(label('FooterModule', 'Open ECharts module', { classes: 'RailFooter' }));
    children.push(label('FooterData', 'Simulated data  ·  no tags', { classes: 'RailFooter' }));
    return view(flex('root', { direction: 'column', classes: 'Rail' }, children), { height: 1024, width: layout.railWidth });
}

module.exports = { PAGES, LINE_OPTIONS, views: { 'Shell/Header': header, 'Shell/NavRail': rail() } };
