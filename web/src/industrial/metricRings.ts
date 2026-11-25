import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import {
    Row, asArray, asBoolean, asNumber, asString, isRecord, noDataTitle, readBoolean, readNumber, readProp, readString,
    toLabel, toNumber,
} from './util';

export const METRIC_RINGS_ID = 'open.industrial.MetricRings';

export interface MetricRingsProps {
    /** Metrics as objects { name, value, min?, max?, target?, color?, unit?, decimals?, thresholds? }; validated in buildOption. */
    metrics: unknown;
    /** Scale and unit of metrics that do not set their own. */
    min: number;
    max: number;
    unit: string;
    decimals: number;
    centerTitle: string;
    /** A number or text shown in the centre instead of the computed summary; null/blank means "compute". */
    centerValue: unknown;
    /** "product", "average", "min", "max", "sum" or "none". */
    summary: string;
    /** Value bands as objects { upTo?, color }; validated in buildOption. */
    thresholds: unknown;
    showLabels: boolean;
    /** "bottom" (default) or "right". */
    labelPosition: string;
    showTargets: boolean;
    /** Thickness of all rings together in percent of the outer radius; 0 picks one from the ring count. */
    ringThickness: number;
    /** Empty space between two rings in percent of the space one ring has. */
    ringGap: number;
    startAngle: number;
    sweep: number;
}

/** One ring of the shared builder, already validated and scaled. */
export interface Ring {
    name: string;
    /** Position on the ring in percent of its range (0-100). */
    percent: number;
    /** The value as it is displayed and reported in the tooltip, e.g. "6.8 bar". */
    text: string;
    /** The target as text for the tooltip; '' for none. */
    targetText?: string;
    /** Ring colour; when undefined the theme palette colours the ring. */
    color?: string;
    /** Target position in percent of the range, or null for no marker. */
    targetPercent: number | null;
}

/** Name/value rows drawn in the hole of the rings (the OEE layout), one per ring. */
export interface HoleLabels {
    show: boolean;
    /** Value template for rows that carry no text of their own, e.g. "{value}%". */
    formatter: string;
    /** The value shown for each ring; parallel to the rings. */
    values: number[];
    /** Fixed value texts, parallel to the rings; a null entry uses `formatter`. */
    texts: Array<string | null>;
}

export interface RingsSpec {
    rings: Ring[];
    /** Centre of the rings in percent of the component width and height. */
    center: [number, number];
    /** Outer and inner radius of the band of rings in percent of half the smaller component side. */
    outerRadius: number;
    innerRadius: number;
    /** Empty space between two rings in percent of the space one ring has. */
    gap: number;
    startAngle: number;
    sweep: number;
    holeLabels?: HoleLabels;
    /** Title components (centre summary, value list, notices). The caller keeps their number constant. */
    titles?: Row[];
}

export interface Threshold {
    /** Exclusive upper bound of the band; Infinity for the band that takes everything else. */
    upTo: number;
    color: string;
}

/**
 * Ring colours: the default ECharts palette without its red, which is left to
 * thresholds. Explicit, not taken from the theme, so that the value list can
 * show the same colours.
 */
export const RING_PALETTE: readonly string[] = [
    '#5470c6', '#3ba272', '#fac858', '#73c0de', '#9a60b4', '#fc8452', '#91cc75', '#ea7ccc',
];
/** The unfilled part of a ring. Translucent grey reads as "empty" on light and dark backgrounds alike. */
export const TRACK_COLOR = 'rgba(128,128,128,0.2)';
/** Target markers are dark with a light outline so that they show on the track, on the ring and on any theme. */
const TARGET_COLOR = '#262626';
const TARGET_OUTLINE = '#ffffff';
const LABEL_COLOR = '#8c8c8c';
/** Angle covered by a target marker, in degrees. */
const TARGET_DEGREES = 2.2;

/** More metrics than this are ignored: the rings would be hairlines. */
export const MAX_RINGS = 12;
const MAX_DECIMALS = 10;
/** Value list entries shown below / beside the rings; further metrics are summarised as "+N more". */
const MAX_LIST_BOTTOM = 9;
const MAX_LIST_RIGHT = 8;
/** Longest name shown in the value list, by the number of columns it is set in (index 0: the list on the right). */
const MAX_NAME_CHARS = [18, 40, 22, 16];
const SUMMARIES = ['product', 'average', 'min', 'max', 'sum', 'none'];

