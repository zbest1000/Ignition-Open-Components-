'use strict';
/**
 * The ECharts options of the Chart Gallery page (pages/gallery.js), one entry per tile.
 *
 * Every 2D option is a verified, function-free example from docs/wiki/examples/<Component>.json,
 * taken as it is and then adjusted for this project by a small patch function: the dark
 * IgnitionIndustrialDark theme, the card surface (#1a1a2e) and the size of the tile. The patches
 * are the list of what an integrator has to touch when copying a wiki example onto a dark view.
 * The 3D options start from the component defaults in components.manifest.json.
 *
 *   OPTIONS.<key> = { type, example, option }
 *
 * What the patches do, in general:
 *   - the heading inside the chart is removed (the card has the title) and the grid moved up;
 *   - `color` is set to the project's series palette (blue, cyan, violet, pink and tints of them);
 *     green, amber and red are used only where the example means good / warning / bad;
 *   - anything a light page was assumed for is replaced: white borders and tick marks, dark label
 *     text, light split areas, mid-grey axis colours the theme does not reach (radar, calendar,
 *     parallel, timeline, matrix, 3D axes);
 *   - font sizes, radii and margins are reduced where the example was drawn for a larger chart.
 */
const path = require('path');
const { wikiExample, design } = require('../lib/ui');

const C = design.color;

// ---- colour helpers ---------------------------------------------------------------------

const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const hex2 = n => Math.round(n).toString(16).padStart(2, '0');
/** mix('#aabbcc', '#ffffff', 0.3): 30 % of the way from the first colour to the second */
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return `#${x.map((v, i) => hex2(v + (y[i] - v) * t)).join('')}`; };
const alpha = (hex, a) => `rgba(${rgb(hex).join(', ')}, ${a})`;
const WHITE = '#ffffff';

/** Series colours: the four of design.chart.palette, then a lighter and a darker round of them. */
const PALETTE = [
    C.accent, C.cyan, C.violet, C.pink,
    mix(C.accent, WHITE, 0.38), mix(C.cyan, C.card, 0.38), mix(C.violet, WHITE, 0.35), mix(C.pink, C.card, 0.35),
    mix(C.accent, C.card, 0.42), mix(C.cyan, WHITE, 0.45),
];
/** A sequential ramp on the accent, dark to light, for magnitudes that are not a status. */
const RAMP = [mix(C.accent, C.card, 0.78), mix(C.accent, C.card, 0.45), C.accent, mix(C.accent, WHITE, 0.45)];
/** Cold to hot, for temperatures. */
const THERMAL = [mix(C.accent, C.card, 0.6), C.accent, C.cyan, mix(C.warn, WHITE, 0.6), C.warn, C.alarm];
const STATUS_RAMP = [C.alarm, C.warn, C.ok];
const TRACK = alpha(WHITE, 0.07); // the unfilled part of a gauge or progress bar
const LINE = C.borderStrong;      // axis lines the theme does not style
const FAINT = C.border;           // split lines

const LEGEND = { textStyle: { color: C.textSecondary, fontSize: 11 }, itemWidth: 14, itemHeight: 9, itemGap: 12 };

// ---- loading ----------------------------------------------------------------------------

const OPTIONS = {};

/** Registers a tile option from a wiki example; patch(option) may change it or return a new one. */
function fromWiki(key, component, example, patch) {
    let option = wikiExample(component, example).option;
    delete option.title;
    option.color = PALETTE.slice();
    for (const legend of [].concat(option.legend || [])) Object.assign(legend, LEGEND, { textStyle: Object.assign({}, LEGEND.textStyle) });
    if (patch) option = patch(option) || option;
    OPTIONS[key] = { type: `open.echarts.${component}`, example, option };
}

const manifest = require(path.join(__dirname, '..', '..', '..', '..', 'common', 'src', 'main', 'resources', 'components.manifest.json'));
function fromDefault(key, component, patch) {
    const row = manifest.components.find(c => c.id === `open.echarts.${component}`);
    if (!row) throw new Error(`components.manifest.json has no open.echarts.${component}`);
    let option = JSON.parse(JSON.stringify(row.defaultOption));
    option = patch(option) || option;
    OPTIONS[key] = { type: row.id, example: 'default option', option };
}

/** Deterministic pseudo-random numbers for the generated point cloud (no Math.random: builds must be reproducible). */
function generator(seed) {
    let s = seed >>> 0;
    const next = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
    const gauss = () => (next() + next() + next() + next() - 2) * 1.7320508;
    return { next, gauss };
}

// ---- Gauges & KPIs ----------------------------------------------------------------------

fromWiki('gaugeTemperature', 'GaugeChart', 'temperature', o => {
    const [arc, edge] = o.series;
    for (const s of o.series) { s.center = ['50%', '60%']; s.radius = '88%'; }
    arc.itemStyle.color = alpha(C.accent, 0.5);
    arc.progress.width = 16;
    arc.axisLine.lineStyle = { width: 16, color: [[1, TRACK]] };
    arc.axisTick = { show: false };
    arc.splitLine = { distance: -24, length: 6, lineStyle: { width: 1.5, color: C.textMuted } };
    arc.splitNumber = 6;
    arc.axisLabel = { distance: -12, color: C.textMuted, fontSize: 10 };
    arc.detail.fontSize = 26;
    arc.detail.fontWeight = 600;
    arc.detail.color = C.text;
    arc.detail.offsetCenter = [0, '-6%'];
    edge.itemStyle.color = C.accent;
    edge.progress.width = 4;
});

