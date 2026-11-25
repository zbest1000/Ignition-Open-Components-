'use strict';
/**
 * The floor plan of the (invented) Meridian plant, as a small GeoJSON FeatureCollection in plain
 * x / y metres: no geography. The Chart Gallery (MapChart, LinesChart) and the 3D page
 * (Map3DChart, Polygons3DChart) register it through the components' `maps` prop under MAP_NAME
 * and refer to that name in `series.map`, `geo.map` or `geo3D.map`.
 *
 * Map names are global to the browser page, so every component that uses the plan registers the
 * same geometry under the same name. Set `aspectScale: 1` on the map / geo: the default of 0.75
 * is meant for latitude and would squash the plan.
 *
 * The building is 120 m x 62 m; y grows upwards (north).
 */

const MAP_NAME = 'meridian-floor';

/** Zone outlines, counter-clockwise, closed. */
const ZONES = {
    Warehouse: [[0, 0], [32, 0], [32, 62], [0, 62]],
    Packaging: [[32, 0], [70, 0], [70, 30], [32, 30]],
    'QA lab': [[70, 12], [92, 12], [92, 30], [70, 30]],
    Offices: [[70, 0], [120, 0], [120, 30], [92, 30], [92, 12], [70, 12]],
    'Filling hall': [[32, 30], [92, 30], [92, 62], [64, 62], [64, 46], [32, 46]],
    'Syrup room': [[32, 46], [64, 46], [64, 62], [32, 62]],
    Utilities: [[92, 30], [120, 30], [120, 62], [92, 62]],
};

/** A label point inside each zone (the centroid of an L-shape can fall outside it). */
const CENTRES = {
    Warehouse: [16, 31], Packaging: [51, 15], 'QA lab': [81, 21], Offices: [106, 15],
    'Filling hall': [74, 40], 'Syrup room': [48, 54], Utilities: [106, 46],
};

const close = ring => ring.concat([ring[0]]);

const GEOJSON = {
    type: 'FeatureCollection',
    features: Object.entries(ZONES).map(([name, ring]) => ({
        type: 'Feature',
        properties: { name, cp: CENTRES[name] },
        geometry: { type: 'Polygon', coordinates: [close(ring)] },
    })),
};

/** The `maps` prop value for a component that uses the plan. */
const maps = () => ({ [MAP_NAME]: JSON.parse(JSON.stringify(GEOJSON)) });

/** Equipment footprints on the plan (rectangles: x0, y0, x1, y1), for the 3D page. */
const EQUIPMENT = [
    // name, zone, rect, height (m)
    ['Syrup tank 1', 'Syrup room', [35, 50, 41, 58], 9],
    ['Syrup tank 2', 'Syrup room', [43, 50, 49, 58], 9],
    ['Mixer', 'Syrup room', [52, 50, 60, 57], 5],
    ['Rinser L1', 'Filling hall', [36, 38, 44, 43], 3],
    ['Filler L1', 'Filling hall', [46, 37, 56, 44], 4.5],
    ['Filler L2', 'Filling hall', [60, 33, 70, 40], 4.5],
    ['Filler L3', 'Filling hall', [74, 33, 84, 40], 4.5],
    ['Pasteuriser', 'Filling hall', [68, 48, 88, 58], 3.5],
    ['Labeller', 'Packaging', [36, 18, 50, 24], 2.5],
    ['Case packer', 'Packaging', [54, 18, 66, 26], 3],
    ['Palletiser', 'Packaging', [44, 4, 58, 13], 5],
    ['Rack A', 'Warehouse', [3, 4, 8, 58], 10],
    ['Rack B', 'Warehouse', [12, 4, 17, 58], 10],
    ['Rack C', 'Warehouse', [21, 4, 26, 58], 10],
    ['Boiler', 'Utilities', [96, 50, 106, 59], 7],
    ['Compressors', 'Utilities', [108, 50, 117, 58], 3],
    ['Chiller', 'Utilities', [96, 34, 108, 44], 4],
    ['Lab benches', 'QA lab', [73, 15, 89, 18], 1],
];

const rect = ([x0, y0, x1, y1]) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]];

module.exports = { MAP_NAME, GEOJSON, ZONES, CENTRES, EQUIPMENT, maps, rect };
