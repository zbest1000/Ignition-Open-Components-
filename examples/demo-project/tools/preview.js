#!/usr/bin/env node
'use strict';
/**
 * Renders a page (or a single view) of the project to a PNG without Ignition.
 *
 * It is an APPROXIMATION of Perspective, for judging layout and looks while no gateway is at
 * hand: the flex container, label, icon, embedded view, dropdown and markdown components are
 * imitated with plain HTML and CSS, style classes are turned into CSS, docks are laid out around
 * the page, and every Open ECharts component is the real one, mounted from the built bundle
 * (web/build/generated-resources/mounted) at the size the layout gives it. Bindings are resolved
 * once, with the project's own Python library, at a fixed time.
 *
 *   node examples/demo-project/tools/preview.js                       the / page at 1920x1080 and 1366x768
 *   node examples/demo-project/tools/preview.js --page /line --size 1920x1080
 *   node examples/demo-project/tools/preview.js --view Shell/NavRail --size 208x1024
 *
 *   --page <url>      page URL from page-config (default /), drawn with the shared docks
 *   --view <path>     a single view instead, without docks
 *   --size <WxH>      viewport; may be given more than once
 *   --line <L1|L2|L3> session.custom.line (default L1)
 *   --now <epoch ms>  the time the data is generated for (default: a fixed instant)
 *   --full            grow the picture to the full scroll height of the page
 *   --out <dir>       output directory (default examples/demo-project/screenshots)
 *   --name <name>     file name stem (default: from the page or view)
 *   --html            also write the generated HTML next to the PNG, for debugging
 *
 * PREVIEW_DEBUG=1 in the environment echoes the browser console.
 *
 * Needs web/node_modules (React) and Playwright with Chromium; it installs nothing.
 * Exit code 1 if a binding could not be resolved or a chart reported an error.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const lib = require('./lib/project');
const { Resolver } = require('./lib/resolve');

const MOUNT_URL = '/res/open-echarts/';
const mountedDir = path.join(lib.REPO, 'web', 'build', 'generated-resources', 'mounted');
const nodeModules = path.join(lib.REPO, 'web', 'node_modules');
const VENDOR = {
    '/vendor/react.js': path.join(nodeModules, 'react', 'umd', 'react.production.min.js'),
    '/vendor/react-dom.js': path.join(nodeModules, 'react-dom', 'umd', 'react-dom.production.min.js'),
};

// ---- arguments --------------------------------------------------------------------------

function parseArgs(argv) {
    const args = { sizes: [], line: 'L1', nowMs: lib.DEFAULT_NOW_MS, out: path.join(lib.DEMO, 'screenshots') };
    for (let i = 0; i < argv.length; i++) {
        const next = () => { if (i + 1 >= argv.length) throw new Error(`${argv[i]} needs a value`); return argv[++i]; };
        switch (argv[i]) {
            case '--page': args.page = next(); break;
            case '--view': args.view = next(); break;
            case '--size': { const m = /^(\d+)x(\d+)$/.exec(next()); if (!m) throw new Error('--size wants WIDTHxHEIGHT'); args.sizes.push([Number(m[1]), Number(m[2])]); break; }
            case '--line': args.line = next(); break;
            case '--now': args.nowMs = Number(next()); break;
            case '--out': args.out = path.resolve(next()); break;
            case '--name': args.name = next(); break;
            case '--full': args.full = true; break;
            case '--html': args.html = true; break;
            default: throw new Error(`unknown argument ${argv[i]} (see the comment at the top of preview.js)`);
        }
    }
    if (!args.view && !args.page) args.page = '/';
    if (!args.sizes.length) args.sizes = args.view ? [[800, 600]] : [[1920, 1080], [1366, 768]];
    return args;
}

// ---- view tree -> HTML ------------------------------------------------------------------

const UNITLESS = new Set(['opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flex', 'flexGrow', 'flexShrink', 'order', 'zoom']);
const kebab = name => name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
const cssValue = (name, value) => (typeof value === 'number' && value !== 0 && !UNITLESS.has(name) ? `${value}px` : String(value));
const cssText = style => Object.entries(style || {}).filter(([k, v]) => k !== 'classes' && v !== null && v !== undefined && v !== '').map(([k, v]) => `${kebab(k)}:${cssValue(k, v)}`).join(';');
const esc = text => String(text === null || text === undefined ? '' : text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** Perspective compiles a style class to the CSS class psc-<path>; here slashes become underscores. */
const cssClass = name => `psc-${name.replace(/[^A-Za-z0-9_-]/g, '_')}`;