fromWiki('gaugeSpeed', 'GaugeChart', 'speed', o => {
    const s = o.series[0];
    s.center = ['50%', '68%'];
    s.radius = '100%';
    s.itemStyle = { color: C.cyan, shadowColor: alpha(C.cyan, 0.45), shadowBlur: 10 };
    s.progress.width = 10;
    s.pointer.width = 8;
    s.pointer.length = '62%';
    s.axisLine.lineStyle = { width: 10, color: [[1, TRACK]] };
    s.axisTick = { show: false };
    s.splitNumber = 6;
    s.splitLine = { length: 6, distance: 6, lineStyle: { width: 1.5, color: C.textMuted } };
    s.axisLabel = { distance: 16, color: C.textMuted, fontSize: 10 };
    s.detail = {
        offsetCenter: [0, '34%'], valueAnimation: true, formatter: '{value|{value}}{unit|bpm}',
        rich: { value: { fontSize: 24, fontWeight: 600, color: C.text }, unit: { fontSize: 11, color: C.textMuted, padding: [0, 0, -6, 6] } },
    };
});

fromWiki('gaugeRing', 'GaugeChart', 'ring', o => {
    const s = o.series[0];
    o.color = [C.ok, C.warn, C.alarm]; // good, rework, scrap: a status each
    s.radius = '90%';
    s.center = ['50%', '52%'];
    s.axisLine.lineStyle = { width: 30, color: [[1, TRACK]] };
    s.title = { fontSize: 11, color: C.textSecondary };
    s.detail = Object.assign(s.detail, { width: 38, height: 11, fontSize: 11 });
    // name on the left and value on the right of one line: stacked, they collide in a small ring
    const rows = ['-27%', '0%', '27%'];
    s.data.forEach((d, i) => { d.title.offsetCenter = ['-33%', rows[i]]; d.detail.offsetCenter = ['27%', rows[i]]; });
});

fromWiki('gaugeStage', 'GaugeChart', 'stage', o => {
    const s = o.series[0];
    s.radius = '92%';
    s.center = ['50%', '56%'];
    s.axisLine.lineStyle = { width: 14, color: [[0.3, C.cyan], [0.7, C.accent], [1, C.alarm]] };
    // ticks are cut out of the band: they take the card colour, not white
    s.axisTick = { distance: -14, length: 4, lineStyle: { color: C.card, width: 1 } };
    s.splitLine = { distance: -14, length: 14, lineStyle: { color: C.card, width: 2 } };
    s.axisLabel = { color: C.textMuted, distance: 20, fontSize: 10 };
    s.pointer = { width: 4, length: '58%', itemStyle: { color: 'auto' } };
    s.detail = Object.assign(s.detail, { fontSize: 15, fontWeight: 600, offsetCenter: [0, '80%'] });
});

fromWiki('gaugeGrade', 'GaugeChart', 'grade', o => {
    const [gauge, names] = o.series;
    const grades = [C.alarm, C.warn, C.cyan, C.ok];
    for (const s of o.series) s.center = ['50%', '74%'];
    gauge.radius = '118%';
    gauge.axisLine.lineStyle = { width: 4, color: grades.map((c, i) => [(i + 1) / 4, c]) };
    gauge.axisTick = { length: 5, lineStyle: { color: 'auto', width: 1.5 } };
    gauge.splitLine = { length: 10, lineStyle: { color: 'auto', width: 3 } };
    Object.assign(gauge.pointer, { width: 10, length: '10%', offsetCenter: [0, '-44%'] });
    gauge.title = { offsetCenter: [0, '2%'], fontSize: 11, color: C.textSecondary };
    gauge.detail = Object.assign(gauge.detail, { fontSize: 24, fontWeight: 600, offsetCenter: [0, '-17%'] });
    names.radius = ['74%', '98%'];
    names.label.fontSize = 10;
    names.data.forEach((d, i) => { d.label.color = grades[i]; });
});

fromWiki('gaugeMultiTitle', 'GaugeChart', 'multi-title', o => {
    const s = o.series[0];
    o.color = [C.accent, C.cyan, C.pink];
    s.radius = '80%';
    s.center = ['50%', '46%'];
    s.anchor = { show: true, showAbove: true, size: 12, itemStyle: { color: C.text } };
    s.pointer.width = 5;
    s.progress.width = 6;
    s.axisLine.lineStyle = { width: 6, color: [[1, TRACK]] };
    s.axisTick = { show: false };
    s.splitNumber = 5;
    s.splitLine = { length: 6, distance: 5, lineStyle: { color: C.textMuted, width: 1.5 } };
    s.axisLabel = { fontSize: 10, distance: 14, color: C.textMuted };
    s.title = { fontSize: 10, color: C.textSecondary };
    s.detail = Object.assign(s.detail, { width: 30, height: 12, fontSize: 10, color: C.page });
    const columns = ['-62%', '0%', '62%'];
    s.data.forEach((d, i) => { d.title.offsetCenter = [columns[i], '92%']; d.detail.offsetCenter = [columns[i], '116%']; });
});

// ---- Comparison -------------------------------------------------------------------------

