import { asArray, isRecord, toEpochMs, toLabel } from './util';

/**
 * Total duration per (row, series) pair, as used by the state timeline,
 * downtime tracker and batch timeline (stacked bars of minutes).
 */
export interface DurationSummary {
    /** Row labels (y-axis categories) in order of first appearance. */
    rows: string[];
    /** Series names in order of first appearance. */
    series: string[];
    /** minutes[seriesIndex][rowIndex], rounded to 0.1 minute. */
    minutes: number[][];
    /** Sum over all cells, rounded to 0.1 minute. */
    totalMinutes: number;
    /** First per-record colour seen for each series (when a colour field is given). */
    recordColors: Map<string, string>;
}

const MS_PER_MINUTE = 60000;

function roundMinutes(ms: number): number {
    return Math.round(ms / (MS_PER_MINUTE / 10)) / 10;
}

/** Length of the union of [start, end] intervals stored as a flat [s0, e0, s1, e1, ...] list. */
function unionLength(flat: number[]): number {
    if (flat.length === 2) return flat[1] - flat[0];
    const intervals: Array<[number, number]> = [];
    for (let i = 0; i < flat.length; i += 2) {
        intervals.push([flat[i], flat[i + 1]]);
    }
    intervals.sort((a, b) => a[0] - b[0]);
    let total = 0;
    let curStart = intervals[0][0];
    let curEnd = intervals[0][1];
    for (let i = 1; i < intervals.length; i++) {
        const [start, end] = intervals[i];
        if (start <= curEnd) {
            if (end > curEnd) curEnd = end;
        } else {
            total += curEnd - curStart;
            curStart = start;
            curEnd = end;
        }
    }
    return total + (curEnd - curStart);
}

/**
 * Sums interval durations per (row, series) in a single pass over the records.
 *
 * - Records that are not objects, or lack a usable row or series label, are skipped.
 * - A record whose start or end is missing/unparsable, or whose end is not
 *   after its start (zero-length or reversed), contributes no time but still
 *   makes its row and series appear. Reversed intervals are not swapped: an
 *   `end` of 0 or a stale end time usually means "still open" and swapping
 *   would invent a very long duration.
 * - Overlapping intervals of the same row and series are counted once (union),
 *   so duplicated records do not double the total.
 * - Totals are accumulated in milliseconds and rounded once.
 */
export function summariseDurations(
    records: unknown,
    rowField: string,
    seriesField: string,
    colorField?: string
): DurationSummary {
    const rowIndex = new Map<string, number>();
    const seriesIndex = new Map<string, number>();
    const rows: string[] = [];
    const series: string[] = [];
    const recordColors = new Map<string, string>();
    // cells[seriesIdx] maps rowIdx -> flat interval list
    const cells: Array<Map<number, number[]>> = [];

    for (const record of asArray(records)) {
        if (!isRecord(record)) continue;
        const rowLabel = toLabel(record[rowField]);
        const seriesLabel = toLabel(record[seriesField]);
        if (rowLabel === null || seriesLabel === null) continue;

        let ri = rowIndex.get(rowLabel);
        if (ri === undefined) {
            ri = rows.length;
            rowIndex.set(rowLabel, ri);
            rows.push(rowLabel);
        }
        let si = seriesIndex.get(seriesLabel);
        if (si === undefined) {
            si = series.length;
            seriesIndex.set(seriesLabel, si);
            series.push(seriesLabel);
            cells.push(new Map<number, number[]>());
        }
        if (colorField !== undefined && !recordColors.has(seriesLabel)) {
            const color = record[colorField];
            if (typeof color === 'string' && color !== '') {
                recordColors.set(seriesLabel, color);
            }
        }

        const start = toEpochMs(record.start);
        const end = toEpochMs(record.end);
        if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue;

        const cell = cells[si].get(ri);
        if (cell) {
            cell.push(start, end);
        } else {
            cells[si].set(ri, [start, end]);
        }
    }

    let totalMs = 0;
    const minutes = cells.map(byRow => {
        const out = new Array<number>(rows.length).fill(0);
        byRow.forEach((flat, ri) => {
            const ms = unionLength(flat);
            totalMs += ms;
            out[ri] = roundMinutes(ms);
        });
        return out;
    });

    return { rows, series, minutes, totalMinutes: roundMinutes(totalMs), recordColors };
}

/** Stacked bar series (one per series name) for a duration summary. */
export function durationSeries(
    summary: DurationSummary,
    stack: string,
    colors: Map<string, string>,
    fallbackColor: string
): Array<Record<string, unknown>> {
    return summary.series.map((name, si) => ({
        name,
        type: 'bar',
        stack,
        data: summary.minutes[si],
        itemStyle: { color: summary.recordColors.get(name) ?? colors.get(name) ?? fallbackColor },
    }));
}
