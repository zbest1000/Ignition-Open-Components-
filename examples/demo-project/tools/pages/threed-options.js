'use strict';
/**
 * The ECharts options of the 3D & WebGL page (pages/threed.js), one entry per tile.
 *
 * Every ECharts-GL component of the module is on that page and nowhere else: a browser allows a
 * limited number of WebGL contexts per page (Chromium: 16), and each GL chart takes one.
 *
 * The options start from the component defaults in components.manifest.json and are rebuilt with
 * plant data. The theme does not reach the 3D axes, globe or geo3D, so every colour is set here
 * from the design tokens. Zoom and pan are off on every 3D view so that the mouse wheel scrolls
 * the page; dragging still rotates.
 *
 *   OPTIONS.<key> = { type, example, option, props? }
 */
const { kit } = require('./gallery-options');
const floor = require('./floor-plan');

const { C, mix, alpha, WHITE, LEGEND, FAINT, generator, manifest } = kit;

const OPTIONS = {};

function fromDefault(key, component, patch, props) {
    const row = manifest.components.find(c => c.id === `open.echarts.${component}`);
    if (!row) throw new Error(`components.manifest.json has no open.echarts.${component}`);
    let option = JSON.parse(JSON.stringify(row.defaultOption));
    option = patch(option) || option;
    OPTIONS[key] = { type: row.id, example: props && props.example || 'default option, plant data', option };
    if (props && props.maps) OPTIONS[key].props = { maps: props.maps };
}

const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;

/** The 3D axes are not covered by the theme: every line and label colour is set here. */
const axis3D = (name, extra) => Object.assign({
    name, nameGap: 22,
    nameTextStyle: { color: C.textSecondary, fontSize: 12 },
    axisLine: { lineStyle: { color: C.textMuted } },
    axisLabel: { textStyle: { color: C.textSecondary, fontSize: 11 } },
    axisTick: { lineStyle: { color: C.textMuted } },
    splitLine: { lineStyle: { color: C.borderStrong } },
    splitArea: { show: false },
    axisPointer: { lineStyle: { color: C.textMuted } },
}, extra || {});

const grid3D = (alphaAngle, beta, distance) => ({
    boxWidth: 100, boxDepth: 100, boxHeight: 62,
    environment: 'none',
    // zoom and pan are off so that the mouse wheel scrolls the page; dragging still rotates
    viewControl: { alpha: alphaAngle, beta, distance, center: [0, -24, 0], autoRotate: false, zoomSensitivity: 0, panSensitivity: 0 },
    light: { main: { intensity: 0.85, shadow: false, alpha: 40, beta: 30 }, ambient: { intensity: 0.4 } },
    axisPointer: { show: false },
});

fromDefault('bar3D', 'Bar3DChart', o => {
    // output by machine and weekday; values follow a daily rhythm instead of the 5 x 5 default sample
    const machines = ['Rinser', 'Filler', 'Capper', 'Labeller', 'Packer', 'Palletiser'];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const g = generator(7);
    const data = [];
    days.forEach((day, d) => machines.forEach((machine, m) => {
        const level = 62 + 22 * Math.sin((m + 1) * 0.9 + d * 0.55) + 10 * g.next() - (d > 4 ? 18 : 0);
        data.push([m, d, Math.round(Math.max(12, level))]);
    }));
    return {
        tooltip: {},
        visualMap: { show: false, dimension: 2, min: 20, max: 95, inRange: { color: [mix(C.accent, C.card, 0.45), C.accent, mix(C.accent, C.cyan, 0.6)] } },
        grid3D: grid3D(24, 38, 205),
        xAxis3D: axis3D('', { type: 'category', data: machines, axisLabel: { interval: 0, textStyle: { color: C.textSecondary, fontSize: 10 } } }),
        yAxis3D: axis3D('', { type: 'category', data: days }),
        zAxis3D: axis3D('', { type: 'value' }), // k units; a name here is cut off in a narrow tile
        series: [Object.assign(o.series[0], { data, bevelSize: 0.25, bevelSmoothness: 2, barSize: 9, itemStyle: { opacity: 1 }, emphasis: { itemStyle: { color: C.pink } } })],
    };
});

