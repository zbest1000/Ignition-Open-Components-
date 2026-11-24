import { deepEqual } from '../utils/deepEqual';

describe('deepEqual', () => {
    it.each([
        [1, 1], ['a', 'a'], [null, null], [undefined, undefined], [NaN, NaN],
        [[1, [2, { a: 3 }]], [1, [2, { a: 3 }]]],
        [{ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 }],
        [new Date(5), new Date(5)],
    ])('%j equals %j', (a, b) => {
        expect(deepEqual(a, b)).toBe(true);
    });

    it.each([
        [1, 2], [1, '1'], [null, undefined], [null, {}], [{}, []], [[1, 2], [1, 2, 3]], [[1, 2], [2, 1]],
        [{ a: 1 }, { a: 1, b: undefined }], [{ a: 1 }, { b: 1 }], [{ a: { b: 1 } }, { a: { b: 2 } }],
        [new Date(5), new Date(6)], [new Date(5), {}],
        [new Float32Array([1]), new Float32Array([1])],
    ])('%j differs from %j', (a, b) => {
        expect(deepEqual(a, b)).toBe(false);
    });

    it('treats the same reference as equal without walking it', () => {
        const big = new Float32Array(10);
        expect(deepEqual(big, big)).toBe(true);
    });
});
