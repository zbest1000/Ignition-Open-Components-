import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { Row, asArray, asString, noDataTitle, readBoolean, readNumber, readProp, readString, toNumber } from './util';

export const CAPABILITY_HISTOGRAM_ID = 'open.industrial.CapabilityHistogram';

export interface CapabilityHistogramProps {
    /** Measurements (in time order when sigmaMethod is "within"); validated in buildOption. */
    values: unknown;
    /** Lower / upper specification limit and target; null or blank when there is none. */
    lsl: unknown;
    usl: unknown;
    target: unknown;
    /** "auto" or a number of bins. */
    bins: unknown;
    showNormalCurve: boolean;
    showStats: boolean;
    /** "overall" (default) or "within". */
    sigmaMethod: string;
    decimals: number;
    unit: string;
    title: string;
    barColor: string;
    outOfSpecColor: string;
    curveColor: string;
    limitColor: string;
    targetColor: string;
}

export interface CapabilityStats {
    n: number;
    /** Null when there are no values. */
    mean: number | null;
    min: number | null;
    max: number | null;
    /** Sample standard deviation (divisor n - 1) of all values; null when n < 2. */
    sigmaOverall: number | null;
    /** Short-term estimate: average moving range of consecutive values / d2 (1.128); null when n < 2. */
    sigmaWithin: number | null;
    lsl: number | null;
    usl: number | null;
    target: number | null;
    /** Performance indices, from sigmaOverall. */
    pp: number | null;
    ppl: number | null;
    ppu: number | null;
    ppk: number | null;
    /** Capability indices, from sigmaWithin. */
    cp: number | null;
    cpl: number | null;
    cpu: number | null;
    cpk: number | null;
    /** Values strictly below LSL / strictly above USL (a value on a limit is in spec). */
    belowLsl: number;
    aboveUsl: number;
}

export interface Histogram {
    /** counts.length + 1 ascending bin edges. */
    edges: number[];
    counts: number[];
    /** How the number of bins was chosen. */
    rule: 'freedman-diaconis' | 'sturges' | 'fixed' | 'single';
}

/** d2 for moving ranges of two consecutive values, as used by the SPC chart. */
export const D2_MOVING_RANGE = 1.128;
export const MAX_FIXED_BINS = 200;
export const MAX_AUTO_BINS = 60;

const BAR_COLOR = '#5470c6';
const OUT_OF_SPEC_COLOR = '#ee6666';
const CURVE_COLOR = '#e6a23c';
const LIMIT_COLOR = '#d9534f';
const TARGET_COLOR = '#3ba272';
const MAX_DECIMALS = 10;
const CURVE_POINTS = 80;

const DEFAULT_VALUES: readonly number[] = [
    25.054, 24.994, 25.011, 24.988, 25.009, 25.004, 25.01, 24.993, 25.027, 25.027, 25.005, 24.985,
    24.984, 25.014, 25.027, 25.03, 25.001, 25.022, 25.015, 24.995, 25.001, 24.998, 25.014, 25.007,
    25.003, 25, 25.007, 25.012, 24.997, 25.019, 25.026, 25.014, 24.998, 25.012, 25.011, 24.979,
    25.005, 25.006, 25.021, 24.999, 25.003, 25.02, 25.019, 25.011, 25.014, 24.994, 24.977, 25.012,
    25.011, 24.997, 25, 25, 25.004, 25.003, 24.997, 25.029, 25.012, 25.012, 25.006, 25.02,
    25.052, 25.022, 25.005, 25.027, 25.009, 24.996, 24.994, 25.006, 24.992, 24.987, 24.992, 25.002,
    24.983, 24.992, 25.012, 24.98, 24.995, 24.986, 24.995, 25.017, 25.016, 25.023, 25.03, 25.029,
    24.985, 25.023, 25.023, 25.008, 24.983, 24.994, 25.004, 25.033, 25.017, 25.025, 25.009, 24.98,
    24.985, 25.006, 24.987, 25.008, 24.986, 25.014, 24.988, 25.01, 25, 25.014, 24.985, 25.027,
    24.976, 25.006, 24.995, 24.995, 24.996, 25, 25.003, 25.001, 25.016, 25.019, 25.013, 24.99,
];

/** Removes binary floating point noise from computed edges and axis bounds. */
function clean(n: number): number {
    return Number(n.toPrecision(12));
}

/** A finite number, or null for null, blank, non-numeric and non-finite input. */
function optionalNumber(value: unknown): number | null {
    const n = toNumber(value);
    return Number.isNaN(n) ? null : n;
}

