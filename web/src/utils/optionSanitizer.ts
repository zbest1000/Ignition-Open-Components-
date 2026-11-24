/**
 * Makes an ECharts option safe to hand to `setOption` when parts of it may
 * come from an untrusted source (a tag, a database row, a user-edited prop).
 *
 * ECharts treats almost every option value as data, but some values reach
 * the DOM as markup, CSS or a URL. The rules below are derived from those
 * sinks in ECharts 6 and are keyed on the property name alone, so they hold
 * wherever in the option the property appears (ECharts resolves most of
 * these with inheritance: item -> series -> level -> global):
 *
 *  HTML   The tooltip element's innerHTML. A string under `tooltip`, and
 *         `formatter` / `content` of a `tooltip` object, are HTML: sanitised
 *         with DOMPurify. So are the data view's `title` and `lang`.
 *  CSS    The tooltip element's style.cssText, and the style attribute of
 *         its arrow (which ECharts builds as markup without escaping).
 *         These take colours, font and box properties from tooltip, series,
 *         item and global text style. Every colour-named property, every
 *         font/box property, and any other string inside a `tooltip` object
 *         must be a single CSS value: no `;`, no markup, nothing that
 *         fetches. `extraCssText` may hold several declarations but nothing
 *         that fetches.
 *  URL    `link` / `sublink` are passed to window.open (title, treemap and
 *         sunburst nodes, series and levels): only http, https and relative
 *         URLs are kept.
 *  Code   Function values are dropped. JSON props cannot contain them, so
 *         this only guards against an option assembled in code.
 *
 * Values that fail a rule are removed, not repaired.
 *
 * Not treated as option nodes, and therefore left exactly as given:
 *  - `dataset.source`: its rows and columns are data, whatever they are named.
 *  - Rows that are tuples of values, e.g. `[x, y]` in `series.data`: an array
 *    nested in an array whose first element is not an object. ECharts reads
 *    such a row as values only. This is what keeps the walk cheap for large
 *    data: a million [x, y] pairs cost a million type checks, not a million
 *    recursive walks. The trade-off is that a function hidden inside such a
 *    tuple is not removed; ECharts never calls it.
 *
 * The walk is copy-on-write: the input is never mutated, and an option that
 * needs no change is returned as the very same object. Nothing is truncated.
 * Only a true cycle (an object that contains itself) is cut.
 */
import createDOMPurify from 'dompurify';

type Plain = Record<string, any>;

/** Attributes whose value is fetched or navigated to. */
const URL_ATTRIBUTES = new Set([
    'href', 'src', 'srcset', 'action', 'formaction', 'poster', 'background', 'cite', 'longdesc', 'usemap',
    'xlink:href',
]);

/**
 * A URL that contains a template variable ({a}..{g}, {@dimension}) gets a
 * data value substituted into it after sanitising. That is only acceptable
 * when what precedes the variable already fixes where the URL points:
 * a path on this origin, or an http(s) URL whose host part is complete.
 */