function styleSheet(classes) {
    const rules = [];
    for (const [name, body] of Object.entries(classes)) {
        const selector = `.${cssClass(name)}`;
        if (body.base && body.base.style) rules.push(`${selector}{${cssText(body.base.style)}}`);
        for (const variant of body.variants || []) {
            if (variant.pseudo) rules.push(`${selector}:${variant.pseudo}{${cssText(variant.style)}}`);
            else if (variant.mediaQuery) rules.push(`@media (${variant.mediaQuery}){${selector}{${cssText(variant.style)}}}`);
        }
    }
    return rules.join('\n');
}

// A few Material icons, so that the navigation reads as it will; any other icon is a neutral dot.
const ICONS = {
    'material/dashboard': 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
    'material/timeline': 'M23 8c0 1.1-.9 2-2 2-.18 0-.35-.02-.51-.07l-3.56 3.55c.05.16.07.34.07.52 0 1.1-.9 2-2 2s-2-.9-2-2c0-.18.02-.36.07-.52l-2.55-2.55c-.16.05-.34.07-.52.07s-.36-.02-.52-.07l-4.55 4.56c.05.16.07.33.07.51 0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.18 0 .35.02.51.07l4.56-4.55C8.02 9.36 8 9.18 8 9c0-1.1.9-2 2-2s2 .9 2 2c0 .18-.02.36-.07.52l2.55 2.55c.16-.05.34-.07.52-.07s.36.02.52.07l3.55-3.56C19.02 8.35 19 8.18 19 8c0-1.1.9-2 2-2s2 .9 2 2z',
    'material/verified_user': 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z',
    'material/flash_on': 'M7 2v11h3v9l7-12h-4l4-8z',
    'material/event': 'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    'material/apps': 'M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z',
    'material/3d_rotation': 'M7.52 21.48C4.25 19.94 1.91 16.76 1.55 13H.05C.56 19.16 5.71 24 12 24l.66-.03-3.81-3.81-1.33 1.32zm.89-6.52c-.19 0-.37-.03-.52-.08-.16-.06-.29-.13-.4-.24-.11-.1-.2-.22-.26-.37-.06-.14-.09-.3-.09-.47h-1.3c0 .36.07.68.21.95.14.27.33.5.56.69.24.18.51.32.82.41.3.1.62.15.96.15.37 0 .72-.05 1.03-.15.32-.1.6-.25.83-.44s.42-.43.55-.72c.13-.29.2-.61.2-.97 0-.19-.02-.38-.07-.56-.05-.18-.12-.35-.23-.51-.1-.16-.24-.3-.4-.43-.17-.13-.37-.23-.61-.31.2-.09.37-.2.52-.33.15-.13.27-.27.37-.42.1-.15.17-.3.22-.46.05-.16.07-.32.07-.48 0-.36-.06-.68-.18-.96-.12-.28-.29-.51-.51-.69-.2-.19-.47-.33-.77-.43C9.1 8.05 8.76 8 8.39 8c-.36 0-.69.05-1 .16-.3.11-.57.26-.79.45-.21.19-.38.41-.51.67-.12.26-.18.54-.18.85h1.3c0-.17.03-.32.09-.45s.14-.25.25-.34c.11-.09.23-.17.38-.22.15-.05.3-.08.48-.08.4 0 .7.1.89.31.19.2.29.49.29.86 0 .18-.03.34-.08.49-.05.15-.14.27-.25.37-.11.1-.25.18-.41.24-.16.06-.36.09-.58.09H7.5v1.03h.77c.22 0 .42.02.6.07s.33.13.45.23c.12.11.22.24.29.4.07.16.1.35.1.57 0 .41-.12.72-.35.93-.23.23-.55.33-.95.33zm8.55-5.92c-.32-.33-.7-.59-1.14-.77-.43-.18-.92-.27-1.46-.27H12v8h2.3c.55 0 1.06-.09 1.51-.27.45-.18.84-.43 1.16-.76.32-.33.57-.73.74-1.19.17-.47.26-.99.26-1.57v-.4c0-.58-.09-1.1-.26-1.57-.18-.47-.43-.87-.75-1.2zm-.39 3.16c0 .42-.05.79-.14 1.13-.1.33-.24.62-.43.85-.19.23-.43.41-.71.53-.29.12-.62.18-.99.18h-.91V9.12h.97c.72 0 1.27.23 1.64.69.38.46.57 1.12.57 1.99v.4zM12 0l-.66.03 3.81 3.81 1.33-1.33c3.27 1.55 5.61 4.72 5.96 8.48h1.5C23.44 4.84 18.29 0 12 0z',
    'material/bubble_chart': 'M7.2 18a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zm7.6 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm.4-6a4.8 4.8 0 1 0 0-9.6 4.8 4.8 0 0 0 0 9.6z',
};

