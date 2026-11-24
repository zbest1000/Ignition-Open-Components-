import type { PropertyTree } from '@inductiveautomation/perspective-client';

/** Minimal stand-in for a Perspective PropertyTree: only `read` is used by the behaviours. */
export function fakeTree(props: Record<string, unknown>, readPaths?: string[]): PropertyTree {
    return {
        read: (path: string, fallback?: unknown) => {
            readPaths?.push(path);
            return Object.prototype.hasOwnProperty.call(props, path) ? props[path] : fallback;
        },
    } as unknown as PropertyTree;
}

/** A tree whose every read throws, as the typed readers do on a type mismatch. */
export function throwingTree(): PropertyTree {
    return {
        read: () => { throw new Error('ComponentPropertyError'); },
    } as unknown as PropertyTree;
}

export type Opt = any;

/**
 * Asserts an option is plain data: no functions, no NaN/Infinity, and no
 * object referenced twice (the option sanitiser drops repeated references).
 */
export function expectPlainOption(option: unknown): void {
    const seen = new Set<object>();
    const walk = (value: unknown, path: string): void => {
        if (typeof value === 'function') throw new Error(`function at ${path}`);
        if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`non-finite number at ${path}`);
        if (typeof value !== 'object' || value === null) return;
        if (seen.has(value)) throw new Error(`shared reference at ${path}`);
        seen.add(value);
        if (Array.isArray(value)) {
            // Large pass-through data arrays are checked by the tests that create them.
            value.slice(0, 2000).forEach((item, i) => walk(item, `${path}[${i}]`));
        } else {
            for (const key of Object.keys(value)) walk((value as Record<string, unknown>)[key], `${path}.${key}`);
        }
    };
    walk(option, 'option');
}