const FIXED_URL_PREFIX = /^(?:https?:\/\/[^/{}\s]+\/|\/(?!\/)|\.{1,2}\/|[?#])/i;

let purifier: ReturnType<typeof createDOMPurify> | null = null;

function getPurifier(): ReturnType<typeof createDOMPurify> {
    if (!purifier) {
        // A private instance, so the hook below cannot affect other users of DOMPurify on the page.
        purifier = createDOMPurify(window);
        purifier.addHook('uponSanitizeAttribute', (_node, data) => {
            const name = data.attrName.toLowerCase();
            if (name === 'style') {
                if (!isSafeCss(data.attrValue)) data.keepAttr = false;
            } else if (URL_ATTRIBUTES.has(name)) {
                const brace = data.attrValue.indexOf('{');
                if (brace !== -1 && !FIXED_URL_PREFIX.test(data.attrValue.slice(0, brace))) data.keepAttr = false;
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

/**
 * True for a string usable as one CSS value: it cannot end the declaration
 * it is placed in, open markup, or fetch anything.
 */
export function isSafeCssValue(value: string, allowQuotes = false): boolean {
    return !(allowQuotes ? /[<>;{}]/ : /[<>;{}"'`]/).test(value) && isSafeCss(value);
}

/** True for a string that is plausibly a CSS colour: a single value, no markup, nothing fetched. */
export function isSafeColor(color: string): boolean {
    return isSafeCssValue(color);
}

/**
 * True for http, https and relative URLs. Follows what a browser does with
 * the string: it ignores tabs and line breaks anywhere and control characters
 * and spaces at the start, so those are removed before looking for a scheme.
 */
export function isSafeUrl(url: string): boolean {
    const compact = url.replace(/[\u0000-\u001f\u007f]/g, '').replace(/^\s+/, '');
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
    if (!scheme) return true;
    const name = scheme[1].toLowerCase();
    return name === 'http' || name === 'https';
}

/**
 * True when the option is a plain option (no timeline or media variants)
 * whose single global tooltip asks for rich text rendering. In that mode
 * formatters are drawn as text, not written to the DOM.
 */
export function declaresRichTextTooltip(option: unknown): boolean {
    if (typeof option !== 'object' || option === null) return false;
    const o = option as Plain;
    if ('baseOption' in o || 'options' in o || 'media' in o) return false;
    const tooltip = o.tooltip;
    return typeof tooltip === 'object' && tooltip !== null && !Array.isArray(tooltip) &&
        tooltip.renderMode === 'richText';
}

export interface SanitizeOptions {
    /**
     * Leave tooltip formatters as written because they are rendered as rich
     * text. Only pass true when the chart instance is known to render its
     * tooltip that way: the mode is fixed when ECharts creates the tooltip,
     * so the option saying `renderMode: 'richText'` is not proof on its own.
     */
    richTextTooltip?: boolean;
}

/** Marks a value that has to be removed from its parent. */
const DROP = Symbol('drop');

/** What a property name means for a string stored under it. */
const enum Kind { None, Tooltip, Link, Color, CssValue, FontFamily, CssText }

/** Properties ECharts writes into a style declaration as given (tooltip box and text style). */
const CSS_VALUE_KEYS = new Set([
    'fontStyle', 'fontWeight', 'fontSize', 'lineHeight', 'align', 'verticalAlign', 'decoration',
    'padding', 'borderRadius', 'borderWidth', 'borderType',
    'shadowBlur', 'shadowOffsetX', 'shadowOffsetY',
    'textShadowBlur', 'textShadowOffsetX', 'textShadowOffsetY', 'transitionDuration',
]);

const kindCache = new Map<string, Kind>();

function kindOf(key: string): Kind {
    let kind = kindCache.get(key);
    if (kind === undefined) {
        if (key === 'tooltip') kind = Kind.Tooltip;
        else if (key === 'link' || key === 'sublink') kind = Kind.Link;
        else if (key === 'fontFamily') kind = Kind.FontFamily;
        else if (key === 'extraCssText') kind = Kind.CssText;
        // color, color0, borderColor0, borderColorDoji, textShadowColor, areaColor, textareaColor, ...
        else if (/color/i.test(key) || key === 'fill' || key === 'stroke') kind = Kind.Color;
        else if (CSS_VALUE_KEYS.has(key)) kind = Kind.CssValue;
        else kind = Kind.None;
        if (kindCache.size > 5000) kindCache.clear();
        kindCache.set(key, kind);
    }
    return kind;
}

/** Strings inside a tooltip object that are not CSS values. */
const TOOLTIP_TEXT_KEYS = new Set(['formatter', 'content', 'className', 'appendTo']);

interface Walk {
    richText: boolean;
    /** The objects currently being walked, for cycle detection. */
    stack: object[];
}

/** Context flags passed down the walk. */
const IN_TOOLTIP = 1;

function cleanString(value: string, key: string, parentKey: string, flags: number, walk: Walk): string | typeof DROP {
    switch (kindOf(key)) {
        case Kind.Tooltip:
            return walk.richText ? value : sanitizeHtml(value);
        case Kind.Link:
            return isSafeUrl(value) ? value : DROP;
        case Kind.Color:
        case Kind.CssValue:
            return isSafeCssValue(value) ? value : DROP;
        case Kind.FontFamily:
            return isSafeCssValue(value, true) ? value : DROP;
        case Kind.CssText:
            return isSafeCss(value) ? value : DROP;
    }
    if (parentKey === 'tooltip' && (key === 'formatter' || key === 'content')) {
        return walk.richText ? value : sanitizeHtml(value);
    }
    if (parentKey === 'dataView' && (key === 'title' || key === 'lang')) return sanitizeHtml(value);
    if ((flags & IN_TOOLTIP) !== 0 && !TOOLTIP_TEXT_KEYS.has(key)) {
        return isSafeCssValue(value) ? value : DROP;
    }
    return value;
}

/** Whether strings stored in an array under this key are subject to a rule. */
function hasStringRule(key: string, parentKey: string, flags: number): boolean {
    return kindOf(key) !== Kind.None || (flags & IN_TOOLTIP) !== 0 || (parentKey === 'dataView' && key === 'lang');
}

/**
 * @param key        the property name `value` is stored under (the enclosing property's name for array items)
 * @param parentKey  the property name of the object that holds `value`
 */
function clean(value: any, key: string, parentKey: string, flags: number, walk: Walk): any {
    const type = typeof value;

    if (type === 'string') return cleanString(value, key, parentKey, flags, walk);
    if (type === 'function') return DROP;
    if (type !== 'object' || value === null) return value;
    // Typed arrays hold numbers only.
    if (ArrayBuffer.isView(value)) return value;
    // Dataset contents are data, not option nodes.
    if (key === 'source' && parentKey === 'dataset') return value;

    const stack = walk.stack;
    if (stack.indexOf(value) !== -1) return DROP;

    stack.push(value);
    const result = Array.isArray(value)
        ? cleanArray(value, key, parentKey, flags, walk)
        : cleanObject(value, key, flags, walk);
    stack.pop();
    return result;
}

function cleanArray(source: any[], key: string, parentKey: string, flags: number, walk: Walk): any[] {
    let copy: any[] | null = null;
    const checkStrings = hasStringRule(key, parentKey, flags);

    for (let i = 0; i < source.length; i++) {
        const item = source[i];
        const type = typeof item;
        let cleaned: any;

        if (type === 'number' || type === 'boolean' || item == null) {
            continue;
        } else if (type === 'string') {
            if (!checkStrings) continue;
            cleaned = cleanString(item, key, parentKey, flags, walk);
        } else if (type === 'object' && Array.isArray(item) && (item.length === 0 || typeof item[0] !== 'object' || item[0] === null)) {
            // A tuple of values such as [x, y]: data, not option nodes. See the note at the top.
            if (!checkStrings) continue;
            cleaned = clean(item, key, parentKey, flags, walk);
        } else {
            // Items of an array stand in the place of the array itself, so
            // `tooltip: [{...}]` and `title: [{...}]` are treated like the single form.
            cleaned = clean(item, key, parentKey, flags, walk);
        }

        if (cleaned !== item) {
            if (!copy) copy = source.slice();
            // Removing an item would shift the indices ECharts reports in events.
            copy[i] = cleaned === DROP ? undefined : cleaned;
        }
    }
    return copy || source;
}

function cleanObject(source: Plain, key: string, flags: number, walk: Walk): Plain {
    let copy: Plain | null = null;
    // Everything inside a tooltip object can end up in the tooltip's style,
    // except its axis pointer, which is drawn on the canvas.
    const childFlags = key === 'tooltip' ? flags | IN_TOOLTIP : key === 'axisPointer' ? flags & ~IN_TOOLTIP : flags;

    const keys = Object.keys(source);
    for (let i = 0; i < keys.length; i++) {
        const prop = keys[i];
        const item = source[prop];
        const type = typeof item;
        if (type === 'number' || type === 'boolean' || item == null) continue;

        const cleaned = clean(item, prop, key, childFlags, walk);
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
export function sanitizeOption<T>(option: T, options: SanitizeOptions = {}): T {
    const result = clean(option, '', '', 0, { richText: options.richTextTooltip === true, stack: [] });
    return result === DROP ? (undefined as unknown as T) : result;
}