fromDefault('surface', 'SurfaceChart', o => {
    // a response surface z = f(x, y) on a finer grid than the 9 x 9 default sample
    const data = [];
    const steps = 30;
    for (let j = 0; j <= steps; j++) {
        for (let i = 0; i <= steps; i++) {
            const x = -3 + 6 * i / steps, y = -3 + 6 * j / steps;
            const z = Math.sin(x) * Math.cos(y) * Math.exp(-(x * x + y * y) / 14);
            data.push([Number(x.toFixed(2)), Number(y.toFixed(2)), Number(z.toFixed(3))]);
        }
    }
    return {
        tooltip: {},
        visualMap: { show: false, dimension: 2, min: -0.85, max: 0.85, inRange: { color: [C.violet, C.accent, C.cyan] } },
        grid3D: grid3D(26, 42, 205),
        xAxis3D: axis3D('x', { type: 'value' }),
        yAxis3D: axis3D('y', { type: 'value' }),
        zAxis3D: axis3D('z', { type: 'value' }),
        series: [Object.assign(o.series[0], { data, shading: 'lambert', wireframe: { show: true, lineStyle: { color: alpha(C.page, 0.55), width: 1 } } })],
    };
});

fromDefault('scatterGL', 'ScatterGLChart', o => {
    // 6,000 points in three clusters: what the WebGL scatter is for
    const g = generator(42);
    const clusters = [[34, 58, 9, 7, C.accent, 'Line 1'], [58, 41, 11, 8, C.cyan, 'Line 2'], [74, 66, 7, 9, C.pink, 'Line 3']];
    const base = o.series[0];
    return {
        legend: Object.assign({ top: 0, data: clusters.map(c => c[5]), itemStyle: { opacity: 1 } }, LEGEND),
        grid: { left: 46, right: 16, top: 34, bottom: 42 },
        xAxis: { name: 'Application torque (N·cm)', nameLocation: 'middle', nameGap: 26, nameTextStyle: { color: C.textMuted }, min: 0, max: 100, splitLine: { lineStyle: { color: FAINT, type: 'dashed' } } },
        yAxis: { name: 'Removal torque (N·cm)', nameTextStyle: { color: C.textMuted }, min: 0, max: 100, splitLine: { lineStyle: { color: FAINT, type: 'dashed' } } },
        series: clusters.map(([cx, cy, sx, sy, color, name]) => {
            const data = [];
            for (let i = 0; i < 2000; i++) {
                const a = g.gauss(), b = g.gauss();
                data.push([Number((cx + sx * a).toFixed(2)), Number((cy + sy * (0.55 * a + 0.83 * b)).toFixed(2))]);
            }
            return Object.assign({}, base, { name, data, symbolSize: 3, itemStyle: { color, opacity: 0.55 } });
        }),
    };
});


// ---- the plant floor in 3D --------------------------------------------------------------

/** A view onto a 3D scene: zoom and pan off (the wheel scrolls the page), drag rotates. */
const camera = (alphaAngle, beta, distance, extra) => Object.assign({
    alpha: alphaAngle, beta, distance, autoRotate: false, zoomSensitivity: 0, panSensitivity: 0,
}, extra || {});

const light = (intensity, shadow) => ({
    main: { intensity, shadow: !!shadow, shadowQuality: 'high', alpha: 50, beta: 35 },
    ambient: { intensity: 0.38 },
});

const label3D = (size) => ({
    show: true, distance: 1.5,
    textStyle: { color: C.text, fontSize: size || 11, fontWeight: 600, backgroundColor: alpha(C.card, 0.78), padding: [3, 5], borderRadius: 3 },
});

