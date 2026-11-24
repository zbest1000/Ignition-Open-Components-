import { MAX_RANGE_DAYS, shiftCalendarBehavior } from '../../industrial/shiftCalendar';
import { Opt, fakeTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    shiftCalendarBehavior.buildOption(shiftCalendarBehavior.readProps(fakeTree(props)));

const PATTERNS = [
    { name: 'Day', color: '#5470c6', days: [1, 2, 3, 4, 5] },
    { name: 'Weekend', color: '#ee6666', days: [0, 6] },
];
const CREWS = [
    { crew: 'Crew A', pattern: 'Day', startDate: '2025-01-01' },
    { crew: 'Crew B', pattern: 'Weekend', startDate: '2025-01-01', rotationDays: 7 },
];
// 2025-01-05 is a Sunday, 2025-01-06 a Monday, 2025-01-11 a Saturday.
const WEEK = ['2025-01-05', '2025-01-11'];

const cells = (option: Opt, crewIndex: number): string[] =>
    option.series[0].data.filter((d: Opt) => d.value[1] === crewIndex).map((d: Opt) => d.value[0]);

/**
 * Bug 4: the old code took the weekday from local time and the label from
 * UTC, so west of UTC a Mon-Fri pattern was drawn on Tue-Sat labels.
 *
 * jest sandboxes process.env, so the zone cannot be switched from inside a
 * test; the expectations below hold in every zone and this file is run once
 * per zone from the command line:
 *
 *   for tz in UTC America/Chicago Asia/Kolkata Pacific/Auckland Pacific/Pago_Pago; do
 *     TZ=$tz npx jest src/__tests__/industrial/shiftCalendar src/__tests__/industrial/scheduleCalendar
 *   done
 *
 * The "never uses local-time Date accessors" test guards the same property
 * in a plain run, whatever zone the build machine is in.
 */
const LOCAL_DATE_METHODS = [
    'getDay', 'getDate', 'getMonth', 'getFullYear', 'getHours', 'getTimezoneOffset',
    'setDate', 'setMonth', 'setFullYear', 'setHours',
] as const;

describe('industrial ShiftCalendar', () => {
    it('readProps applies the schema defaults', () => {
        expect(shiftCalendarBehavior.readProps(fakeTree({}))).toEqual({
            patterns: [], crews: [], dateRange: ['2025-01-01', '2025-01-31'], title: '',
        });
    });

    it('runs in the zone requested through TZ, when one is set', () => {
        // Proves the TZ matrix is real: January offsets (minutes behind UTC) of the zones it uses.
        const januaryOffsets: Record<string, number> = {
            'UTC': 0, 'America/Chicago': 360, 'Asia/Kolkata': -330, 'Pacific/Auckland': -780, 'Pacific/Pago_Pago': 660,
        };
        const expected = januaryOffsets[process.env.TZ ?? ''];
        if (expected !== undefined) {
            expect(new Date(2025, 0, 15, 12).getTimezoneOffset()).toBe(expected);
        }
    });

    it('marks Monday to Friday, not Saturday, for a Mon-Fri pattern (bug 4)', () => {
        const option = build({ patterns: PATTERNS, crews: CREWS, dateRange: WEEK });
        expect(option.xAxis.data).toEqual([
            '2025-01-05', '2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10', '2025-01-11',
        ]);
        expect(cells(option, 0)).toEqual(['2025-01-06', '2025-01-07', '2025-01-08', '2025-01-09', '2025-01-10']);
        expect(cells(option, 1)).toEqual(['2025-01-05', '2025-01-11']);
    });

    it('covers the inclusive range across DST changes without skipping or repeating a day', () => {
        const option = build({ patterns: PATTERNS, crews: CREWS, dateRange: ['2025-03-01', '2025-11-30'] });
        const dates: string[] = option.xAxis.data;
        expect(dates).toHaveLength(275);
        expect(dates[0]).toBe('2025-03-01');
        expect(dates[274]).toBe('2025-11-30');
        expect(new Set(dates).size).toBe(275);
        // 2025-03-09 (US DST start) and 2025-11-02 (US DST end) are Sundays
        expect(cells(option, 1)).toEqual(expect.arrayContaining(['2025-03-09', '2025-11-02']));
        expect(cells(option, 0)).not.toEqual(expect.arrayContaining(['2025-03-09']));
        expect(cells(option, 0)).toHaveLength(195); // weekdays from 2025-03-01 to 2025-11-30
    });

    it('never uses local-time Date accessors (bug 4)', () => {
        const spies = LOCAL_DATE_METHODS.map(name => jest.spyOn(Date.prototype, name));
        try {
            build({ patterns: PATTERNS, crews: CREWS, dateRange: WEEK });
            for (const spy of spies) expect(spy).not.toHaveBeenCalled();
        } finally {
            spies.forEach(spy => spy.mockRestore());
        }
    });

    it('maps cells to pattern indices and names them for the tooltip', () => {
        const option = build({ patterns: PATTERNS, crews: CREWS, dateRange: ['2025-01-06', '2025-01-06'] });
        expect(option.series[0].data).toEqual([{ name: '2025-01-06 Crew A: Day', value: ['2025-01-06', 0, 0] }]);
        expect(option.yAxis.data).toEqual(['Crew A', 'Crew B']);
        expect(option.visualMap.pieces).toEqual([
            { value: 0, label: 'Day', color: '#5470c6' },
            { value: 1, label: 'Weekend', color: '#ee6666' },
        ]);
        expect(option.tooltip.formatter).toBe('{b}');
        expect(option.title[0].text).toBe('Shift Calendar');
        expect(option.title[1].text).toBe('');
    });

    it('renders an empty chart for the schema defaults (no patterns, no crews)', () => {
        const option = build({});
        expect(option.series[0].data).toEqual([]);
        expect(option.xAxis.data).toHaveLength(31);
        expect(option.title[1].text).toBe('No data');
    });

    it('gives an empty chart for an unusable or reversed date range', () => {
        for (const dateRange of ['abc', [], ['2025-01-01'], ['x', 'y'], ['2025-02-30', '2025-03-01'],
            ['2025-01-31', '2025-01-01'], [null, null], { 0: '2025-01-01', 1: '2025-01-02' }]) {
            const option = build({ patterns: PATTERNS, crews: CREWS, dateRange });
            expect(option.xAxis.data).toEqual([]);
            expect(option.series[0].data).toEqual([]);
        }
    });

    it('caps a huge range', () => {
        const option = build({ patterns: PATTERNS, crews: CREWS, dateRange: ['1900-01-01', '2999-12-31'] });
        expect(option.xAxis.data).toHaveLength(MAX_RANGE_DAYS);
        expect(option.xAxis.data[0]).toBe('1900-01-01');
    });

    it('skips malformed patterns and crews (bug 2)', () => {
        const option = build({
            patterns: [null, 'x', {}, { name: 'NoDays' }, { name: 'Bad', days: 'mon' },
                { name: 'Mixed', days: [1, '2', 9, -1, 1.5, null, 'x'] }, { name: 'Mixed', days: [0] }],
            crews: [null, 5, {}, { crew: 'No pattern' }, { crew: 'Unknown', pattern: 'Nope' },
                { crew: 'M', pattern: 'Mixed' }, { crew: 'N', pattern: 'NoDays' }],
            dateRange: WEEK,
        });
        expect(option.yAxis.data).toEqual(['No pattern', 'Unknown', 'M', 'N']);
        expect(cells(option, 2)).toEqual(['2025-01-06', '2025-01-07']); // Monday and Tuesday only
        expect(option.series[0].data).toHaveLength(2);
        expect(option.visualMap.pieces.map((p: Opt) => p.label)).toEqual(['NoDays', 'Bad', 'Mixed']);
        for (const bad of [null, 'abc', { $columns: [] }, [null]]) {
            expect(build({ patterns: bad, crews: bad, dateRange: WEEK }).series[0].data).toEqual([]);
        }
    });
});
