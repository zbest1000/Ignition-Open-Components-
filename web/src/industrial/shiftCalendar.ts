import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import {
    FALLBACK_COLOR, Row, asArray, asString, formatDayNumber, isRecord, readProp, readString, titles,
    toDayNumber, toLabel, toNumber, weekdayOf,
} from './util';

export const SHIFT_CALENDAR_ID = 'open.industrial.ShiftCalendar';

export interface ShiftCalendarProps {
    /** `{ name, color, days }` records, `days` being weekday numbers 0 = Sunday .. 6 = Saturday. */
    patterns: unknown;
    /** `{ crew, pattern, startDate?, rotationDays? }` records. */
    crews: unknown;
    /** Inclusive `[start, end]` as YYYY-MM-DD strings. */
    dateRange: unknown;
    title: string;
}

/** Upper bound on the rendered range (about ten years) so a typo cannot hang the session. */
export const MAX_RANGE_DAYS = 3660;

interface Pattern {
    name: string;
    index: number;
    /** worked[weekday] for weekday 0..6 */
    worked: boolean[];
}

function parsePatterns(raw: unknown): { byName: Map<string, Pattern>; pieces: Row[] } {
    const byName = new Map<string, Pattern>();
    const pieces: Row[] = [];
    for (const row of asArray(raw)) {
        if (!isRecord(row)) continue;
        const name = toLabel(row.name);
        if (name === null || byName.has(name)) continue;
        const worked = [false, false, false, false, false, false, false];
        for (const d of asArray(row.days)) {
            const weekday = toNumber(d);
            if (Number.isInteger(weekday) && weekday >= 0 && weekday <= 6) {
                worked[weekday] = true;
            }
        }
        const index = pieces.length;
        byName.set(name, { name, index, worked });
        pieces.push({
            value: index,
            label: name,
            color: typeof row.color === 'string' && row.color !== '' ? row.color : FALLBACK_COLOR,
        });
    }
    return { byName, pieces };
}

function readProps(tree: PropertyTree): ShiftCalendarProps {
    return {
        patterns: readProp(tree, 'patterns', []),
        crews: readProp(tree, 'crews', []),
        dateRange: readProp(tree, 'dateRange', ['2025-01-01', '2025-01-31']),
        title: readString(tree, 'title', ''),
    };
}

/**
 * Crew x day heatmap: a cell is drawn where the crew's pattern works on that
 * weekday.
 *
 * All date handling is on whole calendar days (day numbers derived from the
 * YYYY-MM-DD text), never on local-time Date objects, so the weekday of a
 * date and its label cannot disagree whatever the browser time zone or DST.
 *
 * An unusable or reversed `dateRange` gives an empty chart, as do empty
 * `patterns` / `crews`. The crew fields `startDate` and `rotationDays` are
 * read but have no effect (they never had one); rotation is not implemented.
 */
function buildOption(props: ShiftCalendarProps): object {
    const { byName, pieces } = parsePatterns(props.patterns);

    const crewNames: string[] = [];
    const crewPatterns: Array<Pattern | undefined> = [];
    for (const row of asArray(props.crews)) {
        if (!isRecord(row)) continue;
        const crew = toLabel(row.crew);
        if (crew === null) continue;
        const patternName = toLabel(row.pattern);
        crewNames.push(crew);
        crewPatterns.push(patternName === null ? undefined : byName.get(patternName));
    }

    const range = asArray(props.dateRange);
    const first = toDayNumber(range[0]);
    const last = toDayNumber(range[1]);
    const dates: string[] = [];
    const data: Row[] = [];
    if (!Number.isNaN(first) && !Number.isNaN(last) && last >= first) {
        const end = Math.min(last, first + MAX_RANGE_DAYS - 1);
        for (let day = first; day <= end; day++) {
            const date = formatDayNumber(day);
            const weekday = weekdayOf(day);
            dates.push(date);
            for (let ci = 0; ci < crewNames.length; ci++) {
                const pattern = crewPatterns[ci];
                if (pattern && pattern.worked[weekday]) {
                    data.push({
                        // Shown by the tooltip; the raw value is only a pattern index.
                        name: `${date} ${crewNames[ci]}: ${pattern.name}`,
                        value: [date, ci, pattern.index],
                    });
                }
            }
        }
    }

    return {
        title: titles(asString(props.title, '') || 'Shift Calendar', data.length === 0),
        tooltip: { trigger: 'item', formatter: '{b}' },
        // The bottom margin holds the rotated date labels and, below them, the legend.
        grid: { top: 60, bottom: 100, left: 100, right: 40 },
        xAxis: { type: 'category', data: dates, axisLabel: { rotate: 45, fontSize: 9 } },
        yAxis: { type: 'category', data: crewNames },
        visualMap: {
            type: 'piecewise', pieces, orient: 'horizontal', left: 'center', bottom: 10,
            show: pieces.length > 0,
        },
        series: [{ type: 'heatmap', data, label: { show: false } }],
    };
}

export const shiftCalendarBehavior: ChartBehavior<ShiftCalendarProps> = { readProps, buildOption };