// Map3DChart: the floor plan extruded, each zone as high as its energy use
const ENERGY = { Warehouse: 6.2, Packaging: 14.8, 'QA lab': 3.1, Offices: 4.4, 'Filling hall': 27.5, 'Syrup room': 11.9, Utilities: 38.6 };
fromDefault('map3D', 'Map3DChart', () => ({
    tooltip: { formatter: '{b}: {c} MWh' },
    visualMap: {
        min: 0, max: 40, show: true, calculable: false, left: 4, bottom: 4, itemWidth: 10, itemHeight: 90,
        text: ['40 MWh', '0'], textGap: 6, textStyle: { color: C.textMuted, fontSize: 10 },
        inRange: { color: [mix(C.accent, C.card, 0.55), C.accent, C.cyan, mix(C.cyan, WHITE, 0.55)] },
    },
    series: [{
        type: 'map3D', map: floor.MAP_NAME, aspectScale: 1, boxWidth: 118, boxHeight: 26,
        environment: 'none', shading: 'lambert', light: light(1.05, true),
        viewControl: camera(46, 16, 104, { center: [0, -4, 2] }),
        groundPlane: { show: false },
        itemStyle: { borderWidth: 1, borderColor: C.card, opacity: 1 },
        label: Object.assign(label3D(11), { formatter: '{b}\n{c} MWh' }),
        emphasis: { itemStyle: { color: C.pink }, label: { show: true } },
        data: Object.entries(ENERGY).map(([name, value]) => ({ name, value, height: r1(1.2 + value * 0.42) })),
    }],
}), { example: 'floor plan GeoJSON, height = energy', maps: floor.maps() });

// Polygons3DChart: the plan as a flat geo3D floor, the equipment on it as extruded polygons.
//
// Work-around for echarts-gl 2.1.0: on a geo3D coordinate system, polygons3D converts each point
// with geo3D.dataToPoint(), which already returns a transformed 3D point [x, altitude, z], and then
// reads it as [x, z] and applies the geo3D transform a second time. Unpatched, every polygon lands
// on one line along the front edge of the plan. The points below are written so that the second
// pass puts them where they belong: x is the inverse of the geo3D transform, and the "altitude"
// (third coordinate) carries the transformed y. That needs an altitude axis that maps altitude
// 1:1 to box units: an invisible scatter3D with altitudes 0 and boxHeight - regionHeight provides it.
const KIND_COLOUR = {
    'Syrup room': C.cyan, 'Filling hall': C.accent, Packaging: C.violet, Warehouse: mix(C.accent, C.card, 0.35),
    Utilities: C.pink, 'QA lab': mix(C.cyan, WHITE, 0.5),
};
(() => {
    const BOX = { width: 118, depth: 61, height: 14, region: 0.4 };
    const xs = [], ys = [];
    for (const ring of Object.values(floor.ZONES)) for (const [x, y] of ring) { xs.push(x); ys.push(y); }
    const rect = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    const sx = BOX.width / rect.w, tx = -BOX.width / 2 - rect.x * sx;
    // geo3D.dataToPoint([a, b, alt]) = [sx * a + tx, alt + region, sz * b + tz]; the builder reads its
    // first two values as (x, z) and transforms them again: x' = sx * (sx * a + tx) + tx and
    // z' = sz * (alt + region) + tz. For x' = sx * x + tx and z' = sz * y + tz:
    const fixed = ([x, y]) => [r2((x - tx) / sx), y, r2(y - BOX.region)];
    fromDefault('polygons3D', 'Polygons3DChart', () => ({
        tooltip: { formatter: '{b}' },
        geo3D: {
            map: floor.MAP_NAME, aspectScale: 1, boxWidth: BOX.width, boxDepth: BOX.depth, boxHeight: BOX.height, regionHeight: BOX.region,
            environment: 'none', shading: 'lambert', light: light(1.0, true),
            viewControl: camera(50, -20, 100, { center: [0, -4, 2] }),
            groundPlane: { show: false },
            itemStyle: { color: mix(C.card, WHITE, 0.07), borderWidth: 1.5, borderColor: C.borderStrong },
            label: { show: true, distance: 0.5, textStyle: { color: C.textMuted, fontSize: 10, backgroundColor: 'transparent' } },
            emphasis: { itemStyle: { color: mix(C.card, WHITE, 0.12) }, label: { show: true } },
            silent: true,
        },
        series: [
            {
                type: 'polygons3D', coordinateSystem: 'geo3D', shading: 'lambert',
                emphasis: { itemStyle: { color: C.text }, label: label3D(11) },
                data: floor.EQUIPMENT.map(([name, zone, box, height]) => ({
                    name, coords: [floor.rect(box).map(fixed)], height: r1(height * 0.55),
                    itemStyle: { color: KIND_COLOUR[zone] || C.accent },
                })),
            },
            {
                // invisible: only here to create the 1:1 altitude axis the work-around needs
                type: 'scatter3D', coordinateSystem: 'geo3D', silent: true, symbolSize: 0, itemStyle: { opacity: 0 },
                data: [[rect.x, rect.y, 0], [rect.x, rect.y, BOX.height - BOX.region]],
            },
        ],
    }), { example: 'equipment on a geo3D floor plan', maps: floor.maps() });
})();