function indices(mean: number, sigma: number | null, lsl: number | null, usl: number | null): { both: number | null; lower: number | null; upper: number | null; k: number | null } {
    if (sigma === null || !(sigma > 0)) return { both: null, lower: null, upper: null, k: null };
    const lower = lsl === null ? null : (mean - lsl) / (3 * sigma);
    const upper = usl === null ? null : (usl - mean) / (3 * sigma);
    const both = lsl === null || usl === null ? null : (usl - lsl) / (6 * sigma);
    const k = lower === null ? upper : (upper === null ? lower : Math.min(lower, upper));
    return { both, lower, upper, k };
}

/**
 * Drops non-numeric entries and computes every statistic in ONE pass over the
 * input (Welford's running mean/variance, running min/max, the sum of moving
 * ranges and the out-of-spec counts), so it is safe for very large arrays.
 *
 *   sigmaOverall = sqrt( sum((x - mean)^2) / (n - 1) )
 *   sigmaWithin  = mean(|x[i] - x[i-1]|) / 1.128        (needs time order)
 *   Pp  = (USL - LSL) / (6 sigmaOverall)    Cp  = (USL - LSL) / (6 sigmaWithin)
 *   Ppu = (USL - mean) / (3 sigmaOverall)   Ppl = (mean - LSL) / (3 sigmaOverall)
 *   Ppk = min(Ppu, Ppl)                     Cpk = min(Cpu, Cpl), likewise with sigmaWithin
 *
 * With a one-sided specification Pp/Cp are null and Ppk/Cpk equal the index
 * of the side that exists. Every index is null when its sigma is null or 0.
 * If LSL is greater than USL the two are swapped.
 */
export function analyseCapability(rawValues: unknown, rawLsl?: unknown, rawUsl?: unknown, rawTarget?: unknown): { values: number[]; stats: CapabilityStats } {
    let lsl = optionalNumber(rawLsl);
    let usl = optionalNumber(rawUsl);
    if (lsl !== null && usl !== null && lsl > usl) [lsl, usl] = [usl, lsl];

    const values: number[] = [];
    let mean = 0;
    let squares = 0;
    let min = Infinity;
    let max = -Infinity;
    let rangeSum = 0;
    let previous = 0;
    let belowLsl = 0;
    let aboveUsl = 0;
    for (const raw of asArray(rawValues)) {
        const v = toNumber(raw);
        if (Number.isNaN(v)) continue;
        const n = values.push(v);
        const delta = v - mean;
        mean += delta / n;
        squares += delta * (v - mean);
        if (v < min) min = v;
        if (v > max) max = v;
        if (n > 1) rangeSum += Math.abs(v - previous);
        previous = v;
        if (lsl !== null && v < lsl) belowLsl++;
        if (usl !== null && v > usl) aboveUsl++;
    }

    const n = values.length;
    const sigmaOverall = n >= 2 ? Math.sqrt(Math.max(0, squares) / (n - 1)) : null;
    const sigmaWithin = n >= 2 ? rangeSum / (n - 1) / D2_MOVING_RANGE : null;
    const p = indices(mean, sigmaOverall, lsl, usl);
    const c = indices(mean, sigmaWithin, lsl, usl);
    return {
        values,
        stats: {
            n,
            mean: n > 0 ? mean : null,
            min: n > 0 ? min : null,
            max: n > 0 ? max : null,
            sigmaOverall, sigmaWithin,
            lsl, usl, target: optionalNumber(rawTarget),
            pp: n > 0 ? p.both : null, ppl: n > 0 ? p.lower : null, ppu: n > 0 ? p.upper : null, ppk: n > 0 ? p.k : null,
            cp: n > 0 ? c.both : null, cpl: n > 0 ? c.lower : null, cpu: n > 0 ? c.upper : null, cpk: n > 0 ? c.k : null,
            belowLsl, aboveUsl,
        },
    };
}

/** Smallest of 1, 2, 5, 10 x 10^k that is not below `raw`. */
function roundStepUp(raw: number): number {
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const fraction = raw / magnitude;
    const nice = fraction <= 1.0000001 ? 1 : fraction <= 2.0000001 ? 2 : fraction <= 5.0000001 ? 5 : 10;
    return clean(nice * magnitude);
}

/** Quantile by linear interpolation between order statistics (Hyndman-Fan type 7, the Excel/NumPy default). */
function quantile(sorted: Float64Array, p: number): number {
    const h = (sorted.length - 1) * p;
    const lower = Math.floor(h);
    const upper = Math.min(lower + 1, sorted.length - 1);
    return sorted[lower] + (h - lower) * (sorted[upper] - sorted[lower]);
}

