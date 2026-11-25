import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import {
    FALLBACK_COLOR, Row, asArray, asString, isRecord, readBoolean, readProp, readString, titles,
    toEpochMs, toLabel, toNumber,
} from './util';

export const GANTT_ID = 'open.industrial.Gantt';

export interface GanttProps {
    /** `{ name, start, end, progress?, category?, color?, milestone? }` records; validated in buildOption. */
    tasks: unknown;
    title: string;
    /** Overlays each task's `progress` (percent, 0-100) on its bar. */
    showProgress: boolean;
}

const CATEGORY_COLORS = new Map<string, string>([
    ['Planning', '#5470c6'],
    ['Execution', '#91cc75'],
    ['Review', '#fac858'],
    ['Maintenance', '#73c0de'],
]);

const MS_PER_HOUR = 3600000;

interface Task {
    name: string;
    start: number;
    /** Never before `start`. */
    end: number;
    color: string;
    milestone: boolean;
    /** Percent 0-100, or NaN when the task has none. */
    progress: number;
}

/**
 * Validates the task records in one pass. Rows that are not objects or have
 * no usable start are skipped. A missing, unparsable or reversed end gives a
 * zero-length task at its start (not a swapped interval: an `end` of 0
 * usually means "not finished" and swapping would stretch the bar to 1970).
 */
function parseTasks(raw: unknown): { tasks: Task[]; earliest: number } {
    const tasks: Task[] = [];
    let earliest = Infinity;
    const rows = asArray(raw);
    for (let i = 0; i < rows.length; i++) {
        const row: unknown = rows[i];
        if (!isRecord(row)) continue;
        const start = toEpochMs(row.start);
        if (Number.isNaN(start)) continue;
        const end = toEpochMs(row.end);
        const progress = toNumber(row.progress);
        const category = toLabel(row.category);
        const color = typeof row.color === 'string' && row.color !== ''
            ? row.color
            : (category !== null ? CATEGORY_COLORS.get(category) : undefined) ?? FALLBACK_COLOR;
        if (start < earliest) earliest = start;
        tasks.push({
            name: toLabel(row.name) ?? `Task ${i + 1}`,
            start,
            end: Number.isNaN(end) || end < start ? start : end,
            color,
            milestone: row.milestone === true,
            progress: Number.isNaN(progress) ? NaN : Math.min(100, Math.max(0, progress)),
        });
    }
    return { tasks, earliest };
}

function spacerSeries(name: string, stack: string, data: number[]): Row {
    return {
        name, type: 'bar', stack, data,
        itemStyle: { color: 'transparent' },
        emphasis: { itemStyle: { color: 'transparent' } },
    };
}

function readProps(tree: PropertyTree): GanttProps {
    return {
        tasks: readProp(tree, 'tasks', []),
        title: readString(tree, 'title', ''),
        showProgress: readBoolean(tree, 'showProgress', true),
    };
}

/**
 * Horizontal bars positioned by hours since the earliest task start. The
 * whole option is built in a single pass over the tasks (no spread of the
 * task list into Math.min, which overflows the stack for very large lists).
 */
function buildOption(props: GanttProps): object {
    const { tasks, earliest } = parseTasks(props.tasks);
    const count = tasks.length;

    const names = new Array<string>(count);
    const offsets = new Array<number>(count);
    const bars = new Array<Row>(count);
    const milestones: Row[] = [];
    const progress = new Array<number | string>(count);
    let hasProgress = false;

    for (let i = 0; i < count; i++) {
        const task = tasks[i];
        const offset = (task.start - earliest) / MS_PER_HOUR;
        const duration = (task.end - task.start) / MS_PER_HOUR;
        names[i] = task.name;
        offsets[i] = offset;
        bars[i] = { value: duration, itemStyle: { color: task.color } };
        if (Number.isNaN(task.progress)) {
            progress[i] = '-';
        } else {
            progress[i] = duration * task.progress / 100;
            hasProgress = true;
        }
        if (task.milestone) {
            milestones.push({
                name: `${task.name} (milestone)`,
                // Addressed by row index, so duplicate task names stay distinct.
                coord: [offset, i],
                symbol: 'diamond',
                symbolSize: 14,
                itemStyle: { color: '#ee6666' },
                label: { show: false },
            });
        }
    }

    const durationSeries: Row = { name: 'Duration', type: 'bar', stack: 'gantt', data: bars };
    if (milestones.length > 0) {
        durationSeries.markPoint = { data: milestones };
    }
    const series: Row[] = [spacerSeries('Offset', 'gantt', offsets), durationSeries];

    if (props.showProgress !== false && hasProgress) {
        // A second stack drawn on top of the first (barGap -100%): a
        // transparent spacer followed by the completed part of each task.
        series.push(spacerSeries('Progress offset', 'progress', offsets.slice()));
        series.push({
            name: 'Progress', type: 'bar', stack: 'progress', barGap: '-100%', data: progress,
            itemStyle: { color: 'rgba(0, 0, 0, 0.3)' },
        });
    }

    return {
        title: titles(asString(props.title, '') || 'Gantt Chart', count === 0),
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { top: 60, bottom: 40, left: 160, right: 40 },
        xAxis: { type: 'value', name: 'Hours', min: 0 },
        yAxis: { type: 'category', data: names, inverse: true },
        series,
        dataZoom: [{ type: 'inside' }],
    };
}

export const ganttBehavior: ChartBehavior<GanttProps> = { readProps, buildOption };
