/**
 * Structural equality for JSON-like values (the shape of Perspective props).
 * Used to tell a prop that really changed from a fresh copy of the same
 * value, which Perspective produces whenever any prop of a component changes.
 *
 * The comparison is exact: there is no sampling of large arrays. A sampled
 * comparison would have to guess when the samples agree, and either guess is
 * worse than the cost it saves: "equal" leaves a stale chart on screen when
 * an unsampled point changed, and "changed" makes ECharts re-process the
 * whole option, which costs far more than comparing it. Instead the common
 * large shapes take short paths: the same reference is never read, rows of
 * primitives are compared in a tight loop, typed arrays element by element,
 * and the walk stops at the first difference.
 */
export function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
        // NaN is the only value that is not identical to itself.
        return a !== a && b !== b;
    }

    if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            const x = a[i];
            const y = b[i];
            if (x === y) continue;
            // Primitives that are not identical differ, except NaN; only objects need a deeper look.
            if (typeof x !== 'object' || x === null) {
                if (x !== x && y !== y) continue;
                return false;
            }
            if (!deepEqual(x, y)) return false;
        }
        return true;
    }
    if (Array.isArray(b)) return false;

    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    if (a instanceof Date) return a.getTime() === b.getTime();
    if (ArrayBuffer.isView(a)) return equalViews(a as any, b as any);

    // for...in avoids allocating a key array per object, which dominates for
    // a million small data items. Props are plain JSON, so there are no
    // inherited enumerable keys to tell apart.
    for (const key in a) {
        const x = a[key];
        const y = b[key];
        if (x === y) {
            // An absent key and a key holding undefined are different objects.
            if (x === undefined && !(key in b)) return false;
            continue;
        }
        if (typeof x !== 'object' || x === null) {
            if (x !== x && y !== y) continue;
            return false;
        }
        if (!deepEqual(x, y)) return false;
    }
    // Every key of a is in b with an equal value; b must not have more.
    for (const key in b) {
        if (!(key in a)) return false;
    }
    return true;
}

/** Typed arrays of the same type (the caller has compared prototypes). */
function equalViews(a: ArrayLike<number>, b: ArrayLike<number>): boolean {
    if (a.length === undefined || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i] && (a[i] === a[i] || b[i] === b[i])) return false;
    }
    return true;
}
