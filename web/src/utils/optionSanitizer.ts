/**
 * Makes an ECharts option safe to hand to `setOption` when parts of it may
 * come from an untrusted source (a tag, a database row, a user-edited prop).
 *
 * ECharts treats almost every option value as data, but a few accept raw
 * HTML, CSS or URLs (see the ECharts security guidelines). Those are the only
 * values changed here:
 *
 *  - `tooltip.formatter` / `tooltip.content` strings at any level (global,
 *    axis, series, data item, mark point, ...) and the data view's `title` /
 *    `lang` are HTML: they are sanitised with DOMPurify.
 *  - `tooltip.extraCssText` is raw CSS: it is dropped if it could load an
 *    external resource.
 *  - `link` / `sublink` (title, treemap and sunburst nodes) are opened as
 *    URLs: anything other than http, https or a relative URL is dropped.
 *  - Colour strings end up in the tooltip's markup and inline style, where
 *    ECharts does not escape all of them: a colour containing markup or CSS
 *    syntax is dropped.
 *  - Function values are dropped. JSON props cannot contain them, so this
 *    only guards against an option assembled in code.
 *
 * The walk is copy-on-write: the input is never mutated, and an option that
 * needs no change is returned as the very same object, so large data arrays
 * are scanned but not copied. Nothing is truncated. Only a true cycle (an
 * object that contains itself) is cut, which ECharts could not render anyway.
 */
import createDOMPurify from 'dompurify';

type Plain = Record<string, any>;

const TEMPLATE_PLACEHOLDER = /\{[a-e]\d*\}/i;
/** Attributes whose value is fetched or navigated to. */
const URL_ATTRIBUTES = new Set([
    'href', 'src', 'srcset', 'action', 'formaction', 'poster', 'background', 'cite', 'longdesc', 'usemap',
    'xlink:href',
]);

let purifier: ReturnType<typeof createDOMPurify> | null = null;

function getPurifier(): ReturnType<typeof createDOMPurify> {
    if (!purifier) {
        // A private instance, so the hook below cannot affect other users of DOMPurify on the page.
        purifier = createDOMPurify(window);
        purifier.addHook('uponSanitizeAttribute', (_node, data) => {
            const name = data.attrName.toLowerCase();
            if (name === 'style') {
                if (!isSafeCss(data.attrValue)) data.keepAttr = false;
            } else if (URL_ATTRIBUTES.has(name) && TEMPLATE_PLACEHOLDER.test(data.attrValue)) {
                // ECharts substitutes data values into {a}/{b}/{c} after this
                // runs, so a URL built from a placeholder cannot be vetted.
                data.keepAttr = false;
            }
        });
    }
    return purifier;
}

const PURIFY_CONFIG = {
    USE_PROFILES: { html: true },
    // Tooltips are for presentation: no embedded stylesheets and nothing that collects input.
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'select', 'option', 'textarea', 'dialog'],
};

const HTML_CACHE_LIMIT = 500;
const htmlCache = new Map<string, string>();

/** Sanitises an HTML fragment. Text without markup is returned unchanged. */
export function sanitizeHtml(html: string): string {
    // Without '<' the string cannot open a tag, so there is nothing to remove.
    if (html.indexOf('<') === -1) return html;

    const cached = htmlCache.get(html);
    if (cached !== undefined) return cached;

    const clean = getPurifier().sanitize(html, PURIFY_CONFIG);
    if (htmlCache.size >= HTML_CACHE_LIMIT) htmlCache.clear();
    htmlCache.set(html, clean);
    return clean;
}

/** Sanitises an SVG document, e.g. a map supplied as SVG, keeping only drawing content. */
export function sanitizeSvg(svg: string): string {
    return getPurifier().sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
}

/**
 * True when a CSS declaration list cannot fetch anything or run script.
 * Deliberately strict: escapes and comments can hide a function name, so any
 * use of them fails the check rather than being decoded.
 */
