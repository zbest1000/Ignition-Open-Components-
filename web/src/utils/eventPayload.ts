/**
 * Maps ECharts events to Perspective component events and reduces their
 * params to the documented, JSON-safe payload for each event.
 *
 * Payloads travel to the gateway on every event, so two parts that can grow
 * with the data are bounded:
 *
 *  - Mouse events: `data` is the clicked data item without its `children`.
 *    For a tree, treemap or sunburst node that would be the whole subtree.
 *  - onBrushSelected: in each `batch[].selected[]` entry, `dataIndex` holds
 *    at most the first MAX_SELECTED_INDICES (1000) selected indices and
 *    `dataIndexCount` holds how many are selected in total. When
 *    `dataIndexCount` is greater than `dataIndex.length` the list was cut.
 */

/** The most selected data indices sent per series in an onBrushSelected payload. */
export const MAX_SELECTED_INDICES = 1000;

/** ECharts event name -> Perspective component event name. */
export const CHART_EVENTS = {
    click:               'onClick',
    dblclick:            'onDoubleClick',
    mouseover:           'onMouseOver',
    mouseout:            'onMouseOut',
    legendselectchanged: 'onLegendSelectChanged',
    datazoom:            'onDataZoom',
    brushselected:       'onBrushSelected',
} as const;

export type ChartEventName = keyof typeof CHART_EVENTS;

const MOUSE_FIELDS = [
    'componentType', 'seriesType', 'seriesIndex', 'seriesName',
    'name', 'dataIndex', 'data', 'dataType', 'value', 'color', 'percent',
];
const DATA_ZOOM_FIELDS = ['start', 'end', 'startValue', 'endValue', 'dataZoomId'];
const BRUSH_FIELDS = ['brushId', 'brushIndex', 'brushName', 'areas', 'selected'];

/** Typed as strings in the event schemas, so they are left out rather than sent as null. */
const STRING_FIELDS = new Set(['seriesName', 'name', 'dataType', 'brushName', 'dataZoomId']);

interface PayloadShape {
    fields: string[];
    /** Fields allowed on each entry of `batch`, when the event has one. */
    batchFields?: string[];
}

/** The payload fields of each event. These match the event schemas on the Java side. */
const PAYLOADS: Record<ChartEventName, PayloadShape> = {
    click:               { fields: MOUSE_FIELDS },
    dblclick:            { fields: MOUSE_FIELDS },
    mouseover:           { fields: MOUSE_FIELDS },
    mouseout:            { fields: MOUSE_FIELDS },
    legendselectchanged: { fields: ['name', 'selected'] },
    datazoom:            { fields: DATA_ZOOM_FIELDS, batchFields: DATA_ZOOM_FIELDS },
    brushselected:       { fields: [], batchFields: BRUSH_FIELDS },
};

/**
 * Copies a value into plain JSON-compatible data. Functions, DOM nodes,
 * undefined values and cyclic references are left out.
 */
function toPlain(value: any, ancestors: Set<object>): any {
    const type = typeof value;
    if (value === null || type === 'string' || type === 'boolean') return value;
    if (type === 'number') return Number.isFinite(value) ? value : null;
    if (type !== 'object') return undefined;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    if (typeof value.nodeType === 'number' || ancestors.has(value)) return undefined;

    ancestors.add(value);
    let result: any;
    if (Array.isArray(value) || ArrayBuffer.isView(value)) {
        result = Array.from(value as ArrayLike<any>, item => {
            const plain = toPlain(item, ancestors);
            return plain === undefined ? null : plain;
        });
    } else {
        result = {};
        for (const key of Object.keys(value)) {
            const plain = toPlain(value[key], ancestors);
            if (plain !== undefined) result[key] = plain;
        }
    }
    ancestors.delete(value);
    return result;
}

function pick(source: any, fields: string[]): Record<string, any> {
    const out: Record<string, any> = {};
    if (!source || typeof source !== 'object') return out;
    for (const field of fields) {
        const plain = toPlain(source[field], new Set());
        if (plain === undefined || (plain === null && STRING_FIELDS.has(field))) continue;
        out[field] = plain;
    }
    return out;
}

/** One `selected` entry of a brush: the indices are capped before they are copied. */
function boundSelected(entry: any): any {
    if (!entry || typeof entry !== 'object' || !entry.dataIndex || typeof entry.dataIndex.length !== 'number') return entry;
    const all: ArrayLike<number> = entry.dataIndex;
    return {
        ...entry,
        dataIndex: all.length > MAX_SELECTED_INDICES ? Array.prototype.slice.call(all, 0, MAX_SELECTED_INDICES) : all,
        dataIndexCount: all.length,
    };
}

/** Bounds the parts of the raw params that grow with the data, without touching the originals. */
function bound(event: ChartEventName, source: any): any {
    if (event === 'brushselected') {
        return Array.isArray(source.selected) ? { ...source, selected: source.selected.map(boundSelected) } : source;
    }
    const data = source.data;
    if (data && typeof data === 'object' && !Array.isArray(data) && 'children' in data) {
        const own = { ...data };
        delete own.children;
        return { ...source, data: own };
    }
    return source;
}

/** Builds the Perspective event payload for an ECharts event. */
export function serializeEventParams(event: ChartEventName, params: any): Record<string, any> {
    const shape = PAYLOADS[event];
    if (!shape || !params || typeof params !== 'object') return {};

    const payload = pick(event === 'brushselected' ? params : bound(event, params), shape.fields);
    if (shape.batchFields && Array.isArray(params.batch)) {
        const batchFields = shape.batchFields;
        payload.batch = params.batch.map((entry: any) =>
            pick(entry && typeof entry === 'object' ? bound(event, entry) : entry, batchFields));
    }
    return payload;
}
