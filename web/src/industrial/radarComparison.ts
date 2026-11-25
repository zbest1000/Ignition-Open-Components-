import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import {
    Row, asArray, asBoolean, asNumber, asString, isRecord, noDataTitle, readBoolean, readNumber, readProp, readString,
    toLabel, toNumber,
} from './util';

export const RADAR_COMPARISON_ID = 'open.industrial.RadarComparison';

export interface RadarComparisonProps {
    /** Rows of `{ name, min?, max?, higherIsBetter?, unit? }`; validated in buildOption. */
    metrics: unknown;
    /** Rows of `{ name, values: [...] }`, values aligned to metrics; validated in buildOption. */
    series: unknown;
    /** Optional `{ name, values, color? }` (or a bare values array) drawn as a dashed outline. */
    target: unknown;
    fill: boolean;
    shape: string;
    showRange: boolean;
    showLegend: boolean;
    decimals: number;
    /** Series colours; empty means the theme palette. Validated in buildOption. */
    colors: unknown;
    title: string;
}

export interface RadarAxis {
    name: string;
    unit: string;
    min: number;
    max: number;
    higherIsBetter: boolean;
}

export interface RadarEntity {
    name: string;
    /** Real values aligned to the axes; NaN where missing. */
    values: number[];
}

export interface RadarModel {
    axes: RadarAxis[];
    entities: RadarEntity[];
    target: RadarEntity | null;
}

const TARGET_COLOR = '#8a8f98';
const MAX_VALUE = 1e15;

function defaultMetrics(): Row[] {
    return [
        { name: 'OEE', unit: '%', min: 40, max: 100 },
        { name: 'Throughput', unit: 'u/h', min: 600, max: 1400 },
        { name: 'First-pass yield', unit: '%', min: 85, max: 100 },
        { name: 'Scrap', unit: '%', min: 0, max: 6, higherIsBetter: false },
        { name: 'Changeover', unit: 'min', min: 10, max: 60, higherIsBetter: false },
        { name: 'Energy', unit: 'kWh/u', min: 0.4, max: 1.2, higherIsBetter: false },
    ];
}

function defaultSeries(): Row[] {
    return [
        { name: 'Line 1', values: [78, 1180, 97.2, 1.8, 24, 0.62] },
        { name: 'Line 2', values: [64, 1290, 93.5, 3.9, 41, 0.71] },
        { name: 'Line 3', values: [71, 860, 98.4, 1.1, 18, 0.95] },
    ];
}

function defaultTarget(): Row {
    return { name: 'Target', values: [85, 1200, 98, 2, 20, 0.6] };
}

function toValues(raw: unknown, length: number): number[] {
    const source = asArray(raw);
    const values: number[] = [];
    for (let i = 0; i < length; i++) {
        const value = toNumber(source[i]);
        // Absurd magnitudes are bad data and would overflow the range arithmetic.
        values.push(Math.abs(value) <= MAX_VALUE ? value : NaN);
    }
    return values;
}

function hasValue(values: number[]): boolean {
    return values.some(v => !Number.isNaN(v));
}

/**
 * Validates metrics, series and target and settles the range of every axis.
 *
 *  - A metric is `{ name, min?, max?, higherIsBetter?, unit? }` or just a name.
 *  - Series values are aligned to the metrics by position: extra values are
 *    ignored, missing or non-numeric ones stay missing (NaN). A series
 *    without a single usable value is dropped.
 *  - A missing `min` or `max` is taken from the data of that metric (all
 *    series and the target), widened by 20 % of the spread at each end so the
 *    weakest series does not collapse into the centre. The automatic
 *    minimum never goes below zero for data that is not negative (and the
 *    maximum never above zero for data that is not positive).
 *  - `min` and `max` given the wrong way round are swapped.
 */
