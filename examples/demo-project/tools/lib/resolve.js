'use strict';
/**
 * Turns a view.json into a tree with every binding replaced by its value, the way a session
 * would see it at one instant. Used by preview.js (to draw) and validate.js (to check that every
 * binding can be evaluated and that Open ECharts props are valid once the data is in).
 *
 * Supported: property and expr bindings, map / expression / format transforms, and runScript()
 * calls into the project library (executed with python3). Anything else resolves to null and is
 * reported in `problems`, so a view that uses it is flagged instead of silently drawn wrong.
 */
const lib = require('./project');
const expr = require('./expr');

const clone = value => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

/** "props.option.series[0].data" -> ['props', 'option', 'series', 0, 'data'] */
function splitPath(path) {
    const out = [];
    for (const part of path.split('.')) {
        const m = /^([^[\]]*)((\[\d+\])*)$/.exec(part);
        if (!m) throw new Error(`cannot read property path ${path}`);
        if (m[1] !== '') out.push(m[1]);
        for (const index of m[2].match(/\d+/g) || []) out.push(Number(index));
    }
    return out;
}

function getPath(root, path) {
    let at = root;
    for (const key of splitPath(path)) {
        if (at === null || at === undefined) return undefined;
        at = at[key];
    }
    return at;
}

function setPath(root, path, value) {
    const keys = splitPath(path);
    let at = root;
    keys.forEach((key, i) => {
        if (i === keys.length - 1) { at[key] = value; return; }
        if (at[key] === null || typeof at[key] !== 'object') at[key] = typeof keys[i + 1] === 'number' ? [] : {};
        at = at[key];
    });
}

class Resolver {
    /** context: { session: {custom, props}, page: {props}, nowMs } */
    constructor(context) {
        this.session = context.session;
        this.page = context.page;
        this.nowMs = context.nowMs === undefined ? lib.DEFAULT_NOW_MS : context.nowMs;
        this.problems = [];
        this.scriptCache = new Map();
        this.scriptCalls = [];
    }

    runScript(fn, args) {
        const key = JSON.stringify([fn, args]);
        if (!this.scriptCache.has(key)) {
            const [result] = lib.runPython([{ fn, args }], this.nowMs);
            this.scriptCalls.push({ fn, args, ok: result.ok, error: result.error });
            if (!result.ok) this.problems.push(`runScript("${fn}") failed: ${result.error}`);
            this.scriptCache.set(key, result.ok ? result.value : null);
        }
        return clone(this.scriptCache.get(key));
    }

    /** One instance of a view: returns { viewPath, view: {params, custom, props}, root } with bindings applied. */
    instantiate(viewPath, params) {
        const doc = clone(lib.readView(viewPath));
        const view = { params: Object.assign({}, doc.params, params || {}), custom: doc.custom || {}, props: doc.props || {} };
        const where = `${viewPath}`;
        const scopeFor = (node, parent) => ({
            nowMs: this.nowMs,
            runScript: (fn, args) => this.runScript(fn, args),
            ref: path => this.ref(path, view, node, parent, where),
        });
        // view-level bindings may read each other: two passes settle one level of dependency
        for (let pass = 0; pass < 2; pass++) {
            for (const [key, config] of Object.entries(doc.propConfig || {})) {
                if (config.binding) setPath(view, key, this.binding(config.binding, scopeFor(null, null), `${where} ${key}`, pass === 1));
            }
        }
        const walk = (node, parent, trail) => {
            const here = `${where} /${trail}`;
            for (const [key, config] of Object.entries(node.propConfig || {})) {
                if (config.binding) setPath(node, key, this.binding(config.binding, scopeFor(node, parent), `${here} ${key}`, true));
            }
            (node.children || []).forEach(child => walk(child, node, `${trail}/${child.meta && child.meta.name}`));
        };
        walk(doc.root, null, 'root');
        return { viewPath, view, root: doc.root };
    }

    ref(path, view, node, parent, where) {
        const [head, ...rest] = path.split('.');
        const tail = rest.join('.');
        const sources = { view, session: this.session, page: this.page, this: node, parent };
        if (!(head in sources) || sources[head] === null) {
            this.problems.push(`${where}: reference {${path}} is outside what the tools can resolve (view. session. page. this. parent.)`);
            return null;
        }
        const value = getPath(sources[head], tail);
        if (value === undefined) {
            this.problems.push(`${where}: {${path}} does not exist`);
            return null;
        }
        return value;
    }

    binding(binding, scope, where, report) {
        const problem = message => { if (report) this.problems.push(`${where}: ${message}`); };
        let value = null;
        try {
            if (binding.type === 'property') value = scope.ref(binding.config.path);
            else if (binding.type === 'expr') value = expr.evaluate(expr.parse(binding.config.expression), scope);
            else problem(`"${binding.type}" bindings cannot be evaluated by the tools (shown as null)`);
            if (value && value.date !== undefined && Object.keys(value).length === 1) value = value.date;
            for (const transform of binding.transforms || []) value = this.transform(transform, value, scope, problem);
        } catch (error) {
            problem(error.message);
            return null;
        }
        return value;
    }

    transform(transform, value, scope, problem) {
        switch (transform.type) {
            case 'expression':
                return expr.evaluate(expr.parse(transform.expression), Object.assign({}, scope, { ref: path => (path === 'value' ? value : scope.ref(path)) }));
            case 'map': {
                for (const mapping of transform.mappings || []) {
                    const input = mapping.input;
                    if (transform.inputType === 'range' ? value >= input.min && value < input.max : input === value) return mapping.output;
                }
                return transform.fallback;
            }
            case 'format':
                if (transform.formatType === 'datetime') return expr.dateFormat(value, transform.formatValue);
                return expr.evaluate({ k: 'call', name: 'numberFormat', args: [{ k: 'lit', v: value }, { k: 'lit', v: transform.formatValue }] }, scope);
            default:
                problem(`"${transform.type}" transforms cannot be evaluated by the tools: put the logic in the project library instead`);
                return value;
        }
    }
}

module.exports = { Resolver, getPath, setPath, splitPath, clone };
