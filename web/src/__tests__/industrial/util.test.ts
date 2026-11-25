import {
    asArray, asBoolean, colorLookup, formatDayNumber, toDayNumber, toEpochMs, toLabel, toNumber, weekdayOf,
} from '../../industrial/util';

describe('industrial/util', () => {
    it('toNumber accepts finite numbers and numeric strings only', () => {
        expect(toNumber(1.5)).toBe(1.5);
        expect(toNumber(' 42 ')).toBe(42);
        for (const bad of [NaN, Infinity, '', ' ', 'abc', null, undefined, true, {}, [], [1]]) {
            expect(toNumber(bad)).toBeNaN();
        }
    });

    it('toEpochMs accepts epoch numbers, numeric strings, Dates and zoned ISO strings', () => {
        expect(toEpochMs(1700000000000)).toBe(1700000000000);
        expect(toEpochMs('1700000000000')).toBe(1700000000000);
        expect(toEpochMs(new Date(5))).toBe(5);
        expect(toEpochMs('2023-11-14T22:13:20Z')).toBe(1700000000000);
        for (const bad of [null, undefined, 'soon', {}, [], true]) {
            expect(toEpochMs(bad)).toBeNaN();
        }
    });

    it('toLabel / asArray / asBoolean coerce conservatively', () => {
        expect(toLabel('A')).toBe('A');
        expect(toLabel(3)).toBe('3');
        expect(toLabel('')).toBeNull();
        expect(toLabel(null)).toBeNull();
        expect(toLabel({})).toBeNull();
        expect(asArray('abc')).toEqual([]);
        expect(asArray({ length: 2 })).toEqual([]);
        expect(asBoolean('false', true)).toBe(false);
        expect(asBoolean(0, true)).toBe(true);
    });

    it('colorLookup ignores prototype members and non-string colours', () => {
        const colors = colorLookup([['Run', '#111']], { Idle: '#222', Bad: 5, Run: '#333' });
        expect(colors.get('Run')).toBe('#333');
        expect(colors.get('Idle')).toBe('#222');
        expect(colors.get('Bad')).toBeUndefined();
        expect(colors.get('constructor')).toBeUndefined();
        expect(colorLookup([], 'nope').size).toBe(0);
    });

    it('toDayNumber reads the calendar date as written', () => {
        expect(toDayNumber('1970-01-01')).toBe(0);
        expect(toDayNumber('1970-01-02T23:59:59-11:00')).toBe(1);
        expect(toDayNumber('2025-01-06')).toBe(20094);
        expect(formatDayNumber(20094)).toBe('2025-01-06');
        expect(weekdayOf(20094)).toBe(1); // a Monday
        expect(weekdayOf(-1)).toBe(3);    // 1969-12-31, a Wednesday
        expect(toDayNumber(86400000 * 3 + 5)).toBe(3);
        for (const bad of ['2025-02-30', '2025-13-01', 'Jan 5 2025', '', null, undefined, {}, NaN, '20250106']) {
            expect(toDayNumber(bad)).toBeNaN();
        }
    });
});
