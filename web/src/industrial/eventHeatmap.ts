import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import {
    Row, asArray, asBoolean, asNumber, asString, isRecord, noDataTitle, readBoolean, readNumber, readProp, readString,
    toLabel, toNumber,
} from './util';

export const EVENT_HEATMAP_ID = 'open.industrial.EventHeatmap';

export interface EventHeatmapProps {
    /** Pre-aggregated rows of `{ day, hour, value }`; validated in buildOption. */
    cells: unknown;
    /** Raw event times (epoch ms or ISO strings); when non-empty they replace `cells`. Validated in buildOption. */
    timestamps: unknown;
    /** Optional weights parallel to `timestamps`; validated in buildOption. */
    weights: unknown;
    utcOffsetMinutes: number;
    weekStart: string;
    /** Seven labels, Monday first; validated in buildOption. */
    dayLabels: unknown;
    hourStep: number;
    /** Colour ramp, low to high; validated in buildOption. */
    colors: unknown;
    showValues: boolean;
    showTotals: boolean;
    showLegend: boolean;
    /** Top of the colour scale; anything that is not a positive number means automatic. */
    max: unknown;
    valueLabel: string;
    title: string;
}

export interface EventCounts {
    /** grid[day][hour]: day 0 = Monday .. 6 = Sunday, hour 0..23. */
    grid: number[][];
    /** Number of input rows that were counted. */
    accepted: number;
}

const MS_PER_MINUTE = 60000;
const MS_PER_HOUR = 3600000;
const MS_PER_DAY = 86400000;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_STEPS = [1, 2, 3, 4, 6];
// One hue with rising opacity: pale-to-strong on a light background and
// dim-to-bright on a dark one, so "more events" reads the same on any theme.
const DEFAULT_COLORS = ['rgba(47,125,225,0.18)', 'rgba(47,125,225,0.45)', 'rgba(47,125,225,0.75)', 'rgba(47,125,225,1)'];
/** Neutral, translucent fill for cells with nothing in them; reads as "empty" on light and dark backgrounds. */
const ZERO_COLOR = 'rgba(128,128,128,0.12)';

/** Larger counts and weights are treated as bad data; the cap also keeps sums finite. */
const MAX_VALUE = 1e15;

/** Sample: alarms per hour, Monday to Sunday. Peaks at the 06:00 / 14:00 / 22:00 shift changes. */
const SAMPLE: ReadonlyArray<ReadonlyArray<number>> = [
    [4, 2, 3, 0, 3, 16, 25, 23, 14, 9, 3, 4, 6, 8, 13, 10, 7, 3, 4, 5, 3, 8, 13, 10],
    [5, 3, 3, 0, 1, 11, 18, 12, 6, 6, 2, 3, 4, 9, 15, 11, 7, 2, 3, 3, 5, 9, 13, 10],
    [6, 3, 3, 3, 4, 13, 20, 13, 7, 6, 6, 6, 7, 11, 16, 11, 7, 6, 6, 6, 6, 10, 14, 10],
    [3, 0, 3, 3, 3, 11, 17, 10, 3, 6, 5, 5, 5, 9, 13, 8, 7, 5, 5, 4, 4, 7, 10, 10],
    [5, 0, 3, 2, 2, 10, 19, 11, 4, 6, 5, 3, 3, 17, 20, 14, 13, 5, 3, 2, 6, 8, 11, 10],
    [0, 1, 3, 0, 0, 4, 0, 4, 1, 0, 1, 0, 0, 1, 5, 0, 3, 1, 0, 2, 0, 0, 3, 4],
    [0, 1, 0, 1, 3, 0, 5, 1, 0, 3, 1, 0, 0, 3, 0, 3, 3, 0, 2, 0, 0, 0, 3, 0],
];

function defaultCells(): Row[] {
    const cells: Row[] = [];
    SAMPLE.forEach((hours, day) => hours.forEach((value, hour) => {
        if (value > 0) cells.push({ day: DAY_NAMES[day], hour, value });
    }));
    return cells;
}

