import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { Row, asArray, asString, isRecord, noDataTitle, readBoolean, readNumber, readProp, readString, toLabel, toNumber } from './util';

export const WATERFALL_ID = 'open.industrial.Waterfall';

export interface WaterfallProps {
    /** Steps as objects { name, value, type? }; validated in buildOption. */
    steps: unknown;
    title: string;
    /** Unit of the values, shown on the value axis and in tooltips. */
    unit: string;
    decimals: number;
    increaseColor: string;
    decreaseColor: string;
    totalColor: string;
    showValues: boolean;
    showConnectors: boolean;
    /** "vertical" (default) or "horizontal". */
    orientation: string;
    startAtZero: boolean;
}

export type WaterfallStepType = 'delta' | 'total' | 'subtotal';

export interface WaterfallBar {
    name: string;
    type: WaterfallStepType;
    /** The change for a delta; the running total for a total or subtotal. */
    value: number;
    /** Where the bar starts: the previous running total for a delta, 0 for totals. */
    start: number;
    /** Where the bar ends: always the running total after this step. */
    end: number;
}

const DEFAULT_STEPS: Row[] = [
    { name: 'Planned time', value: 480, type: 'total' },
    { name: 'Breakdowns', value: -38 },
    { name: 'Changeover', value: -27 },
    { name: 'Run time', type: 'subtotal' },
    { name: 'Minor stops', value: -31 },
    { name: 'Reduced speed', value: -42 },
    { name: 'Scrap & rework', value: -14 },
    { name: 'Productive time', type: 'total' },
];

const INCREASE_COLOR = '#3ba272';
const DECREASE_COLOR = '#ee6666';
const TOTAL_COLOR = '#5470c6';
const NEUTRAL_LINE = '#8c8c8c';
const MAX_DECIMALS = 10;
/** Category labels are wrapped while there are at most this many bars; beyond it they are rotated. */
const WRAP_MAX_BARS = 8;

/** Removes binary floating point noise (0.1 + 0.2) from sums. */
function clean(n: number): number {
    return Number(n.toPrecision(12));
}

function stepType(value: unknown): WaterfallStepType {
    const text = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return text === 'total' || text === 'subtotal' ? text : 'delta';
}

/**
 * Turns the steps into floating bars by keeping a running sum.
 *
 * - `delta` (the default type): the bar runs from the running sum before the
 *   step to the running sum after adding `value`. A delta without a numeric
 *   value is skipped.
 * - `subtotal`: a bar from 0 to the running sum; any `value` is ignored.
 * - `total`: like `subtotal`, except that a numeric `value` first SETS the
 *   running sum (use it for the opening total, or to restate a total).
 *
 * The running sum starts at 0, so a chart may also begin with a delta.
 * Rows that are not objects are skipped; a missing name becomes "#<position>".
 */
export function computeWaterfall(rawSteps: unknown): WaterfallBar[] {
    const bars: WaterfallBar[] = [];
    let running = 0;
    const steps = asArray(rawSteps);
    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!isRecord(step)) continue;
        const type = stepType(step.type);
        const value = toNumber(step.value);
        const name = toLabel(step.name) ?? `#${i + 1}`;
        if (type === 'delta') {
            if (Number.isNaN(value)) continue;
            const start = running;
            running = clean(running + value);
            bars.push({ name, type, value, start, end: running });
        } else {
            if (type === 'total' && !Number.isNaN(value)) running = value;
            bars.push({ name, type, value: running, start: 0, end: running });
        }
    }
    return bars;
}

function niceStep(raw: number): number {
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const fraction = raw / magnitude;
    const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
    return nice * magnitude;
}

/**
 * Value-axis range covering [lo, hi] plus padding (given as fractions of the
 * span) for the value labels, rounded outwards to a round tick interval. A
 * range that does not cross zero never extends past zero.
 */
export function waterfallAxisRange(lo: number, hi: number, padLo: number, padHi: number): { min: number; max: number; interval: number } {
    const span = hi - lo || Math.abs(hi) || 1;
    const interval = niceStep(span * (1 + padLo + padHi) / 5);
    let min = clean(Math.floor((lo - span * padLo) / interval) * interval);
    let max = clean(Math.ceil((hi + span * padHi) / interval) * interval);
    if (lo >= 0 && min < 0) min = 0;
    if (hi <= 0 && max > 0) max = 0;
    if (min === max) max = clean(min + interval);
    return { min, max, interval };
}

function formatNumber(value: number, decimals: number): string {
    const text = Math.abs(value).toFixed(decimals);
    // No "−0.0": a value that rounds to zero carries no sign.
    return value < 0 && Number(text) !== 0 ? `−${text}` : text;
}

function formatDelta(value: number, decimals: number): string {
    const text = formatNumber(value, decimals);
    return value > 0 && Number(Math.abs(value).toFixed(decimals)) !== 0 ? `+${text}` : text;
}

