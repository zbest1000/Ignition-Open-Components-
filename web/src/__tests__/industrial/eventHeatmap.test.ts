import * as fs from 'fs';
import * as path from 'path';
import { bucketTimestamps, eventHeatmapBehavior, sumCells, toDayIndex, toWallClockMs } from '../../industrial/eventHeatmap';
import { Opt, expectPlainOption, fakeTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    eventHeatmapBehavior.buildOption(eventHeatmapBehavior.readProps(fakeTree(props)));
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** [column, row, value] of the coloured cells. */
const cellsOf = (option: Opt): number[][] => option.series[0].data.map((d: Opt) => d.value);
const HOUR = 3600000;
// 2025-01-06 is a Monday.
const MONDAY = Date.UTC(2025, 0, 6);

describe('industrial Event Heatmap', () => {
    it('readProps defaults match the prop schema', () => {
        const schema = JSON.parse(fs.readFileSync(path.resolve(
            __dirname, '../../../../common/src/main/resources/props/industrial-event-heatmap.props.json'), 'utf8'));
        const defaults = eventHeatmapBehavior.readProps(fakeTree({})) as unknown as Record<string, unknown>;
        for (const key of Object.keys(defaults)) {
            expect({ [key]: schema.properties[key].default }).toEqual({ [key]: defaults[key] });
        }
    });

    it('draws the default sample: 7 x 24 cells, zero cells in their own series', () => {
        const option = build({});
        expectPlainOption(option);
        expect(option.xAxis[0].data).toHaveLength(24);
        expect(option.xAxis[0].data.slice(0, 3)).toEqual(['00', '01', '02']);
        expect(option.yAxis[0].data).toEqual(DAYS);
        expect(option.yAxis[0].inverse).toBe(true);
        const filled = option.series[0].data;
        const blank = option.series[1].data;
        expect(filled.length + blank.length).toBe(168);
        expect(blank).toHaveLength(27);
        expect(filled.every((d: Opt) => d.value[2] > 0)).toBe(true);
        expect(blank.every((d: Opt) => d.value[2] === 0)).toBe(true);
        // Monday 06:00 is the busiest hour of the sample
        expect(filled.find((d: Opt) => d.value[0] === 6 && d.value[1] === 0))
            .toEqual({ name: 'Mon 06:00–07:00: 25 alarms', value: [6, 0, 25] });
        expect(blank[0].name).toBe('Mon 03:00–04:00: 0 alarms');
        expect(option.visualMap[0].max).toBe(25);
        expect(option.visualMap[0].seriesIndex).toBe(0);
        expect(option.visualMap[0].text).toEqual(['25 alarms', '0']);
        // the zero cells are coloured by their own, hidden scale: one neutral colour
        expect(option.visualMap[1].seriesIndex).toBe(1);
        expect(option.visualMap[1].show).toBe(false);
        expect(new Set(option.visualMap[1].inRange.color).size).toBe(1);
        expect(option.visualMap[0].inRange.color).not.toContain(option.visualMap[1].inRange.color[0]);
        expect(option.title[1].text).toBe('');
        expect(option.tooltip.formatter).toBe('{b}');
    });

    it('totals per hour and per day match the cells', () => {
        const option = build({});
        const perHour = option.series[2].data.map((d: Opt) => d.value);
        const perDay = option.series[3].data.map((d: Opt) => d.value);
        // row sums of the sample, Monday to Sunday
        expect(perDay).toEqual([196, 161, 200, 156, 182, 33, 29]);
        expect(perHour.reduce((a: number, b: number) => a + b, 0)).toBe(957);
        expect(perHour[6]).toBe(25 + 18 + 20 + 17 + 19 + 0 + 5);
        expect(option.series[3].data[0].name).toBe('Mon, all hours: 196 alarms');
        expect(option.series[3].data[0].label.formatter).toBe('196');
        expect(option.series[2].data[6].name).toBe('06:00–07:00, all days: 104 alarms');
        expect(option.grid).toHaveLength(3);
        expect(option.series[2].xAxisIndex).toBe(1);
        expect(option.series[3].yAxisIndex).toBe(2);

        const plain = build({ showTotals: false });
        expect(plain.series).toHaveLength(2);
        expect(plain.grid).toHaveLength(1);
        expect(plain.grid[0].right).toBeLessThan(option.grid[0].right);
    });

    it('sums cells and accepts days as ISO numbers, getDay numbers, names and custom labels', () => {
        expect(toDayIndex(1, DAYS)).toBe(0);
        expect(toDayIndex(7, DAYS)).toBe(6);
        expect(toDayIndex(0, DAYS)).toBe(6);
        expect(toDayIndex('3', DAYS)).toBe(2);
        expect(toDayIndex('monday', DAYS)).toBe(0);
        expect(toDayIndex('SAT', DAYS)).toBe(5);
        expect(toDayIndex('Sunday', DAYS)).toBe(6);
        expect(toDayIndex('Mi', ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'])).toBe(2);
        for (const bad of [8, -1, 1.5, 'xyz', 'mo', '', null, undefined, {}, [], NaN, true]) {
            expect(toDayIndex(bad, DAYS)).toBe(-1);
        }

        const { grid, accepted } = sumCells([
            { day: 1, hour: 0, value: 2 }, { day: 'Mon', hour: '0', value: 3 }, [1, 0, 1.5],
            { day: 7, hour: 23, value: 4 }, { day: 0, hour: 23.9, value: 1 },
            { day: 2, hour: 5, value: 0 },
            { day: 2, hour: 24, value: 1 }, { day: 2, hour: -1, value: 1 }, { day: 9, hour: 1, value: 1 },
            { day: 2, hour: 1, value: -1 }, { day: 2, hour: 1, value: 'x' }, { day: 2, hour: null, value: 1 },
            null, 5, 'x', {}, [1, 2],
        ], DAYS);
        expect(grid[0][0]).toBe(6.5);
        expect(grid[6][23]).toBe(5);
        expect(accepted).toBe(6);
        expect(grid.reduce((a, row) => a + row.reduce((b, v) => b + v, 0), 0)).toBe(11.5);
    });

    it('buckets epoch timestamps by weekday and hour at the given offset', () => {
        const stamps = [
            MONDAY,                    // Mon 00:00 UTC
            MONDAY + HOUR - 1,         // Mon 00:59:59.999
            MONDAY + 13 * HOUR + 5,    // Mon 13:00
            MONDAY - 1,                // Sun 23:59:59.999
            MONDAY + 6 * 24 * HOUR + 23 * HOUR, // Sun 23:00
            0,                         // Thu 1970-01-01 00:00
            -1,                        // Wed 1969-12-31 23:59
            String(MONDAY + 2 * HOUR), // numeric string: Mon 02:00
        ];
        const utc = bucketTimestamps(stamps, [], 0).grid;
        expect(utc[0][0]).toBe(2);
        expect(utc[0][13]).toBe(1);
        expect(utc[6][23]).toBe(2);
        expect(utc[3][0]).toBe(1);
        expect(utc[2][23]).toBe(1);
        expect(utc[0][2]).toBe(1);

        // UTC+5:30: Mon 00:00 UTC is Mon 05:30; Sun 23:59 UTC is Mon 05:29
        const india = bucketTimestamps([MONDAY, MONDAY - 1, MONDAY + 19 * HOUR], [], 330).grid;
        expect(india[0][5]).toBe(2);
        expect(india[1][0]).toBe(1);
        // UTC-5: Mon 00:00 UTC is Sun 19:00
        expect(bucketTimestamps([MONDAY], [], -300).grid[6][19]).toBe(1);
        expect(bucketTimestamps([MONDAY], [], NaN).grid[0][0]).toBe(1);
    });

    it('reads ISO strings: zoned ones as instants, unzoned ones as written', () => {
        expect(toWallClockMs('2025-01-06T00:00:00Z', 0)).toBe(MONDAY);
        expect(toWallClockMs('2025-01-06T02:00:00+02:00', 0)).toBe(MONDAY);
        expect(toWallClockMs('2025-01-05T19:00:00-0500', 0)).toBe(MONDAY);
        expect(toWallClockMs('2025-01-06T05:30+0530', 0)).toBe(MONDAY);
        expect(toWallClockMs('2025-01-06T01:00+01', 0)).toBe(MONDAY);
        expect(toWallClockMs('2025-01-06T00:00:00.250Z', 60 * 60000)).toBe(MONDAY + HOUR + 250);
        // no zone: wall-clock time as written, whatever the offset
        expect(toWallClockMs('2025-01-06T13:45:10', 0)).toBe(MONDAY + 13 * HOUR + 45 * 60000 + 10000);
        expect(toWallClockMs('2025-01-06 13:45:10', -480 * 60000)).toBe(MONDAY + 13 * HOUR + 45 * 60000 + 10000);
        expect(toWallClockMs('2025-01-06', 600 * 60000)).toBe(MONDAY);
        expect(toWallClockMs(new Date(MONDAY), 60 * 60000)).toBe(MONDAY + HOUR);
        for (const bad of ['', 'yesterday', '2025-13-01', '2025-01-32', '2025-01-06T25:00', '06/01/2025', null, undefined, {}, [],
            true, NaN, Infinity, new Date(NaN)]) {
            expect(toWallClockMs(bad, 0)).toBeNaN();
        }

        const { grid, accepted } = bucketTimestamps(
            ['2025-01-06T13:45:10', '2025-01-06T23:30:00Z', '2025-01-08T06:00:00+02:00', 'nope', null], [], 60);
        expect(accepted).toBe(3);
        expect(grid[0][13]).toBe(1);   // as written
        expect(grid[1][0]).toBe(1);    // Mon 23:30 UTC is Tue 00:30 at UTC+1
        expect(grid[2][5]).toBe(1);    // Wed 06:00+02:00 is 04:00 UTC, 05:00 at UTC+1
    });

    it('gives the same buckets whatever the time zone of the machine', () => {
        // Run this file under several zones (TZ=America/New_York, Asia/Kolkata, Pacific/Auckland, UTC):
        // the expectations below are fixed numbers, so any dependence on the machine's zone fails.
        const stamps = [
            MONDAY + 30 * 60000, '2025-03-30T01:30:00', '2025-03-30T02:30:00', '2025-03-09T02:30:00',
            '2025-10-26T01:30:00Z', '2025-11-02T01:30:00-04:00', Date.UTC(2025, 2, 30, 0, 59, 59),
        ];
        const { grid } = bucketTimestamps(stamps, [], 0);
        const found: Array<[number, number, number]> = [];
        grid.forEach((row, d) => row.forEach((v, h) => { if (v > 0) found.push([d, h, v]); }));
        expect(found).toEqual([[0, 0, 1], [6, 0, 1], [6, 1, 2], [6, 2, 2], [6, 5, 1]]);
        const shifted = bucketTimestamps(stamps, [], -480).grid;
        // only the epoch and zoned values move (by 8 hours); the three unzoned ones stay
        expect(shifted[6][16]).toBe(1);
        expect(shifted[5][16]).toBe(1);
        expect(shifted[5][17]).toBe(1);
        expect(shifted[5][21]).toBe(1);
        expect(shifted[6][1] + shifted[6][2]).toBe(3);
        const option = build({ timestamps: stamps, utcOffsetMinutes: 0 });
        expect(cellsOf(option)).toEqual([[0, 0, 1], [0, 6, 1], [1, 6, 2], [2, 6, 2], [5, 6, 1]]);
    });

    it('applies weights, skipping events without a valid one', () => {
        const stamps = [MONDAY, MONDAY, MONDAY, MONDAY, MONDAY, MONDAY];
        const { grid, accepted } = bucketTimestamps(stamps, [2.5, '4', -1, 'x', null], 0);
        expect(grid[0][0]).toBe(6.5);
        expect(accepted).toBe(2);
        // rows as a named query returns them
        const rows = bucketTimestamps([
            { t_stamp: MONDAY, weight: 3 }, { timestamp: '2025-01-06T00:10:00Z' }, { t: MONDAY, value: 2 },
            { t_stamp: MONDAY, weight: 'bad' }, { weight: 2 }, {},
        ], [], 0);
        expect(rows.grid[0][0]).toBe(6);
        expect(rows.accepted).toBe(3);
        // a zero weight is an event that adds nothing: the chart is not "No data"
        expect(build({ timestamps: [MONDAY], weights: [0] }).title[1].text).toBe('');
    });

    it('prefers timestamps over cells, and falls back to cells when there are none', () => {
        const both = build({ timestamps: [MONDAY + 3 * HOUR], cells: [{ day: 5, hour: 9, value: 7 }] });
        expect(cellsOf(both)).toEqual([[3, 0, 1]]);
        const none = build({ timestamps: [], cells: [{ day: 5, hour: 9, value: 7 }] });
        expect(cellsOf(none)).toEqual([[9, 4, 7]]);
        expect(none.series[1].data).toHaveLength(167);
    });

    it('buckets 100,000 timestamps in one pass', () => {
        const stamps: number[] = [];
        for (let i = 0; i < 100000; i++) stamps.push(MONDAY + i * 6047 * 1000); // every 1 h 40 min 47 s: ~19 years
        const started = Date.now();
        const option = build({ timestamps: stamps });
        const elapsed = Date.now() - started;
        const total = cellsOf(option).reduce((a, c) => a + c[2], 0);
        expect(total).toBe(100000);
        expect(option.series[3].data.reduce((a: number, d: Opt) => a + d.value, 0)).toBe(100000);
        expect(option.series[0].data.length + option.series[1].data.length).toBe(168);
        expect(elapsed).toBeLessThan(1000);
    });

    it('groups hours into wider columns', () => {
        const cells = [{ day: 1, hour: 0, value: 1 }, { day: 1, hour: 3, value: 2 }, { day: 1, hour: 4, value: 4 }, { day: 7, hour: 23, value: 8 }];
        const four = build({ cells, hourStep: 4 });
        expect(four.xAxis[0].data).toEqual(['00–04', '04–08', '08–12', '12–16', '16–20', '20–24']);
        expect(cellsOf(four)).toEqual([[0, 0, 3], [1, 0, 4], [5, 6, 8]]);
        expect(four.series[0].data[0].name).toBe('Mon 00:00–04:00: 3 alarms');
        expect(four.series[0].data.length + four.series[1].data.length).toBe(42);
        expect(four.visualMap[0].max).toBe(8);
        expect(build({ cells, hourStep: 2 }).xAxis[0].data).toHaveLength(12);
        expect(build({ cells, hourStep: 3 }).xAxis[0].data).toHaveLength(8);
        expect(build({ cells, hourStep: 6 }).xAxis[0].data).toHaveLength(4);
        for (const bad of [5, 0, -1, 24, 1.5, 'x', NaN]) {
            expect(build({ cells, hourStep: bad }).xAxis[0].data).toHaveLength(24);
        }
    });

    it('starts the week on Sunday when asked, keeping dayLabels Monday-first', () => {
        const cells = [{ day: 'Sun', hour: 1, value: 5 }, { day: 'Mon', hour: 2, value: 3 }];
        const option = build({ cells, weekStart: 'sunday', dayLabels: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] });
        expect(option.yAxis[0].data).toEqual(['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']);
        expect(cellsOf(option)).toEqual([[1, 0, 5], [2, 1, 3]]);
        expect(option.series[0].data[0].name).toBe('So 01:00–02:00: 5 alarms');
        expect(option.series[3].data.map((d: Opt) => d.value)).toEqual([5, 3, 0, 0, 0, 0, 0]);
        // incomplete or unusable labels fall back per entry
        expect(build({ dayLabels: ['L', null, {}, ''] }).yAxis[0].data).toEqual(['L', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
        expect(build({ weekStart: 'friday' }).yAxis[0].data).toEqual(DAYS);
    });

    it('fixes or derives the top of the scale, and applies colours, labels and title', () => {
        const cells = [{ day: 1, hour: 0, value: 40 }];
        expect(build({ cells }).visualMap[0].max).toBe(40);
        expect(build({ cells, max: 100 }).visualMap[0].max).toBe(100);
        expect(build({ cells, max: 100 }).visualMap[0].text).toEqual(['100 alarms', '0']);
        expect(build({ cells, max: -5 }).visualMap[0].max).toBe(40);
        expect(build({ cells, max: 'x' }).visualMap[0].max).toBe(40);

        const styled = build({
            cells, colors: ['#ffffff', 5, '#ff0000'], showValues: true, showLegend: false, valueLabel: 'stops', title: 'Stops',
        });
        expect(styled.visualMap[0].inRange.color).toEqual(['#ffffff', '#ff0000']);
        expect(styled.visualMap[0].show).toBe(false);
        expect(styled.series[0].label.show).toBe(true);
        expect(styled.series[0].label.formatter).toBe('{@[2]}');
        expect(styled.series[0].label.color).toBeUndefined();
        expect(styled.series[1].label.show).toBe(false);
        expect(styled.series[0].data[0].name).toBe('Mon 00:00–01:00: 40 stops');
        expect(styled.title[0].text).toBe('Stops');
        expect(build({ cells, colors: ['#123456'] }).visualMap[0].inRange.color).toEqual(['#123456', '#123456']);
        expect(build({ cells, colors: 'red' }).visualMap[0].inRange.color).toHaveLength(4);
        expect(build({ cells, valueLabel: '' }).series[0].data[0].name).toBe('Mon 00:00–01:00: 40');
        expect(build({ cells: [{ day: 1, hour: 0, value: 1234.5678 }] }).series[0].data[0])
            .toEqual({ name: 'Mon 00:00–01:00: 1,234.57 alarms', value: [0, 0, 1234.57] });
    });

    it('skips absurdly large values and weights so totals stay finite', () => {
        const option = build({ cells: [{ day: 1, hour: 0, value: 1e308 }, { day: 1, hour: 1, value: 1e308 }, { day: 1, hour: 2, value: 3 }] });
        expectPlainOption(option);
        expect(cellsOf(option)).toEqual([[2, 0, 3]]);
        expect(bucketTimestamps([MONDAY, MONDAY], [1e308, 2], 0).grid[0][0]).toBe(2);
    });

    it('shows "No data" for no usable input, but an all-zero grid for explicit zeros', () => {
        for (const props of [{ cells: [] }, { cells: 'x' }, { cells: [{ day: 9, hour: 1, value: 1 }] }, { timestamps: ['nope'], cells: [] },
            { timestamps: ['nope'] }]) {
            const option = build(props);
            expectPlainOption(option);
            expect(option.title[1].text).toBe('No data');
            expect(option.series[0].data).toEqual([]);
            expect(option.series[1].data).toEqual([]);
            expect(option.visualMap[0].max).toBe(1);
        }
        const zeros = build({ cells: [{ day: 1, hour: 0, value: 0 }] });
        expect(zeros.title[1].text).toBe('');
        expect(zeros.series[0].data).toEqual([]);
        expect(zeros.series[1].data).toHaveLength(168);
    });
});