const DEFAULT_METRICS: Row[] = [
    { name: 'Power', value: 73, target: 80 },
    { name: 'Steam', value: 81, target: 75 },
    { name: 'Chilled water', value: 54, target: 70 },
    { name: 'Compressed air', value: 68, target: 85 },
];

function clamp(n: number, low: number, high: number): number {
    return Math.min(high, Math.max(low, n));
}

/** Whole number of decimals in 0-10, or the fallback. */
export function toDecimals(value: unknown, fallback: number): number {
    const n = toNumber(value);
    return Number.isNaN(n) ? fallback : clamp(Math.round(n), 0, MAX_DECIMALS);
}

/** "12.4 bar", "87%": a unit starting with % or a degree sign is attached, any other is set off by a space. */
export function withUnit(text: string, unit: string): string {
    if (unit === '') return text;
    return /^[%°‰]/.test(unit) ? text + unit : `${text} ${unit}`;
}

/**
 * Fixed-point text with thousands separators as ECharts writes them on its
 * axes ("1,234.5"). A value that rounds to zero carries no sign.
 */
export function formatNumber(value: number, decimals: number): string {
    const text = Math.abs(value).toFixed(decimals);
    const dot = text.indexOf('.');
    const whole = dot < 0 ? text : text.slice(0, dot);
    const grouped = whole.replace(/\B(?=(\d{3})+$)/g, ',') + (dot < 0 ? '' : text.slice(dot));
    return value < 0 && Number(text) !== 0 ? `-${grouped}` : grouped;
}

