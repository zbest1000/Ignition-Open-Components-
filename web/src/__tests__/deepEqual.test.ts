import { deepEqual } from '../utils/deepEqual';

describe('deepEqual', () => {
    it.each([
        [1, 1], ['a', 'a'], [null, null], [undefined, undefined], [NaN, NaN],
        [[1, [2, { a: 3 }]], [1, [2, { a: 3 }]]],
        [{ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 }],
        [new Date(5), new Date(5)],
        [new Float64Array([1, 2]), new Float64Array([1, 2])], [[[1, 2], [3, NaN]], [[1, 2], [3, NaN]]],
    ])('%j equals %j', (a, b) => {
        expect(deepEqual(a, b)).toBe(true);
    });

    it.each([
        [1, 2], [1, '1'], [null, undefined], [null, {}], [{}, []], [[1, 2], [1, 2, 3]], [[1, 2], [2, 1]],
        [{ a: 1 }, { a: 1, b: undefined }], [{ a: 1 }, { b: 1 }], [{ a: { b: 1 } }, { a: { b: 2 } }],
        [new Date(5), new Date(6)], [new Date(5), {}],
        [new Float32Array([1]), new Float32Array([2])], [new Float32Array([1]), new Float64Array([1])],
        [new Float32Array([1]), [1]], [[1, [2, 3]], [1, [2, 4]]], [[[1, 'a']], [[1, 'b']]],
    ])('%j differs from %j', (a, b) => {
        expect(deepEqual(a, b)).toBe(false);
    });

    it('does not read the contents of a value that is the same reference on both sides', () => {
        let reads = 0;
        const rows = Array.from({ length: 100 }, (_, i) => new Proxy([i, i], {
            get(target, prop, receiver) { reads++; return Reflect.get(target, prop, receiver); },
        }));
        // Fresh outer arrays around the same rows, as when only part of an option is rebuilt.
        expect(deepEqual({ data: [...rows] }, { data: [...rows] })).toBe(true);
        expect(reads).toBe(0);
    });

    it('stops at the first difference', () => {
        let reads = 0;
        const counted = (values: number[]) => new Proxy(values, {
            get(target, prop, receiver) { reads++; return Reflect.get(target, prop, receiver); },
        });
        const a = [[0, 0], ...Array.from({ length: 100 }, () => counted([1, 1]))];
        const b = [[0, 9], ...Array.from({ length: 100 }, () => counted([1, 1]))];
        expect(deepEqual(a, b)).toBe(false);
        expect(reads).toBe(0);
    });
});