export function computeRadar(rawMetrics: unknown, rawSeries: unknown, rawTarget: unknown): RadarModel {
    const metricRows = asArray(rawMetrics);
    const count = metricRows.length;

    const entities: RadarEntity[] = [];
    asArray(rawSeries).forEach((raw, i) => {
        if (!isRecord(raw)) return;
        const values = toValues(raw.values, count);
        if (hasValue(values)) entities.push({ name: toLabel(raw.name) ?? `Series ${i + 1}`, values });
    });

    let target: RadarEntity | null = null;
    if (Array.isArray(rawTarget) || isRecord(rawTarget)) {
        const values = toValues(Array.isArray(rawTarget) ? rawTarget : rawTarget.values, count);
        if (hasValue(values)) {
            target = { name: (isRecord(rawTarget) ? toLabel(rawTarget.name) : null) ?? 'Target', values };
        }
    }

    const axes: RadarAxis[] = metricRows.map((raw, m) => {
        const row = isRecord(raw) ? raw : {};
        const name = toLabel(isRecord(raw) ? raw.name : raw) ?? `Metric ${m + 1}`;
        let min = toNumber(row.min);
        let max = toNumber(row.max);
        if (!(Math.abs(min) <= MAX_VALUE)) min = NaN;
        if (!(Math.abs(max) <= MAX_VALUE)) max = NaN;
        if (!Number.isNaN(min) && !Number.isNaN(max)) {
            if (min > max) {
                const swap = min;
                min = max;
                max = swap;
            } else if (min === max) {
                // An empty range cannot place anything: fall back to the automatic one.
                min = NaN;
                max = NaN;
            }
        }
        if (Number.isNaN(min) || Number.isNaN(max)) {
            let low = Infinity;
            let high = -Infinity;
            const scan = (values: number[]): void => {
                const v = values[m];
                if (Number.isNaN(v)) return;
                if (v < low) low = v;
                if (v > high) high = v;
            };
            entities.forEach(entity => scan(entity.values));
            if (target) scan(target.values);
            if (low > high) {
                low = 0;
                high = 1;
            }
            const spread = high - low;
            const pad = spread > 0 ? spread * 0.2 : Math.max(Math.abs(high) * 0.1, 1);
            const step = (from: number): number => Math.max(Math.abs(from) * 0.1, 1);
            if (Number.isNaN(min)) {
                const auto = low - pad;
                min = low >= 0 && auto < 0 ? 0 : auto;
                if (!Number.isNaN(max) && min >= max) min = max - step(max);
            }
            if (Number.isNaN(max)) {
                const auto = high + pad;
                max = high <= 0 && auto > 0 ? 0 : auto;
                if (max <= min) max = min + step(min);
            }
        }
        return {
            name, min, max,
            unit: asString(row.unit, '').trim(),
            higherIsBetter: asBoolean(row.higherIsBetter, true),
        };
    });

    return { axes, entities, target };
}

/**
 * Position of a real value on its axis: 0 = centre (worst), 1 = rim (best).
 * Values outside the axis range are clamped. Axes where lower is better are
 * inverted, so outward always means better.
 */
export function normalise(value: number, axis: RadarAxis): number {
    const span = axis.max - axis.min;
    if (Number.isNaN(value) || !(span > 0)) return 0;
    const share = Math.min(1, Math.max(0, (value - axis.min) / span));
    const position = axis.higherIsBetter ? share : 1 - share;
    return Math.round(position * 10000) / 10000;
}

/** Up to `decimals` decimals without trailing zeros, thousands separators; independent of the browser locale. */
export function formatMetric(value: number, decimals: number): string {
    if (Number.isNaN(value)) return '–';
    const places = Math.min(6, Math.max(0, Math.round(Number.isFinite(decimals) ? decimals : 2)));
    let fixed = Math.abs(value).toFixed(places);
    if (fixed.indexOf('.') !== -1) fixed = fixed.replace(/\.?0+$/, '');
    const dot = fixed.indexOf('.');
    const whole = dot === -1 ? fixed : fixed.slice(0, dot);
    const sign = value < 0 && Number(fixed) !== 0 ? '-' : '';
    return sign + whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (dot === -1 ? '' : fixed.slice(dot));
}

/** Text for a tooltip formatter: HTML-escaped, and braces encoded so no `{a}`-style variable is substituted. */
function tooltipText(text: string): string {
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
        .replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
}