/** Text for an HTML tooltip template: no markup, and no "{x}" placeholders ECharts would substitute. */
export function tooltipText(text: string): string {
    return text.replace(/[&<>"'{}]/g, ch => `&#${ch.charCodeAt(0)};`);
}

/** Text for a rich text label: braces and bars would be read as style markup. */
export function richText(text: string): string {
    return text.replace(/[{}|]/g, '');
}

/**
 * Validates a `thresholds` prop: entries are objects { upTo, color }. A value
 * gets the colour of the first band, in ascending order of `upTo`, whose
 * `upTo` is greater than the value; an entry without a numeric `upTo` takes
 * every value above the other bands. Entries without a colour are skipped.
 */
export function readThresholds(raw: unknown): Threshold[] {
    const bands: Threshold[] = [];
    for (const entry of asArray(raw)) {
        if (!isRecord(entry) || typeof entry.color !== 'string' || entry.color === '') continue;
        const upTo = toNumber(entry.upTo);
        bands.push({ upTo: Number.isNaN(upTo) ? Infinity : upTo, color: entry.color });
    }
    // Stable sort: of two bands with the same bound the first one listed wins.
    return bands.sort((a, b) => (a.upTo === b.upTo ? 0 : a.upTo < b.upTo ? -1 : 1));
}

/** Colour of the band a value falls in, or undefined when no band takes it. */
export function thresholdColor(bands: readonly Threshold[], value: number): string | undefined {
    if (Number.isNaN(value)) return undefined;
    for (const band of bands) {
        if (value < band.upTo) return band.color;
    }
    return undefined;
}

/** Share of the outer radius left as the hole, by ring count, when the thickness is automatic. */
function autoHole(count: number): number {
    const holes = [0.8, 0.68, 0.6, 0.53, 0.47, 0.43];
    if (count <= holes.length) return holes[Math.max(1, count) - 1];
    return count <= 9 ? 0.38 : 0.32;
}

/**
 * Concentric progress rings: the ECharts option shared by Metric Rings and
 * OEE.
 *
 * The rings are bars on a polar coordinate system, one category per ring, so
 * their thickness and spacing scale with the component, every ring has its
 * own track, and a target is a short stacked bar segment across the ring.
 * Optional name/value rows in the hole are a gauge series without any dial,
 * because a gauge places text relative to its radius and can give it the
 * colour of its ring. That gauge comes first in `series`.
 */
export function buildRings(spec: RingsSpec): Row {
    const rings = spec.rings;
    // A fresh array per use: an option must not hold the same object twice.
    const center = (): string[] => [`${spec.center[0]}%`, `${spec.center[1]}%`];
    const sweep = clamp(spec.sweep, 30, 360);
    const tick = TARGET_DEGREES / sweep * 100;
    const hasTargets = rings.some(ring => ring.targetPercent !== null);

    const series: Row[] = [];
    const hole = spec.holeLabels;
    if (hole) {
        series.push(holeLabelSeries(rings, hole, center(), spec.outerRadius));
    }
    series.push({
        type: 'bar', coordinateSystem: 'polar', name: 'rings', z: 2,
        roundCap: true,
        barCategoryGap: `${clamp(spec.gap, 0, 90)}%`,
        // Without explicit colours every ring takes its own palette colour, as gauge data items do.
        colorBy: 'data',
        showBackground: true,
        backgroundStyle: { color: TRACK_COLOR },
        data: rings.map(ring => {
            const item: Row = {
                value: ring.percent,
                name: ring.name,
                // {b} is HTML-encoded by ECharts; the value texts carry the unit, which is free text.
                tooltip: {
                    formatter: `{b}: <b>${tooltipText(ring.text)}</b>`
                        + (ring.targetText ? ` (target ${tooltipText(ring.targetText)})` : ''),
                },
            };
            if (ring.color !== undefined) item.itemStyle = { color: ring.color };
            return item;
        }),
    });
    // The marker is the second segment of a stack whose first, invisible segment
    // ends where the marker starts. Both series are always present so that a
    // merged option never keeps the markers of an earlier one.
    const spacer = (ring: Ring): number | string =>
        ring.targetPercent === null ? '-' : clamp(ring.targetPercent - tick / 2, 0, 100 - tick);
    series.push({
        type: 'bar', coordinateSystem: 'polar', name: 'targetOffset', stack: 'target', z: 3,
        silent: true, barGap: '-100%', barCategoryGap: `${clamp(spec.gap, 0, 90)}%`,
        itemStyle: { color: 'transparent' },
        tooltip: { show: false },
        data: hasTargets ? rings.map(spacer) : [],
    });
    series.push({
        type: 'bar', coordinateSystem: 'polar', name: 'target', stack: 'target', z: 3,
        silent: true, barGap: '-100%', barCategoryGap: `${clamp(spec.gap, 0, 90)}%`,
        itemStyle: { color: TARGET_COLOR, borderColor: TARGET_OUTLINE, borderWidth: 1 },
        tooltip: { show: false },
        data: hasTargets ? rings.map(ring => (ring.targetPercent === null ? '-' : tick)) : [],
    });

    const option: Row = {
        tooltip: { trigger: 'item' },
        polar: { center: center(), radius: [`${spec.innerRadius}%`, `${spec.outerRadius}%`] },
        angleAxis: {
            type: 'value', min: 0, max: 100, show: false,
            startAngle: spec.startAngle, endAngle: spec.startAngle - sweep, clockwise: true,
        },
        // The first ring is the outermost one.
        radiusAxis: { type: 'category', inverse: true, show: false, data: rings.map((_ring, i) => String(i)) },
        series,
    };
    if (spec.titles) option.title = spec.titles;
    return option;
}

/**
 * Vertical positions of the name and value rows in the hole, in percent of
 * the radius. Up to five rows fit; with more only the first row (the summary
 * ring) is labelled, larger and centred.
 */
function holeRows(count: number): { rows: Array<[number, number]>; titleSize: number; detailSize: number } {
    if (count > 5) {
        return { rows: [[-9, 9]], titleSize: 13, detailSize: 24 };
    }
    // Four rows span -47 % to +56 % of the radius: the hole ends at 80 %.
    const pitch = count === 5 ? 22.5 : 30;
    const lead = count === 5 ? 11 : 13;
    const first = count === 5 ? -47 : -47 + (4 - count) * 15;
    const rows: Array<[number, number]> = [];
    for (let i = 0; i < count; i++) {
        rows.push([first + i * pitch, first + i * pitch + lead]);
    }
    return count === 5 ? { rows, titleSize: 11, detailSize: 13 } : { rows, titleSize: 12, detailSize: 14 };
}

function holeLabelSeries(rings: Ring[], hole: HoleLabels, center: string[], radius: number): Row {
    const layout = holeRows(rings.length);
    return {
        type: 'gauge', name: 'labels', z: 4, silent: true,
        center, radius: `${radius}%`,
        startAngle: 90, endAngle: -270,
        min: 0, max: 100,
        pointer: { show: false },
        // The text takes its ring's colour only from a visible progress bar, so this
        // one is "shown" with no width; the rings themselves are the polar bars.
        progress: { show: true, overlap: false },
        axisLine: { show: false, lineStyle: { width: 0 } },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        tooltip: { show: false },
        // Values take the colour of their ring; names are a grey that reads on light and dark themes.
        title: hole.show ? { fontSize: layout.titleSize, color: LABEL_COLOR } : { show: false },
        detail: hole.show
            ? { width: 40, height: 14, fontSize: layout.detailSize, color: 'inherit', formatter: hole.formatter }
            : { show: false },
        data: rings.map((ring, i) => {
            const row = layout.rows[i];
            const text = hole.texts[i];
            const item: Row = {
                value: hole.values[i],
                name: ring.name,
                title: row ? { offsetCenter: ['0%', `${row[0]}%`] } : { show: false, offsetCenter: ['0%', '0%'] },
                detail: row ? { offsetCenter: ['0%', `${row[1]}%`] } : { show: false, offsetCenter: ['0%', '0%'] },
            };
            if (row && typeof text === 'string') (item.detail as Row).formatter = text;
            if (ring.color !== undefined) item.itemStyle = { color: ring.color };
            return item;
        }),
    };
}

interface Metric {
    name: string;
    /** NaN when the metric has no usable value. */
    value: number;
    /** Position in the range as a fraction, 0-1; 0 without a value. */
    fraction: number;
    ring: Ring;
}

/** A usable [min, max] range: the metric's own if valid, else the shared one, else 0-100. */
function rangeOf(row: Row, sharedMin: number, sharedMax: number): [number, number] {
    const ownMin = toNumber(row.min);
    const ownMax = toNumber(row.max);
    const min = Number.isNaN(ownMin) ? sharedMin : ownMin;
    const max = Number.isNaN(ownMax) ? sharedMax : ownMax;
    if (max > min) return [min, max];
    return sharedMax > sharedMin ? [sharedMin, sharedMax] : [0, 100];
}

/**
 * Validates the `metrics` prop. Entries that are not objects, and objects
 * with neither a name nor a numeric value, are skipped. A named metric
 * without a usable value is kept as an empty ring showing a dash, so that a
 * tag that is briefly bad does not rearrange the chart.
 */
export function readMetrics(props: Partial<MetricRingsProps>): Metric[] {
    const sharedMin = asNumber(props.min, 0);
    const sharedMax = asNumber(props.max, 100);
    const sharedUnit = asString(props.unit, '');
    const sharedDecimals = toDecimals(props.decimals, 0);
    const sharedBands = readThresholds(props.thresholds);
    const showTargets = asBoolean(props.showTargets, true);

    const metrics: Metric[] = [];
    for (const row of asArray(props.metrics)) {
        if (metrics.length >= MAX_RINGS) break;
        if (!isRecord(row)) continue;
        const label = toLabel(row.name);
        const value = toNumber(row.value);
        if (label === null && Number.isNaN(value)) continue;

        const index = metrics.length;
        const name = label ?? `Metric ${index + 1}`;
        const [min, max] = rangeOf(row, sharedMin, sharedMax);
        const span = max - min;
        const unit = asString(row.unit, sharedUnit);
        const decimals = toDecimals(row.decimals, sharedDecimals);
        const bands = Array.isArray(row.thresholds) ? readThresholds(row.thresholds) : sharedBands;
        const own = typeof row.color === 'string' && row.color !== '' ? row.color : undefined;
        const target = toNumber(row.target);
        const hasValue = !Number.isNaN(value);
        const hasTarget = showTargets && !Number.isNaN(target) && target >= min && target <= max;
        // (v - min) * 100 / span rather than a fraction times 100: exact for whole percentages.
        const percent = hasValue ? clamp((value - min) * 100 / span, 0, 100) : 0;

        metrics.push({
            name,
            value,
            fraction: percent / 100,
            ring: {
                name,
                percent,
                text: hasValue ? withUnit(formatNumber(value, decimals), unit) : '–',
                color: thresholdColor(bands, value) ?? own ?? RING_PALETTE[index % RING_PALETTE.length],
                targetText: hasTarget ? withUnit(formatNumber(target, decimals), unit) : '',
                targetPercent: hasTarget ? (target - min) * 100 / span : null,
            },
        });
    }
    return metrics;
}

/**
 * The centre value for a summary rule, or NaN when there is nothing to
 * summarise.
 *
 * "product" multiplies the positions of the metrics in their ranges (as
 * fractions) and returns a percentage: with 0-100 % metrics this is the OEE
 * rule. The other rules work on the values as given, so they are meaningful
 * when the metrics share a unit. Metrics without a value are left out.
 */
export function summarize(metrics: ReadonlyArray<{ value: number; fraction: number }>, rule: string): number {
    let count = 0;
    let sum = 0;
    let low = Infinity;
    let high = -Infinity;
    let product = 1;
    for (const metric of metrics) {
        if (Number.isNaN(metric.value)) continue;
        count++;
        sum += metric.value;
        if (metric.value < low) low = metric.value;
        if (metric.value > high) high = metric.value;
        product *= metric.fraction;
    }
    if (count === 0) return NaN;
    switch (rule) {
        case 'product': return product * 100;
        case 'average': return sum / count;
        case 'min': return low;
        case 'max': return high;
        case 'sum': return sum;
        default: return NaN;
    }
}

/** Removes binary floating point noise (0.1 + 0.2) from sums. */
function clean(n: number): number {
    return Number.isFinite(n) ? Number(n.toPrecision(12)) : n;
}

function truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** Font size of the centre value: smaller for long texts and for small holes. */
function centerFontSize(text: string, ringCount: number): number {
    const base = ringCount <= 2 ? 32 : ringCount <= 4 ? 28 : ringCount <= 6 ? 22 : 18;
    const shrink = text.length <= 5 ? 1 : text.length <= 8 ? 0.8 : 0.62;
    return Math.max(12, Math.round(base * shrink));
}

/**
 * A title component used as a text slot. Every slot sets the same keys so
 * that a merged option leaves nothing behind when a slot changes or empties.
 */
function textSlot(
    text: string, subtext: string, left: number, top: number, align: string, fontSize: number, bold: boolean,
    dotColor?: string, verticalAlign = 'top',
): Row {
    return {
        text, subtext,
        left: `${left}%`, top: `${top}%`,
        textAlign: align, textVerticalAlign: verticalAlign,
        itemGap: 3, padding: 0,
        textStyle: {
            fontSize, fontWeight: bold ? 'bold' : 'normal', lineHeight: Math.round(fontSize * 1.15),
            rich: { dot: { color: dotColor ?? 'transparent', fontSize: 10, padding: [0, 4, 1, 0] } },
        },
        subtextStyle: { fontSize: 11, lineHeight: 13 },
    };
}

function emptySlot(): Row {
    return textSlot('', '', 50, 50, 'center', 13, true);
}

interface Layout {
    center: [number, number];
    outerRadius: number;
    /** Anchor of each value list entry (left, top of the text block), in percent. */
    cells: Array<[number, number]>;
    align: string;
    /** Names longer than this are cut. */
    nameChars: number;
}

function layoutFor(position: string, listed: number): Layout {
    if (listed === 0) {
        return { center: [50, 50], outerRadius: 88, cells: [], align: 'center', nameChars: MAX_NAME_CHARS[0] };
    }
    const cells: Array<[number, number]> = [];
    if (position === 'right') {
        const pitch = Math.min(15, 84 / listed);
        for (let i = 0; i < listed; i++) {
            // An entry is two lines, about 30 px: start it a little above its slot's middle.
            cells.push([73, clean(50 + (i - (listed - 1) / 2) * pitch - 4.5)]);
        }
        return { center: [35, 50], outerRadius: 64, cells, align: 'left', nameChars: MAX_NAME_CHARS[0] };
    }
    const columns = listed <= 3 ? listed : listed === 4 ? 2 : 3;
    const rows = Math.ceil(listed / columns);
    const pitch = 12;
    const listTop = 100 - rows * pitch - 1;
    for (let i = 0; i < listed; i++) {
        const column = i % columns;
        const row = Math.floor(i / columns);
        // Two columns are kept near the middle rather than at the far quarters.
        const span = columns === 2 ? 64 : 100;
        const left = 50 - span / 2 + (column + 0.5) * span / columns;
        cells.push([clean(left), clean(listTop + row * pitch + 1)]);
    }
    return { center: [50, clean(listTop / 2 + 0.5)], outerRadius: listTop - 7, cells, align: 'center', nameChars: MAX_NAME_CHARS[columns] };
}

function readProps(tree: PropertyTree): MetricRingsProps {
    return {
        metrics: readProp(tree, 'metrics', DEFAULT_METRICS),
        min: readNumber(tree, 'min', 0),
        max: readNumber(tree, 'max', 100),
        unit: readString(tree, 'unit', '%'),
        decimals: readNumber(tree, 'decimals', 0),
        centerTitle: readString(tree, 'centerTitle', 'Average load'),
        centerValue: readProp(tree, 'centerValue', null),
        summary: readString(tree, 'summary', 'average'),
        thresholds: readProp(tree, 'thresholds', []),
        showLabels: readBoolean(tree, 'showLabels', true),
        labelPosition: readString(tree, 'labelPosition', 'bottom'),
        showTargets: readBoolean(tree, 'showTargets', true),
        ringThickness: readNumber(tree, 'ringThickness', 0),
        ringGap: readNumber(tree, 'ringGap', 25),
        startAngle: readNumber(tree, 'startAngle', 90),
        sweep: readNumber(tree, 'sweep', 360),
    };
}

/** The centre value as text, or '' when there is none. */
function centerText(props: MetricRingsProps, metrics: Metric[]): string {
    const unit = asString(props.unit, '');
    const decimals = toDecimals(props.decimals, 0);
    const explicit = toNumber(props.centerValue);
    if (!Number.isNaN(explicit)) return withUnit(formatNumber(explicit, decimals), unit);
    if (typeof props.centerValue === 'string' && props.centerValue.trim() !== '') return props.centerValue.trim();

    const rule = SUMMARIES.includes(props.summary) ? props.summary : 'average';
    const value = clean(summarize(metrics, rule));
    if (Number.isNaN(value)) return '';
    return withUnit(formatNumber(value, decimals), rule === 'product' ? '%' : unit);
}

function buildOption(props: MetricRingsProps): object {
    const metrics = readMetrics(props);
    const count = metrics.length;
    const position = props.labelPosition === 'right' ? 'right' : 'bottom';
    const maxListed = position === 'right' ? MAX_LIST_RIGHT : MAX_LIST_BOTTOM;
    const listed = asBoolean(props.showLabels, true) ? Math.min(count, maxListed) : 0;
    const layout = layoutFor(position, listed);

    const thickness = asNumber(props.ringThickness, 0);
    const hole = thickness > 0 ? 1 - clamp(thickness, 5, 90) / 100 : autoHole(count);
    const startAngle = asNumber(props.startAngle, 90);
    const sweep = clamp(asNumber(props.sweep, 360), 30, 360);

    // Slot 0 is the centre, slot 1 the "No data" notice, the rest the value list.
    const value = count > 0 ? centerText(props, metrics) : '';
    const caption = count > 0 ? asString(props.centerTitle, '') : '';
    const [cx, cy] = layout.center;
    const titles: Row[] = [
        value !== ''
            // The caption hangs below the value; lift the pair so that it is centred as a whole.
            ? textSlot(richText(value), caption, cx, caption === '' ? cy : cy - 2.5, 'center', centerFontSize(value, count), true,
                undefined, 'middle')
            : textSlot(caption, '', cx, cy, 'center', 13, false, undefined, 'middle'),
        noDataTitle(count === 0),
    ];
    for (let i = 0; i < MAX_LIST_BOTTOM; i++) {
        const cell = layout.cells[i];
        if (!cell) {
            titles.push(emptySlot());
        } else if (i === listed - 1 && count > listed) {
            titles.push(textSlot(`+${count - listed + 1} more`, '', cell[0], cell[1], layout.align, 11, false));
        } else {
            const ring = metrics[i].ring;
            titles.push(textSlot(
                `{dot|●}${richText(ring.text)}`, truncate(ring.name, layout.nameChars), cell[0], cell[1], layout.align, 13, true,
                ring.color,
            ));
        }
    }

    return buildRings({
        rings: metrics.map(metric => metric.ring),
        center: layout.center,
        outerRadius: layout.outerRadius,
        innerRadius: clean(layout.outerRadius * hole),
        gap: asNumber(props.ringGap, 25),
        startAngle,
        sweep,
        titles,
    });
}

export const metricRingsBehavior: ChartBehavior<MetricRingsProps> = { readProps, buildOption };
