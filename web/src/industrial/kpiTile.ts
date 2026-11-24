import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { formatNumber, richText, toDecimals, tooltipText, withUnit } from './metricRings';
import { Row, asArray, asBoolean, asString, isRecord, readBoolean, readNumber, readProp, readString, toNumber } from './util';

export const KPI_TILE_ID = 'open.industrial.KpiTile';

export interface KpiTileProps {
    title: string;
    /** The number shown; when null/blank the last point of `history` is used. */
    value: unknown;
    unit: string;
    decimals: number;
    /** The value of the previous period; the delta is measured against it when it is a number. */
    previous: unknown;
    /** The target; the delta is measured against it when there is no `previous`. */
    target: unknown;
    /** "percent" (default) or "absolute". */
    deltaFormat: string;
    /** Text after the delta; blank gives "vs previous" / "vs target". */
    deltaLabel: string;
    /** Whether an increase is good (green) or bad (red). */
    higherIsBetter: boolean;
    /** Recent values, oldest first: numbers, [time, value] pairs or objects with a `value`. */
    history: unknown;
    showSparkline: boolean;
    color: string;
    goodColor: string;
    badColor: string;
}

export type DeltaDirection = 'up' | 'down' | 'flat';

export interface KpiDelta {
    /** "previous" or "target": what the value is compared with. */
    basis: 'previous' | 'target';
    /** value - reference. */
    difference: number;
    /** The difference in percent of |reference|; NaN when the reference is 0. */
    percent: number;
    direction: DeltaDirection;
    /** True when the change is in the wanted direction, false when not, null when there is none. */
    good: boolean | null;
}

const DEFAULT_HISTORY = [
    1180, 1204, 1196, 1221, 1240, 1232, 1215, 1190, 1172, 1198, 1226, 1251,
    1263, 1244, 1239, 1258, 1270, 1262, 1249, 1266, 1281, 1275, 1290, 1284,
];
const LINE_COLOR = '#5470c6';
const GOOD_COLOR = '#3ba272';
const BAD_COLOR = '#e05252';
const MUTED = '#8c8c8c';
const ARROWS: Record<DeltaDirection, string> = { up: '▲', down: '▼', flat: '–' };

/** Text rows, in pixels from the top of the tile. They are fixed so that the smallest tile (160 x 100) holds them. */
const TITLE_TOP = 8;
const VALUE_TOP = 24;
const DELTA_TOP = 56;
const SPARK_TOP = 76;
const PADDING = 10;

/** Removes binary floating point noise (0.1 + 0.2) from sums. */
function clean(n: number): number {
    return Number(n.toPrecision(12));
}

/**
 * The numeric values of a `history` prop, oldest first. An entry is a number
 * or numeric string, a [time, value] pair (its last element), or an object
 * with a `value`; anything else is skipped.
 */
export function readHistory(raw: unknown): number[] {
    const values: number[] = [];
    for (const entry of asArray(raw)) {
        let candidate: unknown = entry;
        if (Array.isArray(entry)) candidate = entry[entry.length - 1];
        else if (isRecord(entry)) candidate = entry.value;
        const n = toNumber(candidate);
        if (!Number.isNaN(n)) values.push(n);
    }
    return values;
}

/**
 * The change of a value against the previous value or, when there is none,
 * against the target. Returns null without a value or a reference.
 *
 * A difference that is zero at the displayed precision has direction "flat"
 * and is neither good nor bad.
 */
export function computeDelta(
    value: number, previous: unknown, target: unknown, higherIsBetter: boolean, decimals: number,
): KpiDelta | null {
    if (Number.isNaN(value)) return null;
    const prev = toNumber(previous);
    const goal = toNumber(target);
    const basis = !Number.isNaN(prev) ? 'previous' : 'target';
    const reference = basis === 'previous' ? prev : goal;
    if (Number.isNaN(reference)) return null;

    const difference = clean(value - reference);
    const percent = reference === 0 ? NaN : clean(difference / Math.abs(reference) * 100);
    const rounded = Number(difference.toFixed(decimals));
    const direction: DeltaDirection = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
    return {
        basis, difference, percent, direction,
        good: direction === 'flat' ? null : (direction === 'up') === higherIsBetter,
    };
}

/**
 * A null `value`, `previous` or `target` means "none", so these three fall
 * back to null rather than to the sample numbers of the schema: a binding
 * that delivers null must not bring the sample back.
 */
function readProps(tree: PropertyTree): KpiTileProps {
    return {
        title: readString(tree, 'title', 'Throughput'),
        value: readProp(tree, 'value', null),
        unit: readString(tree, 'unit', 'units/h'),
        decimals: readNumber(tree, 'decimals', 0),
        previous: readProp(tree, 'previous', null),
        target: readProp(tree, 'target', null),
        deltaFormat: readString(tree, 'deltaFormat', 'percent'),
        deltaLabel: readString(tree, 'deltaLabel', ''),
        higherIsBetter: readBoolean(tree, 'higherIsBetter', true),
        history: readProp(tree, 'history', DEFAULT_HISTORY),
        showSparkline: readBoolean(tree, 'showSparkline', true),
        color: readString(tree, 'color', LINE_COLOR),
        goodColor: readString(tree, 'goodColor', GOOD_COLOR),
        badColor: readString(tree, 'badColor', BAD_COLOR),
    };
}