/** Text for an HTML tooltip template: no markup, and no "{x}" placeholders ECharts would substitute. */
function tooltipText(text: string): string {
    return text.replace(/[&<>"'{}]/g, ch => `&#${ch.charCodeAt(0)};`);
}

/** Breaks a label at spaces into lines of about `width` characters, at most three lines. */
export function wrapLabel(label: string, width = 10): string {
    const lines: string[] = [];
    let line = '';
    for (const word of label.split(/\s+/)) {
        if (word === '') continue;
        if (line !== '' && line.length + 1 + word.length > width) {
            lines.push(line);
            line = word;
        } else {
            line = line === '' ? word : `${line} ${word}`;
        }
    }
    if (line !== '') lines.push(line);
    if (lines.length > 3) {
        lines.length = 3;
        lines[2] = `${lines[2]}…`;
    }
    return lines.join('\n');
}

function normaliseDecimals(value: unknown): number {
    const n = Math.floor(toNumber(value));
    return Number.isNaN(n) || n < 0 ? 0 : Math.min(n, MAX_DECIMALS);
}

function color(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

function readProps(tree: PropertyTree): WaterfallProps {
    return {
        steps: readProp(tree, 'steps', DEFAULT_STEPS.map(step => ({ ...step }))),
        title: readString(tree, 'title', ''),
        unit: readString(tree, 'unit', 'min'),
        decimals: readNumber(tree, 'decimals', 0),
        increaseColor: readString(tree, 'increaseColor', INCREASE_COLOR),
        decreaseColor: readString(tree, 'decreaseColor', DECREASE_COLOR),
        totalColor: readString(tree, 'totalColor', TOTAL_COLOR),
        showValues: readBoolean(tree, 'showValues', true),
        showConnectors: readBoolean(tree, 'showConnectors', true),
        orientation: readString(tree, 'orientation', 'vertical'),
        startAtZero: readBoolean(tree, 'startAtZero', true),
    };
}

/**
 * The bars are three stacked bar series: an invisible base that lifts a bar
 * off the axis, the part of the bar above zero and the part below zero.
 * ECharts stacks positive and negative values separately, so
 *
 *   bar entirely >= 0:  base = low,  positive = high - low
 *   bar entirely <= 0:  base = high, negative = low - high
 *   bar crossing zero:  base = 0,    positive = high, negative = low
 *
 * which stays correct when the running total goes below zero and comes back
 * (the single transparent-bar trick does not).
 */
function buildOption(props: WaterfallProps): object {
    const bars = computeWaterfall(props.steps);
    const horizontal = asString(props.orientation, '').trim().toLowerCase() === 'horizontal';
    const decimals = normaliseDecimals(props.decimals);
    const unit = asString(props.unit, '').trim();
    const title = asString(props.title, '');
    const showValues = props.showValues !== false;
    const colors: Record<WaterfallStepType | 'increase', string> = {
        increase: color(props.increaseColor, INCREASE_COLOR),
        delta: color(props.decreaseColor, DECREASE_COLOR),
        total: color(props.totalColor, TOTAL_COLOR),
        subtotal: color(props.totalColor, TOTAL_COLOR),
    };
    const unitHtml = unit === '' ? '' : ` ${tooltipText(unit)}`;
    const rotate = !horizontal && bars.length > WRAP_MAX_BARS;

    const names: string[] = [];
    const base: number[] = [];
    const positive: Row[] = [];
    const negative: Row[] = [];
    const labels: Row[] = [];
    const connectors: Array<number[] | null> = [];
    let lo = Infinity;
    let hi = -Infinity;
    // Extent of the running total alone, ignoring that total bars reach down to zero.
    let levelLo = Infinity;
    let levelHi = -Infinity;
    let labelsBelow = false;
    let labelsAbove = false;

    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const low = Math.min(bar.start, bar.end);
        const high = Math.max(bar.start, bar.end);
        if (low < lo) lo = low;
        if (high > hi) hi = high;
        const levelLow = bar.type === 'delta' ? low : bar.end;
        const levelHigh = bar.type === 'delta' ? high : bar.end;
        if (levelLow < levelLo) levelLo = levelLow;
        if (levelHigh > levelHi) levelHi = levelHigh;
        names.push(horizontal || rotate ? bar.name : wrapLabel(bar.name));

        const isDelta = bar.type === 'delta';
        const barColor = isDelta && bar.value >= 0 ? colors.increase : colors[bar.type];
        const tooltip = isDelta
            ? `{b}<br/><b>${formatDelta(bar.value, decimals)}${unitHtml}</b><br/>Running total: ${formatNumber(bar.end, decimals)}${unitHtml}`
            : `{b}<br/><b>${formatNumber(bar.end, decimals)}${unitHtml}</b>`;
        const segment = (value: number): Row => ({ value: clean(value), itemStyle: { color: barColor }, tooltip: { formatter: tooltip } });
        if (low >= 0) {
            base.push(low);
            positive.push(segment(high - low));
            negative.push({ value: '-' });
        } else if (high <= 0) {
            base.push(high);
            positive.push({ value: '-' });
            negative.push(segment(low - high));
        } else {
            base.push(0);
            positive.push(segment(high));
            negative.push(segment(low));
        }

        // The value label sits at the end of the bar that points away from zero.
        const below = high <= 0 && low < 0;
        if (below) labelsBelow = true; else labelsAbove = true;
        const anchor = below ? low : high;
        labels.push({
            name: isDelta ? formatDelta(bar.value, decimals) : formatNumber(bar.end, decimals),
            value: horizontal ? [anchor, i] : [i, anchor],
            label: { position: horizontal ? (below ? 'left' : 'right') : (below ? 'bottom' : 'top') },
        });

        // A connector carries the running total to the next bar, unless that bar restates the total.
        const next = bars[i + 1];
        if (next && (next.start === bar.end || next.end === bar.end)) {
            if (connectors.length > 0) connectors.push(null);
            connectors.push(horizontal ? [bar.end, i] : [i, bar.end], horizontal ? [bar.end, i + 1] : [i + 1, bar.end]);
        }
    }

    const empty = bars.length === 0;
    const crossesZero = !empty && lo < 0 && hi > 0;
    let range: Row = {};
    if (!empty) {
        // The axis can only leave zero out when every running total lies on one side of it.
        const zeroBased = props.startAtZero !== false || crossesZero || (levelLo <= 0 && levelHi >= 0);
        const axisLo = zeroBased ? Math.min(lo, 0) : levelLo;
        const axisHi = zeroBased ? Math.max(hi, 0) : levelHi;
        const labelPad = showValues ? (horizontal ? 0.2 : 0.12) : 0.02;
        // Without a zero base the bars are cut off at the axis; a little room keeps the lowest end visible.
        const cutPad = zeroBased ? 0 : 0.1;
        range = waterfallAxisRange(
            axisLo, axisHi,
            showValues && labelsBelow ? labelPad : (axisLo < 0 ? 0.02 : cutPad),
            showValues && labelsAbove ? labelPad : (axisHi > 0 ? 0.02 : cutPad),
        );
    }

    const categoryAxis: Row = {
        type: 'category',
        data: names,
        axisTick: { show: false },
        // Keep the labels at the edge of the plot when the totals go negative; the zero line is drawn separately.
        axisLine: { onZero: false },
        axisLabel: horizontal
            ? { interval: 0, hideOverlap: true, width: 110, overflow: 'truncate' }
            : rotate
                ? { interval: 0, hideOverlap: true, rotate: 40, width: 90, overflow: 'truncate' }
                : { interval: 0, hideOverlap: true, lineHeight: 14 },
    };
    if (horizontal) categoryAxis.inverse = true;
    const valueAxis: Row = {
        type: 'value',
        name: unit,
        axisLabel: { hideOverlap: true },
        ...range,
    };
    if (horizontal) {
        valueAxis.nameLocation = 'middle';
        valueAxis.nameGap = 26;
    }

    const stacked = { type: 'bar', stack: 'waterfall', barWidth: '62%', barMaxWidth: 72 };
    const baseSeries: Row = {
        ...stacked, name: 'base', data: base, silent: true,
        itemStyle: { color: 'transparent' },
        emphasis: { disabled: true },
        tooltip: { show: false },
    };
    if (crossesZero) {
        baseSeries.markLine = {
            silent: true, symbol: 'none', animation: false,
            label: { show: false },
            lineStyle: { color: NEUTRAL_LINE, type: 'solid', width: 1 },
            data: [horizontal ? { xAxis: 0 } : { yAxis: 0 }],
        };
    }
    const series: Row[] = [
        baseSeries,
        { ...stacked, name: 'positive', data: positive, z: 3 },
        { ...stacked, name: 'negative', data: negative, z: 3 },
    ];
    if (props.showConnectors !== false && connectors.length > 0) {
        series.push({
            type: 'line', name: 'connectors', data: connectors, silent: true, z: 1,
            symbol: 'none', connectNulls: false, animation: false,
            lineStyle: { color: NEUTRAL_LINE, width: 1 },
            tooltip: { show: false },
        });
    }
    if (showValues && !empty) {
        series.push({
            type: 'scatter', name: 'values', data: labels, silent: true, z: 4,
            symbolSize: 0, animation: false,
            label: { show: true, formatter: '{b}', distance: 4 },
            labelLayout: { hideOverlap: true },
            tooltip: { show: false },
        });
    }

    const titleShown = title !== '';
    return {
        title: [{ text: title, left: 'center', top: 6 }, noDataTitle(empty)],
        tooltip: { trigger: 'item' },
        grid: {
            top: (titleShown ? 40 : 14) + (unit !== '' && !horizontal ? 20 : 0),
            bottom: horizontal && unit !== '' ? 30 : 10,
            left: 12,
            right: horizontal ? 24 : 16,
            containLabel: true,
        },
        xAxis: horizontal ? valueAxis : categoryAxis,
        yAxis: horizontal ? categoryAxis : valueAxis,
        series,
    };
}

export const waterfallBehavior: ChartBehavior<WaterfallProps> = { readProps, buildOption };
