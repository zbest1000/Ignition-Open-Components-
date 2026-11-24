/**
 * Structural equality for JSON-like values (the shape of Perspective props).
 * Used to tell a prop that really changed from a fresh copy of the same
 * value, which Perspective produces whenever any prop of a component changes.
 */
export function deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
        // NaN is the only value that is not identical to itself.
        return a !== a && b !== b;
    }

    const aIsArray = Array.isArray(a);
    if (aIsArray !== Array.isArray(b)) return false;

    if (aIsArray) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }

    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    if (a instanceof Date) return a.getTime() === b.getTime();
    if (ArrayBuffer.isView(a)) return false;

    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(b, key) || !deepEqual(a[key], b[key])) return false;
    }
    return true;
}
