/**
 * Browser smoke test for the built bundle.
 *
 * Serves build/generated-resources/mounted/ the way the gateway does (under
 * /res/open-echarts/), loads it into a page that stands in for a Perspective
 * session (React globals plus a minimal PerspectiveClient), and checks in
 * headless Chromium what jsdom cannot: canvas and WebGL rendering, on-demand
 * loading of the echarts-gl chunk, and what really ends up in the tooltip DOM.
 *
 * Run `npm run build` first, then `npm run test:e2e`.
 * Needs Playwright with Chromium available to Node; it is not a dependency of this package.
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

const MOUNT_URL = '/res/open-echarts/';
const mountedDir = path.resolve(__dirname, '../build/generated-resources/mounted');
const nodeModules = path.resolve(__dirname, '../node_modules');

const VENDOR = {
    '/vendor/react.js': path.join(nodeModules, 'react/umd/react.production.min.js'),
    '/vendor/react-dom.js': path.join(nodeModules, 'react-dom/umd/react-dom.production.min.js'),
};
const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.txt': 'text/plain' };

const HARNESS_PAGE = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Open ECharts smoke test</title>
<link rel="stylesheet" href="${MOUNT_URL}OpenECharts.css?v=abc123">
<style>body { margin: 0; background: #fff; } .host { width: 600px; height: 400px; }</style>
</head>
<body>
<script src="/vendor/react.js"></script>
<script src="/vendor/react-dom.js"></script>
<script>
// What Perspective provides to a module's bundle, reduced to what this bundle uses.
window.__metas = {};
window.__events = [];
window.PerspectiveClient = {
    Component: React.Component,
    ComponentRegistry: { register: function (meta) {
        var id = meta.getComponentType();
        if (window.__metas[id]) throw new Error('registered twice: ' + id);
        window.__metas[id] = meta;
    } },
};

// Like Perspective's PropertyTree: every read returns a fresh plain copy.
function tree(values) {
    function read(key, fallback) { return key in values ? JSON.parse(JSON.stringify(values[key])) : fallback; }
    return new Proxy({}, { get: function (_t, name) { return String(name).indexOf('read') === 0 ? read : undefined; } });
}

var charts = {};
window.harness = {
    render: function (key, id, values, hostStyle) {
        var host = document.createElement('div');
        host.className = 'host';
        host.id = key;
        if (hostStyle) host.style.cssText = hostStyle;
        document.body.appendChild(host);
        charts[key] = { id: id, values: values || {}, root: ReactDOM.createRoot(host) };
        this.update(key, {});
    },
    update: function (key, values) {
        var chart = charts[key];
        var meta = window.__metas[chart.id];
        Object.assign(chart.values, values);
        chart.root.render(React.createElement(meta.getViewComponent(), {
            props: meta.getPropsReducer(tree(chart.values)),
            emit: function (e) { return { className: (e.classes || []).join(' ') }; },
            componentEvents: { fireComponentEvent: function (name, payload) { window.__events.push([name, payload]); } },
        }));
    },
    remove: function (key) {
        charts[key].root.unmount();
        document.getElementById(key).remove();
        delete charts[key];
    },
};
</script>
<script src="${MOUNT_URL}OpenECharts.js?v=abc123"></script>
</body>
</html>`;

function startServer() {
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost');
        let file = null;
        if (url.pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(HARNESS_PAGE);
            return;
        }
        if (VENDOR[url.pathname]) {
            file = VENDOR[url.pathname];
        } else if (url.pathname.startsWith(MOUNT_URL)) {
            const resolved = path.resolve(mountedDir, url.pathname.slice(MOUNT_URL.length));
            if (resolved.startsWith(mountedDir + path.sep)) file = resolved;
        }
        if (!file || !fs.existsSync(file)) {
            res.writeHead(404);
            res.end('not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const results = [];
function check(name, ok, detail) {
    results.push({ name, ok: !!ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
}

const BAR = {
    xAxis: { type: 'category', data: ['a', 'b', 'c'] },
    yAxis: { type: 'value', max: 10 },
    series: [{ type: 'bar', name: 'A', data: [5, 9, 7] }],
    animation: false,
};
const BROKEN = { series: [{ type: 'line', data: [1, 2] }] };
const marker = name => `<img src="data:image/png;base64,AA" onerror="window.${name} = 1">`;

/** The bundle as shipped, checked without a browser. */
function checkBundleFiles() {
    const files = fs.readdirSync(mountedDir);
    const size = name => fs.statSync(path.join(mountedDir, name)).size;
    const glChunks = files.filter(f => /^OpenECharts\.echarts-gl\.[0-9a-f]{8}\.js$/.test(f));

    check('mounted/ has the entry script and stylesheet', files.includes('OpenECharts.js') && files.includes('OpenECharts.css'));
    check('mounted/ has exactly one content-hashed echarts-gl chunk', glChunks.length === 1, glChunks.join(', '));

    const main = fs.readFileSync(path.join(mountedDir, 'OpenECharts.js'), 'utf8');
    const scripts = files.filter(f => f.endsWith('.js'));
    check('no shipped script points at a source map',
        scripts.every(f => !fs.readFileSync(path.join(mountedDir, f), 'utf8').includes('sourceMappingURL=')));
    check('React, ReactDOM and mobx are not bundled',
        !main.includes('__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED') && !main.includes('[mobx]') &&
        !main.includes('react.production.min.js'));
    const glOnly = 'your browser does not support WebGL';
    check('echarts-gl is in its chunk and not in the entry script',
        !main.includes(glOnly) && fs.readFileSync(path.join(mountedDir, glChunks[0] || 'OpenECharts.js'), 'utf8').includes(glOnly));
    check('chunks register under a global of their own', main.includes('webpackChunkOpenECharts'));

    const kb = bytes => `${(bytes / 1024).toFixed(0)} kB`;
    console.log(`      sizes: OpenECharts.js ${kb(size('OpenECharts.js'))}` +
        glChunks.map(f => `, ${f} ${kb(size(f))}`).join('') + `, OpenECharts.css ${kb(size('OpenECharts.css'))}`);
    return glChunks[0];
}