/**
 * Number of bins for bins = "auto":
 *
 * - Freedman-Diaconis: width h = 2 IQR / n^(1/3), bins = ceil(range / h);
 * - when the IQR is 0 (heavily tied data) Sturges' rule: bins = ceil(log2 n) + 1.
 *
 * The result is limited to MAX_AUTO_BINS. Sorts a copy of the values to find
 * the quartiles.
 */
export function autoBinCount(values: readonly number[], min: number, max: number): { count: number; rule: 'freedman-diaconis' | 'sturges' } {
    const n = values.length;
    const sorted = Float64Array.from(values).sort();
    const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
    if (iqr > 0) {
        const count = Math.ceil((max - min) / (2 * iqr / Math.cbrt(n)) - 1e-9);
        return { count: Math.max(1, Math.min(count, MAX_AUTO_BINS)), rule: 'freedman-diaconis' };
    }
    return { count: Math.max(1, Math.min(Math.ceil(Math.log2(n)) + 1, MAX_AUTO_BINS)), rule: 'sturges' };
}

/**
 * Bins the values into equal-width bins.
 *
 * Every bin contains its lower edge and excludes its upper edge, [lo, hi),
 * except the last bin, which also contains its upper edge so that the largest
 * value is counted: [lo, hi].
 *
 * - `bins` a number (1..MAX_FIXED_BINS, fractions are floored): exactly that
 *   many bins spanning [min, max].
 * - anything else ("auto"): the bin count from {@link autoBinCount}; the bin
 *   width is then rounded up to 1, 2 or 5 x 10^k and the edges are aligned to
 *   multiples of it, so the bins have readable boundaries. The final number
 *   of bins can therefore differ slightly from what the rule suggests.
 * - all values equal: a single bin centred on the value, `singleWidth` wide
 *   (default: 1 % of the value rounded up to 1, 2 or 5 x 10^k, or 1 for zero).
 *
 * `min` and `max` must be the extremes of `values` (from analyseCapability).
 */
export function computeHistogram(values: readonly number[], min: number, max: number, bins?: unknown, singleWidth?: number): Histogram {
    const n = values.length;
    if (n === 0) return { edges: [], counts: [], rule: 'single' };
    if (!(max > min)) {
        const width = singleWidth !== undefined && singleWidth > 0
            ? singleWidth
            : (min === 0 ? 1 : roundStepUp(Math.abs(min) * 0.01));
        return { edges: [clean(min - width / 2), clean(min + width / 2)], counts: [n], rule: 'single' };
    }

    const requested = Math.floor(toNumber(bins));
    const edges: number[] = [];
    let rule: Histogram['rule'];
    let width: number;
    if (requested >= 1) {
        rule = 'fixed';
        const count = Math.min(requested, MAX_FIXED_BINS);
        width = (max - min) / count;
        for (let i = 0; i < count; i++) edges.push(clean(min + i * width));
        edges.push(max);
    } else {
        const auto = autoBinCount(values, min, max);
        rule = auto.rule;
        width = roundStepUp((max - min) / auto.count);
        const first = Math.floor(min / width + 1e-9);
        const count = Math.max(1, Math.ceil(max / width - 1e-9) - first);
        for (let i = 0; i <= count; i++) edges.push(clean((first + i) * width));
    }

    const last = edges.length - 2;
    const counts = new Array<number>(last + 1).fill(0);
    const origin = edges[0];
    for (let i = 0; i < n; i++) {
        const v = values[i];
        let bin = Math.floor((v - origin) / width);
        if (bin < 0) bin = 0; else if (bin > last) bin = last;
        // The division can land one bin off for a value on (or next to) an edge; the edges decide.
        while (bin > 0 && v < edges[bin]) bin--;
        while (bin < last && v >= edges[bin + 1]) bin++;
        counts[bin]++;
    }
    return { edges, counts, rule };
}