/** Font size of the value: long numbers are set smaller so that they fit a 160 px tile. */
function valueFontSize(text: string): number {
    return text.length <= 6 ? 28 : text.length <= 9 ? 24 : 20;
}

/**
 * A title component used as a text row. Every row sets the same keys so that
 * a merged option leaves nothing behind when a row changes or empties.
 */
function textRow(text: string, top: number, fontSize: number, bold: boolean, rich: Row): Row {
    return {
        text, left: PADDING, top, padding: 0,
        textStyle: { fontSize, fontWeight: bold ? 'bold' : 'normal', lineHeight: Math.round(fontSize * 1.1), rich },
    };
}

function buildOption(props: KpiTileProps): object {
    const history = readHistory(props.history);
    const unit = asString(props.unit, '');
    const decimals = toDecimals(props.decimals, 0);
    const explicit = toNumber(props.value);
    const value = !Number.isNaN(explicit) ? explicit : (history.length > 0 ? history[history.length - 1] : NaN);
    const lineColor = asString(props.color, '') || LINE_COLOR;

    // Value row: the number large, its unit small beside it.
    const numberText = Number.isNaN(value) ? '–' : formatNumber(value, decimals);
    const unitText = Number.isNaN(value) ? '' : richText(unit);
    const valueSize = valueFontSize(numberText);
    const valueRow = textRow(
        unitText === '' ? numberText : `${numberText}{unit| ${unitText}}`, VALUE_TOP, valueSize, true,
        { unit: { fontSize: 12, fontWeight: 'normal', color: MUTED } },
    );

    // Delta row: arrow and amount in the good/bad colour, then what it is measured against.
    const delta = computeDelta(value, props.previous, props.target, asBoolean(props.higherIsBetter, true), decimals);
    let deltaText = '';
    let deltaColor = MUTED;
    if (delta) {
        const absolute = props.deltaFormat === 'absolute' || Number.isNaN(delta.percent);
        const amount = absolute
            ? withUnit(formatNumber(Math.abs(delta.difference), decimals), unit)
            : `${formatNumber(Math.abs(delta.percent), 1)}%`;
        const label = asString(props.deltaLabel, '').trim() || `vs ${delta.basis}`;
        deltaText = `{delta|${ARROWS[delta.direction]} ${richText(amount)}}{label|  ${richText(label)}}`;
        if (delta.good !== null) {
            deltaColor = delta.good
                ? asString(props.goodColor, '') || GOOD_COLOR
                : asString(props.badColor, '') || BAD_COLOR;
        }
    }
    const deltaRow = textRow(deltaText, DELTA_TOP, 11, false, {
        delta: { color: deltaColor, fontWeight: 'bold', fontSize: 12 },
        label: { color: MUTED, fontSize: 11 },
    });

    // Sparkline: the history without axes, its last point marked, the target as a dashed line when it is in view.
    const drawn = asBoolean(props.showSparkline, true) && history.length >= 2 ? history : [];
    let low = Infinity;
    let high = -Infinity;
    for (const point of drawn) {
        if (point < low) low = point;
        if (point > high) high = point;
    }
    const target = toNumber(props.target);
    const span = high - low;
    const targetInView = drawn.length > 0 && !Number.isNaN(target)
        && target >= low - Math.max(span, Math.abs(high) * 0.02) && target <= high + Math.max(span, Math.abs(high) * 0.02);
    if (targetInView) {
        low = Math.min(low, target);
        high = Math.max(high, target);
    }
    const flat = high - low === 0;
    const pad = flat ? Math.max(1, Math.abs(high) * 0.05) : (high - low) * 0.12;
    const last = drawn.length - 1;

    const series: Row[] = [{
        type: 'line', name: 'history', data: drawn,
        showSymbol: false, sampling: 'lttb',
        lineStyle: { width: 2, color: lineColor },
        itemStyle: { color: lineColor },
        areaStyle: { color: lineColor, opacity: 0.12 },
        tooltip: { formatter: `<b>{c}</b>${unit === '' ? '' : ` ${tooltipText(unit)}`}` },
        markLine: {
            silent: true, symbol: 'none', animation: false,
            label: { show: false },
            lineStyle: { type: 'dashed', color: MUTED, width: 1 },
            data: targetInView ? [{ yAxis: target }] : [],
        },
    }, {
        type: 'scatter', name: 'latest', silent: true,
        symbolSize: 7,
        itemStyle: { color: lineColor, borderColor: '#ffffff', borderWidth: 1 },
        tooltip: { show: false },
        data: drawn.length > 0 ? [[last, drawn[last]]] : [],
    }];

    return {
        title: [
            textRow(richText(asString(props.title, '')), TITLE_TOP, 12, false, {}),
            valueRow,
            deltaRow,
        ],
        tooltip: { trigger: 'item' },
        grid: { left: PADDING, right: PADDING + 2, top: SPARK_TOP, bottom: 8 },
        xAxis: { type: 'category', show: false, boundaryGap: false, data: drawn.map((_point, i) => i) },
        yAxis: {
            type: 'value', show: false,
            min: drawn.length > 0 ? clean(low - pad) : 0,
            max: drawn.length > 0 ? clean(high + pad) : 1,
        },
        series,
    };
}

export const kpiTileBehavior: ChartBehavior<KpiTileProps> = { readProps, buildOption };