// ---- paths and points -------------------------------------------------------------------

// Line3DChart: a robot tool path, a conical spiral (a glue bead around a tapered part)
fromDefault('line3D', 'Line3DChart', o => {
    const data = [];
    const turns = 7, steps = 560;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const angle = t * turns * 2 * Math.PI;
        const radius = 90 - 50 * t;
        const z = 160 * t;
        const speed = 40 + 60 * Math.abs(Math.sin(angle * 0.5)) * (1 - 0.4 * t);
        data.push([r1(radius * Math.cos(angle)), r1(radius * Math.sin(angle)), r1(z), r1(speed)]);
    }
    return {
        tooltip: {},
        visualMap: {
            show: true, dimension: 3, min: 40, max: 100, calculable: false, right: 4, top: 4, itemWidth: 10, itemHeight: 80,
            text: ['100 mm/s', '40'], textGap: 6, textStyle: { color: C.textMuted, fontSize: 10 },
            inRange: { color: [C.violet, C.accent, C.cyan, mix(C.cyan, WHITE, 0.6)] },
        },
        grid3D: grid3D(18, 36, 210),
        xAxis3D: axis3D('x (mm)', { type: 'value', min: -100, max: 100 }),
        yAxis3D: axis3D('y (mm)', { type: 'value', min: -100, max: 100 }),
        zAxis3D: axis3D('z', { type: 'value', min: 0, max: 160, interval: 40 }),
        series: [Object.assign(o.series[0], { data, lineStyle: { width: 3.5, opacity: 1 } })],
    };
}, { example: 'robot tool path, colour = speed' });

// Scatter3DChart: process points of three recipes in temperature x pressure x speed
fromDefault('scatter3D', 'Scatter3DChart', o => {
    const g = generator(31);
    const recipes = [
        ['Cola 330 mL', C.accent, [78, 4.2, 520], [1.6, 0.18, 22]],
        ['Lemon 1.5 L', C.cyan, [72, 3.4, 360], [1.4, 0.15, 18]],
        ['Tonic 500 mL', C.violet, [84, 5.1, 440], [1.5, 0.2, 20]],
    ];
    const series = recipes.map(([name, color, mean, sd]) => {
        const data = [];
        for (let i = 0; i < 160; i++) data.push([r1(mean[0] + sd[0] * g.gauss()), r2(mean[1] + sd[1] * g.gauss()), Math.round(mean[2] + sd[2] * g.gauss())]);
        return Object.assign({}, o.series[0], { name, data, symbolSize: 5, itemStyle: { color, opacity: 0.9 } });
    });
    const outliers = [[90.5, 3.0, 310], [68.2, 5.6, 590], [88.9, 5.9, 330], [70.1, 2.9, 580], [91.4, 4.0, 510], [67.5, 4.8, 470]];
    series.push(Object.assign({}, o.series[0], { name: 'Out of window', data: outliers, symbolSize: 9, symbol: 'diamond', itemStyle: { color: C.alarm, opacity: 1 } }));
    return {
        tooltip: {},
        legend: Object.assign({ top: 0, data: series.map(s => s.name) }, LEGEND),
        grid3D: grid3D(16, 40, 235),
        xAxis3D: axis3D('°C', { type: 'value', min: 65, max: 95, interval: 10 }),
        yAxis3D: axis3D('bar', { type: 'value', min: 2.5, max: 6.5, interval: 1 }),
        zAxis3D: axis3D('bpm', { type: 'value', min: 300, max: 600, interval: 100 }),
        series,
    };
}, { example: 'temperature x pressure x speed' });

// ---- supply chain on a globe ------------------------------------------------------------

