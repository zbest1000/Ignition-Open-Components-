import { deepEqual } from '../utils/deepEqual';
import { sanitizeSvg } from '../utils/optionSanitizer';
import { echarts } from './echarts';

/**
 * What was last registered under each map name. ECharts keeps maps in one
 * registry for the whole page, so this is shared by all components too.
 */
const registered = new Map<string, { source: unknown; sanitize: boolean }>();

type MapInput = Parameters<typeof echarts.registerMap>[1];

function isObject(value: unknown): value is Record<string, any> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Turns one entry of the `maps` prop into what `echarts.registerMap` takes:
 * a GeoJSON object, `{ geoJSON, specialAreas }` or `{ svg }`. Returns null
 * for anything else.
 */
function toMapInput(source: unknown, sanitize: boolean): MapInput | null {
    if (!isObject(source)) return null;
    if (typeof source.svg === 'string') {
        const svg = sanitize ? sanitizeSvg(source.svg) : source.svg;
        return svg.trim() ? { svg } : null;
    }
    const geoJSON = isObject(source.geoJSON) ? source.geoJSON : source;
    if (!Array.isArray(geoJSON.features)) return null;
    if (!isObject(source.geoJSON)) return geoJSON as MapInput;
    return {
        geoJSON,
        ...(isObject(source.specialAreas) ? { specialAreas: source.specialAreas } : null),
    } as MapInput;
}

/**
 * Registers the entries of a `maps` prop that are new or have changed.
 * Malformed entries are skipped. Returns true if anything was registered, in
 * which case charts using those maps need their option applied again.
 */
export function registerMaps(maps: unknown, sanitize: boolean): boolean {
    if (!isObject(maps)) return false;
    let changed = false;

    for (const name of Object.keys(maps)) {
        const source = maps[name];
        const known = registered.get(name);
        // Perspective hands over a fresh copy of the prop on every change, so compare by value.
        if (known && known.sanitize === sanitize && deepEqual(known.source, source)) continue;
        try {
            const input = toMapInput(source, sanitize);
            if (!input) continue;
            echarts.registerMap(name, input);
            registered.set(name, { source, sanitize });
            changed = true;
        } catch {
            // A map ECharts cannot parse is treated like a missing one.
        }
    }
    return changed;
}
