/**
 * Sanitises ECharts option objects before they reach the chart instance.
 *
 * Primary goal: strip JavaScript function values (tooltip formatters, label
 * callbacks, etc.) to prevent arbitrary code execution in the Perspective
 * session context.  Also caps deeply-nested or circular structures.
 */

const MAX_DEPTH = 20;
const MAX_ARRAY_ITEMS = 5000;
const MAX_STRING_LENGTH = 50_000;

/**
 * Deep-clone an option object, stripping any function-type values and
 * capping sizes.  Returns a JSON-safe copy.
 */
export function sanitizeOption(option: any): any {
    return cloneAndStrip(option, 0, new WeakSet());
}

function cloneAndStrip(value: any, depth: number, seen: WeakSet<object>): any {
    if (depth > MAX_DEPTH) return undefined;
    if (value === null || value === undefined) return value;

    const t = typeof value;

    if (t === 'function') return undefined;

    if (t === 'string') {
        return value.length > MAX_STRING_LENGTH
            ? value.slice(0, MAX_STRING_LENGTH)
            : value;
    }

    if (t === 'number' || t === 'boolean') return value;

    if (Array.isArray(value)) {
        const capped = value.length > MAX_ARRAY_ITEMS
            ? value.slice(0, MAX_ARRAY_ITEMS)
            : value;
        return capped.map((item: any) => cloneAndStrip(item, depth + 1, seen));
    }

    if (t === 'object') {
        if (seen.has(value)) return undefined;
        seen.add(value);

        const out: Record<string, any> = {};
        for (const key of Object.keys(value)) {
            const v = cloneAndStrip(value[key], depth + 1, seen);
            if (v !== undefined) {
                out[key] = v;
            }
        }
        return out;
    }

    return undefined;
}

/**
 * Serialise ECharts event params into a plain, JSON-safe object suitable
 * for Perspective component events.  Strips DOM references, functions,
 * and circular refs.
 */
export function serializeEventParams(params: any): Record<string, any> {
    if (!params || typeof params !== 'object') return {};

    const safe: Record<string, any> = {};

    const allowedKeys = [
        'componentType', 'seriesType', 'seriesIndex', 'seriesName',
        'name', 'dataIndex', 'data', 'dataType', 'value',
        'color', 'percent', 'event'
    ];

    for (const key of allowedKeys) {
        if (key in params) {
            const val = params[key];
            if (key === 'event') {
                continue;
            }
            safe[key] = cloneAndStrip(val, 0, new WeakSet());
        }
    }

    return safe;
}