/** Faint latitude and longitude circles: there are no textures (no URLs), so they give the globe its shape. */
function graticule() {
    const data = [];
    for (let lat = -60; lat <= 60; lat += 30) {
        const coords = [];
        for (let lon = -180; lon <= 180; lon += 5) coords.push([lon, lat]);
        data.push({ coords });
    }
    for (let lon = -180; lon < 180; lon += 30) {
        const coords = [];
        for (let lat = -80; lat <= 80; lat += 5) coords.push([lon, lat]);
        data.push({ coords });
    }
    return { type: 'lines3D', coordinateSystem: 'globe', polyline: true, silent: true, lineStyle: { width: 1, color: alpha(WHITE, 0.16), opacity: 1 }, data };
}

const globe = (target, distance) => ({
    baseColor: mix(C.accent, C.card, 0.72),
    shading: 'lambert',
    environment: 'none',
    light: { main: { intensity: 1.15, alpha: 30, beta: 40 }, ambient: { intensity: 0.5 } },
    atmosphere: { show: true, color: C.accent, glowPower: 5, innerGlowPower: 2.5 },
    viewControl: camera(0, 0, distance, { targetCoord: target, alpha: undefined, beta: undefined }),
    globeRadius: 78,
    globeOuterRadius: 98, // the altitude range: the tallest column rises 20 units
});

const PLANT = { name: 'Meridian plant', value: [5.3, 51.6, 0] };

// GlobeChart: inbound suppliers, a column per supplier as high as its annual volume (bar3D on the globe)
const SUPPLIERS = [
    ['Sugar, Hamburg', 10.0, 53.6, 38], ['CO₂, Antwerp', 4.4, 51.2, 22], ['Glass, Lyon', 4.8, 45.8, 30],
    ['Cans, Milan', 9.2, 45.5, 26], ['Closures, Gdańsk', 18.6, 54.4, 12], ['Labels, Leeds', -1.5, 53.8, 9],
    ['Concentrate, São Paulo', -46.6, -23.5, 34], ['Citrus, Valencia', -0.4, 39.5, 18], ['Quinine, Lima', -77.0, -12.0, 7],
    ['PET resin, Houston', -95.4, 29.8, 24], ['Flavours, Mumbai', 72.9, 19.1, 11], ['Film, Istanbul', 29.0, 41.0, 10],
    ['Sugar, Recife', -34.9, -8.1, 16], ['Cans, Monterrey', -100.3, 25.7, 14], ['Citrus, Tangier', -5.8, 35.8, 8],
];
fromDefault('globe', 'GlobeChart', o => ({
    tooltip: { formatter: '{b}' },
    globe: globe([-12, 26], 118),
    visualMap: {
        show: false, dimension: 2, min: 5, max: 40, seriesIndex: 1,
        inRange: { color: [mix(C.cyan, C.card, 0.25), C.cyan, mix(C.cyan, WHITE, 0.6)] },
    },
    series: [
        graticule(),
        {
            type: 'bar3D', coordinateSystem: 'globe', name: 'Suppliers', barSize: 2.4, minHeight: 1, bevelSize: 0.3,
            shading: 'lambert', itemStyle: { opacity: 1 },
            emphasis: { itemStyle: { color: C.pink }, label: { show: true, formatter: '{b}', textStyle: { color: C.text, fontSize: 11, backgroundColor: alpha(C.card, 0.8), padding: [2, 4], borderRadius: 3 } } },
            data: SUPPLIERS.map(([name, lon, lat, volume]) => ({
                name: `${name}: ${volume} kt`, value: [lon, lat, volume],
                // a few suppliers carry a label (Europe is too crowded at this size); the tooltip names the others
                label: ['Hamburg', 'São Paulo', 'Houston'].includes(name.split(', ')[1]) ? { show: true, formatter: `${name.split(', ')[1]}  ${volume} kt`, distance: 1, textStyle: { color: C.text, fontSize: 10, backgroundColor: alpha(C.card, 0.75), padding: [2, 4], borderRadius: 3 } } : undefined,
            })),
        },
        Object.assign(o.series[0], {
            name: 'Plant', symbolSize: 14, symbol: 'diamond', itemStyle: { color: C.pink, opacity: 1 },
            data: [PLANT],
        }),
    ],
}), { example: 'supplier volumes as columns, plain globe' });