export function isSafeCss(css: string): boolean {
    if (css.indexOf('\\') !== -1 || css.indexOf('/*') !== -1 || css.indexOf('@') !== -1) return false;
    return !/(?:url|image-set|image|src|expression|element|paint|attr)\s*\(|behavior\s*:|-moz-binding/i.test(css);
}

/** True for http, https and relative URLs. */
export function isSafeUrl(url: string): boolean {
    try {
        // The base only matters for relative URLs; its scheme is what they inherit.
        const protocol = new URL(url, 'https://relative.invalid/').protocol;
        return protocol === 'http:' || protocol === 'https:';
    } catch {
        return false;
    }
}

/** True for a string that is plausibly a CSS colour: no markup, no further declarations, nothing fetched. */
export function isSafeColor(color: string): boolean {
    return !/[<>";]/.test(color) && isSafeCss(color);
}

/** Marks a value that has to be removed from its parent. */
const DROP = Symbol('drop');

/** Where ECharts opens `link` / `sublink` as a URL: on a title and on treemap / sunburst nodes. */
const LINK_HOLDERS = new Set(['title', 'data', 'children']);
const COLOR_KEYS = new Set(['color', 'borderColor', 'backgroundColor', 'shadowColor']);

function cleanString(key: string, value: string, parentKey: string): string | typeof DROP {
    if (COLOR_KEYS.has(key)) {
        return isSafeColor(value) ? value : DROP;
    }
    if ((key === 'link' || key === 'sublink') && LINK_HOLDERS.has(parentKey)) {
        return isSafeUrl(value) ? value : DROP;
    }
    if (parentKey === 'tooltip') {
        if (key === 'formatter' || key === 'content') return sanitizeHtml(value);
        if (key === 'extraCssText') return isSafeCss(value) ? value : DROP;
        // Written into the tooltip arrow's style attribute as given.
        if (key === 'borderWidth') return /^[\d.]+$/.test(value) ? value : DROP;
    }
    if (parentKey === 'dataView' && key === 'title') return sanitizeHtml(value);
    return value;
}

/**
 * @param key        the property name `value` is stored under (the enclosing property's name for array items)
 * @param parentKey  the property name of the object that holds `value`
 * @param ancestors  the objects currently being walked, for cycle detection
 */
function clean(value: any, key: string, parentKey: string, ancestors: Set<object>): any {
    const type = typeof value;

    if (type === 'string') return cleanString(key, value, parentKey);
    if (type === 'function') return DROP;
    if (type !== 'object' || value === null) return value;
    // Typed arrays hold numbers only.
    if (ArrayBuffer.isView(value)) return value;
    if (ancestors.has(value)) return DROP;

    ancestors.add(value);
    const result = Array.isArray(value)
        ? cleanArray(value, key, parentKey, ancestors)
        : cleanObject(value, key, ancestors);
    ancestors.delete(value);
    return result;
}

function cleanArray(source: any[], key: string, parentKey: string, ancestors: Set<object>): any[] {
    let copy: any[] | null = null;
    const isLang = key === 'lang' && parentKey === 'dataView';
    // A colour palette; every other array of strings (categories, names) is plain text to ECharts.
    const isPalette = COLOR_KEYS.has(key);

    for (let i = 0; i < source.length; i++) {
        const item = source[i];
        const type = typeof item;
        let cleaned: any;

        if (type === 'number' || type === 'boolean' || item == null) {
            continue;
        } else if (type === 'string') {
            if (isLang) cleaned = sanitizeHtml(item);
            else if (isPalette) cleaned = isSafeColor(item) ? item : DROP;
            else continue;
        } else {
            // Items of an array stand in the place of the array itself, so
            // `tooltip: [{...}]` and `title: [{...}]` are treated like the single form.
            cleaned = clean(item, key, parentKey, ancestors);
        }

        if (cleaned !== item) {
            if (!copy) copy = source.slice();
            // Removing an item would shift the indices ECharts reports in events.
            copy[i] = cleaned === DROP ? undefined : cleaned;
        }
    }
    return copy || source;
}

function cleanObject(source: Plain, key: string, ancestors: Set<object>): Plain {
    let copy: Plain | null = null;

    for (const prop in source) {
        if (!Object.prototype.hasOwnProperty.call(source, prop)) continue;
        const item = source[prop];
        const cleaned = clean(item, prop, key, ancestors);

        if (cleaned !== item) {
            if (!copy) copy = { ...source };
            if (cleaned === DROP) delete copy[prop];
            else copy[prop] = cleaned;
        }
    }
    return copy || source;
}

/**
 * Returns a safe version of `option`; the same object if it was already safe.
 */
export function sanitizeOption<T>(option: T): T {
    const result = clean(option, '', '', new Set());
    return result === DROP ? (undefined as unknown as T) : result;
}