fromWiki('barMixed', 'BarChart', 'mixed-line-bar', o => {
    // live: xAxis.data and the three series are bound to demo.data.energy_series (see gallery.js)
    o.color = [C.accent, C.cyan, C.pink];
    o.legend.top = 0;
    o.grid = { left: 52, right: 44, top: 44, bottom: 26 };
    o.xAxis.axisLabel = { interval: 3 };
    o.yAxis = [
        { type: 'value', name: 'kWh', nameTextStyle: { color: C.textMuted }, splitNumber: 4 },
        { type: 'value', name: 'm³', nameTextStyle: { color: C.textMuted }, splitNumber: 4, splitLine: { show: false } },
    ];
    o.series[0].name = 'Electricity';
    o.series[1].name = 'Natural gas';
    Object.assign(o.series[2], { name: 'Water', smooth: true, showSymbol: false, lineStyle: { width: 2 } });
    for (const s of o.series.slice(0, 2)) s.itemStyle = { borderRadius: [2, 2, 0, 0] };
});

fromWiki('lineStackedArea', 'LineChart', 'stacked-area', o => {
    o.legend.top = 0;
    o.grid = { left: 46, right: 20, top: 40, bottom: 26 };
    delete o.yAxis.name; // it sat under the legend in a tile of this width
    for (const s of o.series) { s.showSymbol = false; s.lineStyle = { width: 1.5 }; s.areaStyle = { opacity: 0.55 }; }
    const top = o.series[o.series.length - 1];
    top.showSymbol = true;
    top.label = { show: true, position: 'top', color: C.textSecondary, fontSize: 11 };
});

fromWiki('barPolar', 'BarChart', 'polar-tangential', o => {
    // live: radiusAxis.data and series.data are bound to demo.data.gallery_live().machines
    o.polar = { radius: ['16%', '84%'], center: ['50%', '52%'] };
    o.angleAxis = Object.assign(o.angleAxis, {
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: C.textMuted, fontSize: 10 }, splitLine: { lineStyle: { color: FAINT } },
    });
    o.angleAxis.splitNumber = 5;
    // the names sit at the start of each ring (on the axis) instead of inside it: a ring is too thin for text here
    o.radiusAxis.axisLine = { show: false };
    o.radiusAxis.axisLabel = { show: true, interval: 0, color: C.textSecondary, fontSize: 10, margin: 8 };
    o.series = Object.assign(o.series, {
        roundCap: true, barWidth: '58%', colorBy: 'data', showBackground: true, backgroundStyle: { color: TRACK },
        label: { show: false },
    });
});

fromWiki('radarCircle', 'RadarChart', 'circle-areas', o => {
    o.color = [C.cyan, C.pink];
    o.legend.bottom = 0;
    o.radar = Object.assign(o.radar, {
        center: ['50%', '46%'], radius: '64%',
        axisName: { color: C.textSecondary, fontSize: 11 },
        // the example's bright turquoise rings become four steps of the accent on the card
        splitArea: { areaStyle: { color: [0.05, 0.1, 0.15, 0.2].map(a => alpha(C.accent, a)) } },
        axisLine: { lineStyle: { color: LINE } },
        splitLine: { lineStyle: { color: LINE } },
    });
    const [first, second] = o.series[0].data;
    first.areaStyle = { color: alpha(C.cyan, 0.3) };
    second.areaStyle = { color: alpha(C.pink, 0.3) };
    o.series[0].symbolSize = 5;
    o.series[0].lineStyle = { width: 2 };
});

fromWiki('pictorialTanks', 'PictorialBarChart', 'tank-levels', o => {
    const [level, capacity] = o.series;
    o.grid = { left: 16, right: 16, top: 34, bottom: 28 };
    o.xAxis.axisLabel = { color: C.textSecondary };
    level.itemStyle.color = C.accent;
    level.label = Object.assign(level.label, { color: C.text, fontSize: 12, fontWeight: 600 });
    level.data = level.data.map(d => (typeof d === 'object' ? Object.assign(d, { itemStyle: { color: C.alarm } }) : d)); // the low tank
    capacity.itemStyle = { color: alpha(WHITE, 0.05), borderColor: LINE, borderWidth: 1 };
});

fromWiki('pictorialSegments', 'PictorialBarChart', 'segmented', o => {
    const [output, track, plan] = o.series;
    o.legend.top = 0;
    o.grid = { left: 46, right: 12, top: 38, bottom: 26 };
    o.yAxis.nameTextStyle = { color: C.textMuted };
    for (const s of [output, track]) s.symbolSize = [26, 4];
    output.itemStyle = { color: C.accent };
    track.itemStyle = { color: C.accent, opacity: 0.14 };
    plan.itemStyle = { color: C.pink }; // was orange, which reads as a warning here
    plan.lineStyle = { width: 2, color: C.pink };
    plan.symbolSize = 6;
});

fromWiki('barProgress', 'BarChart', 'progress-background', o => {
    const s = o.series[0];
    o.grid = { left: 68, right: 48, top: 10, bottom: 24 };
    o.xAxis.splitLine = { show: false };
    o.yAxis.axisLine = { show: false };
    o.yAxis.axisLabel = { color: C.textSecondary };
    s.barWidth = 14;
    s.backgroundStyle = { color: TRACK, borderRadius: 7 };
    s.itemStyle = { borderRadius: 7, color: C.cyan };
    s.label = Object.assign(s.label, { color: C.text, fontSize: 11 });
});