// Lines3DChart: outbound shipping lanes as arcs with moving trails
const DESTINATIONS = [
    ['New York', -74.0, 40.7], ['Montréal', -73.6, 45.5], ['Lagos', 3.4, 6.5], ['Dubai', 55.3, 25.2],
    ['Singapore', 103.8, 1.35], ['Cape Town', 18.4, -33.9], ['Mumbai', 72.9, 19.1], ['Santos', -46.3, -23.9],
    ['Reykjavík', -21.9, 64.1], ['Casablanca', -7.6, 33.6], ['Athens', 23.7, 38.0], ['Oslo', 10.7, 59.9],
];
fromDefault('lines3D', 'Lines3DChart', o => ({
    tooltip: { formatter: '{b}' },
    globe: globe([18, 24], 132),
    series: [
        graticule(),
        Object.assign(o.series[0], {
            name: 'Shipping lanes', blendMode: 'lighter',
            lineStyle: { width: 1.5, color: C.cyan, opacity: 0.55 },
            effect: { show: true, period: 3, trailWidth: 3, trailLength: 0.25, trailOpacity: 1, trailColor: mix(C.cyan, WHITE, 0.55) },
            data: DESTINATIONS.map(([name, lon, lat]) => ({ name: `Plant → ${name}`, coords: [PLANT.value.slice(0, 2), [lon, lat]] })),
        }),
        {
            type: 'scatter3D', coordinateSystem: 'globe', name: 'Ports', symbolSize: 6, itemStyle: { color: mix(C.cyan, WHITE, 0.5), opacity: 1 },
            data: DESTINATIONS.map(([name, lon, lat]) => ({ name, value: [lon, lat, 0] })),
        },
        {
            type: 'scatter3D', coordinateSystem: 'globe', name: 'Plant', symbolSize: 12, symbol: 'diamond', itemStyle: { color: C.pink, opacity: 1 },
            data: [PLANT],
        },
    ],
}), { example: 'shipping lanes from the plant' });

// ---- large data on WebGL ----------------------------------------------------------------

// GraphGLChart: the plant's tag network: SCADA server, PLCs, I/O racks and tags (radial layout, precomputed)
fromDefault('graphGL', 'GraphGLChart', o => {
    const g = generator(11);
    const plcs = ['PLC Syrup', 'PLC L1', 'PLC L2', 'PLC L3', 'PLC Packaging', 'PLC Utilities'];
    const colours = [C.cyan, C.accent, mix(C.accent, WHITE, 0.4), C.violet, C.pink, mix(C.cyan, WHITE, 0.45)];
    const nodes = [{ name: 'SCADA server', x: 0, y: 0, symbolSize: 18, itemStyle: { color: C.text } }];
    const edges = [];
    const tagNodes = [];
    plcs.forEach((plc, p) => {
        const a0 = (p / plcs.length) * 2 * Math.PI;
        const sector = 2 * Math.PI / plcs.length;
        const plcIndex = nodes.length;
        nodes.push({ name: plc, x: r1(120 * Math.cos(a0 + sector / 2)), y: r1(120 * Math.sin(a0 + sector / 2)), symbolSize: 13, itemStyle: { color: colours[p] } });
        edges.push({ source: 0, target: plcIndex });
        const racks = 5 + (p % 3);
        for (let r = 0; r < racks; r++) {
            const ar = a0 + sector * (r + 0.5) / racks;
            const rackIndex = nodes.length;
            nodes.push({ name: `${plc} / rack ${r + 1}`, x: r1(250 * Math.cos(ar)), y: r1(250 * Math.sin(ar)), symbolSize: 7, itemStyle: { color: colours[p] } });
            edges.push({ source: plcIndex, target: rackIndex });
            const tags = 6 + Math.floor(g.next() * 5);
            for (let t = 0; t < tags; t++) {
                const at = ar + (sector / racks) * ((t + 0.5) / tags - 0.5) * 0.9;
                const radius = 330 + 70 * g.next();
                const tagIndex = nodes.length;
                nodes.push({ name: `${plc} / rack ${r + 1} / tag ${t + 1}`, x: r1(radius * Math.cos(at)), y: r1(radius * Math.sin(at)), symbolSize: 3.5, itemStyle: { color: mix(colours[p], C.card, 0.15) } });
                edges.push({ source: rackIndex, target: tagIndex });
                tagNodes.push(tagIndex);
            }
        }
    });
    // cross references: interlocks and alarm pipelines that tie tags of different PLCs together
    for (let i = 0; i < 70; i++) {
        const a = tagNodes[Math.floor(g.next() * tagNodes.length)];
        const b = tagNodes[Math.floor(g.next() * tagNodes.length)];
        if (a !== b) edges.push({ source: a, target: b, lineStyle: { color: alpha(C.pink, 0.22) } });
    }
    const base = o.series[0];
    return {
        series: [Object.assign(base, {
            layout: 'none', forceAtlas2: undefined,
            left: 8, right: 8, top: 8, bottom: 8,
            nodes, edges,
            itemStyle: { opacity: 1 },
            lineStyle: { color: alpha(C.textSecondary, 0.28), width: 1 },
            symbolSize: 4,
        })],
    };
}, { example: 'plant tag network, 334 nodes' });