/** A small part of Markdown: paragraphs, bullet lists, **bold**, `code`. */
function markdownHtml(source) {
    const inline = text => esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
    const out = [];
    let list = false;
    for (const line of String(source || '').split('\n')) {
        const item = /^\s*[-*]\s+(.*)$/.exec(line);
        if (item) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(item[1])}</li>`); continue; }
        if (list) { out.push('</ul>'); list = false; }
        const heading = /^(#{1,4})\s+(.*)$/.exec(line);
        if (heading) out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`);
        else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
    }
    if (list) out.push('</ul>');
    return out.join('');
}

class Renderer {
    constructor(resolver, manifest) {
        this.resolver = resolver;
        this.manifest = manifest;
        this.charts = [];
        this.unknown = new Set();
        this.depth = 0;
    }

    viewHtml(viewPath, params) {
        if (++this.depth > 12) throw new Error(`embedded views nest too deeply at ${viewPath}`);
        const instance = this.resolver.instantiate(viewPath, params);
        const html = this.node(instance.root, null);
        this.depth--;
        return html;
    }

    /** Layout a component gets from its parent, as a style object. */
    placement(node, parent) {
        if (!parent) return { width: '100%', height: '100%' };
        const p = node.position || {};
        const out = { position: 'relative' };
        if (parent.type === 'ia.container.flex') {
            out.flexGrow = p.grow === undefined ? 0 : p.grow;
            out.flexShrink = p.shrink === undefined ? 1 : p.shrink;
            out.flexBasis = p.basis === undefined ? 'auto' : p.basis;
            if (p.align && p.align !== 'auto') out.alignSelf = p.align;
            if (p.display === false) out.display = 'none';
        }
        return out;
    }