function emptyGrid(): number[][] {
    const grid: number[][] = [];
    for (let d = 0; d < 7; d++) grid.push(new Array<number>(24).fill(0));
    return grid;
}

const ISO_PATTERN =
    /^\s*(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2})(?::(\d{2})(?::(\d{2})(?:[.,](\d+))?)?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?\s*$/i;

/**
 * Milliseconds of the wall-clock time to bucket, counted from 1970-01-01
 * 00:00 of that wall clock; NaN when the value is unusable.
 *
 *  - Numbers (and numeric strings) are epoch milliseconds: an instant, moved
 *    to wall-clock time with `offsetMs`.
 *  - ISO 8601 strings with a zone (`Z`, `+02:00`) are instants too.
 *  - ISO 8601 strings without a zone are taken as wall-clock time exactly as
 *    written; the offset is not applied.
 *
 * `Date.parse` is deliberately not used: for a string without a zone it
 * applies the zone of the machine, which would make the chart depend on
 * where it is rendered.
 */
export function toWallClockMs(value: unknown, offsetMs: number): number {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value + offsetMs : NaN;
    }
    if (value instanceof Date) {
        const time = value.getTime();
        return Number.isFinite(time) ? time + offsetMs : NaN;
    }
    if (typeof value !== 'string') return NaN;
    const numeric = toNumber(value);
    if (!Number.isNaN(numeric)) return numeric + offsetMs;
    const m = ISO_PATTERN.exec(value);
    if (!m) return NaN;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const hour = m[4] === undefined ? 0 : Number(m[4]);
    const minute = m[5] === undefined ? 0 : Number(m[5]);
    const second = m[6] === undefined ? 0 : Number(m[6]);
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 24 || minute > 59 || second > 60) return NaN;
    const millis = m[7] === undefined ? 0 : Math.floor(Number(`0.${m[7]}`) * 1000);
    const wall = Date.UTC(year, month - 1, day, hour, minute, second, millis);
    if (!Number.isFinite(wall)) return NaN;
    const zone = m[8];
    if (zone === undefined) return wall;
    if (zone === 'Z' || zone === 'z') return wall + offsetMs;
    const digits = zone.slice(1).replace(':', '');
    const zoneMinutes = Number(digits.slice(0, 2)) * 60 + (digits.length > 2 ? Number(digits.slice(2)) : 0);
    const sign = zone.charAt(0) === '-' ? -1 : 1;
    return wall - sign * zoneMinutes * MS_PER_MINUTE + offsetMs;
}

/**
 * Buckets raw event times by day of week and hour of day, in one pass and
 * without creating Date objects. Entries may also be rows
 * `{ timestamp | t_stamp | t, weight | value }`. When `rawWeights` is a
 * non-empty array, entry i weighs `rawWeights[i]`, and events whose weight is
 * missing, negative or not a number are skipped; otherwise every event
 * counts 1.
 */
export function bucketTimestamps(rawTimestamps: unknown, rawWeights: unknown, utcOffsetMinutes: number): EventCounts {
    const grid = emptyGrid();
    const stamps = asArray(rawTimestamps);
    const weights = asArray(rawWeights);
    const weighted = weights.length > 0;
    const offsetMs = (Number.isFinite(utcOffsetMinutes) ? utcOffsetMinutes : 0) * MS_PER_MINUTE;
    let accepted = 0;
    for (let i = 0; i < stamps.length; i++) {
        let stamp: unknown = stamps[i];
        let weight = 1;
        if (isRecord(stamp)) {
            const rowWeight = stamp.weight ?? stamp.value;
            if (rowWeight !== undefined && rowWeight !== null) weight = toNumber(rowWeight);
            stamp = stamp.timestamp ?? stamp.t_stamp ?? stamp.t;
        }
        if (weighted) weight = toNumber(weights[i]);
        if (!(weight >= 0 && weight <= MAX_VALUE)) continue;
        const wall = toWallClockMs(stamp, offsetMs);
        if (Number.isNaN(wall)) continue;
        const dayNumber = Math.floor(wall / MS_PER_DAY);
        // 1970-01-01 was a Thursday: index 3 when Monday is 0.
        const day = (((dayNumber + 3) % 7) + 7) % 7;
        const hour = Math.min(23, Math.floor((wall - dayNumber * MS_PER_DAY) / MS_PER_HOUR));
        grid[day][hour] += weight;
        accepted++;
    }
    return { grid, accepted };
}

