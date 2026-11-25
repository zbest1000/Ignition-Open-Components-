#!/usr/bin/env node
'use strict';
/**
 * Checks the project in project/ against the on-disk format recorded in FORMAT-NOTES.md and
 * against this project's own conventions. Nothing here needs Ignition.
 *
 *   node examples/demo-project/tools/validate.js            every check
 *   node examples/demo-project/tools/validate.js --quiet    only problems and the summary
 *
 * What is checked (each line of the output names the check it belongs to):
 *   project    project.json keys and types
 *   resource   every resource.json: keys, scope, version, listed files exist, nothing unlisted,
 *              no data file in a folder without a manifest (the gateway would ignore it)
 *   script     library names, the "module with child modules" trap, python3 compiles it, it stays in
 *              the Jython 2.7 / Python 3 common subset (syntax scan + integer-division run)
 *   style      style.json shape; no style class nested inside another style class
 *   pages      page URLs, page and dock views exist, dock fields
 *   session    session-props shape
 *   view       structure, component types (built-ins the previewer imitates, or ids of the module
 *              manifest), sibling names, positions, bindings and expressions inside the supported
 *              subset, style classes exist, embedded views and navigation targets exist
 *   data       every binding resolves for every line (the Python library is run), and every
 *              Open ECharts component's props, with the data in, validate against its prop schema
 *   build      project/ matches what tools/build.js generates
 *   package    dist/OpenEChartsDemo.zip holds exactly the files of project/
 *
 * Exit code 1 if there is any error. Warnings do not fail.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const lib = require('./lib/project');
const expr = require('./lib/expr');
const { Resolver, getPath } = require('./lib/resolve');

const quiet = process.argv.includes('--quiet');
const errors = [];
const warnings = [];
const passed = [];
const error = (check, message) => errors.push(`${check.padEnd(8)} ${message}`);
const warn = (check, message) => warnings.push(`${check.padEnd(8)} ${message}`);
const ok = (check, message) => passed.push(`${check.padEnd(8)} ${message}`);

const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const rel = file => path.relative(lib.DEMO, file).split(path.sep).join('/');

/** Built-in components the project may use: exactly the ones tools/preview.js imitates. */
const BUILT_IN = {
    'ia.container.flex': { container: true },
    'ia.display.label': {},
    'ia.display.icon': {},
    'ia.display.view': {},
    'ia.input.dropdown': {},
    'ia.display.markdown': {},
};
const FLEX_POSITION = new Set(['grow', 'shrink', 'basis', 'align', 'display']);
const BINDING_TYPES = new Set(['tag', 'query', 'expr', 'expr-struct', 'property', 'tag-history', 'http']); // registered by Perspective
const PREVIEWABLE_BINDINGS = new Set(['property', 'expr']);
const TRANSFORM_TYPES = new Set(['script', 'map', 'expression', 'format']);
const PREVIEWABLE_TRANSFORMS = new Set(['map', 'expression', 'format']);
const VIEW_KEYS = new Set(['custom', 'params', 'props', 'propConfig', 'root', 'events', 'permissions']);
const COMPONENT_KEYS = new Set(['type', 'version', 'meta', 'position', 'props', 'custom', 'propConfig', 'events', 'scripts', 'children']);
const DOCK_KEYS = ['anchor', 'autoBreakpoint', 'content', 'handle', 'iconUrl', 'id', 'modal', 'resizable', 'show', 'size', 'viewParams', 'viewPath'];
const LINES = ['L1', 'L2', 'L3'];

// ---- project.json -----------------------------------------------------------------------