fromWiki('funnelCompare', 'FunnelChart', 'compare', o => {
    const [expected, actual] = o.series;
    delete o.legend; // the stages are named beside the funnel
    for (const s of o.series) Object.assign(s, { top: 8, bottom: 8, left: '4%', width: '62%' });
    expected.label = Object.assign(expected.label, { color: C.textSecondary, fontSize: 11 });
    expected.labelLine = { show: true, length: 12, lineStyle: { color: LINE, opacity: 1 } };
    expected.itemStyle = { opacity: 0.3, borderColor: C.card, borderWidth: 1 };
    actual.label = Object.assign(actual.label, { color: C.page, fontSize: 11, fontWeight: 600 });
    actual.itemStyle = { opacity: 1, borderColor: C.card, borderWidth: 1 }; // was a white outline
});

// ---- Composition ------------------------------------------------------------------------

fromWiki('barTimeline', 'BarChart', 'timeline', o => {
    const base = o.baseOption;
    delete base.title;
    for (const step of o.options) delete step.title; // the timeline itself shows the year
    base.color = [C.accent, C.cyan, C.violet, C.pink, mix(C.accent, WHITE, 0.38)];
    // the theme has no timeline styling: without this the track and labels are drawn for a light page
    base.timeline = Object.assign(base.timeline, {
        left: 24, right: 24, bottom: 2, height: 38, symbolSize: 9,
        lineStyle: { color: LINE },
        itemStyle: { color: C.card, borderColor: C.textMuted },
        label: { color: C.textMuted },
        checkpointStyle: { color: C.accent, borderColor: alpha(C.accent, 0.35), borderWidth: 5, symbolSize: 12 },
        progress: { lineStyle: { color: C.accent }, itemStyle: { color: C.accent, borderColor: C.accent }, label: { color: C.textSecondary } },
        controlStyle: { color: C.textSecondary, borderColor: C.textSecondary, itemSize: 16 },
        emphasis: { itemStyle: { color: C.accent }, label: { color: C.text }, controlStyle: { color: C.text, borderColor: C.text } },
    });
    base.legend = Object.assign(base.legend, LEGEND, { top: 0, left: 'center', right: null });
    base.grid = { left: 44, right: '31%', top: 44, bottom: 76 };
    base.yAxis.nameTextStyle = { color: C.textMuted, align: 'left', padding: [0, 0, 0, -30] };
    for (const s of base.series.slice(0, 2)) s.itemStyle = { borderRadius: [2, 2, 0, 0] };
    Object.assign(base.series[2], {
        center: ['85%', '42%'], radius: ['24%', '40%'],
        itemStyle: { borderColor: C.card, borderWidth: 2 },
        label: { position: 'outside', formatter: '{b}\n{d} %', color: C.textSecondary, fontSize: 11 },
        labelLine: { length: 8, length2: 6, lineStyle: { color: LINE } },
    });
    // the pie takes the three last palette colours so that it does not repeat the bars
    for (const step of o.options) {
        const share = step.series.find(s => s.id === 'share');
        share.data.forEach((d, i) => { d.itemStyle = { color: base.color[2 + i] }; });
    }
});

fromWiki('pieNested', 'PieChart', 'nested', o => {
    const [inner, outer] = o.series;
    // legend of the three groups only (the ring is labelled); it was a scrolling legend of all eleven names
    Object.assign(o.legend, { type: 'plain', bottom: 0, data: inner.data.map(d => d.name) });
    inner.radius = [0, '30%'];
    outer.radius = ['42%', '58%'];
    for (const s of o.series) { s.center = ['50%', '44%']; s.itemStyle = { borderColor: C.card, borderWidth: 2 }; }
    inner.label = { show: false };
    outer.label = { formatter: '{b}\n{d}%', color: C.textSecondary, fontSize: 11 };
    outer.labelLine = { length: 10, length2: 6, lineStyle: { color: LINE } };
    // the ring repeats its group's colour in lighter steps
    const groups = [C.accent, C.cyan, C.violet];
    inner.data.forEach((d, i) => { d.itemStyle = { color: groups[i] }; });
    const split = [3, 2, 3];
    let at = 0;
    split.forEach((count, g) => {
        for (let i = 0; i < count; i++) outer.data[at++].itemStyle = { color: mix(groups[g], C.card, 0.12 + 0.2 * i) };
    });
});

fromWiki('pieRose', 'PieChart', 'nightingale', o => {
    const s = o.series[0];
    delete o.legend; // every slice is labelled
    s.radius = ['10%', '78%'];
    s.center = ['50%', '52%'];
    s.itemStyle = { borderRadius: 6, borderColor: C.card, borderWidth: 2 };
    s.label = { color: C.textSecondary, fontSize: 11 };
    s.labelLine = { length: 8, length2: 6, lineStyle: { color: LINE } };
});

// ---- Hierarchy --------------------------------------------------------------------------

fromWiki('sunburstWheel', 'SunburstChart', 'wheel', o => {
    const s = o.series;
    s.radius = [0, '84%'];
    s.itemStyle = { borderRadius: 4, borderColor: C.card, borderWidth: 2 };
    s.label = { color: C.page, fontSize: 10 };
    s.levels[1] = Object.assign(s.levels[1], { r0: '12%', r: '36%', itemStyle: { borderWidth: 2 }, label: { rotate: 'tangential', fontSize: 11, fontWeight: 600, color: C.page } });
    s.levels[2] = Object.assign(s.levels[2], { r0: '36%', r: '70%', label: { align: 'right', fontSize: 10, color: C.page } });
    s.levels[3] = Object.assign(s.levels[3], { r0: '70%', r: '74%', itemStyle: { borderWidth: 2 }, label: { position: 'outside', padding: 3, silent: false, fontSize: 10, color: C.textSecondary } });
    // one hue per branch
    s.data.forEach((branch, i) => { branch.itemStyle = { color: PALETTE[i] }; });
});