/**
 * Day index (0 = Monday .. 6 = Sunday) from a number or a name.
 * Numbers follow ISO 8601 (1 = Monday .. 7 = Sunday) and 0 also means
 * Sunday, so JavaScript `getDay()` and PostgreSQL `dow` values work as well.
 * Names match one of `labels` exactly, or an English day name by its first
 * three letters in any case.
 */
export function toDayIndex(value: unknown, labels: readonly string[]): number {
    if (typeof value === 'string') {
        const exact = labels.indexOf(value);
        if (exact !== -1) return exact;
        const trimmed = value.trim();
        if (trimmed !== '' && Number.isNaN(toNumber(trimmed))) {
            const prefix = trimmed.slice(0, 3).toLowerCase();
            return trimmed.length < 3 ? -1 : DAY_NAMES.findIndex(name => name.toLowerCase() === prefix);
        }
    }
    const n = toNumber(value);
    if (!Number.isInteger(n) || n < 0 || n > 7) return -1;
    return n === 0 ? 6 : n - 1;
}

/**
 * Sums pre-aggregated `{ day, hour, value }` rows (or `[day, hour, value]`
 * tuples). Rows with an unknown day, an hour outside 0..23 or a negative or
 * non-numeric value are skipped; rows for the same cell are summed.
 */
export function sumCells(rawCells: unknown, labels: readonly string[]): EventCounts {
    const grid = emptyGrid();
    let accepted = 0;
    for (const raw of asArray(rawCells)) {
        let day: number;
        let hour: number;
        let value: number;
        if (isRecord(raw)) {
            day = toDayIndex(raw.day, labels);
            hour = toNumber(raw.hour);
            value = toNumber(raw.value);
        } else if (Array.isArray(raw) && raw.length >= 3) {
            day = toDayIndex(raw[0], labels);
            hour = toNumber(raw[1]);
            value = toNumber(raw[2]);
        } else {
            continue;
        }
        if (day < 0 || !(hour >= 0 && hour < 24) || !(value >= 0 && value <= MAX_VALUE)) continue;
        grid[day][Math.floor(hour)] += value;
        accepted++;
    }
    return { grid, accepted };
}

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

/** Up to two decimals, thousands separators; independent of the browser locale. */
function formatCount(value: number): string {
    const fixed = round2(value).toFixed(2).replace(/\.?0+$/, '');
    const dot = fixed.indexOf('.');
    const whole = dot === -1 ? fixed : fixed.slice(0, dot);
    return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dot === -1 ? '' : fixed.slice(dot));
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n);
}

function readProps(tree: PropertyTree): EventHeatmapProps {
    return {
        cells: readProp(tree, 'cells', defaultCells()),
        timestamps: readProp(tree, 'timestamps', []),
        weights: readProp(tree, 'weights', []),
        utcOffsetMinutes: readNumber(tree, 'utcOffsetMinutes', 0),
        weekStart: readString(tree, 'weekStart', 'monday'),
        dayLabels: readProp(tree, 'dayLabels', [...DAY_NAMES]),
        hourStep: readNumber(tree, 'hourStep', 1),
        colors: readProp(tree, 'colors', [...DEFAULT_COLORS]),
        showValues: readBoolean(tree, 'showValues', false),
        showTotals: readBoolean(tree, 'showTotals', true),
        showLegend: readBoolean(tree, 'showLegend', true),
        max: readProp(tree, 'max', 0),
        valueLabel: readString(tree, 'valueLabel', 'alarms'),
        title: readString(tree, 'title', ''),
    };
}

