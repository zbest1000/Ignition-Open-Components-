/**
 * `echarts/core`, `echarts/charts`, `echarts/components` and
 * `echarts/renderers` are ES modules that Jest (CommonJS) cannot load, so the
 * tests run against the real, prebuilt full ECharts bundle instead. Everything
 * is already registered in that bundle, hence `use` is a no-op here.
 */
const echarts = require('echarts/dist/echarts.js');

module.exports = Object.assign({}, echarts, { use: () => {} });
