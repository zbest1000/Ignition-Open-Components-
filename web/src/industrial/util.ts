import type { PropertyTree } from '@inductiveautomation/perspective-client';

/**
 * Shared helpers for the industrial chart behaviours.
 *
 * Everything here is defensive: props arrive from bindings, so any value can
 * be null, the wrong type, or half-populated. Helpers never throw on such
 * input; they return an empty/NaN/null result the caller can skip.
 */

export type Row = Record<string, unknown>;

/** Fallback series colour (first colour of the default ECharts palette). */
export const FALLBACK_COLOR = '#5470c6';

const MS_PER_DAY = 86400000;

export function isRecord(value: unknown): value is Row {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The value if it is an array, otherwise an empty array. Never copies. */
export function asArray(value: unknown): readonly unknown[] {
    return Array.isArray(value) ? value : [];
}

/** Finite number from a number or numeric string, otherwise NaN. */
export function toNumber(value: unknown): number {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : NaN;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') return NaN;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : NaN;
    }
    return NaN;
}

/**
 * Epoch milliseconds from a number, numeric string, Date, or date string;
 * NaN when unparsable. Date strings without an explicit zone are parsed by
 * the JS engine in local time, so callers only use differences of these
 * values (durations, offsets), never calendar-day arithmetic.
 */
export function toEpochMs(value: unknown): number {
    const numeric = toNumber(value);
    if (!Number.isNaN(numeric)) return numeric;
    if (value instanceof Date) {
        return value.getTime();
    }
    if (typeof value === 'string' && value.trim() !== '') {
        return Date.parse(value);
    }
    return NaN;
}

/** Category label from a non-empty string or a finite number, otherwise null. */
export function toLabel(value: unknown): string | null {
    if (typeof value === 'string') {
        return value === '' ? null : value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    return null;
}

/** Labels of an array prop; entries that are not usable labels become ''. */
export function toLabels(value: unknown): string[] {
    return asArray(value).map(item => toLabel(item) ?? '');
}

export function asString(value: unknown, fallback: string): string {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return fallback;
}

export function asBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
}

export function asNumber(value: unknown, fallback: number): number {
    const parsed = toNumber(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Builds a colour lookup from built-in defaults plus a user supplied
 * `{ name: colour }` object. A Map is used rather than a plain object so that
 * names such as "constructor" cannot resolve to prototype members.
 */
export function colorLookup(defaults: ReadonlyArray<readonly [string, string]>, overrides: unknown): Map<string, string> {
    const colors = new Map<string, string>(defaults);
    if (isRecord(overrides)) {
        for (const key of Object.keys(overrides)) {
            const color = overrides[key];
            if (typeof color === 'string' && color !== '') {
                colors.set(key, color);
            }
        }
    }
    return colors;
}

/**
 * Reads one prop from the property tree. Only `tree.read` is used: the typed
 * readers (`readString`, `readNumber`, ...) throw when a binding delivers a
 * value of another type. Null/undefined and read failures give the fallback.
 */
export function readProp(tree: PropertyTree, path: string, fallback: unknown): unknown {
    try {
        const value: unknown = tree.read(path, fallback);
        return value === undefined || value === null ? fallback : value;
    } catch {
        return fallback;
    }
}

export function readString(tree: PropertyTree, path: string, fallback: string): string {
    return asString(readProp(tree, path, fallback), fallback);
}

export function readBoolean(tree: PropertyTree, path: string, fallback: boolean): boolean {
    return asBoolean(readProp(tree, path, fallback), fallback);
}

export function readNumber(tree: PropertyTree, path: string, fallback: number): number {
    return asNumber(readProp(tree, path, fallback), fallback);
}

/**
 * Centred "No data" notice, expressed as a title so that it merges cleanly:
 * the entry is always present and only its text changes, so the notice
 * disappears again when data arrives even if the chart merges options.
 * Returns a fresh object on every call (options must not share references).
 */
export function noDataTitle(empty: boolean, text = 'No data'): Row {
    return {
        text: empty ? text : '',
        left: 'center',
        top: 'middle',
        textStyle: { color: '#999999', fontSize: 14, fontWeight: 'normal' },
    };
}

/** Main chart title followed by the "No data" notice. */
export function titles(text: string, empty: boolean, noDataText?: string): Row[] {
    return [{ text, left: 'center' }, noDataTitle(empty, noDataText)];
}

/**
 * Day number (days since 1970-01-01) of a calendar date written as
 * YYYY-MM-DD, optionally followed by a time part which is ignored. The date
 * is taken exactly as written, so the result does not depend on the time
 * zone of the browser. Numbers and Dates are treated as instants and mapped
 * to their UTC day. Returns NaN for anything else or for impossible dates.
 */
export function toDayNumber(value: unknown): number {
    if (typeof value === 'string') {
        const match = /^\s*(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/.exec(value);
        if (!match) return NaN;
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const ms = Date.UTC(year, month - 1, day);
        const check = new Date(ms);
        if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
            return NaN;
        }
        return ms / MS_PER_DAY;
    }
    const ms = value instanceof Date ? value.getTime() : (typeof value === 'number' ? value : NaN);
    return Number.isFinite(ms) ? Math.floor(ms / MS_PER_DAY) : NaN;
}

/** YYYY-MM-DD for a day number from {@link toDayNumber}. */
export function formatDayNumber(dayNumber: number): string {
    return new Date(dayNumber * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Day of week (0 = Sunday .. 6 = Saturday) of a day number. 1970-01-01 was a Thursday. */
export function weekdayOf(dayNumber: number): number {
    return (((dayNumber + 4) % 7) + 7) % 7;
}