async function main() {
    if (!fs.existsSync(path.join(mountedDir, 'OpenECharts.js'))) {
        console.error(`No bundle in ${mountedDir}. Run "npm run build" first.`);
        process.exit(2);
    }
    let chromium;
    try {
        ({ chromium } = require('playwright'));
    } catch {
        console.error('Playwright is not installed. Install it (with Chromium) to run the smoke test.');
        process.exit(2);
    }

    const glChunk = checkBundleFiles();
    const server = await startServer();
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });

    const problems = [];
    const requests = [];
    page.on('console', msg => { if (msg.type() === 'error') problems.push(`console: ${msg.text()}`); });
    page.on('pageerror', err => problems.push(`pageerror: ${err.message}`));
    page.on('requestfailed', req => problems.push(`request failed: ${req.url()}`));
    page.on('response', res => {
        requests.push(new URL(res.url()).pathname);
        if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`);
    });
    const glRequests = () => requests.filter(p => p.includes('echarts-gl'));

    /** Pixels of the element that differ from the white page, from a real screenshot. */
    const inkOf = async selector => {
        const shot = await page.locator(selector).screenshot();
        return page.evaluate(async base64 => {
            const img = new Image();
            img.src = `data:image/png;base64,${base64}`;
            await img.decode();
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, img.width, img.height).data;
            let ink = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) ink++;
            }
            return ink;
        }, shot.toString('base64'));
    };
    const frames = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));

    try {
        await page.goto(`${origin}/`);

        // --- registration -------------------------------------------------
        const ids = await page.evaluate(() => Object.keys(window.__metas));
        check('all 48 components register', ids.length === 48, `${ids.length} registered`);
        check('the bundle exposes its UMD library', await page.evaluate(() => typeof window.OpenECharts === 'object'));

        // --- 2D chart -----------------------------------------------------
        await page.evaluate(() => window.harness.render('line', 'open.echarts.LineChart'));
        await page.waitForSelector('#line .open-echarts-mount canvas');
        await frames();
        check('2D chart: a canvas appears in the mount element', true);
        check('2D chart: something is drawn', (await inkOf('#line')) > 500);
        check('2D chart: root has the shared and the per-type class',
            await page.evaluate(() => document.querySelector('#line > .open-echarts-root.open-echarts-line') !== null));
        check('2D chart: ECharts describes the chart for assistive technology',
            await page.evaluate(() => {
                const mount = document.querySelector('#line .open-echarts-mount');
                return mount.getAttribute('role') === 'img' && (mount.getAttribute('aria-label') || '').length > 10;
            }));
        check('2D chart: echarts-gl has not been requested', glRequests().length === 0);

        // --- GL chart -----------------------------------------------------
        await page.evaluate(() => window.harness.render('bar3d', 'open.echarts.Bar3DChart'));
        await page.waitForSelector('#bar3d .open-echarts-mount canvas');
        await page.waitForTimeout(1500);
        // The entry script is loaded as OpenECharts.js?v=abc123, as the gateway serves it;
        // the chunk URL must be derived from its folder, not from the query string.
        check('GL chart: the chunk is fetched from the mount path although the entry script has a ?v= query',
            glRequests().length === 1 && glRequests()[0] === `${MOUNT_URL}${glChunk}`, glRequests().join(', '));
        check('GL chart: a canvas appears in the mount element', true);
        check('GL chart: the loading message is gone and there is no error',
            await page.evaluate(() => !document.querySelector('#bar3d [role="status"], #bar3d [role="alert"]')));
        check('GL chart: something is drawn', (await inkOf('#bar3d')) > 500);

        await page.evaluate(() => window.harness.render('scattergl', 'open.echarts.ScatterGLChart'));
        await page.waitForSelector('#scattergl .open-echarts-mount canvas');
        check('GL chart: a second GL chart reuses the loaded chunk', glRequests().length === 1);

        // --- industrial chart ----------------------------------------------
        await page.evaluate(() => window.harness.render('oee', 'open.industrial.OEE'));
        await page.waitForSelector('#oee .open-echarts-mount canvas');
        await frames();
        check('industrial chart: built from its domain props and drawn', (await inkOf('#oee')) > 500);

        // --- geo chart with a map from the maps prop --------------------------
        await page.evaluate(() => {
            const square = (name, x) => ({
                type: 'Feature', properties: { name },
                geometry: { type: 'Polygon', coordinates: [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 1], [x, 0]]] },
            });
            window.harness.render('geo', 'open.echarts.MapChart', {
                maps: { plant: { type: 'FeatureCollection', features: [square('North', 0), square('South', 2)] } },
                option: { animation: false, series: [{ type: 'map', map: 'plant', itemStyle: { areaColor: '#3b6cb5' }, data: [] }] },
            });
        });
        await page.waitForSelector('#geo .open-echarts-mount canvas');
        await frames();
        check('map chart: regions from the maps prop are drawn', (await inkOf('#geo')) > 5000);
        await page.evaluate(() => window.harness.remove('geo'));

        // --- error and recovery (bug: chart stayed blank after an error) ---
        await page.evaluate(() => { ['bar3d', 'scattergl', 'oee'].forEach(k => window.harness.remove(k)); });
        await page.evaluate(broken => window.harness.update('line', { option: broken, notMerge: true }), BROKEN);
        await page.waitForSelector('#line [role="alert"]');
        check('error: a bad option shows an alert over the chart area',
            await page.evaluate(() => document.querySelector('#line [role="alert"]').textContent.length > 0));
        check('error: the mount element is still in the document',
            await page.evaluate(() => document.querySelector('#line .open-echarts-mount').isConnected));

        await page.evaluate(bar => window.harness.update('line', { option: bar }), BAR);
        await page.waitForSelector('#line [role="alert"]', { state: 'detached' });
        await page.waitForSelector('#line .open-echarts-mount canvas');
        await frames();
        check('error: the chart is drawn again once the option is corrected', (await inkOf('#line')) > 500);

        // --- series removal when merging ------------------------------------
        const inkTwo = await (async () => {
            await page.evaluate(bar => window.harness.update('line', {
                notMerge: false,
                option: { ...bar, series: [bar.series[0], { type: 'line', name: 'B', data: [2, 6, 4], lineStyle: { width: 12, color: '#000' } }] },
            }), BAR);
            await frames();
            return inkOf('#line');
        })();
        await page.evaluate(bar => window.harness.update('line', { option: bar }), BAR);
        await frames();
        const inkOne = await inkOf('#line');
        check('merge: a series removed from the option is removed from the chart', inkOne < inkTwo, `${inkTwo} -> ${inkOne} px`);

        // --- a chart mounted with no size, autoResize off ---------------------
        await page.evaluate(bar => window.harness.render('hidden', 'open.echarts.BarChart',
            { option: bar, autoResize: false }, 'display: none'), BAR);
        await frames();
        await page.evaluate(() => { document.getElementById('hidden').style.display = 'block'; });
        await page.waitForTimeout(300);
        check('zero size: the chart draws once its element gets a size', (await inkOf('#hidden')) > 500);
        await page.evaluate(() => window.harness.remove('hidden'));

        check('no console errors, page errors or failed requests so far', problems.length === 0, problems.join(' | '));
        problems.length = 0;

        // --- tooltip sanitising in a real DOM --------------------------------
        await page.evaluate(() => window.harness.remove('line'));
        const hover = async key => {
            const box = await page.locator(`#${key}`).boundingBox();
            await page.mouse.move(box.x + 5, box.y + 5);
            const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
            await page.mouse.move(x, y, { steps: 5 });
            await page.mouse.move(x + 4, y + 4, { steps: 2 });
            await page.waitForTimeout(400);
            return page.evaluate(k => {
                // ECharts appends the tooltip element to the chart element, after its canvas wrapper.
                const tip = document.querySelector(`#${k} .open-echarts-mount > div:nth-child(2)`);
                return tip ? tip.innerHTML : null;
            }, key);
        };
        const tooltipCase = async (name, option, sanitizeTooltip) => {
            await page.evaluate(([opt, sanitize]) => window.harness.render('tip', 'open.echarts.BarChart',
                { option: opt, sanitizeTooltip: sanitize }), [option, sanitizeTooltip]);
            await page.waitForSelector('#tip .open-echarts-mount canvas');
            await frames();
            const html = await hover('tip');
            const fired = await page.evaluate(n => window[n] === 1, name);
            await page.evaluate(n => { delete window[n]; window.harness.remove('tip'); }, name);
            return { html, fired };
        };

        const formatterOption = { ...BAR, tooltip: { trigger: 'axis', formatter: `<b>{b}</b> ${marker('__xssFormatter')}` } };
        let r = await tooltipCase('__xssFormatter', formatterOption, true);
        check('tooltip: formatter markup is sanitised (handler removed, formatting kept)',
            r.html && !r.fired && !/onerror/i.test(r.html) && /<b>b<\/b>/.test(r.html), r.html);
        r = await tooltipCase('__xssFormatter', formatterOption, false);
        check('tooltip: the same formatter does run script with sanitizeTooltip off (the check above is meaningful)', r.fired);

        // Data values substituted into a {b} template, and shown by the default tooltip.
        const hostileData = {
            ...BAR,
            xAxis: { type: 'category', data: ['a', marker('__xssData'), 'c'] },
            series: [{ type: 'bar', name: marker('__xssData'), data: [5, 9, 7] }],
        };
        r = await tooltipCase('__xssData', { ...hostileData, tooltip: { trigger: 'axis', formatter: '{a}: {b} = {c}' } }, false);
        check('ECharts HTML-encodes values substituted into {a}/{b}/{c} templates',
            r.html && !r.fired && r.html.includes('&lt;img'), r.html);
        r = await tooltipCase('__xssData', { ...hostileData, tooltip: { trigger: 'axis' } }, false);
        check('ECharts HTML-encodes names and values in the default tooltip',
            r.html && !r.fired && r.html.includes('&lt;img'), r.html);

        // A colour is written unescaped into the tooltip arrow's style attribute.
        const hostileColour = {
            ...BAR,
            tooltip: { trigger: 'item', position: 'top', backgroundColor: `#fff"></div>${marker('__xssColour')}<div x="` },
        };
        r = await tooltipCase('__xssColour', hostileColour, true);
        check('tooltip: a colour carrying markup is dropped', r.html && !r.fired && !/onerror/i.test(r.html), r.html);
        r = await tooltipCase('__xssColour', hostileColour, false);
        check('tooltip: the same colour does run script with sanitizeTooltip off (ECharts does not escape it)', r.fired);

        check('no page errors during the tooltip checks',
            problems.filter(p => p.startsWith('pageerror')).length === 0, problems.join(' | '));
    } finally {
        await browser.close();
        server.close();
    }

    const failed = results.filter(r => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    process.exit(failed.length === 0 ? 0 : 1);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