function checkProject() {
    const file = path.join(lib.PROJECT, 'project.json');
    if (!fs.existsSync(file)) return error('project', 'project/project.json is missing');
    const doc = lib.readJson(file);
    const want = { title: 'string', description: 'string', parent: 'string', enabled: 'boolean', inheritable: 'boolean' };
    let good = true;
    for (const [key, type] of Object.entries(want)) {
        if (typeof doc[key] !== type) { error('project', `project.json: "${key}" must be a ${type}`); good = false; }
    }
    for (const key of Object.keys(doc)) if (!(key in want)) { error('project', `project.json: unexpected key "${key}"`); good = false; }
    if (good) ok('project', `project.json: "${doc.title}"`);
}

// ---- resources --------------------------------------------------------------------------

/** { dir (relative to project/), manifest } for every resource. Reports structural problems. */
function checkResources() {
    const files = lib.walk(lib.PROJECT);
    const dirs = new Map(); // dir -> file names directly inside
    for (const file of files) {
        const dir = path.posix.dirname(file);
        if (!dirs.has(dir)) dirs.set(dir, []);
        dirs.get(dir).push(path.posix.basename(file));
    }
    const found = [];
    for (const [dir, names] of dirs) {
        if (dir === '.') {
            for (const name of names) if (name !== 'project.json') error('resource', `${name}: only project.json belongs in the project root`);
            continue;
        }
        const parts = dir.split('/');
        if (parts.length < 2) { error('resource', `${dir}: files must be inside <moduleId>/<typeId>/...`); continue; }
        if (!names.includes('resource.json')) {
            error('resource', `${dir}: has ${names.join(', ')} but no resource.json, so the gateway does not load it`);
            continue;
        }
        let manifest;
        try { manifest = lib.readJson(path.join(lib.PROJECT, dir, 'resource.json')); } catch (e) { error('resource', `${dir}/resource.json: ${e.message}`); continue; }
        const where = `${dir}/resource.json`;
        const isScript = dir.startsWith('ignition/script-python/');
        if (manifest.scope !== (isScript ? 'A' : 'G')) error('resource', `${where}: scope must be "${isScript ? 'A' : 'G'}" (got ${JSON.stringify(manifest.scope)})`);
        if (manifest.version !== 1) error('resource', `${where}: version must be 1`);
        if (typeof manifest.restricted !== 'boolean' || typeof manifest.overridable !== 'boolean') error('resource', `${where}: restricted and overridable must be booleans`);
        if (!isObject(manifest.attributes)) error('resource', `${where}: attributes must be an object`);
        else if ('lastModificationSignature' in manifest.attributes) error('resource', `${where}: must not carry a lastModificationSignature (the gateway computes it; a stale one marks the resource as externally modified)`);
        if (!Array.isArray(manifest.files) || !manifest.files.length) { error('resource', `${where}: files must be a non-empty list`); continue; }
        for (const listed of manifest.files) if (!names.includes(listed)) error('resource', `${where}: lists ${listed}, which does not exist`);
        for (const name of names) if (name !== 'resource.json' && !manifest.files.includes(name)) error('resource', `${dir}/${name}: not listed in resource.json "files", so the gateway ignores it`);
        const raw = fs.readFileSync(path.join(lib.PROJECT, dir, 'resource.json'), 'utf8');
        if (raw.endsWith('\n')) warn('resource', `${where}: ends with a newline (the gateway writes none)`);
        found.push({ dir, manifest, names });
    }
    const expected = { 'com.inductiveautomation.perspective/page-config': 'config.json', 'com.inductiveautomation.perspective/session-props': 'props.json' };
    for (const [dir, file] of Object.entries(expected)) {
        const res = found.find(r => r.dir === dir);
        if (!res) error('resource', `${dir} is missing`);
        else if (res.manifest.files.join() !== file) error('resource', `${dir}/resource.json: files must be ["${file}"]`);
    }
    for (const res of found) {
        const type = res.dir.split('/').slice(0, 2).join('/');
        const main = { 'com.inductiveautomation.perspective/views': 'view.json', 'com.inductiveautomation.perspective/style-classes': 'style.json', 'ignition/script-python': 'code.py' }[type];
        if (main && !res.manifest.files.includes(main)) error('resource', `${res.dir}/resource.json: a ${type.split('/')[1]} resource must list ${main}`);
        if (!main && !(res.dir in expected)) warn('resource', `${res.dir}: resource type not covered by this validator`);
    }
    ok('resource', `${found.length} resources, every manifest lists exactly the files beside it`);
    return found;
}