/**
 * Heatmap of event counts by hour of day (x) and day of week (y), with
 * optional bars for the total per hour (above) and per day (right).
 *
 * Cells that hold nothing are drawn by a second heatmap series in a neutral
 * grey, outside the colour scale, so "nothing happened" cannot be mistaken
 * for "a little happened".
 */
function buildOption(props: EventHeatmapProps): object {
    const rawLabels = asArray(props.dayLabels);
    const dayLabels = DAY_NAMES.map((fallback, i) => toLabel(rawLabels[i]) ?? fallback);
    const step = HOUR_STEPS.indexOf(asNumber(props.hourStep, 1)) !== -1 ? asNumber(props.hourStep, 1) : 1;
    const columns = 24 / step;
    const sundayFirst = asString(props.weekStart, '').toLowerCase() === 'sunday';
    const dayOrder = sundayFirst ? [6, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6];
    const showTotals = asBoolean(props.showTotals, true);
    const showLegend = asBoolean(props.showLegend, true);
    const showValues = asBoolean(props.showValues, false);
    const valueLabel = asString(props.valueLabel, '').trim();
    const title = asString(props.title, '');
    const suffix = valueLabel === '' ? '' : ` ${valueLabel}`;

    const rampInput = asArray(props.colors).filter((c): c is string => typeof c === 'string' && c !== '');
    const ramp = rampInput.length >= 2 ? rampInput : (rampInput.length === 1 ? [rampInput[0], rampInput[0]] : [...DEFAULT_COLORS]);

    const counts = asArray(props.timestamps).length > 0
        ? bucketTimestamps(props.timestamps, props.weights, asNumber(props.utcOffsetMinutes, 0))
        : sumCells(props.cells, dayLabels);
    const empty = counts.accepted === 0;

    const hourLabels: string[] = [];
    const hourRanges: string[] = [];
    for (let c = 0; c < columns; c++) {
        const from = c * step;
        hourLabels.push(step >= 3 ? `${pad2(from)}–${pad2(from + step)}` : pad2(from));
        hourRanges.push(`${pad2(from)}:00–${pad2(from + step)}:00`);
    }

    const filled: Row[] = [];
    const blank: Row[] = [];
    const hourTotals = new Array<number>(columns).fill(0);
    const dayTotals: number[] = [];
    let peak = 0;
    dayOrder.forEach((day, row) => {
        let dayTotal = 0;
        for (let c = 0; c < columns; c++) {
            let value = 0;
            for (let h = c * step; h < (c + 1) * step; h++) value += counts.grid[day][h];
            value = round2(value);
            dayTotal += value;
            hourTotals[c] += value;
            if (value > peak) peak = value;
            const name = `${dayLabels[day]} ${hourRanges[c]}: ${formatCount(value)}${suffix}`;
            if (value > 0) {
                filled.push({ name, value: [c, row, value] });
            } else if (!empty) {
                blank.push({ name, value: [c, row, 0] });
            }
        }
        dayTotals.push(round2(dayTotal));
    });

    const fixedMax = toNumber(props.max);
    const max = fixedMax > 0 ? fixedMax : (peak > 0 ? peak : 1);

    const titleHeight = title !== '' ? 34 : 8;
    const mainTop = titleHeight + (showTotals ? 40 : 4);
    const mainRight = showTotals ? 86 : 16;
    const mainBottom = showLegend ? 66 : 30;
    const dayNames = dayOrder.map(day => dayLabels[day]);
    const hidden = { show: false };

    const grid: Row[] = [{ left: 48, right: mainRight, top: mainTop, bottom: mainBottom }];
    const xAxis: Row[] = [{
        type: 'category', gridIndex: 0, data: hourLabels,
        axisTick: { show: false }, axisLine: { show: false }, splitLine: { show: false },
        axisLabel: step === 1 ? { interval: 2 } : (step === 2 ? { interval: 1 } : {}),
    }];
    const yAxis: Row[] = [{
        type: 'category', gridIndex: 0, data: dayNames, inverse: true,
        axisTick: { show: false }, axisLine: { show: false }, splitLine: { show: false },
    }];
    const series: Row[] = [
        {
            name: valueLabel, type: 'heatmap', xAxisIndex: 0, yAxisIndex: 0, data: filled,
            // Text colour is left unset: ECharts picks light or dark text from the cell colour.
            label: { show: showValues, formatter: '{@[2]}', fontSize: 10 },
            labelLayout: { hideOverlap: true },
            emphasis: { itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.45)' } },
        },
        {
            name: 'empty', type: 'heatmap', xAxisIndex: 0, yAxisIndex: 0, data: blank,
            label: { show: false },
            emphasis: { disabled: true },
        },
    ];

    if (showTotals) {
        const barColor = ramp[Math.floor((ramp.length - 1) / 2)];
        const hourPeak = hourTotals.reduce((a, b) => Math.max(a, b), 0);
        const dayPeak = dayTotals.reduce((a, b) => Math.max(a, b), 0);
        grid.push(
            { left: 48, right: mainRight, top: titleHeight + 4, height: 30 },
            { width: 70, right: 10, top: mainTop, bottom: mainBottom },
        );
        xAxis.push(
            { type: 'category', gridIndex: 1, data: [...hourLabels], show: false },
            // Bars use a third of the width, leaving room for the total written beside each one.
            { type: 'value', gridIndex: 2, min: 0, max: dayPeak > 0 ? dayPeak * 3 : 1, ...hidden },
        );
        yAxis.push(
            { type: 'value', gridIndex: 1, min: 0, max: hourPeak > 0 ? hourPeak : 1, ...hidden },
            { type: 'category', gridIndex: 2, data: [...dayNames], inverse: true, show: false },
        );
        series.push(
            {
                name: 'per hour', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, barWidth: '72%',
                itemStyle: { color: barColor, borderRadius: [2, 2, 0, 0] },
                data: hourTotals.map((value, c) => ({
                    name: `${hourRanges[c]}, all days: ${formatCount(value)}${suffix}`, value: round2(value),
                })),
            },
            {
                name: 'per day', type: 'bar', xAxisIndex: 2, yAxisIndex: 2, barWidth: '60%',
                itemStyle: { color: barColor, borderRadius: [0, 2, 2, 0] },
                label: { show: !empty, position: 'right', fontSize: 10 },
                data: dayTotals.map((value, row) => ({
                    name: `${dayNames[row]}, all hours: ${formatCount(value)}${suffix}`, value,
                    label: { formatter: formatCount(value) },
                })),
            },
        );
    }

    return {
        title: [
            { text: title, left: 'center', top: 6 },
            noDataTitle(empty),
        ],
        tooltip: { trigger: 'item', confine: true, formatter: '{b}' },
        grid,
        xAxis,
        yAxis,
        visualMap: [
            {
                type: 'continuous', seriesIndex: 0, dimension: 2, min: 0, max,
                show: showLegend, calculable: false, orient: 'horizontal',
                left: 48, bottom: 8, itemWidth: 10, itemHeight: 120,
                text: [`${formatCount(max)}${suffix}`, '0'],
                inRange: { color: ramp },
            },
            {
                type: 'continuous', seriesIndex: 1, dimension: 2, min: 0, max: 1, show: false,
                inRange: { color: [ZERO_COLOR, ZERO_COLOR] },
            },
        ],
        series,
    };
}

export const eventHeatmapBehavior: ChartBehavior<EventHeatmapProps> = { readProps, buildOption };
