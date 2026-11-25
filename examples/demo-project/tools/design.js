'use strict';
/**
 * The design system: tokens, and the Perspective style classes built from them.
 * build.js writes one style-classes/Demo/<Name> resource per entry of CLASSES.
 * Views refer to tokens through this module and to classes by path ("Demo/Card").
 */

const color = {
    // Surfaces, darkest first. `card` is exactly the background of the IgnitionIndustrialDark
    // chart theme (#1a1a2e), so a chart and the card around it are one surface. Do not change
    // one without the other: the theme background cannot be overridden on the industrial
    // components (a non-empty `option` prop replaces their whole chart).
    page: '#0f0f1c',
    chrome: '#141425', // header and navigation rail
    card: '#1a1a2e',
    cardRaised: '#22223a',
    border: '#2a2a42',
    borderStrong: '#3a3a58',
    // text
    text: '#e6e7ef',
    textSecondary: '#a9acbf',
    textMuted: '#74778f',
    // one accent, used for selection and the primary series
    accent: '#6f8ce8',
    accentSoft: 'rgba(111, 140, 232, 0.16)',
    // status - used for ok / warning / alarm and for nothing else
    ok: '#3ba272',
    warn: '#e6a23c',
    alarm: '#e05252',
    // further series colours (never green / amber / red: those mean status)
    violet: '#b08bd9',
    cyan: '#48b8d0',
    pink: '#d98bb6',
    idle: '#5d6785',
};

const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
const radius = { card: 10, control: 6, pill: 999 };
const font = {
    family: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    // name: [size px, weight, line height px]
    eyebrow: [11, 600, 14],
    hint: [12, 400, 16],
    body: [13, 400, 18],
    cardTitle: [13, 600, 18],
    nav: [13, 500, 18],
    brand: [15, 600, 20],
    pageTitle: [22, 600, 28],
    clock: [20, 500, 24],
};
const type = name => ({ fontSize: `${font[name][0]}px`, fontWeight: String(font[name][1]), lineHeight: `${font[name][2]}px` });

/** Sizes shared by the shell and the pages. */
const layout = { headerHeight: 56, railWidth: 208, pageGap: 14, pagePadding: `${space.lg}px ${space.xl}px`, cardMinHeight: 250, tileHeight: 112 };

/** The chart theme every Open ECharts component uses. Its background is color.card. */
const chart = {
    theme: 'IgnitionIndustrialDark',
    // series colours in the order they should be used when a chart needs its own
    palette: [color.accent, color.cyan, color.violet, color.pink],
};

const px = n => `${n}px`;

/** style-classes/Demo/<key>/style.json */
const CLASSES = {
    Page: { base: { style: { backgroundColor: color.page, color: color.text, fontFamily: font.family, padding: layout.pagePadding, gap: px(layout.pageGap), overflowY: 'auto', overflowX: 'hidden', boxSizing: 'border-box' } } },
    Row: { base: { style: { gap: px(layout.pageGap) } } },
    Stack: { base: { style: { gap: px(space.xs) } } },
    PageTitle: { base: { style: Object.assign({ color: color.text, letterSpacing: '-0.01em' }, type('pageTitle')) } },
    PageSubtitle: { base: { style: Object.assign({ color: color.textSecondary }, type('body')) } },
    Eyebrow: { base: { style: Object.assign({ color: color.textMuted, textTransform: 'uppercase', letterSpacing: '0.09em' }, type('eyebrow')) } },
    Card: { base: { style: { backgroundColor: color.card, borderColor: color.border, borderStyle: 'solid', borderWidth: '1px', borderRadius: px(radius.card), padding: `${px(space.md)} ${px(space.lg)} ${px(space.sm)}`, overflow: 'hidden', boxSizing: 'border-box' } } },
    Tile: { base: { style: { backgroundColor: color.card, borderColor: color.border, borderStyle: 'solid', borderWidth: '1px', borderRadius: px(radius.card), padding: `${px(space.xs)} ${px(space.sm)}`, overflow: 'hidden', boxSizing: 'border-box' } } },
    CardHeader: { base: { style: { gap: px(space.sm), marginBottom: px(space.xs) } } },
    CardTitle: { base: { style: Object.assign({ color: color.text, letterSpacing: '0.01em', whiteSpace: 'nowrap' }, type('cardTitle')) } },
    CardHint: { base: { style: Object.assign({ color: color.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, type('hint')) } },
    Body: { base: { style: Object.assign({ color: color.textSecondary }, type('body')) } },
    Stat: { base: { style: { gap: px(space.sm) } } },
    StatLabel: { base: { style: Object.assign({ color: color.textSecondary, whiteSpace: 'nowrap' }, type('hint')) } },
    StatValue: { base: { style: { color: color.text, fontSize: '15px', fontWeight: '600', lineHeight: '20px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } } },
    StatValueLarge: { base: { style: { color: color.text, fontSize: '30px', fontWeight: '600', lineHeight: '34px', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } } },
    Chip: { base: { style: Object.assign({ color: color.accent, backgroundColor: color.accentSoft, borderRadius: px(radius.pill), padding: `2px ${px(space.sm + 2)}`, whiteSpace: 'nowrap' }, type('hint'), { fontWeight: '600' }) } },
    Header: { base: { style: { backgroundColor: color.chrome, borderBottom: `1px solid ${color.border}`, color: color.text, fontFamily: font.family, padding: `0 ${px(space.xl)}`, gap: px(space.lg), boxSizing: 'border-box' } } },
    HeaderBrand: { base: { style: Object.assign({ color: color.text, whiteSpace: 'nowrap' }, type('brand')) } },
    HeaderMeta: { base: { style: Object.assign({ color: color.textMuted, whiteSpace: 'nowrap' }, type('hint')) } },
    HeaderClock: { base: { style: Object.assign({ color: color.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }, type('clock')) } },
    BrandMark: { base: { style: { backgroundColor: color.accent, borderRadius: px(radius.control), color: '#ffffff' } } },
    Rail: { base: { style: { backgroundColor: color.chrome, borderRight: `1px solid ${color.border}`, color: color.text, fontFamily: font.family, padding: `${px(space.lg)} ${px(space.md)}`, gap: px(space.xs), boxSizing: 'border-box' } } },
    NavItem: {
        base: { style: Object.assign({ color: color.textSecondary, borderRadius: px(radius.control), padding: `0 ${px(space.md)}`, gap: px(space.md), cursor: 'pointer', boxSizing: 'border-box' }, type('nav')) },
        variants: [{ pseudo: 'hover', style: { backgroundColor: color.cardRaised, color: color.text } }],
    },
    NavItemActive: { base: { style: { backgroundColor: color.accentSoft, color: color.text } } },
    RailFooter: { base: { style: Object.assign({ color: color.textMuted, padding: `0 ${px(space.md)}` }, type('hint')) } },
};

module.exports = { color, space, radius, font, type, layout, chart, CLASSES, px };
