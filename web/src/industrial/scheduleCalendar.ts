import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import {
    Row, asArray, asString, colorLookup, formatDayNumber, isRecord, readBoolean, readProp, readString,
    titles, toDayNumber, toLabel,
} from './util';

export const SCHEDULE_CALENDAR_ID = 'open.industrial.ScheduleCalendar';

export interface ScheduleCalendarProps {
    /**
     * Calendar range: "YYYY" (or "YYYY-MM"). `readProps` replaces a blank
     * value with the current year so that buildOption never needs the clock.
     */
    year: string;
    /** `{ date (YYYY-MM-DD), shift, crew?, value?, color? }` records; validated in buildOption. */
    entries: unknown;
    /** `{ shift: colour }` overrides; validated in buildOption. */
    shiftColors: unknown;
    title: string;
    showLegend: boolean;
}

const DEFAULT_SHIFT_COLORS: ReadonlyArray<readonly [string, string]> = [
    ['Day', '#5470c6'],
    ['Night', '#3ba272'],
    ['Swing', '#fac858'],
    ['Off', '#e0e0e0'],
    ['Overtime', '#ee6666'],
];

/** "YYYY" or "YYYY-MM" from a string or number, otherwise null. */
export function normaliseYear(value: unknown): string | null {
    const text = typeof value === 'number' && Number.isFinite(value) ? String(value)
        : typeof value === 'string' ? value.trim() : '';
    return /^\d{4}(-(0[1-9]|1[0-2]))?$/.test(text) ? text : null;
}

/**
 * `now` is only a seam for tests. The current year is resolved here, in
 * local time (the year the operator sees on the wall), not in buildOption.
 */
export function readScheduleCalendarProps(tree: PropertyTree, now: Date = new Date()): ScheduleCalendarProps {
    return {
        year: normaliseYear(readProp(tree, 'year', '')) ?? String(now.getFullYear()),
        entries: readProp(tree, 'entries', []),
        shiftColors: readProp(tree, 'shiftColors', {}),
        title: readString(tree, 'title', ''),
        showLegend: readBoolean(tree, 'showLegend', true),
    };
}

/**
 * Calendar heatmap coloured by shift.
 *
 * Entry dates are calendar days taken exactly as written (YYYY-MM-DD, any
 * time part ignored) and emitted as YYYY-MM-DD strings, so the cell an entry
 * lands on does not depend on the browser time zone. Entries without a
 * usable date or shift are skipped. If `year` is not usable the year of the
 * first valid entry is used; with neither there is nothing to draw.
 * The entry fields `value` and `color` are not charted.
 */
function buildOption(props: ScheduleCalendarProps): object {
    const colors = colorLookup(DEFAULT_SHIFT_COLORS, props.shiftColors);
    const shiftIndex = new Map<string, number>();
    const pieces: Row[] = [];
    const data: Row[] = [];

    for (const entry of asArray(props.entries)) {
        if (!isRecord(entry)) continue;
        const day = toDayNumber(entry.date);
        const shift = toLabel(entry.shift);
        if (Number.isNaN(day) || shift === null) continue;

        let index = shiftIndex.get(shift);
        if (index === undefined) {
            index = pieces.length;
            shiftIndex.set(shift, index);
            pieces.push({ value: index, label: shift, color: colors.get(shift) ?? '#999999' });
        }
        const date = formatDayNumber(day);
        const crew = toLabel(entry.crew);
        data.push({
            // Shown by the tooltip; the raw value is only a shift index.
            name: crew === null ? `${date}: ${shift}` : `${date}: ${shift} (${crew})`,
            value: [date, index],
        });
    }

    const firstDate = data.length > 0 ? (data[0].value as [string, number])[0] : null;
    const range = normaliseYear(props.year) ?? (firstDate !== null ? firstDate.slice(0, 4) : null);
    const customTitle = asString(props.title, '');

    if (range === null) {
        return { title: titles(customTitle || 'Schedule', true, 'No year set'), series: [] };
    }

    return {
        title: titles(customTitle || `Schedule — ${range}`, data.length === 0),
        tooltip: { trigger: 'item', formatter: '{b}' },
        visualMap: {
            type: 'piecewise',
            orient: 'horizontal',
            left: 'center',
            bottom: 10,
            pieces,
            show: props.showLegend !== false && pieces.length > 0,
        },
        // Title, month labels, seven rows of cells and the legend fit the default 250 px height.
        calendar: [{
            top: 60,
            left: 50,
            right: 30,
            cellSize: ['auto', 18],
            // Empty days stay see-through and the grid mid-grey, so the calendar also works on a dark background.
            itemStyle: { color: 'transparent', borderColor: 'rgba(128,128,128,0.4)' },
            splitLine: { lineStyle: { color: '#888888' } },
            range,
            yearLabel: { show: true },
            dayLabel: { firstDay: 1 },
            monthLabel: { show: true },
        }],
        series: [{
            type: 'heatmap',
            coordinateSystem: 'calendar',
            calendarIndex: 0,
            data,
        }],
    };
}

export const scheduleCalendarBehavior: ChartBehavior<ScheduleCalendarProps> = {
    readProps: tree => readScheduleCalendarProps(tree),
    buildOption,
};