/** Text placed in rich-text labels: a zero-width space after `{` stops it being read as a style or variable. */
function labelText(text: string): string {
    return text.replace(/\{/g, '{​');
}

function readProps(tree: PropertyTree): RadarComparisonProps {
    return {
        metrics: readProp(tree, 'metrics', defaultMetrics()),
        series: readProp(tree, 'series', defaultSeries()),
        target: readProp(tree, 'target', defaultTarget()),
        fill: readBoolean(tree, 'fill', true),
        shape: readString(tree, 'shape', 'polygon'),
        showRange: readBoolean(tree, 'showRange', true),
        showLegend: readBoolean(tree, 'showLegend', true),
        decimals: readNumber(tree, 'decimals', 2),
        colors: readProp(tree, 'colors', []),
        title: readString(tree, 'title', ''),
    };
}

/**
 * Radar chart comparing entities across metrics with unlike units.
 *
 * Every axis runs from 0 (centre) to 1 (rim) and carries the value
 * normalised to that metric's own range, so the plotted numbers are not the
 * real ones. The real values are therefore written into a fixed tooltip
 * string per series (an option cannot carry formatter functions), and the
 * real range is written under each axis name.
 */
function buildOption(props: RadarComparisonProps): object {
    const model = computeRadar(props.metrics, props.series, props.target);
    const decimals = asNumber(props.decimals, 2);
    const title = asString(props.title, '');
    const fill = asBoolean(props.fill, true);
    const showRange = asBoolean(props.showRange, true);
    const showLegend = asBoolean(props.showLegend, true);
    const circle = props.shape === 'circle';
    const tooFewAxes = model.axes.length < 3;
    const empty = tooFewAxes || model.entities.length === 0;

    const withUnit = (text: string, axis: RadarAxis): string => (axis.unit === '' ? text : `${text} ${axis.unit}`);

    // A radar needs three axes; with fewer, three blank ones keep the (empty) component valid.
    const indicator: Row[] = tooFewAxes
        ? [0, 1, 2].map(() => ({ name: '', min: 0, max: 1 }))
        : model.axes.map(axis => {
            const inner = axis.higherIsBetter ? axis.min : axis.max;
            const outer = axis.higherIsBetter ? axis.max : axis.min;
            const range = withUnit(`${formatMetric(inner, decimals)} → ${formatMetric(outer, decimals)}`, axis);
            return {
                name: showRange ? `${labelText(axis.name)}\n{range|${labelText(range).replace(/\}/g, ')')}}` : labelText(axis.name),
                min: 0,
                max: 1,
            };
        });

    const tooltipFor = (entity: RadarEntity): string => {
        const lines = [`<b>${tooltipText(entity.name)}</b>`];
        model.axes.forEach((axis, m) => {
            const value = entity.values[m];
            const text = Number.isNaN(value) ? '–' : withUnit(formatMetric(value, decimals), axis);
            lines.push(`${tooltipText(axis.name)}: <b>${tooltipText(text)}</b>`);
        });
        return lines.join('<br/>');
    };
    const positions = (entity: RadarEntity): number[] =>
        model.axes.map((axis, m) => normalise(entity.values[m], axis));

    const count = model.entities.length;
    const fillOpacity = !fill ? 0 : (count <= 3 ? 0.14 : (count <= 6 ? 0.07 : 0.03));
    const series: Row[] = [];
    const legend: string[] = [];
    if (!empty) {
        model.entities.forEach(entity => {
            legend.push(entity.name);
            series.push({
                name: entity.name,
                type: 'radar',
                symbol: 'circle',
                symbolSize: 5,
                lineStyle: { width: 2 },
                areaStyle: { opacity: fillOpacity },
                emphasis: { focus: 'self', lineStyle: { width: 3 } },
                tooltip: { formatter: tooltipFor(entity) },
                data: [{ name: entity.name, value: positions(entity) }],
            });
        });
        if (model.target) {
            const custom = isRecord(props.target) && typeof props.target.color === 'string' ? props.target.color : '';
            const color = custom || TARGET_COLOR;
            legend.push(model.target.name);
            series.push({
                name: model.target.name,
                type: 'radar',
                symbol: 'none',
                z: 3,
                color,
                itemStyle: { color },
                lineStyle: { width: 1.5, type: 'dashed', color },
                areaStyle: { opacity: 0 },
                emphasis: { focus: 'self', lineStyle: { width: 2.5 } },
                tooltip: { formatter: tooltipFor(model.target) },
                data: [{ name: model.target.name, value: positions(model.target) }],
            });
        }
    }

    const notice = noDataTitle(empty);
    if (tooFewAxes) notice.subtext = 'A radar chart needs at least 3 metrics';

    const option: Row = {
        title: [{ text: title, left: 'center', top: 6 }, notice],
        tooltip: { trigger: 'item', confine: true },
        legend: { show: showLegend && !empty, type: 'scroll', bottom: 4, data: legend },
        radar: {
            shape: circle ? 'circle' : 'polygon',
            center: ['50%', title !== '' ? '52%' : (showLegend ? '46%' : '50%')],
            radius: showRange ? '54%' : '62%',
            splitNumber: 4,
            indicator,
            axisName: { show: !empty, fontSize: 12, rich: { range: { fontSize: 10, lineHeight: 14 } } },
            axisLine: { show: !empty },
            splitLine: { show: !empty },
            splitArea: { show: false },
        },
        series,
    };
    const colors = asArray(props.colors).filter((c): c is string => typeof c === 'string' && c !== '');
    if (colors.length > 0) option.color = colors;
    return option;
}

export const radarComparisonBehavior: ChartBehavior<RadarComparisonProps> = { readProps, buildOption };
