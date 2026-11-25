'use strict';
/**
 * Shared by the tools: where things are, how project files are read and written,
 * and how the project's Python library is executed.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEMO = path.resolve(__dirname, '..', '..');
const REPO = path.resolve(DEMO, '..', '..');
const PROJECT = path.join(DEMO, 'project');
const PERSPECTIVE = 'com.inductiveautomation.perspective';
const P = path.join(PROJECT, PERSPECTIVE);
const VIEWS = path.join(P, 'views');
const STYLE_CLASSES = path.join(P, 'style-classes');
const SCRIPTS = path.join(PROJECT, 'ignition', 'script-python');
const RESOURCES = path.join(REPO, 'common', 'src', 'main', 'resources');

/** Fixed "now" for the tools: Wed 2026-11-18 13:40:00 UTC. Reproducible numbers and screenshots. */
const DEFAULT_NOW_MS = 1795009200000;

/** The manifest timestamp. Fixed, so that building twice gives identical files. */
const RESOURCE_TIMESTAMP = '2026-01-01T00:00:00Z';
const RESOURCE_ACTOR = 'open-echarts-demo';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

/**
 * JSON the way the Designer writes it (Gson, HTML-safe): keys sorted at every level,
 * two-space indent, < > & = ' as \uXXXX escapes, no trailing newline.
 */
function gson(value) {
    const sort = v => {
        if (Array.isArray(v)) return v.map(sort);
        if (v && typeof v === 'object') {
            const out = {};
            for (const key of Object.keys(v).sort()) if (v[key] !== undefined) out[key] = sort(v[key]);
            return out;
        }
        return v;
    };
    return JSON.stringify(sort(value), null, 2).replace(/[<>&='\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}

/** resource.json as the gateway writes it: this key order, no trailing newline. */
function manifest(scope, files, attributes) {
    const body = {
        scope,
        version: 1,
        restricted: false,
        overridable: true,
        files,
        attributes: Object.assign({ lastModification: { actor: RESOURCE_ACTOR, timestamp: RESOURCE_TIMESTAMP } }, attributes || {}),
    };
    return JSON.stringify(body, null, 2);
}

function writeIfChanged(file, text) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text) return false;
    fs.writeFileSync(file, text);
    return true;
}

/** Every file below dir, as paths relative to it with forward slashes, sorted. */
function walk(dir, prefix = '') {
    let out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) out = out.concat(walk(path.join(dir, entry.name), rel));
        else out.push(rel);
    }
    return out;
}

/** Resource directories (those holding a resource.json) below dir, as relative paths. */
function resources(dir) {
    if (!fs.existsSync(dir)) return [];
    return walk(dir).filter(f => f === 'resource.json' || f.endsWith('/resource.json')).map(f => f.replace(/\/?resource\.json$/, ''));
}

const viewPaths = () => resources(VIEWS);
const readView = viewPath => readJson(path.join(VIEWS, viewPath, 'view.json'));

/** style class path -> style.json content */
function styleClasses() {
    const out = {};
    for (const name of resources(STYLE_CLASSES)) {
        const file = path.join(STYLE_CLASSES, name, 'style.json');
        if (fs.existsSync(file)) out[name] = readJson(file);
    }
    return out;
}

const pageConfig = () => readJson(path.join(P, 'page-config', 'config.json'));
const sessionProps = () => readJson(path.join(P, 'session-props', 'props.json'));

/** The module's component manifest: id -> entry. */
function componentManifest() {
    const out = {};
    for (const row of readJson(path.join(RESOURCES, 'components.manifest.json')).components) out[row.id] = row;
    return out;
}

/**
 * Calls functions of the project library with python3 (see run_data.py).
 * calls: [{ fn: 'demo.data.overview', args: ['L1'] }] -> [{ ok, value | error }]
 */
function runPython(calls, nowMs = DEFAULT_NOW_MS) {
    if (!calls.length) return [];
    const result = spawnSync('python3', [path.join(__dirname, 'run_data.py'), SCRIPTS], {
        input: JSON.stringify({ now_ms: nowMs, calls }),
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
    });
    if (result.status !== 0) throw new Error(`python3 failed running the project library:\n${result.stderr || result.error}`);
    return JSON.parse(result.stdout).results;
}

module.exports = {
    DEMO, REPO, PROJECT, PERSPECTIVE, P, VIEWS, STYLE_CLASSES, SCRIPTS, RESOURCES, DEFAULT_NOW_MS,
    readJson, gson, manifest, writeIfChanged, walk, resources, viewPaths, readView, styleClasses,
    pageConfig, sessionProps, componentManifest, runPython,
};