// FlowGLChart: airflow in the filling hall: two supply vents, one extract, a swirl behind the filler
fromDefault('flowGL', 'FlowGLChart', () => {
    const W = 60, Hh = 30, step = 1.5;
    const sources = [[-2, 8, 30], [-2, 22, 30], [62, 26, -42], [30, -2, 8]]; // x, y, strength (> 0 supply, < 0 extract)
    const vortices = [[30, 15, -14], [46, 8, 9]];                              // x, y, circulation
    const data = [];
    let maxMag = 0;
    for (let y = 0; y <= Hh; y += step) {
        for (let x = 0; x <= W; x += step) {
            let vx = 0.6, vy = 0;
            for (const [sx, sy, q] of sources) { const dx = x - sx, dy = y - sy, d2 = dx * dx + dy * dy + 4; vx += q * dx / d2; vy += q * dy / d2; }
            for (const [cx, cy, k] of vortices) { const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy + 6; vx += -k * dy / d2; vy += k * dx / d2; }
            const mag = Math.sqrt(vx * vx + vy * vy);
            maxMag = Math.max(maxMag, mag);
            data.push([x, y, r2(vx), r2(vy), r2(mag)]);
        }
    }
    return {
        visualMap: {
            show: true, dimension: 4, min: 0, max: 6, calculable: false, orient: 'horizontal', right: 8, top: 0,
            itemWidth: 10, itemHeight: 90, text: ['fast', 'slow'], textGap: 6, textStyle: { color: C.textMuted, fontSize: 10 },
            inRange: { color: [C.violet, C.accent, C.cyan, mix(C.cyan, WHITE, 0.7)] },
        },
        grid: { left: 34, right: 12, top: 28, bottom: 26 },
        xAxis: { type: 'value', min: 0, max: W, interval: 10, axisLabel: { formatter: '{value} m', fontSize: 10 }, splitLine: { lineStyle: { color: FAINT, type: 'dashed' } } },
        yAxis: { type: 'value', min: 0, max: Hh, interval: 10, axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { color: FAINT, type: 'dashed' } } },
        series: [
            {
                type: 'flowGL', data, particleDensity: 48, particleSpeed: 1.4, particleSize: 3, particleTrail: 0.8, supersampling: 2,
                gridWidth: Math.round(W / step) + 1, gridHeight: Math.round(Hh / step) + 1,
                itemStyle: { opacity: 1 },
            },
            {
                type: 'scatter', name: 'Vents', symbol: 'triangle', symbolSize: 11, z: 5,
                label: { show: true, position: 'right', formatter: '{b}', color: C.textSecondary, fontSize: 10 },
                data: [
                    { name: 'Supply 1', value: [0.8, 8], symbolRotate: -90, itemStyle: { color: C.cyan } },
                    { name: 'Supply 2', value: [0.8, 22], symbolRotate: -90, itemStyle: { color: C.cyan } },
                    { name: 'Extract', value: [59, 26], symbolRotate: -90, itemStyle: { color: C.pink }, label: { position: 'left' } },
                ],
            },
            {
                type: 'scatter', name: 'Filler', symbol: 'roundRect', symbolSize: [46, 22], z: 4, silent: true,
                itemStyle: { color: alpha(WHITE, 0.06), borderColor: C.borderStrong, borderWidth: 1.5 },
                label: { show: true, formatter: '{b}', color: C.textMuted, fontSize: 10 },
                data: [{ name: 'Filler', value: [30, 15] }],
            },
        ],
    };
}, { example: 'airflow in the filling hall' });

module.exports = { OPTIONS };