// ---- script library ---------------------------------------------------------------------

function checkScripts(resources, pageFunctions) {
    const modules = resources.filter(r => r.dir.startsWith('ignition/script-python/')).map(r => r.dir.slice('ignition/script-python/'.length));
    for (const mod of modules) {
        for (const part of mod.split('/')) if (!/^[_a-zA-Z]\w*$/.test(part)) error('script', `${mod}: "${part}" is not a valid module name ([_a-zA-Z]\\w*)`);
        const parent = modules.find(other => other !== mod && mod.startsWith(`${other}/`));
        if (parent) error('script', `${mod}: unreachable, because its parent folder ${parent} has its own code.py (a module hides its child modules)`);
        if (!Number.isInteger(resources.find(r => r.dir.endsWith(mod)).manifest.attributes.hintScope)) warn('script', `${mod}/resource.json: attributes.hintScope (integer) is normally present`);
        const file = path.join(lib.SCRIPTS, mod, 'code.py');
        const dotted = mod.split('/').join('.');
        const compile = spawnSync('python3', ['-c', 'import sys; compile(open(sys.argv[1]).read(), sys.argv[1], "exec")', file], { encoding: 'utf8' });
        if (compile.status !== 0) { error('script', `${dotted}: does not compile:\n${compile.stderr.trim().split('\n').slice(-3).join('\n')}`); continue; }
        const mine = pageFunctions.filter(fn => fn.startsWith(`${dotted}.`));
        const compat = spawnSync('python3', [path.join(__dirname, 'lib', 'py_compat.py'), file, '--run', lib.SCRIPTS, ...mine], { encoding: 'utf8' });
        if (compat.status !== 0) {
            const lines = (compat.stdout.trim() || compat.stderr.trim().split('\n').slice(-2).join(' ')).split('\n');
            for (const line of lines) error('script', `${rel(file)}:${line}`);
        } else {
            ok('script', `${dotted}: compiles, stays in the Jython 2.7 / Python 3 subset, no integer division in ${mine.length} bound function(s)`);
        }
    }
    return modules.map(m => m.split('/').join('.'));
}

// ---- style classes ----------------------------------------------------------------------

function checkStyles(resources) {
    const prefix = 'com.inductiveautomation.perspective/style-classes/';
    const names = resources.filter(r => r.dir.startsWith(prefix)).map(r => r.dir.slice(prefix.length));
    for (const name of names) {
        const nested = names.find(other => other !== name && other.startsWith(`${name}/`));
        if (nested) error('style', `${name}: is a style class and also the folder of ${nested}; keep classes as leaves`);
        if (!/^[A-Za-z0-9_/-]+$/.test(name)) error('style', `${name}: use only letters, digits, _ - and / in style class paths`);
        const file = path.join(lib.STYLE_CLASSES, name, 'style.json');
        if (!fs.existsSync(file)) continue;
        const doc = lib.readJson(file);
        if (!isObject(doc.base) || !isObject(doc.base.style)) error('style', `${name}: style.json needs base.style`);
        for (const key of Object.keys(doc)) if (!['base', 'variants'].includes(key)) error('style', `${name}: unexpected key "${key}" (base, variants)`);
        for (const variant of doc.variants || []) {
            if (!isObject(variant.style) || !(variant.pseudo || variant.mediaQuery)) error('style', `${name}: a variant needs style and pseudo or mediaQuery`);
        }
    }
    ok('style', `${names.length} style classes`);
    return new Set(names);
}

// ---- pages and session ------------------------------------------------------------------