fromWiki('sunburstMono', 'SunburstChart', 'monochrome', o => {
    const s = o.series;
    const leaf = { itemStyle: { color: mix(C.accent, C.card, 0.7) }, label: { color: C.textSecondary } };
    s.radius = ['14%', '96%'];
    s.itemStyle = { borderWidth: 2, borderColor: C.card };
    s.label = { rotate: 'radial', fontSize: 10 };
    // one hue, lighter towards the centre; the leaves were light grey with dark text
    s.levels[1] = { itemStyle: { color: mix(C.accent, WHITE, 0.3) }, label: { color: C.page, fontWeight: 600, rotate: 'tangential' } };
    s.levels[2] = { itemStyle: { color: mix(C.accent, C.card, 0.3) }, label: { color: C.text } };
    s.levels[3] = leaf;
    const restyle = node => {
        if (node.itemStyle) Object.assign(node, JSON.parse(JSON.stringify(leaf)));
        (node.children || []).forEach(restyle);
    };
    s.data.forEach(restyle);
});

fromWiki('treemapParents', 'TreemapChart', 'parent-labels', o => {
    const s = o.series[0];
    Object.assign(s, { top: 2, left: 0, right: 0, bottom: 0 });
    s.label = Object.assign(s.label, { color: C.text, fontSize: 11 });
    s.upperLabel = { show: true, height: 22, color: C.text, fontSize: 11, fontWeight: 600 };
    s.itemStyle = { borderColor: C.card }; // was white: the gaps between the areas are the card
    s.levels = [
        { itemStyle: { borderWidth: 0, gapWidth: 6, borderColor: C.card }, upperLabel: { show: false } },
        { itemStyle: { borderWidth: 4, gapWidth: 2 } },
        { itemStyle: { borderWidth: 3, gapWidth: 2 } },
        {},
    ];
    // The example derived every shade from saturation settings and white borders, which glows on a
    // dark card. Here each area has one hue: a dark header strip, and leaves in steps of that hue.
    const hues = [C.accent, C.cyan, C.violet];
    s.data.forEach((area, a) => {
        const hue = hues[a % hues.length];
        const frame = mix(hue, C.card, 0.62);
        area.itemStyle = { color: frame, borderColor: frame };
        let n = 0;
        const paint = node => {
            if (node.children) { node.itemStyle = { color: mix(hue, C.card, 0.78), borderColor: mix(hue, C.card, 0.78) }; node.children.forEach(paint); }
            else node.itemStyle = { color: mix(hue, C.card, 0.18 + 0.1 * (n++ % 4)), borderColor: C.card };
        };
        area.children.forEach(paint);
    });
});

fromWiki('treeLeftRight', 'TreeChart', 'left-to-right', o => {
    const s = o.series[0];
    Object.assign(s, { top: 6, bottom: 6, left: 34, right: 78, symbolSize: 6 });
    s.itemStyle = { color: C.card, borderColor: C.accent, borderWidth: 1.5 };
    s.lineStyle = { color: LINE, width: 1.2 };
    s.label = Object.assign(s.label, { fontSize: 10, color: C.text });
    s.leaves.label = Object.assign(s.leaves.label, { color: C.textSecondary });
});

// ---- Flow & Networks --------------------------------------------------------------------

fromWiki('sankeyLevels', 'SankeyChart', 'levels', o => {
    const s = o.series[0];
    Object.assign(s, { top: 8, bottom: 8, left: 2, right: 96, nodeGap: 12, nodeWidth: 14 });
    s.label = { fontSize: 11, color: C.textSecondary };
    s.itemStyle = { borderWidth: 0 };
    s.lineStyle = { color: 'source', curveness: 0.5, opacity: 0.32 };
    // a colour per column: the example ran from blue to yellow and orange, which read as warnings here
    const columns = [C.accent, C.cyan, mix(C.cyan, WHITE, 0.4), C.violet, C.pink];
    s.levels = columns.map((color, depth) => ({ depth, itemStyle: { color } }));
    for (const node of s.data) if (node.itemStyle) node.itemStyle.color = C.alarm; // the loss node
});

fromWiki('graphCircular', 'GraphChart', 'circular', o => {
    const s = o.series[0];
    o.color = [C.accent, C.cyan, C.pink, C.violet];
    o.legend[0].top = 0;
    Object.assign(s, { top: 72, bottom: 48, left: 56, right: 56, roam: false });
    s.label = { show: true, position: 'right', formatter: '{b}', fontSize: 9, color: C.textSecondary };
    s.lineStyle = { color: 'source', curveness: 0.3, opacity: 0.55, width: 1 };
    s.itemStyle = { borderColor: C.card, borderWidth: 1 };
    for (const node of s.data) node.symbolSize = Math.round(node.symbolSize * 0.8);
});

