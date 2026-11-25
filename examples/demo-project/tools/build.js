#!/usr/bin/env node
'use strict';
/**
 * Writes the Ignition project in project/ from the sources in tools/:
 *   tools/design.js     -> style classes
 *   tools/pages/*.js    -> views, page configuration
 *   (session props and project.json are defined below)
 * plus a resource.json beside every resource. Files are only rewritten when their content changes,
 * and the output is byte-for-byte reproducible.
 *
 *   node examples/demo-project/tools/build.js           write
 *   node examples/demo-project/tools/build.js --check   exit 1 if project/ is out of date (writes nothing)
 *
 * The code.py files under project/ignition/script-python are hand-written and are not touched (only their manifests are).
 */
const fs = require('fs');
const path = require('path');
const lib = require('./lib/project');
const design = require('./design');
const { PAGES, views } = require('./pages');

const check = process.argv.includes('--check');
const outputs = new Map(); // relative path -> text

const put = (rel, text) => outputs.set(rel, text);
const P = lib.PERSPECTIVE;

put('project.json', JSON.stringify({
    title: 'Open ECharts Demo — Meridian Bottling Plant',
    description: 'Showcase of the Open ECharts Perspective components on simulated plant data. Needs no tags and no database.',
    parent: '',
    enabled: true,
    inheritable: false,
}, null, 2));

// Session properties: the selected line is the one piece of shared state.
put(`${P}/session-props/props.json`, lib.gson({
    custom: { line: 'L1' },
    propConfig: { 'custom.line': { persistent: true } },
    props: { theme: 'dark' },
}));
put(`${P}/session-props/resource.json`, lib.manifest('G', ['props.json']));

// Pages and docks.
const dock = (id, viewPath, size) => ({
    anchor: 'fixed', autoBreakpoint: 480, content: 'push', handle: 'hide', iconUrl: '', id, modal: false,
    resizable: false, show: 'visible', size, viewParams: {}, viewPath,
});
const pages = {};
for (const page of PAGES) pages[page.url] = { title: page.title, viewPath: page.view };
put(`${P}/page-config/config.json`, lib.gson({
    pages,
    sharedDocks: {
        cornerPriority: 'top-bottom',
        left: [dock('nav', 'Shell/NavRail', design.layout.railWidth)],
        top: [dock('header', 'Shell/Header', design.layout.headerHeight)],
    },
}));
put(`${P}/page-config/resource.json`, lib.manifest('G', ['config.json']));

for (const [name, body] of Object.entries(design.CLASSES)) {
    put(`${P}/style-classes/Demo/${name}/style.json`, lib.gson(body));
    put(`${P}/style-classes/Demo/${name}/resource.json`, lib.manifest('G', ['style.json']));
}

for (const [viewPath, doc] of Object.entries(views)) {
    put(`${P}/views/${viewPath}/view.json`, lib.gson(doc));
    put(`${P}/views/${viewPath}/resource.json`, lib.manifest('G', ['view.json']));
}

// Script library: code.py is the source; only the manifest is generated.
for (const rel of lib.walk(lib.SCRIPTS).filter(f => f.endsWith('/code.py'))) {
    put(`ignition/script-python/${rel.replace(/code\.py$/, 'resource.json')}`, lib.manifest('A', ['code.py'], { hintScope: 2 }));
}

// Generated resources that are no longer produced (a renamed view, a removed style class).
const generatedRoots = [`${P}/views`, `${P}/style-classes`, `${P}/page-config`, `${P}/session-props`];
const stale = [];
for (const root of generatedRoots) {
    const dir = path.join(lib.PROJECT, root);
    if (!fs.existsSync(dir)) continue;
    for (const rel of lib.walk(dir)) if (!outputs.has(`${root}/${rel}`)) stale.push(`${root}/${rel}`);
}

let changed = 0;
for (const [rel, text] of outputs) {
    const file = path.join(lib.PROJECT, rel);
    const same = fs.existsSync(file) && fs.readFileSync(file, 'utf8') === text;
    if (same) continue;
    changed++;
    if (check) console.log(`out of date: project/${rel}`);
    else lib.writeIfChanged(file, text);
}
for (const rel of stale) {
    changed++;
    if (check) console.log(`stale: project/${rel}`);
    else {
        fs.unlinkSync(path.join(lib.PROJECT, rel));
        let dir = path.dirname(path.join(lib.PROJECT, rel));
        while (dir.startsWith(lib.P) && fs.readdirSync(dir).length === 0) { fs.rmdirSync(dir); dir = path.dirname(dir); }
    }
}

if (check) {
    console.log(changed ? `${changed} file(s) differ from the sources. Run: node examples/demo-project/tools/build.js` : `project/ is up to date (${outputs.size} generated files)`);
    process.exit(changed ? 1 : 0);
}
console.log(`build: ${outputs.size} generated files, ${changed} written or removed`);