function checkPages(views) {
    const config = lib.pageConfig();
    if (!isObject(config.pages) || !isObject(config.sharedDocks)) { error('pages', 'config.json needs "pages" and "sharedDocks" objects'); return config; }
    const checkDocks = (docks, where) => {
        for (const [side, list] of Object.entries(docks || {})) {
            if (side === 'cornerPriority') { if (!['top-bottom', 'left-right'].includes(list)) error('pages', `${where}: cornerPriority ${JSON.stringify(list)}`); continue; }
            if (!['top', 'left', 'right', 'bottom'].includes(side)) { error('pages', `${where}: unknown dock side "${side}"`); continue; }
            for (const dock of list) {
                for (const key of DOCK_KEYS) if (!(key in dock)) error('pages', `${where} ${side} dock "${dock.id}": missing "${key}"`);
                if (!views.has(dock.viewPath)) error('pages', `${where} ${side} dock "${dock.id}": view ${dock.viewPath} does not exist`);
                if (!['visible', 'onDemand', 'hidden'].includes(dock.show)) error('pages', `${where} ${side} dock "${dock.id}": show ${JSON.stringify(dock.show)}`);
            }
        }
    };
    for (const [url, page] of Object.entries(config.pages)) {
        if (!url.startsWith('/')) error('pages', `page "${url}": URLs start with /`);
        if (!views.has(page.viewPath)) error('pages', `page ${url}: view ${page.viewPath} does not exist`);
        checkDocks(page.docks, `page ${url}`);
    }
    if (!config.pages['/']) error('pages', 'there is no "/" page');
    checkDocks(config.sharedDocks, 'sharedDocks');
    ok('pages', `${Object.keys(config.pages).length} pages: ${Object.keys(config.pages).join('  ')}`);
    return config;
}

function checkSession() {
    const doc = lib.sessionProps();
    for (const key of ['custom', 'propConfig', 'props']) if (!isObject(doc[key])) error('session', `props.json: "${key}" must be an object`);
    for (const key of Object.keys(doc.propConfig || {})) {
        if (!/^(custom|props)\./.test(key)) error('session', `props.json propConfig "${key}": keys start with custom. or props.`);
        else if (key.startsWith('custom.') && getPath(doc, key) === undefined) error('session', `props.json propConfig "${key}": no such custom property`);
    }
    ok('session', `session custom properties: ${Object.keys(doc.custom || {}).join(', ') || '(none)'}`);
    return doc;
}

// ---- views ------------------------------------------------------------------------------

function checkBinding(binding, where, refs, scripts) {
    if (!isObject(binding) || !isObject(binding.config)) return error('view', `${where}: a binding needs type and config`);
    if (!BINDING_TYPES.has(binding.type)) return error('view', `${where}: "${binding.type}" is not a Perspective binding type (${[...BINDING_TYPES].join(', ')})`);
    if (!PREVIEWABLE_BINDINGS.has(binding.type)) warn('view', `${where}: a ${binding.type} binding cannot be previewed or validated; the project is meant to run without tags or a database`);
    if (binding.type === 'property') {
        if (typeof binding.config.path !== 'string') error('view', `${where}: property binding without config.path`);
        else refs.push(binding.config.path);
    }
    const parseInto = (source, label) => {
        try {
            const found = expr.inspect(expr.parse(source));
            refs.push(...found.refs.filter(r => r !== 'value'));
            for (const call of found.scripts) {
                if (call.args[0].k !== 'lit' || typeof call.args[0].v !== 'string') error('view', `${where}: runScript() needs a literal function path`);
                else scripts.push(call.args[0].v);
                if (call.args.length < 2 || call.args[1].k !== 'lit' || typeof call.args[1].v !== 'number') error('view', `${where}: runScript() needs a literal poll rate in ms as its second argument (0 = no polling)`);
            }
        } catch (e) { error('view', `${where}: ${label} ${JSON.stringify(source)}: ${e.message}`); }
    };
    if (binding.type === 'expr') {
        if (typeof binding.config.expression !== 'string') error('view', `${where}: expr binding without config.expression`);
        else parseInto(binding.config.expression, 'expression');
    }
    for (const transform of binding.transforms || []) {
        if (!TRANSFORM_TYPES.has(transform.type)) error('view', `${where}: unknown transform type "${transform.type}"`);
        else if (!PREVIEWABLE_TRANSFORMS.has(transform.type)) error('view', `${where}: script transforms are not used in this project (they cannot be previewed or tested): put the logic in the project library`);
        if (transform.type === 'expression') parseInto(transform.expression, 'transform expression');
    }
}