/** Density of the normal distribution N(mean, sigma). */
export function normalDensity(x: number, mean: number, sigma: number): number {
    const z = (x - mean) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

function normaliseDecimals(value: unknown): number {
    const n = Math.floor(toNumber(value));
    return Number.isNaN(n) || n < 0 ? 0 : Math.min(n, MAX_DECIMALS);
}

function fixed(value: number, decimals: number): string {
    const text = value.toFixed(decimals);
    return Number(text) === 0 ? text.replace('-', '') : text.replace('-', '−');
}

/**
 * The statistics readout, one string per line.
 *
 * Honest labelling: indices computed from the overall standard deviation are
 * called Pp / Ppk, indices from the within (moving range) estimate are called
 * Cp / Cpk; `within` selects which pair - and which sigma - is shown. Sigma is
 * printed with one decimal more than `decimals`. Indices that cannot be
 * computed (no limit, sigma 0, fewer than two values) are left out.
 */
export function capabilityReadout(stats: CapabilityStats, within: boolean, decimals: number, unit: string): string[] {
    if (stats.n === 0 || stats.mean === null) return [];
    const suffix = unit === '' ? '' : ` ${unit}`;
    const first = [`n ${stats.n}`, `Mean ${fixed(stats.mean, decimals)}${suffix}`];
    const sigma = within ? stats.sigmaWithin : stats.sigmaOverall;
    if (sigma !== null) first.push(`σ ${within ? 'within' : 'overall'} ${fixed(sigma, Math.min(decimals + 1, MAX_DECIMALS))}`);

    const second: string[] = [];
    const both = within ? stats.cp : stats.pp;
    const k = within ? stats.cpk : stats.ppk;
    if (both !== null) second.push(`${within ? 'Cp' : 'Pp'} ${fixed(both, 2)}`);
    if (k !== null) {
        const side = stats.lsl === null ? ' (USL only)' : stats.usl === null ? ' (LSL only)' : '';
        second.push(`${within ? 'Cpk' : 'Ppk'} ${fixed(k, 2)}${side}`);
    }
    if (stats.lsl !== null || stats.usl !== null) {
        const out = stats.belowLsl + stats.aboveUsl;
        second.push(out === 0 ? 'Out of spec 0' : `Out of spec ${out} (${fixed(out / stats.n * 100, 1)} %)`);
    }
    return second.length > 0 ? [first.join(' · '), second.join(' · ')] : [first.join(' · ')];
}

function niceInterval(raw: number): number {
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const fraction = raw / magnitude;
    return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * magnitude;
}

/** Axis range covering [lo, hi] with a small margin, rounded outwards to a round tick interval. */
function axisRange(lo: number, hi: number): { min: number; max: number; interval: number } {
    const span = hi - lo || Math.abs(hi) || 1;
    const interval = niceInterval(span / 8);
    return {
        min: clean(Math.floor((lo - span * 0.03) / interval) * interval),
        max: clean(Math.ceil((hi + span * 0.03) / interval) * interval),
        interval: clean(interval),
    };
}

/** Text for an HTML tooltip template: no markup, and no "{x}" placeholders ECharts would substitute. */
function tooltipText(text: string): string {
    return text.replace(/[&<>"'{}]/g, ch => `&#${ch.charCodeAt(0)};`);
}

function color(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

interface Marker { label: string; value: number; color: string; type: string; width: number }

/**
 * Stacks marker labels in rows so that neighbours (typically mean and target)
 * do not overprint: each label takes the lowest row in which it keeps clear
 * of the labels already placed. Widths are estimated for the smallest
 * supported chart, so a larger chart only gets more air. Returns the row of
 * each marker (0 = next to the plot).
 */
export function markerRows(markers: ReadonlyArray<{ label: string; value: number }>, axisMin: number, axisMax: number): number[] {
    const span = axisMax - axisMin || 1;
    const rows: Array<Array<[number, number]>> = [];
    return markers.map(marker => {
        const half = (marker.label.length * 7 + 10) / 230 / 2;
        const at = (marker.value - axisMin) / span;
        const from = at - half;
        const to = at + half;
        let row = 0;
        while (rows[row] && rows[row].some(([a, b]) => from < b && to > a)) row++;
        (rows[row] = rows[row] || []).push([from, to]);
        return row;
    });
}

/**
 * The limits and the target fall back to null, not to the sample values of
 * the schema: a binding that delivers null means "no such limit" (a one-sided
 * specification), and must not bring the sample limit back.
 */
function readProps(tree: PropertyTree): CapabilityHistogramProps {
    return {
        values: readProp(tree, 'values', DEFAULT_VALUES.slice()),
        lsl: readProp(tree, 'lsl', null),
        usl: readProp(tree, 'usl', null),
        target: readProp(tree, 'target', null),
        bins: readProp(tree, 'bins', 'auto'),
        showNormalCurve: readBoolean(tree, 'showNormalCurve', true),
        showStats: readBoolean(tree, 'showStats', true),
        sigmaMethod: readString(tree, 'sigmaMethod', 'overall'),
        decimals: readNumber(tree, 'decimals', 3),
        unit: readString(tree, 'unit', 'mm'),
        title: readString(tree, 'title', ''),
        barColor: readString(tree, 'barColor', BAR_COLOR),
        outOfSpecColor: readString(tree, 'outOfSpecColor', OUT_OF_SPEC_COLOR),
        curveColor: readString(tree, 'curveColor', CURVE_COLOR),
        limitColor: readString(tree, 'limitColor', LIMIT_COLOR),
        targetColor: readString(tree, 'targetColor', TARGET_COLOR),
    };
}

/**
 * The histogram is drawn on a continuous value axis so that the limits, the
 * mean and the fitted curve sit at their true positions. The bins are the
 * outline of an area series (ECharts cannot size bars to a value interval),
 * split at the specification limits: the part of the histogram outside the
 * limits goes to a second series in the out-of-spec colour. An invisible bar
 * series on top carries the per-bin tooltip.
 */
function buildOption(props: CapabilityHistogramProps): object {
    const { values, stats } = analyseCapability(props.values, props.lsl, props.usl, props.target);
    const decimals = normaliseDecimals(props.decimals);
    const unit = asString(props.unit, '').trim();
    const title = asString(props.title, '');
    const within = asString(props.sigmaMethod, '').trim().toLowerCase() === 'within';
    const empty = stats.n === 0 || stats.mean === null || stats.min === null || stats.max === null;
    const lines = props.showStats !== false ? capabilityReadout(stats, within, decimals, unit) : [];

    const titleEntry: Row = { text: title, left: 'center', top: 6, itemGap: title === '' ? 0 : 4 };
    if (lines.length > 0) {
        titleEntry.subtext = lines.join('\n');
        titleEntry.subtextStyle = { fontSize: 12, lineHeight: 16 };
    }
    const headHeight = 6 + (title === '' ? 0 : 26) + lines.length * 16;

    if (empty) {
        return {
            title: [titleEntry, noDataTitle(true)],
            tooltip: { trigger: 'item' },
            grid: { top: headHeight + 24, bottom: 10, left: 12, right: 20, containLabel: true },
            xAxis: { type: 'value', name: unit, nameLocation: 'middle', nameGap: 26 },
            yAxis: { type: 'value', name: 'Count', nameLocation: 'middle', nameGap: 30, min: 0, minInterval: 1 },
            series: [],
        };
    }

    const mean = stats.mean as number;
    const { lsl, usl, target } = stats;
    // Constant data: one bin a tenth of the tolerance wide, so it does not spill over the limits.
    const tolerance = lsl !== null && usl !== null && usl > lsl ? clean((usl - lsl) / 10) : undefined;
    const histogram = computeHistogram(values, stats.min as number, stats.max as number, props.bins, tolerance);
    const { edges, counts } = histogram;
    const sigma = within ? stats.sigmaWithin : stats.sigmaOverall;
    const hasSigma = sigma !== null && sigma > 0;

    let lo = edges[0];
    let hi = edges[edges.length - 1];
    const include = (v: number | null): void => {
        if (v === null) return;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
    };
    include(lsl);
    include(usl);
    include(target);
    if (hasSigma) {
        include(mean - 3 * (sigma as number));
        include(mean + 3 * (sigma as number));
    }
    const range = axisRange(lo, hi);

    // Bin outlines, split at the limits into an in-spec and an out-of-spec part.
    const lowCut = lsl === null ? -Infinity : lsl;
    const highCut = usl === null ? Infinity : usl;
    const inSpec: number[][] = [];
    const outOfSpec: Array<number[] | null> = [];
    const hits: Row[] = [];
    let peak = 0;
    const unitHtml = unit === '' ? '' : ` ${tooltipText(unit)}`;
    const box = (target: Array<number[] | null>, from: number, to: number, count: number): void => {
        target.push([from, 0], [from, count], [to, count], [to, 0]);
    };
    for (let i = 0; i < counts.length; i++) {
        const from = edges[i];
        const to = edges[i + 1];
        const count = counts[i];
        if (count > peak) peak = count;
        if (count > 0) {
            const a = Math.min(Math.max(from, lowCut), to);
            const b = Math.max(Math.min(to, highCut), a);
            if (a > from) {
                if (outOfSpec.length > 0 && (outOfSpec[outOfSpec.length - 1] as number[])[0] !== from) outOfSpec.push(null);
                box(outOfSpec, from, a, count);
            }
            if (b > a) box(inSpec, a, b, count);
            if (to > b) {
                if (outOfSpec.length > 0 && (outOfSpec[outOfSpec.length - 1] as number[])[0] !== b) outOfSpec.push(null);
                box(outOfSpec, b, to, count);
            }
        }
        const closing = i === counts.length - 1 ? ']' : ')';
        hits.push({
            value: [clean((from + to) / 2), count],
            tooltip: {
                formatter: `[${fixed(from, decimals)}, ${fixed(to, decimals)}${closing}${unitHtml}<br/><b>${count}</b> of ${stats.n} (${fixed(count / stats.n * 100, 1)} %)`,
            },
        });
    }

    const markers: Marker[] = [];
    const limitColor = color(props.limitColor, LIMIT_COLOR);
    const curveColor = color(props.curveColor, CURVE_COLOR);
    if (lsl !== null) markers.push({ label: 'LSL', value: lsl, color: limitColor, type: 'solid', width: 1.5 });
    if (usl !== null) markers.push({ label: 'USL', value: usl, color: limitColor, type: 'solid', width: 1.5 });
    if (target !== null) markers.push({ label: 'Target', value: target, color: color(props.targetColor, TARGET_COLOR), type: 'dashed', width: 1.5 });
    markers.push({ label: 'Mean', value: mean, color: curveColor, type: 'dashed', width: 1.5 });
    const rows = markerRows(markers, range.min, range.max);
    let labelRows = 0;
    for (const row of rows) if (row + 1 > labelRows) labelRows = row + 1;

    const outline = (name: string, data: unknown[], fill: string): Row => ({
        type: 'line', name, data, silent: true, symbol: 'none', z: 2,
        lineStyle: { color: fill, width: 1 },
        areaStyle: { color: fill, opacity: 0.55 },
        tooltip: { show: false },
    });
    const barColor = color(props.barColor, BAR_COLOR);
    const inSpecSeries = outline('In spec', inSpec, barColor);
    inSpecSeries.markLine = {
        silent: true, symbol: 'none', animation: false, z: 5,
        data: markers.map((marker, i) => ({
            xAxis: marker.value,
            lineStyle: { color: marker.color, type: marker.type, width: marker.width },
            label: {
                show: true, position: 'end', formatter: marker.label, color: marker.color,
                distance: 4 + rows[i] * 14,
            },
        })),
    };
    const series: Row[] = [inSpecSeries];
    if (outOfSpec.length > 0) {
        series.push(outline('Out of spec', outOfSpec, color(props.outOfSpecColor, OUT_OF_SPEC_COLOR)));
    }
    if (props.showNormalCurve !== false && hasSigma) {
        const s = sigma as number;
        const width = edges[1] - edges[0];
        const from = Math.max(range.min, mean - 4 * s);
        const to = Math.min(range.max, mean + 4 * s);
        const curve: number[][] = [];
        for (let i = 0; i <= CURVE_POINTS; i++) {
            const x = from + (to - from) * i / CURVE_POINTS;
            curve.push([clean(x), Number((stats.n * width * normalDensity(x, mean, s)).toPrecision(6))]);
        }
        series.push({
            type: 'line', name: 'Normal fit', data: curve, silent: true, symbol: 'none', z: 4,
            lineStyle: { color: curveColor, width: 2 },
            tooltip: { show: false },
        });
    }
    series.push({
        type: 'bar', name: 'Count', data: hits, z: 3,
        barWidth: '100%', barGap: '-100%',
        itemStyle: { color: 'transparent' },
        emphasis: { itemStyle: { color: 'rgba(128, 128, 128, 0.25)' } },
    });

    return {
        title: [titleEntry, noDataTitle(false)],
        tooltip: { trigger: 'item' },
        grid: { top: headHeight + 10 + labelRows * 14, bottom: unit === '' ? 10 : 30, left: 30, right: 20, containLabel: true },
        xAxis: {
            type: 'value', name: unit, nameLocation: 'middle', nameGap: 26,
            min: range.min, max: range.max, interval: range.interval,
            axisLabel: { hideOverlap: true },
            splitLine: { show: false },
        },
        yAxis: {
            type: 'value', name: 'Count', nameLocation: 'middle', nameGap: 14 + String(peak).length * 7,
            min: 0, minInterval: 1, splitNumber: 4,
        },
        series,
    };
}

export const capabilityHistogramBehavior: ChartBehavior<CapabilityHistogramProps> = { readProps, buildOption };
