import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { formatNumber, richText, toDecimals, tooltipText, withUnit } from './metricRings';
import {
    Row, asArray, asBoolean, asString, isRecord, noDataTitle, readBoolean, readNumber, readProp, readString, toLabel,
    toNumber,
} from './util';

export const BULLET_CHART_ID = 'open.industrial.BulletChart';

export interface BulletChartProps {
    /** Rows as objects { name, value, target?, max?, ranges?, color? }; validated in buildOption. */
    items: unknown;
    title: string;
    /** "horizontal" (default) or "vertical". */
    orientation: string;
    unit: string;
    decimals: number;
    /** Draw every row as a percentage of its own target, so that all targets line up at 100 %. */
    percentOfTarget: boolean;
    /** Band boundaries in percent of the target, for items without `ranges` of their own. */
    ranges: unknown;
    /** Band colours from the lowest band to the highest. */
    bandColors: unknown;
    /** Colour of the bars. */
    color: string;
    /** When non-empty, a bar takes the colour of the band its value is in (lowest band first). */
    statusColors: unknown;
    targetColor: string;
    showValues: boolean;
}

export interface BulletRow {
    name: string;
    /** NaN when the item has no usable value. */
    value: number;
    /** NaN when the item has no target. */
    target: number;
    /** End of the scale of this row: at least the value and the target. */
    max: number;
    /** Ascending band boundaries strictly inside 0..max, in the units of the value. */
    bounds: number[];
    /** Index of the band the value is in (0 = lowest); -1 without a value. */
    band: number;
    color?: string;
}

const DEFAULT_ITEMS: Row[] = [
    { name: 'Line 1', value: 1180, target: 1200 },
    { name: 'Line 2', value: 860, target: 1000 },
    { name: 'Line 3', value: 1320, target: 1250 },
    { name: 'Line 4', value: 540, target: 900 },
];
const DEFAULT_RANGES = [75, 95];
/** Greys from dark (poor) to light (good), translucent so that they work on light and dark backgrounds. */
const DEFAULT_BAND_COLORS = ['rgba(128,128,128,0.45)', 'rgba(128,128,128,0.28)', 'rgba(128,128,128,0.14)'];
const BAR_COLOR = '#5470c6';
const TARGET_COLOR = '#262626';
const TARGET_OUTLINE = '#ffffff';
const MUTED = '#8c8c8c';
const MAX_ITEMS = 60;
const MAX_BOUNDS = 4;
/** Headroom of the scale beyond the target (or the value) when an item sets no `max`. */
const HEADROOM = 1.2;
/** Width of the target marker in percent of the longest scale. */
const TARGET_WIDTH = 1;
/** ... and its least thickness in pixels, outline included, for small charts. */
const TARGET_MIN_PX = 5;

/** Removes binary floating point noise (0.1 + 0.2) from sums. */
function clean(n: number): number {
    return Number(n.toPrecision(12));
}

/** The non-empty strings of an array prop, or the fallback when there are none. */
function colorList(raw: unknown, fallback: readonly string[]): readonly string[] {
    const colors = asArray(raw).filter((c): c is string => typeof c === 'string' && c !== '');
    return colors.length > 0 ? colors : fallback;
}

/** Positive finite numbers of an array prop, ascending, without duplicates. */
function boundaries(raw: unknown): number[] {
    const out: number[] = [];
    for (const entry of asArray(raw)) {
        const n = toNumber(entry);
        if (!Number.isNaN(n) && n > 0 && !out.includes(n)) out.push(n);
    }
    return out.sort((a, b) => a - b);
}

/**
 * Validates the `items` prop.
 *
 * Entries that are not objects, and objects with neither a name nor a numeric
 * value, are skipped. The scale of a row starts at zero (a bar encodes its
 * value by length) and ends at the item's `max`, or 120 % of its target, or
 * 120 % of its value without a target; it is extended to hold the value and
 * the target if they are larger. Band boundaries are the item's `ranges` in
 * the units of the value, or the shared `ranges` in percent of the target.
 */
