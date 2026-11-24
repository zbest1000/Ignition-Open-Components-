import { summariseDurations } from '../../industrial/durations';

const MIN = 60000;
const ev = (lane: unknown, state: unknown, startMin: number, endMin: number, extra: object = {}) =>
    ({ lane, state, start: startMin * MIN, end: endMin * MIN, ...extra });

describe('industrial summariseDurations', () => {
    it('sums minutes per row and series in order of first appearance', () => {
        const s = summariseDurations([
            ev('A', 'Run', 0, 30), ev('A', 'Idle', 30, 40), ev('B', 'Run', 0, 5), ev('A', 'Run', 40, 60),
        ], 'lane', 'state');
        expect(s.rows).toEqual(['A', 'B']);
        expect(s.series).toEqual(['Run', 'Idle']);
        expect(s.minutes).toEqual([[50, 5], [10, 0]]);
        expect(s.totalMinutes).toBe(65);
    });

    it('accumulates in milliseconds and rounds once, to 0.1 min', () => {
        // ten 20 s events are 3.3 min, not 0 (rounding each event) or 3 (whole minutes)
        const events = [];
        for (let i = 0; i < 10; i++) events.push({ lane: 'A', state: 'Run', start: i * MIN, end: i * MIN + 20000 });
        expect(summariseDurations(events, 'lane', 'state').minutes).toEqual([[3.3]]);
    });

    it('counts reversed and zero-length intervals as zero but keeps their labels', () => {
        const s = summariseDurations([
            ev('A', 'Run', 10, 5), ev('B', 'Idle', 7, 7), ev('C', 'Stop', 0, 3),
            { lane: 'D', state: 'Open', start: 1700000000000, end: 0 },
        ], 'lane', 'state');
        expect(s.rows).toEqual(['A', 'B', 'C', 'D']);
        expect(s.series).toEqual(['Run', 'Idle', 'Stop', 'Open']);
        expect(s.minutes).toEqual([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 3, 0], [0, 0, 0, 0]]);
        expect(s.totalMinutes).toBe(3);
    });

    it('counts overlapping intervals of the same row and series once', () => {
        const s = summariseDurations([
            ev('A', 'Down', 0, 30), ev('A', 'Down', 20, 50), ev('A', 'Down', 0, 30), // union 0-50
            ev('A', 'Down', 100, 110), ev('A', 'Down', 50, 60),                       // touching + separate
            ev('B', 'Down', 0, 30),
        ], 'lane', 'state');
        expect(s.minutes).toEqual([[70, 30]]);
    });

    it('skips rows that are not objects or lack labels; bad times contribute nothing', () => {
        const s = summariseDurations([
            null, undefined, 5, 'x', [], {}, { lane: 'A' }, { state: 'Run' }, { lane: {}, state: [] },
            { lane: 'A', state: 'Run', start: 'soon', end: null },
            { lane: 'A', state: 'Run' },
            { lane: 1, state: 2, start: '0', end: '120000' },
        ], 'lane', 'state');
        expect(s.rows).toEqual(['A', '1']);
        expect(s.series).toEqual(['Run', '2']);
        expect(s.minutes).toEqual([[0, 0], [0, 2]]);
    });

    it('returns an empty summary for non-array input', () => {
        for (const bad of [null, undefined, 'abc', 5, {}, { $columns: [] }]) {
            expect(summariseDurations(bad, 'lane', 'state')).toMatchObject({ rows: [], series: [], minutes: [], totalMinutes: 0 });
        }
    });

    it('is safe for labels that are Object.prototype member names', () => {
        const s = summariseDurations([ev('constructor', '__proto__', 0, 1), ev('toString', 'constructor', 0, 2)], 'lane', 'state');
        expect(s.rows).toEqual(['constructor', 'toString']);
        expect(s.series).toEqual(['__proto__', 'constructor']);
        expect(s.minutes).toEqual([[1, 0], [0, 2]]);
    });

    it('records the first per-record colour of each series', () => {
        const s = summariseDurations([
            ev('A', 'Run', 0, 1), ev('A', 'Run', 1, 2, { color: '#123' }), ev('A', 'Run', 2, 3, { color: '#456' }),
            ev('A', 'Idle', 3, 4, { color: 7 }),
        ], 'lane', 'state', 'color');
        expect(Array.from(s.recordColors)).toEqual([['Run', '#123']]);
    });

    it('is linear enough for large inputs', () => {
        const events = [];
        for (let i = 0; i < 100000; i++) events.push(ev(`L${i % 50}`, `S${i % 7}`, i, i + 1));
        const started = Date.now();
        const s = summariseDurations(events, 'lane', 'state');
        expect(Date.now() - started).toBeLessThan(1500);
        expect(s.totalMinutes).toBe(100000);
    });
});