fromWiki('graphStates', 'GraphChart', 'state-machine', o => {
    const s = o.series[0];
    // node colours are machine states, so they map to the status tokens
    const states = { '#6b7280': C.idle, '#3d85c6': C.accent, '#2e9e5b': C.ok, '#d9a21b': C.warn, '#d9534f': C.alarm };
    Object.assign(s, { top: 34, bottom: 34, left: 52, right: 52, roam: false, symbolSize: [74, 30] });
    s.label = { show: true, color: C.page, fontSize: 11, fontWeight: 600 };
    s.edgeLabel = { show: true, fontSize: 10, color: C.textSecondary, backgroundColor: C.card, padding: [1, 3] };
    s.lineStyle = { width: 1.5, opacity: 1, curveness: 0, color: C.textMuted };
    s.edgeSymbolSize = [0, 8];
    for (const node of s.data) {
        node.itemStyle.color = states[node.itemStyle.color] || node.itemStyle.color;
        if (node.itemStyle.color === C.idle) node.label = { color: C.text };
    }
});

// ---- Distribution & Statistics ----------------------------------------------------------

fromWiki('boxplotOutliers', 'BoxplotChart', 'outliers', o => {
    const [box, outliers] = o.series;
    o.grid = { left: 48, right: 44, top: 30, bottom: 26 };
    o.yAxis.nameTextStyle = { color: C.textMuted };
    box.itemStyle = { borderWidth: 1.5, borderColor: C.accent, color: alpha(C.accent, 0.18) };
    box.markLine.lineStyle = { type: 'dashed', color: C.alarm };
    box.markLine.label = { formatter: '{b}', color: C.alarm, fontSize: 11 };
    outliers.itemStyle = { color: C.alarm };
    outliers.symbolSize = 6;
});

fromWiki('scatterBubble', 'ScatterChart', 'bubble', o => {
    const tint = [C.accent, C.pink];
    o.legend.top = 0;
    o.grid = { left: 46, right: 18, top: 34, bottom: 42 };
    o.visualMap.inRange.symbolSize = [8, 40];
    for (const axis of [o.xAxis, o.yAxis]) { axis.nameTextStyle = { color: C.textMuted }; axis.splitLine = { lineStyle: { type: 'dashed', color: FAINT } }; }
    o.series.forEach((s, i) => {
        s.itemStyle = { color: alpha(tint[i], 0.55), borderColor: tint[i], borderWidth: 1, shadowBlur: 12, shadowColor: alpha(tint[i], 0.35) };
        s.emphasis.label.color = C.text;
    });
    o.color = tint;
});

fromWiki('parallelQuality', 'ParallelChart', 'quality-map', o => {
    Object.assign(o.visualMap, {
        bottom: 0, itemWidth: 10, itemHeight: 150, text: ['good', 'poor'], textGap: 8,
        inRange: { color: STATUS_RAMP }, // a quality score: red to green keeps its meaning
        textStyle: { color: C.textMuted, fontSize: 11 }, handleStyle: { color: C.textSecondary, borderColor: C.card },
    });
    // parallel axes are not covered by the theme
    o.parallel = {
        left: 34, right: 52, top: 38, bottom: 52,
        parallelAxisDefault: {
            nameLocation: 'end', nameGap: 12, nameTextStyle: { fontSize: 10, color: C.textSecondary },
            axisLine: { lineStyle: { color: LINE } }, axisTick: { lineStyle: { color: LINE } },
            axisLabel: { color: C.textMuted, fontSize: 10 }, splitLine: { show: false },
        },
    };
    o.parallelAxis.forEach(axis => { axis.name = axis.name.replace(/ \(.*\)$/, ''); }); // units dropped: the names were cut off
    o.series[0].lineStyle = { width: 1.4, opacity: 0.7 };
});

fromWiki('heatmapThermal', 'HeatmapChart', 'thermal', o => {
    o.grid = { left: 52, right: 58, top: 8, bottom: 26 };
    Object.assign(o.visualMap, {
        right: 0, itemWidth: 10, itemHeight: 150, inRange: { color: THERMAL },
        textStyle: { color: C.textMuted, fontSize: 11 }, handleStyle: { color: C.textSecondary, borderColor: C.card },
    });
    for (const axis of [o.xAxis, o.yAxis]) { axis.axisLine = { show: false }; axis.axisTick = { show: false }; axis.splitArea = { show: false }; }
    o.series[0].itemStyle = { borderColor: C.card, borderWidth: 1 };
});

// ---- Time -------------------------------------------------------------------------------