export function computeBullets(rawItems: unknown, rawRanges: unknown): BulletRow[] {
    const shared = boundaries(rawRanges);
    const rows: BulletRow[] = [];
    for (const item of asArray(rawItems)) {
        if (rows.length >= MAX_ITEMS) break;
        if (!isRecord(item)) continue;
        const label = toLabel(item.name);
        const value = toNumber(item.value);
        if (label === null && Number.isNaN(value)) continue;

        const rawTarget = toNumber(item.target);
        const target = rawTarget > 0 ? rawTarget : NaN;
        const length = Number.isNaN(value) ? 0 : Math.max(0, value);
        const ownMax = toNumber(item.max);
        const base = ownMax > 0 ? ownMax : (Number.isNaN(target) ? length : target) * HEADROOM;
        const max = clean(Math.max(base, length, Number.isNaN(target) ? 0 : target));

        const candidates = Array.isArray(item.ranges)
            ? boundaries(item.ranges)
            : (Number.isNaN(target) ? [] : shared.map(percent => clean(target * percent / 100)));
        const bounds = candidates.filter(b => b < max).slice(0, MAX_BOUNDS);
        let band = -1;
        if (!Number.isNaN(value)) {
            band = 0;
            while (band < bounds.length && value >= bounds[band]) band++;
        }
        rows.push({
            name: label ?? `Item ${rows.length + 1}`,
            value, target, max, bounds, band,
            color: typeof item.color === 'string' && item.color !== '' ? item.color : undefined,
        });
    }
    return rows;
}

function readProps(tree: PropertyTree): BulletChartProps {
    return {
        items: readProp(tree, 'items', DEFAULT_ITEMS),
        title: readString(tree, 'title', ''),
        orientation: readString(tree, 'orientation', 'horizontal'),
        unit: readString(tree, 'unit', 'pcs'),
        decimals: readNumber(tree, 'decimals', 0),
        percentOfTarget: readBoolean(tree, 'percentOfTarget', false),
        ranges: readProp(tree, 'ranges', DEFAULT_RANGES),
        bandColors: readProp(tree, 'bandColors', DEFAULT_BAND_COLORS),
        color: readString(tree, 'color', BAR_COLOR),
        statusColors: readProp(tree, 'statusColors', []),
        targetColor: readString(tree, 'targetColor', TARGET_COLOR),
        showValues: readBoolean(tree, 'showValues', true),
    };
}