    node(node, parent) {
        const props = node.props || {};
        const userStyle = Object.assign({}, props.style || {});
        const classes = String(userStyle.classes || '').split(/\s+/).filter(Boolean).map(cssClass);
        delete userStyle.classes;
        const place = this.placement(node, parent);
        if (node.meta && node.meta.visible === false) place.display = 'none';
        const attrs = (base, extraClass) => `class="${[extraClass, ...classes].filter(Boolean).join(' ')}" data-name="${esc(node.meta && node.meta.name)}" style="${cssText(Object.assign({}, base, place, userStyle))}"`;

        if (this.manifest[node.type]) {
            const id = `c${this.charts.length}`;
            const values = Object.assign({}, props);
            delete values.style;
            this.charts.push({ id, type: node.type, values, className: classes.join(' '), style: Object.assign({}, place, userStyle) });
            return `<div data-oe="${id}" style="display:contents"></div>`;
        }
        switch (node.type) {
            case 'ia.container.flex': {
                const base = {
                    display: 'flex', flexDirection: props.direction || 'row', flexWrap: props.wrap || 'nowrap',
                    justifyContent: props.justify || 'flex-start', alignItems: props.alignItems || 'stretch', alignContent: props.alignContent || 'stretch',
                };
                return `<div ${attrs(base, 'ia-flex')}>${(node.children || []).map(child => this.node(child, node)).join('')}</div>`;
            }
            case 'ia.display.label':
                return `<div ${attrs({ display: 'flex', alignItems: 'center' }, 'ia-label')}>${esc(props.text)}</div>`;
            case 'ia.display.icon': {
                const d = ICONS[props.path];
                const shape = d ? `<path d="${d}"/>` : '<circle cx="12" cy="12" r="6"/>';
                return `<div ${attrs({ display: 'flex', alignItems: 'center', justifyContent: 'center' }, 'ia-icon')}><svg viewBox="0 0 24 24" width="100%" height="100%" fill="${esc(props.color || 'currentColor')}">${shape}</svg></div>`;
            }
            case 'ia.display.view':
                return `<div ${attrs({ display: 'flex' }, 'ia-view')}>${props.path ? this.viewHtml(props.path, props.params) : ''}</div>`;
            case 'ia.input.dropdown': {
                const option = (props.options || []).find(o => o.value === props.value);
                return `<div ${attrs({}, 'ia-dropdown')}><span>${esc(option ? option.label : props.placeholder || '')}</span><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg></div>`;
            }
            case 'ia.display.markdown':
                return `<div ${attrs({}, 'ia-markdown')}>${markdownHtml(props.source)}</div>`;
            default:
                this.unknown.add(node.type);
                return `<div ${attrs({}, 'ia-unknown')}>${esc(node.type)}</div>`;
        }
    }
}