fromWiki('calendarYear', 'CalendarChart', 'full-year', o => {
    Object.assign(o.visualMap, {
        bottom: 0, itemGap: 18, itemWidth: 14, itemHeight: 10, inRange: { color: RAMP }, // was four greens
        textStyle: { color: C.textSecondary, fontSize: 11 },
    });
    // calendar is not covered by the theme: lines, cells and labels are set here
    o.calendar = Object.assign(o.calendar, {
        top: 24, left: 38, right: 4, bottom: 34, cellSize: null,
        splitLine: { lineStyle: { width: 1, color: C.textMuted } },
        itemStyle: { color: alpha(WHITE, 0.03), borderWidth: 2, borderColor: C.card },
        dayLabel: { firstDay: 1, fontSize: 10, color: C.textMuted, nameMap: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
        monthLabel: { fontSize: 11, color: C.textSecondary },
    });
    delete o.calendar.cellSize;
    o.series[0].itemStyle = { borderColor: C.card, borderWidth: 2, borderRadius: 2 };
});

fromWiki('matrixSparklines', 'DatasetChart', 'matrix-sparklines', o => {
    const header = { color: C.textSecondary, fontSize: 11 };
    const cell = { borderColor: FAINT, borderWidth: 1, color: 'transparent' };
    // the matrix is not covered by the theme: header cells, body cells and borders are set here
    o.matrix = Object.assign(o.matrix, {
        top: 4, left: 0, right: 1, bottom: 2,
        backgroundStyle: { color: 'transparent', borderColor: FAINT },
        body: { itemStyle: cell },
        corner: { itemStyle: cell },
        x: Object.assign(o.matrix.x, { levelSize: 28, label: header, itemStyle: Object.assign({}, cell, { color: alpha(WHITE, 0.03) }), dividerLineStyle: { color: FAINT } }),
        y: Object.assign(o.matrix.y, { levelSize: 60, label: header, itemStyle: Object.assign({}, cell, { color: alpha(WHITE, 0.03) }), dividerLineStyle: { color: FAINT } }),
    });
    // a colour per shift (row), so the rows read as three series
    const rows = o.matrix.y.data;
    const shift = [C.accent, C.cyan, C.violet];
    o.series.forEach((s, i) => {
        const tint = shift[rows.indexOf(o.grid[i].coord[1])] || C.accent;
        s.lineStyle = { width: 1.6, color: tint };
        s.itemStyle = { color: tint };
        s.areaStyle = { opacity: 0.18, color: tint };
    });
});

fromWiki('pieCalendar', 'PieChart', 'calendar-pies', o => {
    o.color = [C.ok, C.idle, C.alarm]; // running, idle, down: machine states
    o.legend.bottom = 0;
    o.calendar = Object.assign(o.calendar, {
        top: 30, cellSize: [52, 58],
        itemStyle: { color: 'transparent', borderColor: FAINT, borderWidth: 1 },
        splitLine: { show: false },
        dayLabel: Object.assign(o.calendar.dayLabel, { color: C.textMuted, margin: 8, fontSize: 11 }),
    });
    const [days, ...pies] = o.series;
    days.label = Object.assign(days.label, { offset: [-18, -20], fontSize: 9, color: C.textMuted });
    for (const pie of pies) { pie.radius = 17; pie.itemStyle = { borderColor: C.card, borderWidth: 1 }; }
});

fromWiki('lineLimits', 'LineChart', 'limits-and-bands', o => {
    const s = o.series[0];
    const [range, batch] = s.markArea.data;
    o.grid = { left: 50, right: 58, top: 24, bottom: 24 };
    o.xAxis.axisLabel = { interval: 5 };
    s.lineStyle = { width: 2, color: C.accent };
    s.itemStyle = { color: C.accent };
    s.markLine.label = { color: C.textSecondary, fontSize: 11 };
    s.markLine.lineStyle = { type: 'dashed', width: 1.5 };
    s.markLine.data[0].lineStyle.color = C.alarm; // high limit
    s.markLine.data[1].lineStyle.color = C.warn;  // low limit
    range[0].itemStyle = { color: C.ok, opacity: 0.12 };
    range[0].label = { position: 'insideBottomLeft', color: C.ok, textBorderWidth: 0, fontSize: 11 };
    batch[0].itemStyle = { color: C.accent, opacity: 0.16 };
    batch[0].label = { position: 'top', color: C.textSecondary, fontSize: 11 };
});

fromWiki('themeRiver', 'ThemeRiverChart', 'downtime-streams', o => {
    o.legend.top = 0;
    o.tooltip.axisPointer.lineStyle.color = C.textMuted;
    o.singleAxis = Object.assign(o.singleAxis, {
        top: 36, bottom: 30, left: 12, right: 12,
        axisLine: { lineStyle: { color: LINE } }, axisTick: { lineStyle: { color: LINE } },
        axisLabel: { color: C.textMuted, fontSize: 11 },
        splitLine: { show: true, lineStyle: { type: 'dashed', color: FAINT, opacity: 1 } },
    });
    o.singleAxis.axisPointer.label = { show: true, color: C.page, backgroundColor: C.textSecondary };
    o.series[0].itemStyle = { borderColor: C.card, borderWidth: 0.5 };
});

fromWiki('candlestick', 'CandlestickChart', 'volume-zoom', o => {
    const [price, ma5, ma20, volume] = o.series;
    o.color = [C.text, C.accent, C.violet];
    o.legend.top = 0;
    o.grid = [{ left: 48, right: 12, top: 36, height: '50%' }, { left: 48, right: 12, top: '66%', height: '14%' }];
    o.yAxis[0].nameTextStyle = { color: C.textMuted };
    // up / down keep green and red: here they do mean better and worse
    price.itemStyle = { color: C.ok, color0: C.alarm, borderColor: C.ok, borderColor0: C.alarm };
    ma5.lineStyle = { width: 1.5, color: C.accent };
    ma20.lineStyle = { width: 1.5, color: C.violet };
    ma5.itemStyle = { color: C.accent };
    ma20.itemStyle = { color: C.violet };
    volume.itemStyle = { color: alpha(C.textSecondary, 0.4) };
    Object.assign(o.dataZoom[1], {
        bottom: 2, height: 18, borderColor: FAINT, textStyle: { color: C.textMuted, fontSize: 10 },
        fillerColor: alpha(C.accent, 0.18), handleStyle: { color: C.accent, borderColor: C.accent },
        moveHandleStyle: { color: C.borderStrong }, brushSelect: false,
        dataBackground: { lineStyle: { color: C.borderStrong }, areaStyle: { color: C.borderStrong, opacity: 0.4 } },
        selectedDataBackground: { lineStyle: { color: C.accent }, areaStyle: { color: C.accent, opacity: 0.3 } },
    });
});

// ---- 3D (ECharts-GL) --------------------------------------------------------------------

/** The 3D axes are not covered by the theme: every line and label colour is set here. */
const axis3D = (name, extra) => Object.assign({
    name, nameGap: 22,
    nameTextStyle: { color: C.textSecondary, fontSize: 12 },
    axisLine: { lineStyle: { color: C.textMuted } },
    axisLabel: { textStyle: { color: C.textSecondary, fontSize: 11 } },
    axisTick: { lineStyle: { color: C.textMuted } },
    splitLine: { lineStyle: { color: C.borderStrong } },
    splitArea: { show: false },
    axisPointer: { lineStyle: { color: C.textMuted } },
}, extra || {});

const grid3D = (alphaAngle, beta, distance) => ({
    boxWidth: 100, boxDepth: 100, boxHeight: 62,
    environment: 'none',
    // zoom and pan are off so that the mouse wheel scrolls the page; dragging still rotates
    viewControl: { alpha: alphaAngle, beta, distance, center: [0, -24, 0], autoRotate: false, zoomSensitivity: 0, panSensitivity: 0 },
    light: { main: { intensity: 0.85, shadow: false, alpha: 40, beta: 30 }, ambient: { intensity: 0.4 } },
    axisPointer: { show: false },
});

fromDefault('bar3D', 'Bar3DChart', o => {
    // output by machine and weekday; values follow a daily rhythm instead of the 5 x 5 default sample
    const machines = ['Rinser', 'Filler', 'Capper', 'Labeller', 'Packer', 'Palletiser'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const g = generator(7);
    const data = [];
    days.forEach((day, d) => machines.forEach((machine, m) => {
        const level = 62 + 22 * Math.sin((m + 1) * 0.9 + d * 0.55) + 10 * g.next() - (d > 4 ? 18 : 0);
        data.push([m, d, Math.round(Math.max(12, level))]);
    }));
    return {
        tooltip: {},
        visualMap: { show: false, dimension: 2, min: 20, max: 95, inRange: { color: [mix(C.accent, C.card, 0.45), C.accent, mix(C.accent, C.cyan, 0.6)] } },
        grid3D: grid3D(24, 38, 205),
        xAxis3D: axis3D('', { type: 'category', data: machines, axisLabel: { interval: 0, textStyle: { color: C.textSecondary, fontSize: 10 } } }),
        yAxis3D: axis3D('', { type: 'category', data: days }),
        zAxis3D: axis3D('', { type: 'value' }), // k units; a name here is cut off in a narrow tile
        series: [Object.assign(o.series[0], { data, bevelSize: 0.25, bevelSmoothness: 2, barSize: 9, itemStyle: { opacity: 1 }, emphasis: { itemStyle: { color: C.pink } } })],
    };
});

fromDefault('surface', 'SurfaceChart', o => {
    // a response surface z = f(x, y) on a finer grid than the 9 x 9 default sample
    const data = [];
    const steps = 30;
    for (let j = 0; j <= steps; j++) {
        for (let i = 0; i <= steps; i++) {
            const x = -3 + 6 * i / steps, y = -3 + 6 * j / steps;
            const z = Math.sin(x) * Math.cos(y) * Math.exp(-(x * x + y * y) / 14);
            data.push([Number(x.toFixed(2)), Number(y.toFixed(2)), Number(z.toFixed(3))]);
        }
    }
    return {
        tooltip: {},
        visualMap: { show: false, dimension: 2, min: -0.85, max: 0.85, inRange: { color: [C.violet, C.accent, C.cyan] } },
        grid3D: grid3D(26, 42, 205),
        xAxis3D: axis3D('x', { type: 'value' }),
        yAxis3D: axis3D('y', { type: 'value' }),
        zAxis3D: axis3D('z', { type: 'value' }),
        series: [Object.assign(o.series[0], { data, shading: 'lambert', wireframe: { show: true, lineStyle: { color: alpha(C.page, 0.55), width: 1 } } })],
    };
});

fromDefault('scatterGL', 'ScatterGLChart', o => {
    // 6,000 points in three clusters: what the WebGL scatter is for
    const g = generator(42);
    const clusters = [[34, 58, 9, 7, C.accent, 'Line 1'], [58, 41, 11, 8, C.cyan, 'Line 2'], [74, 66, 7, 9, C.pink, 'Line 3']];
    const base = o.series[0];
    return {
        legend: Object.assign({ top: 0, data: clusters.map(c => c[5]), itemStyle: { opacity: 1 } }, LEGEND),
        grid: { left: 46, right: 16, top: 34, bottom: 42 },
        xAxis: { name: 'Application torque (N·cm)', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: C.textMuted }, min: 0, max: 100, splitLine: { lineStyle: { color: FAINT, type: 'dashed' } } },
        yAxis: { name: 'Removal torque (N·cm)', nameTextStyle: { color: C.textMuted }, min: 0, max: 100, splitLine: { lineStyle: { color: FAINT, type: 'dashed' } } },
        series: clusters.map(([cx, cy, sx, sy, color, name]) => {
            const data = [];
            for (let i = 0; i < 2000; i++) {
                const a = g.gauss(), b = g.gauss();
                data.push([Number((cx + sx * a).toFixed(2)), Number((cy + sy * (0.55 * a + 0.83 * b)).toFixed(2))]);
            }
            return Object.assign({}, base, { name, data, symbolSize: 3, itemStyle: { color, opacity: 0.55 } });
        }),
    };
});

module.exports = { OPTIONS, PALETTE };
