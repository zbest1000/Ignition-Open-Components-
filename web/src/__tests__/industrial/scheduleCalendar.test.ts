import {
    normaliseYear, readScheduleCalendarProps, scheduleCalendarBehavior,
} from '../../industrial/scheduleCalendar';
import { Opt, fakeTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    scheduleCalendarBehavior.buildOption(scheduleCalendarBehavior.readProps(fakeTree({ year: '2025', ...props })));

const ENTRIES = [
    { date: '2025-01-06', shift: 'Day', crew: 'A' },
    { date: '2025-01-07', shift: 'Night' },
    { date: '2025-01-08', shift: 'Day' },
];

describe('industrial ScheduleCalendar', () => {
    it('readProps resolves a blank or unusable year to the current year (bug 7)', () => {
        const now = new Date(2031, 5, 15);
        expect(readScheduleCalendarProps(fakeTree({}), now)).toEqual({
            year: '2031', entries: [], shiftColors: {}, title: '', showLegend: true,
        });
        expect(readScheduleCalendarProps(fakeTree({ year: '' }), now).year).toBe('2031');
        expect(readScheduleCalendarProps(fakeTree({ year: 'next' }), now).year).toBe('2031');
        expect(readScheduleCalendarProps(fakeTree({ year: null }), now).year).toBe('2031');
        expect(readScheduleCalendarProps(fakeTree({ year: '2024' }), now).year).toBe('2024');
        expect(readScheduleCalendarProps(fakeTree({ year: 2024 }), now).year).toBe('2024');
        expect(scheduleCalendarBehavior.readProps(fakeTree({})).year).toBe(String(new Date().getFullYear()));
    });

    it('normaliseYear accepts YYYY and YYYY-MM only', () => {
        expect(['2025', ' 2025 ', 2025, '2025-03', '2025-13', '25', '', null, {}, 'abcd', 2025.5].map(normaliseYear))
            .toEqual(['2025', '2025', '2025', '2025-03', null, null, null, null, null, null, null]);
    });

    it('buildOption never consults the clock (bug 7)', () => {
        const RealDate = Date;
        const props = scheduleCalendarBehavior.readProps(fakeTree({ year: '', entries: ENTRIES }));
        const spy = jest.spyOn(global, 'Date').mockImplementation(((...args: unknown[]) => {
            if (args.length === 0) throw new Error('buildOption read the clock');
            return new (RealDate as unknown as new (...a: unknown[]) => Date)(...args);
        }) as unknown as () => Date);
        (Date as unknown as { UTC: typeof Date.UTC }).UTC = RealDate.UTC;
        try {
            const blank = scheduleCalendarBehavior.buildOption({ ...props, year: '' }) as Opt;
            expect(blank.calendar[0].range).toBe('2025'); // from the first entry, not from "now"
            expect(scheduleCalendarBehavior.buildOption(props)).toEqual(scheduleCalendarBehavior.buildOption(props));
        } finally {
            spy.mockRestore();
        }
        const nothing = scheduleCalendarBehavior.buildOption({ year: '', entries: [], shiftColors: {}, title: '', showLegend: true }) as Opt;
        expect(nothing.series).toEqual([]);
        expect(nothing.calendar).toBeUndefined();
        expect(nothing.title[1].text).toBe('No year set');
    });

    it('maps entries to shift indices with a colour piece per shift', () => {
        const option = build({ entries: ENTRIES, shiftColors: { Night: '#000000' } });
        expect(option.calendar[0].range).toBe('2025');
        expect(option.title[0].text).toBe('Schedule — 2025');
        expect(option.title[1].text).toBe('');
        expect(option.series[0].data).toEqual([
            { name: '2025-01-06: Day (A)', value: ['2025-01-06', 0] },
            { name: '2025-01-07: Night', value: ['2025-01-07', 1] },
            { name: '2025-01-08: Day', value: ['2025-01-08', 0] },
        ]);
        expect(option.visualMap.pieces).toEqual([
            { value: 0, label: 'Day', color: '#5470c6' },
            { value: 1, label: 'Night', color: '#000000' },
        ]);
        expect(option.visualMap.show).toBe(true);
        expect(build({ entries: ENTRIES, showLegend: false }).visualMap.show).toBe(false);
        expect(build({ entries: ENTRIES, title: 'Rota', year: '2025-01' })).toMatchObject({
            title: [{ text: 'Rota' }, {}], calendar: [{ range: '2025-01' }],
        });
    });

    // Zone independent; also run under several TZ values, see shiftCalendar.test.ts.
    it('keeps entry dates as written, whatever the time zone (bug 4 class)', () => {
        const option = build({
            entries: [
                { date: '2025-01-06', shift: 'Day' },
                { date: '2025-03-09T00:00:00', shift: 'Day' },
                { date: '2025-12-31T23:30:00-06:00', shift: 'Day' },
                { date: '2025-1-7', shift: 'Day' },
            ],
        });
        expect(option.series[0].data.map((d: Opt) => d.value[0]))
            .toEqual(['2025-01-06', '2025-03-09', '2025-12-31', '2025-01-07']);
    });

    it('skips malformed entries and tolerates non-array input (bug 2)', () => {
        const option = build({
            entries: [null, 5, 'x', {}, { date: '2025-01-06' }, { shift: 'Day' }, { date: 'soon', shift: 'Day' },
                { date: '2025-02-30', shift: 'Day' }, { date: '2025-01-09', shift: 'constructor' }],
        });
        expect(option.series[0].data).toEqual([{ name: '2025-01-09: constructor', value: ['2025-01-09', 0] }]);
        expect(option.visualMap.pieces).toEqual([{ value: 0, label: 'constructor', color: '#999999' }]);
        for (const entries of [null, 'abc', { $columns: [] }, [null]]) {
            const empty = build({ entries });
            expect(empty.series[0].data).toEqual([]);
            expect(empty.title[1].text).toBe('No data');
            expect(empty.visualMap.show).toBe(false);
        }
    });
});
