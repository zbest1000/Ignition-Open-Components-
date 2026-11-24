import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { Row, asString, isRecord, noDataTitle, readBoolean, readProp, readString, toNumber } from './util';

export const TREND_ID = 'open.industrial.Trend';

export interface TrendProps {
    /** `{ pvData, spData, timeField, valueField }`; validated in buildOption. */
    data: unknown;
    /** `{ hiAlarm, hiWarning, loWarning, loAlarm }`; validated in buildOption. */
    limits: unknown;
    yAxisLabel: string;
    showSetpoint: boolean;
    showDataZoom: boolean;
}

const DEFAULT_TIME_FIELD = 't';
const DEFAULT_VALUE_FIELD = 'v';

function isPair(row: unknown): boolean {
    return Array.isArray(row) && row.length >= 2;
}

function toPair(row: unknown, timeField: string, valueField: string): [unknown, unknown] | null {
    if (!isRecord(row)) return null;
    const time = row[timeField];
    if (typeof time !== 'number' && typeof time !== 'string') return null;
    if (time === '' || (typeof time === 'number' && !Number.isFinite(time))) return null;
    const value = toNumber(row[valueField]);
    // A row with a time but no usable value is kept as a gap in the line.
    return [time, Number.isNaN(value) ? null : value];
}

/**
 * Normalises a series prop to ECharts `[time, value]` pairs.
 *
 * Rows that are already `[t, v]` arrays pass through; rows that are objects
 * are converted using the configured field names; anything else is skipped.
 * When every row is already a pair (the common, and the large, case) the
 * input array itself is returned so nothing is copied.
 */
export function toTrendSeriesData(raw: unknown, timeField: string, valueField: string): unknown[] {
    if (!Array.isArray(raw)) return [];
    let i = 0;
    while (i < raw.length && isPair(raw[i])) i++;
    if (i === raw.length) return raw;

    const out: unknown[] = raw.slice(0, i);
    for (; i < raw.length; i++) {
        const row: unknown = raw[i];
        if (isPair(row)) {
            out.push(row);
        } else {
            const pair = toPair(row, timeField, valueField);
            if (pair) out.push(pair);
        }
    }
    return out;
}

function limitLine(limits: Row, key: string, label: string, alarm: boolean): Row | null {
    const value = toNumber(limits[key]);
    if (Number.isNaN(value)) return null;
    return {
        yAxis: value,
        lineStyle: alarm ? { color: '#ee6666', type: 'solid', width: 2 } : { color: '#fac858', type: 'dashed' },
        label: { formatter: label },
    };
}

function lineSeries(name: string, data: unknown[], lineStyle: Row): Row {
    return {
        name,
        type: 'line',
        // No symbols and LTTB down-sampling keep large histories cheap to
        // draw; ECharts only samples when there are more points than pixels.
        symbol: 'none',
        showSymbol: false,
        sampling: 'lttb',
        lineStyle,
        data,
    };
}

function readProps(tree: PropertyTree): TrendProps {
    return {
        data: readProp(tree, 'data', {}),
        limits: readProp(tree, 'limits', {}),
        yAxisLabel: readString(tree, 'yAxisLabel', ''),
        showSetpoint: readBoolean(tree, 'showSetpoint', true),
        showDataZoom: readBoolean(tree, 'showDataZoom', true),
    };
}

function buildOption(props: TrendProps): object {
    const data: Row = isRecord(props.data) ? props.data : {};
    const limits: Row = isRecord(props.limits) ? props.limits : {};
    const timeField = asString(data.timeField, '') || DEFAULT_TIME_FIELD;
    const valueField = asString(data.valueField, '') || DEFAULT_VALUE_FIELD;

    const pvData = toTrendSeriesData(data.pvData, timeField, valueField);
    const spData = toTrendSeriesData(data.spData, timeField, valueField);

    const pv = lineSeries('PV', pvData, { width: 2 });
    const markLines = [
        limitLine(limits, 'hiAlarm', 'Hi Alarm', true),
        limitLine(limits, 'hiWarning', 'Hi Warn', false),
        limitLine(limits, 'loWarning', 'Lo Warn', false),
        limitLine(limits, 'loAlarm', 'Lo Alarm', true),
    ].filter((line): line is Row => line !== null);
    if (markLines.length > 0) {
        pv.markLine = { silent: true, symbol: 'none', data: markLines };
    }

    const series: Row[] = [pv];
    const showSetpoint = props.showSetpoint !== false && spData.length > 0;
    if (showSetpoint) {
        series.push(lineSeries('SP', spData, { width: 1, type: 'dashed' }));
    }

    const showDataZoom = props.showDataZoom !== false;
    return {
        title: noDataTitle(pvData.length === 0 && !showSetpoint),
        tooltip: { trigger: 'axis' },
        legend: { data: series.map(s => s.name), bottom: 0 },
        // With the zoom slider, the bottom margin holds axis labels, slider and legend.
        grid: { top: 40, bottom: showDataZoom ? 90 : 50 },
        xAxis: { type: 'time' },
        yAxis: { type: 'value', name: asString(props.yAxisLabel, '') },
        dataZoom: showDataZoom ? [{ type: 'inside' }, { type: 'slider', bottom: 30, height: 24 }] : [],
        series,
    };
}

export const trendBehavior: ChartBehavior<TrendProps> = { readProps, buildOption };