function buildOption(props: BulletChartProps): object {
    const rows = computeBullets(props.items, props.ranges);
    const vertical = props.orientation === 'vertical';
    const percentMode = asBoolean(props.percentOfTarget, false);
    const unit = asString(props.unit, '');
    const decimals = toDecimals(props.decimals, 0);
    const title = asString(props.title, '');
    const showValues = asBoolean(props.showValues, true);
    const bandColors = colorList(props.bandColors, DEFAULT_BAND_COLORS);
    const statusColors = colorList(props.statusColors, []);
    const barColor = asString(props.color, '') || BAR_COLOR;
    const targetColor = asString(props.targetColor, '') || TARGET_COLOR;
    const format = (n: number): string => withUnit(formatNumber(n, decimals), unit);

    // In percent mode every row is scaled so that its target (or, without one, the end of its scale) is 100.
    const factors = rows.map(row => (percentMode ? 100 / (Number.isNaN(row.target) ? row.max || 1 : row.target) : 1));
    let axisMax = 0;
    let bandCount = 0;
    rows.forEach((row, i) => {
        axisMax = Math.max(axisMax, row.max * factors[i]);
        bandCount = Math.max(bandCount, row.bounds.length + 1);
    });
    const tick = clean(axisMax * TARGET_WIDTH / 100);

    const names: string[] = [];
    const valueLabels: string[] = [];
    const bars: Row[] = [];
    const offsets: Array<number | string> = [];
    const ticks: Array<number | string> = [];
    const bands: Row[][] = [];
    for (let b = 0; b < bandCount; b++) bands.push([]);

    rows.forEach((row, i) => {
        const factor = factors[i];
        const hasValue = !Number.isNaN(row.value);
        const hasTarget = !Number.isNaN(row.target);
        const valueText = hasValue ? format(row.value) : '–';
        const attainment = hasValue && hasTarget ? `${(row.value / row.target * 100).toFixed(0)}%` : '';
        names.push(row.name);
        valueLabels.push(`{v|${richText(valueText)}}${attainment === '' ? '' : `{p|  ${attainment}}`}`);

        // Bands: the stack 0..b1, b1..b2, ..., bk..max. Rows with fewer bands than
        // the widest row use the lighter colours, so their last band matches.
        const edges = [0, ...row.bounds, row.max];
        const shift = Math.max(0, Math.min(bandColors.length, bandCount) - (edges.length - 1));
        for (let b = 0; b < bandCount; b++) {
            if (b >= edges.length - 1 || row.max <= 0) {
                bands[b].push({ value: '-' });
            } else {
                bands[b].push({
                    value: clean((edges[b + 1] - edges[b]) * factor),
                    itemStyle: { color: bandColors[Math.min(b + shift, bandColors.length - 1)] },
                });
            }
        }

        const status = statusColors.length > 0 && row.band >= 0
            ? statusColors[Math.min(row.band, statusColors.length - 1)]
            : undefined;
        const lines = [`{b}`, `Actual: <b>${tooltipText(valueText)}</b>`];
        if (hasTarget) lines.push(`Target: ${tooltipText(format(row.target))}${attainment === '' ? '' : ` (${attainment})`}`);
        bars.push({
            value: hasValue ? clean(Math.max(0, row.value) * factor) : '-',
            itemStyle: { color: status ?? row.color ?? barColor },
            tooltip: { formatter: lines.join('<br>') },
        });

        if (hasTarget && tick > 0) {
            offsets.push(clean(Math.max(0, row.target * factor - tick / 2)));
            ticks.push(tick);
        } else {
            offsets.push('-');
            ticks.push('-');
        }
    });

    // Three category axes over the same rows: ECharts lays out the bars of each
    // axis on their own, which centres the wide bands, the narrow bar and the
    // target marker on one another. The second axis also carries the value labels.
    const categoryAxes: Row[] = [
        {
            type: 'category', data: names, inverse: !vertical,
            axisTick: { show: false }, axisLine: { show: false },
            axisLabel: { interval: 0, hideOverlap: true, width: vertical ? 90 : 130, overflow: 'truncate' },
        },
        {
            type: 'category', data: valueLabels, inverse: !vertical,
            position: vertical ? 'top' : 'right',
            axisTick: { show: false }, axisLine: { show: false },
            axisLabel: {
                show: showValues, interval: 0, hideOverlap: true,
                rich: { v: { fontWeight: 'bold', fontSize: 12 }, p: { fontSize: 11, color: MUTED } },
            },
        },
        { type: 'category', data: names.map((_name, i) => String(i)), inverse: !vertical, show: false },
    ];
    const valueAxis: Row = {
        type: 'value', min: 0,
        splitLine: { show: false },
        axisLabel: { formatter: percentMode ? '{value}%' : '{value}', hideOverlap: true },
    };
    const onAxis = (index: number): Row => (vertical ? { xAxisIndex: index } : { yAxisIndex: index });

    const series: Row[] = bands.map((data, b) => ({
        type: 'bar', name: `band${b}`, ...onAxis(1), stack: 'bands', z: 1,
        barWidth: '64%', silent: true, animation: false,
        tooltip: { show: false },
        data,
    }));
    series.push({
        type: 'bar', name: 'actual', ...onAxis(0), z: 3,
        barWidth: '26%',
        data: bars,
    });
    series.push({
        type: 'bar', name: 'targetOffset', ...onAxis(2), stack: 'target', z: 4,
        barWidth: '46%', silent: true, animation: false,
        itemStyle: { color: 'transparent' },
        tooltip: { show: false },
        data: offsets,
    });
    series.push({
        type: 'bar', name: 'target', ...onAxis(2), stack: 'target', z: 4,
        barWidth: '46%', barMinHeight: TARGET_MIN_PX, silent: true, animation: false,
        itemStyle: { color: targetColor, borderColor: TARGET_OUTLINE, borderWidth: 1 },
        tooltip: { show: false },
        data: ticks,
    });

    return {
        title: [{ text: title, left: 'center' }, noDataTitle(rows.length === 0)],
        tooltip: { trigger: 'item' },
        grid: { left: 12, right: 16, top: title === '' ? 14 : 44, bottom: 10, containLabel: true },
        xAxis: vertical ? categoryAxes : [valueAxis],
        yAxis: vertical ? [valueAxis] : categoryAxes,
        series,
    };
}

export const bulletChartBehavior: ChartBehavior<BulletChartProps> = { readProps, buildOption };