function checkViews(viewPaths, styles, pages, session, manifest, libraryModules) {
    const views = new Map();
    for (const viewPath of viewPaths) {
        try { views.set(viewPath, lib.readView(viewPath)); } catch (e) { error('view', `${viewPath}: ${e.message}`); }
    }
    const pageFunctions = new Set();
    const used = { types: new Set(), styles: new Set() };
    for (const [viewPath, doc] of views) {
        const raw = fs.readFileSync(path.join(lib.VIEWS, viewPath, 'view.json'), 'utf8');
        if (raw !== lib.gson(doc)) warn('view', `${viewPath}: not in the Designer's form (sorted keys, 2 spaces, HTML-safe escapes, no final newline)`);
        for (const key of Object.keys(doc)) if (!VIEW_KEYS.has(key)) error('view', `${viewPath}: unexpected top-level key "${key}"`);
        for (const key of ['custom', 'params', 'props', 'root']) if (!isObject(doc[key])) error('view', `${viewPath}: "${key}" must be an object`);
        if (!isObject(doc.root)) continue;
        const size = doc.props && doc.props.defaultSize;
        if (!size || !(size.width > 0) || !(size.height > 0)) error('view', `${viewPath}: props.defaultSize {width, height} is required`);
        if (!BUILT_IN[doc.root.type] || !BUILT_IN[doc.root.type].container) error('view', `${viewPath}: the root must be a container (${doc.root.type})`);
        if (!doc.root.meta || doc.root.meta.name !== 'root') error('view', `${viewPath}: the root component is named "root"`);

        const refs = [];
        const scripts = [];
        for (const [key, config] of Object.entries(doc.propConfig || {})) {
            const where = `${viewPath} ${key}`;
            if (!/^(custom|params|props)\./.test(key)) error('view', `${where}: view propConfig keys start with custom. params. or props.`);
            if (config.paramDirection && !['input', 'output', 'inout'].includes(config.paramDirection)) error('view', `${where}: paramDirection ${config.paramDirection}`);
            if (config.binding) checkBinding(config.binding, where, refs, scripts);
        }
        for (const fn of scripts) {
            pageFunctions.add(fn);
            if (!libraryModules.some(mod => fn.startsWith(`${mod}.`))) error('view', `${viewPath}: runScript("${fn}") is not a function of the project library (${libraryModules.join(', ')})`);
        }

        const walk = (node, parent, trail) => {
            const where = `${viewPath} ${trail}`;
            if (!isObject(node)) return error('view', `${where}: a component must be an object`);
            for (const key of Object.keys(node)) if (!COMPONENT_KEYS.has(key)) error('view', `${where}: unexpected key "${key}"`);
            if (typeof node.type !== 'string') return error('view', `${where}: missing type`);
            const builtIn = BUILT_IN[node.type];
            const chart = manifest[node.type];
            used.types.add(node.type);
            if (!builtIn && !chart) {
                error('view', `${where}: component type ${node.type} is neither an Open ECharts component nor one of the built-ins this project uses (${Object.keys(BUILT_IN).join(', ')})`);
            }
            if (!node.meta || typeof node.meta.name !== 'string' || !node.meta.name) error('view', `${where}: missing meta.name`);
            else if (/[/.]/.test(node.meta.name)) error('view', `${where}: "/" and "." are not allowed in a component name`);
            if (parent) {
                if (parent.type === 'ia.container.flex') {
                    for (const key of Object.keys(node.position || {})) if (!FLEX_POSITION.has(key)) error('view', `${where}: position.${key} is not a flex child property (${[...FLEX_POSITION].join(', ')})`);
                    if (!node.position) warn('view', `${where}: no position; give every flex child grow / shrink / basis`);
                }
            } else if (node.position && Object.keys(node.position).length) warn('view', `${where}: the root needs no position`);
            if (node.children && !(builtIn && builtIn.container)) error('view', `${where}: only containers have children`);
            if (chart && node.props) {
                const schema = lib.readJson(path.join(lib.RESOURCES, chart.schema));
                for (const key of Object.keys(node.props)) if (!(key in schema.properties)) error('view', `${where}: ${node.type} has no prop "${key}"`);
                if (chart.id.startsWith('open.industrial.') && isObject(node.props.option) && Object.keys(node.props.option).length) {
                    error('view', `${where}: a non-empty "option" replaces the whole chart of an industrial component; remove it`);
                }
            }
            for (const name of String((node.props && node.props.style && node.props.style.classes) || '').split(/\s+/).filter(Boolean)) {
                used.styles.add(name);
                if (!styles.has(name)) error('view', `${where}: style class ${name} does not exist`);
            }
            const mine = [];
            for (const [key, config] of Object.entries(node.propConfig || {})) {
                if (!/^(props|meta|position|custom)\./.test(key)) error('view', `${where}: propConfig key "${key}" must start with props. meta. position. or custom.`);
                if (config.binding) checkBinding(config.binding, `${where} ${key}`, mine, scripts);
                if (chart && key.startsWith('props.')) {
                    const schema = lib.readJson(path.join(lib.RESOURCES, chart.schema));
                    const top = key.split('.')[1].replace(/\[.*$/, '');
                    if (!(top in schema.properties)) error('view', `${where}: binding on ${key}, but ${node.type} has no prop "${top}"`);
                }
            }
            refs.push(...mine);
            if (node.type === 'ia.display.view') {
                const target = node.props && node.props.path;
                const boundPath = node.propConfig && node.propConfig['props.path'];
                if (!boundPath) {
                    if (!views.has(target)) error('view', `${where}: embedded view ${JSON.stringify(target)} does not exist`);
                    else for (const param of Object.keys((node.props && node.props.params) || {})) {
                        if (!(param in (views.get(target).params || {}))) error('view', `${where}: view ${target} has no param "${param}"`);
                    }
                }
            }
            for (const [group, handlers] of Object.entries(node.events || {})) {
                if (!['dom', 'component', 'system'].includes(group)) error('view', `${where}: unknown event group "${group}"`);
                for (const [name, value] of Object.entries(handlers)) {
                    for (const action of Array.isArray(value) ? value : [value]) {
                        const at = `${where} events.${group}.${name}`;
                        if (!isObject(action) || typeof action.type !== 'string' || !isObject(action.config)) { error('view', `${at}: an action needs type, scope and config`); continue; }
                        if (action.scope !== (action.type === 'script' ? 'G' : 'C')) error('view', `${at}: a ${action.type} action has scope "${action.type === 'script' ? 'G' : 'C'}"`);
                        if (action.type === 'script') warn('view', `${at}: script actions cannot be checked here; prefer nav / popup / dock actions`);
                        if (action.type === 'nav' && action.config.page !== undefined && !pages.pages[action.config.page]) error('view', `${at}: navigates to ${action.config.page}, which is not a page`);
                        if (action.type === 'nav' && action.config.view !== undefined && !views.has(action.config.view)) error('view', `${at}: navigates to view ${action.config.view}, which does not exist`);
                    }
                }
            }
            const seen = new Set();
            (node.children || []).forEach((child, index) => {
                const name = child && child.meta && child.meta.name;
                if (seen.has(name)) error('view', `${where}: two children are named "${name}"`);
                seen.add(name);
                walk(child, node, `${trail}/${name || index}`);
            });
        };
        walk(doc.root, null, '/root');

        for (const ref of new Set(refs)) {
            const [head, ...rest] = ref.split('.');
            const at = `${viewPath}: reference ${ref}`;
            if (!['view', 'session', 'page', 'this', 'parent'].includes(head)) { error('view', `${at}: starts with something other than view. session. page. this. parent.`); continue; }
            if (head === 'session' && getPath(session, rest.join('.')) === undefined) error('view', `${at}: no such session property (session-props/props.json)`);
            if (head === 'view' && ['custom', 'params', 'props'].includes(rest[0]) && !(rest[1] in (doc[rest[0]] || {}))) error('view', `${at}: the view has no ${rest[0]}.${rest[1]}`);
            if (head === 'page' && !['props.path', 'props.title', 'props.pageId', 'props.primaryView'].includes(rest.join('.')) && !rest.join('.').startsWith('props.dimensions')) warn('view', `${at}: page property not known to this validator`);
        }
    }
    for (const name of styles) if (!used.styles.has(name) && ![...views.values()].some(doc => JSON.stringify(doc).includes(name))) warn('style', `${name}: not used by any view`);
    ok('view', `${views.size} views, component types used: ${[...used.types].sort().join(', ')}`);
    return { views, pageFunctions: [...pageFunctions] };
}

// ---- data: resolve every binding and validate chart props -------------------------------

/** The part of JSON Schema the prop schemas use: type, enum, properties, additionalProperties: false, items, required, minimum, maximum. */
function schemaProblems(schema, value, at, out) {
    if (!isObject(schema) || schema.$ref) return out;
    if (schema.type !== undefined) {
        const types = Array.isArray(schema.type) ? schema.type : [schema.type];
        const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
        const matches = types.some(t => t === actual || (t === 'integer' && Number.isInteger(value)) || (t === 'number' && actual === 'number' && Number.isFinite(value)));
        if (!matches) { out.push(`${at}: expected ${types.join(' | ')}, got ${actual === 'number' ? value : actual}`); return out; }
    }
    if (schema.enum && !schema.enum.includes(value)) out.push(`${at}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
    if (typeof value === 'number') {
        if (schema.minimum !== undefined && value < schema.minimum) out.push(`${at}: ${value} < minimum ${schema.minimum}`);
        if (schema.maximum !== undefined && value > schema.maximum) out.push(`${at}: ${value} > maximum ${schema.maximum}`);
    }
    if (Array.isArray(value) && schema.items) value.slice(0, 2000).forEach((item, i) => schemaProblems(schema.items, item, `${at}[${i}]`, out));
    if (isObject(value) && schema.properties) {
        for (const key of schema.required || []) if (!(key in value)) out.push(`${at}: missing "${key}"`);
        for (const [key, child] of Object.entries(value)) {
            if (schema.properties[key]) schemaProblems(schema.properties[key], child, `${at}.${key}`, out);
            else if (schema.additionalProperties === false) out.push(`${at}: unknown property "${key}"`);
        }
    }
    return out;
}

function checkData(views, pages, session, manifest) {
    let charts = 0;
    let bindings = 0;
    const urlOf = new Map(Object.entries(pages.pages).map(([url, page]) => [page.viewPath, url]));
    for (const line of LINES) {
        const resolver = new Resolver({
            session: { custom: Object.assign({}, session.custom, { line }), props: session.props || {} },
            page: { props: { path: '/' } },
        });
        for (const viewPath of views.keys()) {
            resolver.page.props.path = urlOf.get(viewPath) || '/';
            let instance;
            try { instance = resolver.instantiate(viewPath, {}); } catch (e) { error('data', `${viewPath}: ${e.message}`); continue; }
            const walk = (node, trail) => {
                bindings += Object.values(node.propConfig || {}).filter(c => c.binding).length;
                const entry = manifest[node.type];
                if (entry) {
                    charts++;
                    const schema = lib.readJson(path.join(lib.RESOURCES, entry.schema));
                    const props = Object.assign({}, node.props);
                    delete props.style; // Perspective's own style schema ($ref)
                    for (const problem of schemaProblems(schema, props, 'props', []).slice(0, 8)) error('data', `${viewPath} ${trail} [${line}] ${node.type}: ${problem}`);
                    for (const [key, config] of Object.entries(node.propConfig || {})) {
                        if (config.binding && key.startsWith('props.') && getPath(node, key) === null) {
                            const propSchema = schema.properties[key.split('.')[1]] || {};
                            const types = [].concat(propSchema.type || []);
                            if (types.length && !types.includes('null')) error('data', `${viewPath} ${trail} [${line}]: ${key} resolved to null, which ${node.type} does not accept`);
                        }
                    }
                }
                (node.children || []).forEach(child => walk(child, `${trail}/${child.meta && child.meta.name}`));
            };
            walk(instance.root, '/root');
        }
        for (const problem of new Set(resolver.problems)) error('data', `[${line}] ${problem}`);
        for (const call of resolver.scriptCalls) if (call.ok) ok('data', `[${line}] ${call.fn}(${call.args.map(a => JSON.stringify(a)).join(', ')}) ran`);
    }
    ok('data', `${bindings / LINES.length} bindings resolved for each of ${LINES.join(', ')}; ${charts / LINES.length} Open ECharts components validated against their prop schemas`);
}

// ---- run --------------------------------------------------------------------------------

function main() {
    checkProject();
    const resources = checkResources();
    const styles = checkStyles(resources);
    const viewPaths = lib.viewPaths();
    const pages = checkPages(new Set(viewPaths));
    const session = checkSession();
    const manifest = lib.componentManifest();
    const libraryModules = resources.filter(r => r.dir.startsWith('ignition/script-python/')).map(r => r.dir.slice('ignition/script-python/'.length).split('/').join('.'));
    const { views, pageFunctions } = checkViews(viewPaths, styles, pages, session, manifest, libraryModules);
    checkScripts(resources, pageFunctions);
    if (!errors.some(e => e.startsWith('view') || e.startsWith('script'))) checkData(views, pages, session, manifest);
    else warn('data', 'skipped: fix the view and script errors first');

    const build = spawnSync(process.execPath, [path.join(__dirname, 'build.js'), '--check'], { encoding: 'utf8' });
    if (build.status === 0) ok('build', build.stdout.trim());
    else for (const line of build.stdout.trim().split('\n')) error('build', line);

    const diff = require('./package').difference();
    if (diff) error('package', `dist/OpenEChartsDemo.zip is stale (${diff}). Run: node examples/demo-project/tools/package.js`);
    else ok('package', 'dist/OpenEChartsDemo.zip holds exactly project/');

    for (const dir of [lib.PROJECT, path.join(lib.DEMO, 'tools')]) {
        for (const file of lib.walk(dir)) if (file.includes('__pycache__') || file.endsWith('.pyc')) error('resource', `${rel(path.join(dir, file))}: Python cache file; delete it`);
    }

    if (!quiet) for (const line of passed) console.log(`ok    ${line}`);
    for (const line of warnings) console.log(`warn  ${line}`);
    for (const line of errors) console.log(`ERROR ${line}`);
    console.log(`\nvalidate: ${errors.length} error(s), ${warnings.length} warning(s), ${passed.length} check(s) passed`);
    process.exit(errors.length ? 1 : 0);
}

main();