/** Defaults that stand in for Perspective's own stylesheet and its dark theme. */
const BASE_CSS = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;height:100%;background:#0f0f1c;color:#e6e7ef;font:13px/1.4 "Inter","Segoe UI","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
#app{display:flex;flex-direction:column;overflow:hidden}
#middle{display:flex;flex:1 1 0;min-height:0}
.dock{flex:0 0 auto;display:flex;overflow:hidden}
#main{flex:1 1 0;min-width:0;display:flex;overflow:hidden;position:relative}
.ia-flex{min-width:0}
.ia-label{white-space:pre;min-width:0}
.ia-dropdown{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 8px 0 12px;border:1px solid #3a3a58;border-radius:6px;background:#1a1a2e;color:#e6e7ef;font-size:13px;white-space:pre}
.ia-markdown p{margin:0 0 8px}.ia-markdown ul{margin:0 0 8px;padding-left:18px}.ia-markdown li{margin:2px 0}
.ia-markdown code{font:12px ui-monospace,Menlo,Consolas,monospace;background:rgba(255,255,255,.07);padding:1px 5px;border-radius:4px}
.ia-markdown strong{color:#e6e7ef}
.ia-unknown{border:1px dashed #e05252;color:#e05252;font:11px monospace;padding:4px}
`;

function documentHtml(args, size) {
    const manifest = lib.componentManifest();
    const session = lib.sessionProps();
    const resolver = new Resolver({
        session: { custom: Object.assign({}, session.custom, { line: args.line }), props: session.props || {} },
        page: { props: { path: args.page || '/', dimensions: { viewport: { width: size[0], height: size[1] } } } },
        nowMs: args.nowMs,
    });
    const renderer = new Renderer(resolver, manifest);
    let body;
    if (args.view) {
        body = `<div id="main">${renderer.viewHtml(args.view, {})}</div>`;
    } else {
        const config = lib.pageConfig();
        const page = config.pages[args.page];
        if (!page) throw new Error(`no page ${args.page} in page-config (have: ${Object.keys(config.pages).join(', ')})`);
        const docks = Object.assign({}, config.sharedDocks || {}, page.docks || {});
        const dock = (side, dimension) => (docks[side] || []).filter(d => d.show === 'visible').map(d =>
            `<div class="dock dock-${side}" style="${dimension}:${d.size}px">${renderer.viewHtml(d.viewPath, d.viewParams)}</div>`).join('');
        // cornerPriority "top-bottom": the top and bottom docks span the full width
        body = `${dock('top', 'height')}<div id="middle">${dock('left', 'width')}<div id="main">${renderer.viewHtml(page.viewPath, {})}</div>${dock('right', 'width')}</div>${dock('bottom', 'height')}`;
    }
    const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Open ECharts demo preview</title>
<link rel="stylesheet" href="${MOUNT_URL}OpenECharts.css">
<style>${BASE_CSS}\n${styleSheet(lib.styleClasses())}</style></head>
<body><div id="app" style="width:${size[0]}px;height:${size[1]}px">${body}</div>
<script src="/vendor/react.js"></script><script src="/vendor/react-dom.js"></script>
<script>
// What Perspective provides to a module's bundle, reduced to what this bundle uses (as in web/e2e/smoke.js).
window.__metas = {};
window.PerspectiveClient = { Component: React.Component, ComponentRegistry: { register: function (meta) { window.__metas[meta.getComponentType()] = meta; } } };
function tree(values) {
    function read(key, fallback) { return key in values ? JSON.parse(JSON.stringify(values[key])) : fallback; }
    return new Proxy({}, { get: function (_t, name) { return String(name).indexOf('read') === 0 ? read : undefined; } });
}
window.mountCharts = function (charts) {
    charts.forEach(function (chart) {
        var meta = window.__metas[chart.type];
        var host = document.querySelector('[data-oe="' + chart.id + '"]');
        ReactDOM.createRoot(host).render(React.createElement(meta.getViewComponent(), {
            props: meta.getPropsReducer(tree(chart.values)),
            // emit() is where Perspective applies position, style and style classes to the component root
            emit: function (e) { return { className: (e.classes || []).concat(chart.className).join(' '), style: chart.style, 'data-chart': chart.id }; },
            componentEvents: { fireComponentEvent: function () {} },
        }));
    });
};
</script>
<script src="${MOUNT_URL}OpenECharts.js"></script>
</body></html>`;
    return { html, charts: renderer.charts, problems: resolver.problems, unknown: [...renderer.unknown], scriptCalls: resolver.scriptCalls };
}

// ---- browser ----------------------------------------------------------------------------

function serve(pages) {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost');
        if (pages.has(url.pathname)) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(pages.get(url.pathname)); return; }
        let file = VENDOR[url.pathname] || null;
        if (!file && url.pathname.startsWith(MOUNT_URL)) {
            const resolved = path.resolve(mountedDir, url.pathname.slice(MOUNT_URL.length));
            if (resolved.startsWith(mountedDir + path.sep)) file = resolved;
        }
        if (!file || !fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': file.endsWith('.css') ? 'text/css' : 'text/javascript' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!fs.existsSync(path.join(mountedDir, 'OpenECharts.js'))) {
        throw new Error(`the web bundle is not built: ${mountedDir} is missing. Run "npm run build" in web/ first.`);
    }
    let playwright;
    try { playwright = require('playwright'); } catch (error) {
        throw new Error('Playwright is not available to Node (require("playwright") failed). The previewer needs it with Chromium; it does not install it.');
    }
    fs.mkdirSync(args.out, { recursive: true });
    const stem = args.name || (args.view ? args.view.replace(/\W+/g, '-') : (args.page === '/' ? 'overview' : args.page.replace(/^\//, '').replace(/\W+/g, '-'))).toLowerCase();
    const pages = new Map();
    const server = await serve(pages);
    const browser = await playwright.chromium.launch();
    let failed = false;
    try {
        for (const size of args.sizes) {
            const doc = documentHtml(args, size);
            pages.set('/', doc.html);
            const page = await browser.newPage({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: 1 });
            const consoleProblems = [];
            page.on('console', m => { if (m.type() === 'error') consoleProblems.push(m.text()); if (process.env.PREVIEW_DEBUG) console.log(`  [browser ${m.type()}] ${m.text()}`); });
            page.on('pageerror', e => consoleProblems.push(e.message));
            await page.goto(`http://127.0.0.1:${server.address().port}/`);
            await page.evaluate(charts => window.mountCharts(charts), doc.charts);
            try {
                await page.waitForFunction(n => document.querySelectorAll('.open-echarts-mount canvas, .open-echarts-mount svg, .open-echarts-error').length >= n, doc.charts.length, { timeout: 20000 });
            } catch (error) { consoleProblems.push('not every chart rendered within 20 s'); }
            await page.waitForTimeout(2200); // entry animations
            const report = await page.evaluate(() => {
                const main = document.querySelector('#main > *');
                const charts = [...document.querySelectorAll('[data-chart]')].map(el => {
                    const r = el.getBoundingClientRect();
                    const alert = el.querySelector('[role="alert"]');
                    return { id: el.getAttribute('data-chart'), w: Math.round(r.width), h: Math.round(r.height), error: alert ? alert.textContent : null };
                });
                const clipped = [...document.querySelectorAll('.ia-label')].filter(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== 'ellipsis')
                    .map(el => `${el.getAttribute('data-name')}: "${el.textContent.slice(0, 40)}"`);
                return { scrollHeight: main ? main.scrollHeight : 0, clientHeight: main ? main.clientHeight : 0, scrollWidth: main ? main.scrollWidth : 0, clientWidth: main ? main.clientWidth : 0, charts, clipped };
            });
            let shotSize = size;
            if (args.full && report.scrollHeight > report.clientHeight) {
                shotSize = [size[0], size[1] + report.scrollHeight - report.clientHeight];
                await page.setViewportSize({ width: shotSize[0], height: shotSize[1] });
                await page.evaluate(h => { document.getElementById('app').style.height = `${h}px`; }, shotSize[1]);
                await page.waitForTimeout(1200);
            }
            const file = path.join(args.out, `${stem}-${size[0]}x${size[1]}${args.full ? '-full' : ''}.png`);
            await page.screenshot({ path: file });
            if (args.html) fs.writeFileSync(file.replace(/\.png$/, '.html'), doc.html);
            await page.close();

            console.log(`${path.relative(process.cwd(), file)}  (${shotSize[0]}x${shotSize[1]}, ${doc.charts.length} charts, line ${args.line})`);
            const byId = new Map(doc.charts.map(c => [c.id, c]));
            if (report.scrollHeight > report.clientHeight + 1) console.log(`  note: the page is ${report.scrollHeight}px tall in a ${report.clientHeight}px area, so it scrolls${args.full ? '' : ' (use --full to see all of it)'}`);
            if (report.scrollWidth > report.clientWidth + 1) { console.log(`  PROBLEM: the page is wider (${report.scrollWidth}px) than its area (${report.clientWidth}px)`); failed = true; }
            for (const chart of report.charts) {
                const type = byId.get(chart.id).type.replace(/^open\.\w+\./, '');
                if (chart.error) { console.log(`  PROBLEM: ${type} shows an error: ${chart.error.slice(0, 200)}`); failed = true; }
                if (chart.w < 120 || chart.h < 100) console.log(`  note: ${type} is small (${chart.w}x${chart.h})`);
            }
            if (report.charts.length !== doc.charts.length) { console.log(`  PROBLEM: ${doc.charts.length - report.charts.length} chart(s) did not mount`); failed = true; }
            for (const text of report.clipped) console.log(`  note: label text is cut off: ${text}`);
            for (const type of doc.unknown) { console.log(`  PROBLEM: ${type} is not imitated by the previewer (drawn as a red box)`); failed = true; }
            for (const problem of [...new Set(doc.problems)]) { console.log(`  PROBLEM: ${problem}`); failed = true; }
            for (const problem of [...new Set(consoleProblems)]) { console.log(`  PROBLEM (browser): ${problem.slice(0, 300)}`); failed = true; }
        }
    } finally {
        await browser.close();
        server.close();
    }
    process.exit(failed ? 1 : 0);
}

main().catch(error => { console.error(`preview: ${error.message}`); process.exit(1); });
