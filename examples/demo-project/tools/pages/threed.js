'use strict';
/**
 * Pages/ThreeD: every ECharts-GL component of the module (3D and WebGL charts).
 *
 * They are on their own page, not in the Chart Gallery, because a browser allows a limited number
 * of WebGL contexts per page (Chromium: 16) and each GL chart holds one. Eleven fit with room to
 * spare. The options are in threed-options.js; Map3DChart and Polygons3DChart get the floor plan of
 * floor-plan.js through their `maps` prop.
 */
const { design, page, pageHeading, label } = require('../lib/ui');
const { OPTIONS } = require('./threed-options');
const { tiles } = require('./tiles');

const H = { plant: 440, chart: 404, globe: 420 };

const { tile, group, section, count } = tiles(OPTIONS);

const sections = [
    section('Plant', 'Plant Floor in 3D', 'the floor plan GeoJSON from the maps prop, extruded  ·  drag to rotate', [[
        group('A', H.plant, [tile('Zones', 'Energy by zone, extruded', 'map3D')]),
        group('B', H.plant, [tile('Equipment', 'Equipment footprints on the floor plan', 'polygons3D')]),
    ]]),

    section('Space', 'Paths, Points & Surfaces', 'grid3D with axes styled for the dark card', [[
        group('A', H.chart, [
            tile('ToolPath', 'Robot tool path', 'line3D'),
            tile('Recipes', 'Process window by recipe', 'scatter3D'),
        ]),
        group('B', H.chart, [
            tile('Bar3D', 'Output by machine and day', 'bar3D'),
            tile('Surface', 'Response surface', 'surface'),
        ]),
    ]]),

    section('Supply', 'Supply Chain', 'a plain globe: no textures, no downloads', [[
        group('A', H.globe, [tile('Suppliers', 'Inbound suppliers', 'globe')]),
        group('B', H.globe, [tile('Lanes', 'Outbound shipping lanes', 'lines3D')]),
    ]]),

    section('Large', 'Large Data on WebGL', 'thousands of marks drawn on the GPU', [[
        group('A', H.chart, [tile('ScatterGL', 'Cap torque, 6,000 points', 'scatterGL')]),
        group('B', H.chart, [
            tile('Tags', 'Tag network', 'graphGL'),
            tile('Airflow', 'Airflow in the filling hall', 'flowGL'),
        ]),
    ]]),
];

module.exports = {
    'Pages/ThreeD': page(null, [
        pageHeading('Reference', '3D & WebGL',
            'The ECharts-GL components, on one page because browsers limit WebGL contexts per page.', [
                label('Count', `${count()} charts`, { classes: 'Chip' }),
                label('Theme', design.chart.theme, { classes: 'Chip' }),
            ]),
        ...sections,
    ], { height: 2100 }),
};
