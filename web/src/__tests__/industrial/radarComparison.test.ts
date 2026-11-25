import * as fs from 'fs';
import * as path from 'path';
import { computeRadar, formatMetric, normalise, radarComparisonBehavior } from '../../industrial/radarComparison';
import { Opt, expectPlainOption, fakeTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    radarComparisonBehavior.buildOption(radarComparisonBehavior.readProps(fakeTree(props)));
const axis = (min: number, max: number, higherIsBetter = true) => ({ name: 'm', unit: '', min, max, higherIsBetter });
const METRICS = [{ name: 'A', min: 0, max: 10 }, { name: 'B', min: 0, max: 100 }, { name: 'C', min: 0, max: 1 }];

describe('industrial Radar Comparison', () => {
    it('readProps defaults match the prop schema', () => {
        const schema = JSON.parse(fs.readFileSync(path.resolve(
            __dirname, '../../../../common/src/main/resources/props/industrial-radar-comparison.props.json'), 'utf8'));
        const defaults = radarComparisonBehavior.readProps(fakeTree({})) as unknown as Record<string, unknown>;
        for (const key of Object.keys(defaults)) {
            expect({ [key]: schema.properties[key].default }).toEqual({ [key]: defaults[key] });
        }
        expect(schema.properties.metrics.description).toMatch(/Outward is always better/);
    });

    it('normalises each axis to its own range, inverting lower-is-better axes', () => {
        expect(normalise(40, axis(40, 100))).toBe(0);
        expect(normalise(100, axis(40, 100))).toBe(1);
        expect(normalise(78, axis(40, 100))).toBe(0.6333);   // 38 / 60
        expect(normalise(1.8, axis(0, 6, false))).toBe(0.7); // 1 - 1.8 / 6
        expect(normalise(0, axis(0, 6, false))).toBe(1);
        expect(normalise(6, axis(0, 6, false))).toBe(0);
        // outside the range: clamped
        expect(normalise(150, axis(40, 100))).toBe(1);
        expect(normalise(-5, axis(40, 100))).toBe(0);
        expect(normalise(9, axis(0, 6, false))).toBe(0);
        // missing value or empty range: centre
        expect(normalise(NaN, axis(0, 6))).toBe(0);
        expect(normalise(3, axis(5, 5))).toBe(0);
    });

    it('draws the default comparison with one radar series per entity and a dashed target', () => {
        const option = build({});
        expectPlainOption(option);
        expect(option.radar.indicator).toHaveLength(6);
        expect(option.radar.indicator.every((i: Opt) => i.min === 0 && i.max === 1)).toBe(true);
        expect(option.radar.indicator[0].name).toBe('OEE\n{range|40 → 100 %}');
        // inverted axis: the range is written centre value first, so high (worst) comes first
        expect(option.radar.indicator[3].name).toBe('Scrap\n{range|6 → 0 %}');
        expect(option.series.map((s: Opt) => s.name)).toEqual(['Line 1', 'Line 2', 'Line 3', 'Target']);
        expect(option.legend.data).toEqual(['Line 1', 'Line 2', 'Line 3', 'Target']);
        // Line 1: OEE (78-40)/60, throughput (1180-600)/800, FPY (97.2-85)/15,
        // scrap 1-1.8/6, changeover 1-(24-10)/50, energy 1-(0.62-0.4)/0.8
        expect(option.series[0].data[0].value).toEqual([0.6333, 0.725, 0.8133, 0.7, 0.72, 0.725]);
        expect(option.series[3].data[0].value).toEqual([0.75, 0.75, 0.8667, 0.6667, 0.8, 0.75]);
        expect(option.series[3].lineStyle.type).toBe('dashed');
        expect(option.series[3].areaStyle.opacity).toBe(0);
        expect(option.series[0].areaStyle.opacity).toBeGreaterThan(0);
        expect(option.title[1].text).toBe('');
        expect(option.color).toBeUndefined();
    });

    it('carries the real values, not the normalised ones, in the tooltips', () => {
        const option = build({});
        expect(option.series[0].tooltip.formatter).toBe(
            '<b>Line 1</b><br/>OEE: <b>78 %</b><br/>Throughput: <b>1,180 u/h</b><br/>First-pass yield: <b>97.2 %</b>'
            + '<br/>Scrap: <b>1.8 %</b><br/>Changeover: <b>24 min</b><br/>Energy: <b>0.62 kWh/u</b>');
        expect(option.series[3].tooltip.formatter).toContain('<b>Target</b><br/>OEE: <b>85 %</b>');
        expect(option.tooltip.trigger).toBe('item');
        for (const s of option.series) expect(s.tooltip.formatter).not.toContain('0.6333');
    });

    it('derives missing axis ranges from the data, padded by 20 % of the spread', () => {
        const model = computeRadar(
            ['Speed', { name: 'Yield' }, { name: 'Temp', min: 0 }, { name: 'Cost', max: 500 }, 'Flat', 'Below zero'],
            [{ name: 'a', values: [10, 95, 60, 300, 7, -4] }, { name: 'b', values: [20, 99, 80, 450, 7, -2] }],
            { values: [15, 100, 70, 200, 7, -3] });
        const ranges = model.axes.map(a => [a.min, a.max]);
        expect(ranges[0]).toEqual([8, 22]);            // 10..20, pad 2
        expect(ranges[1]).toEqual([94, 101]);          // 95..100 (target counts), pad 1
        expect(ranges[2]).toEqual([0, 84]);            // min given; 60..80, pad 4
        expect(ranges[3]).toEqual([150, 500]);         // max given; 200..450, pad 50
        expect(ranges[4]).toEqual([6, 8]);             // all equal: pad max(10 %, 1)
        expect(ranges[5][0]).toBeCloseTo(-4.4, 10);    // -4..-2, pad 0.4
        expect(ranges[5][1]).toBeCloseTo(-1.6, 10);
        // the automatic minimum does not go below zero for non-negative data
        expect(computeRadar(['x', 'y', 'z'], [{ values: [1, 0, 5] }, { values: [9, 10, 5] }], null).axes.map(a => a.min))
            .toEqual([0, 0, 4]);
        // nothing to derive from
        expect(computeRadar(['x', 'y', 'z'], [], null).axes[0]).toMatchObject({ min: 0, max: 1.2 });
    });

    it('repairs ranges given the wrong way round or empty, and one-sided ranges the data contradicts', () => {
        const series = [{ name: 'a', values: [5, 5, 5, 5] }];
        const axes = computeRadar([
            { name: 'swapped', min: 10, max: 0 }, { name: 'empty', min: 3, max: 3 },
            { name: 'min above data', min: 50 }, { name: 'max below data', max: -50 },
        ], series, null).axes;
        expect([axes[0].min, axes[0].max]).toEqual([0, 10]);
        expect([axes[1].min, axes[1].max]).toEqual([4, 6]);
        expect([axes[2].min, axes[2].max]).toEqual([50, 55]);
        expect([axes[3].min, axes[3].max]).toEqual([-55, -50]);
        for (const a of axes) expect(a.max).toBeGreaterThan(a.min);
    });

    it('aligns values to metrics: extra values ignored, missing ones at the centre and dashed in the tooltip', () => {
        const option = build({
            metrics: METRICS, target: {},
            series: [
                { name: 'long', values: [5, 50, 0.5, 99, 98] },
                { name: 'short', values: [10] },
                { name: 'holes', values: [null, '25', 'x'] },
                { name: 'nothing', values: [null, 'x'] },
                { name: 'no values' }, null, 'x', 7,
                { values: [1, 2, 0.3] },
            ],
        });
        expect(option.series.map((s: Opt) => s.name)).toEqual(['long', 'short', 'holes', 'Series 9']);
        expect(option.series[0].data[0].value).toEqual([0.5, 0.5, 0.5]);
        expect(option.series[1].data[0].value).toEqual([1, 0, 0]);
        expect(option.series[1].tooltip.formatter).toBe('<b>short</b><br/>A: <b>10</b><br/>B: <b>–</b><br/>C: <b>–</b>');
        expect(option.series[2].data[0].value).toEqual([0, 0.25, 0]);
    });

    it('needs three metrics: fewer give the notice with an explanation', () => {
        for (const metrics of [[], ['A'], ['A', 'B'], 'x', {}]) {
            const option = build({ metrics });
            expectPlainOption(option);
            expect(option.title[1].text).toBe('No data');
            expect(option.title[1].subtext).toBe('A radar chart needs at least 3 metrics');
            expect(option.series).toEqual([]);
            // the radar component stays valid (three blank axes) so a merge clears the previous chart
            expect(option.radar.indicator).toHaveLength(3);
            expect(option.radar.axisName.show).toBe(false);
            expect(option.legend.show).toBe(false);
        }
        const three = build({ metrics: ['A', 'B', 'C'], series: [{ name: 's', values: [1, 2, 3] }], target: {} });
        expect(three.title[1].text).toBe('');
        expect(three.series).toHaveLength(1);
    });

    it('shows plain "No data" when there are metrics but no usable series', () => {
        for (const series of [[], 'x', [{ name: 'a', values: [] }], [{ name: 'a', values: ['x'] }]]) {
            const option = build({ series });
            expect(option.title[1].text).toBe('No data');
            expect(option.title[1].subtext).toBeUndefined();
            expect(option.series).toEqual([]);
            expect(option.radar.indicator).toHaveLength(6);
        }
    });

    it('accepts the target as an object or a bare array, and omits it when unusable', () => {
        const base = { metrics: METRICS, series: [{ name: 's', values: [1, 2, 0.3] }] };
        const named = build({ ...base, target: { name: 'Goal', values: [8, 80, 0.8], color: '#ff00ff' } });
        expect(named.series[1].name).toBe('Goal');
        expect(named.series[1].data[0].value).toEqual([0.8, 0.8, 0.8]);
        expect(named.series[1].lineStyle.color).toBe('#ff00ff');
        const bare = build({ ...base, target: [8, 80, 0.8] });
        expect(bare.series[1].name).toBe('Target');
        expect(bare.series[1].tooltip.formatter).toBe('<b>Target</b><br/>A: <b>8</b><br/>B: <b>80</b><br/>C: <b>0.8</b>');
        for (const target of [{}, [], { values: [] }, { name: 'x' }, 'x', 5, { values: ['a'] }]) {
            expect(build({ ...base, target }).series).toHaveLength(1);
        }
    });

    it('handles many series, thinning the fill as they grow', () => {
        const many = [];
        for (let i = 0; i < 40; i++) many.push({ name: `M${i}`, values: [i % 10, i * 2, (i % 7) / 7] });
        const option = build({ metrics: METRICS, series: many, target: {} });
        expectPlainOption(option);
        expect(option.series).toHaveLength(40);
        expect(option.legend.type).toBe('scroll');
        expect(option.series[0].areaStyle.opacity).toBeLessThan(build({}).series[0].areaStyle.opacity);
    });

    it('applies fill, shape, legend, range, decimals, colours and title', () => {
        const option = build({
            fill: false, shape: 'circle', showLegend: false, showRange: false, colors: ['#111111', null, '#222222'], title: 'Lines',
        });
        expect(option.series[0].areaStyle.opacity).toBe(0);
        expect(option.radar.shape).toBe('circle');
        expect(option.legend.show).toBe(false);
        expect(option.radar.indicator[0].name).toBe('OEE');
        expect(option.color).toEqual(['#111111', '#222222']);
        expect(option.title[0].text).toBe('Lines');
        expect(build({ shape: 'star' }).radar.shape).toBe('polygon');

        const rounded = build({ decimals: 0, metrics: METRICS, series: [{ name: 's', values: [2.5, 33.333, 0.25] }], target: {} });
        expect(rounded.series[0].tooltip.formatter).toBe('<b>s</b><br/>A: <b>3</b><br/>B: <b>33</b><br/>C: <b>0</b>');
    });

    it('treats absurdly large values and bounds as missing', () => {
        const option = build({
            metrics: [{ name: 'A', min: -1e308, max: 1e308 }, 'B', 'C'],
            series: [{ name: 's', values: [1e308, 2, 3] }, { name: 't', values: [-1e308, 4, 5] }, { name: 'u', values: [5, 6, 7] }],
            target: {},
        });
        expectPlainOption(option);
        expect(option.series.map((s: Opt) => s.data[0].value[0])).toEqual([0, 0, 0.5]);
        expect(option.radar.indicator[0].name).toBe('A\n{range|4 \u2192 6}');
    });

    it('formats numbers without trailing zeros and with thousands separators', () => {
        expect(formatMetric(1234567.891, 2)).toBe('1,234,567.89');
        expect(formatMetric(97.2, 2)).toBe('97.2');
        expect(formatMetric(100, 2)).toBe('100');
        expect(formatMetric(1000, 0)).toBe('1,000');
        expect(formatMetric(-0.001, 2)).toBe('0');
        expect(formatMetric(-12.5, 1)).toBe('-12.5');
        expect(formatMetric(NaN, 2)).toBe('–');
        expect(formatMetric(0.5, NaN)).toBe('0.5');
    });

    it('neutralises markup and template variables in names', () => {
        const option = build({
            metrics: [{ name: '<i>{a}</i>', unit: '{b}', min: 0, max: 10 }, 'B', 'C'],
            series: [{ name: '<img src=x> {c}', values: [1, 2, 3] }], target: {},
        });
        expect(option.series[0].tooltip.formatter).toContain('<b>&lt;img src=x&gt; &#123;c&#125;</b>');
        expect(option.series[0].tooltip.formatter).toContain('&lt;i&gt;&#123;a&#125;&lt;/i&gt;: <b>1 &#123;b&#125;</b>');
        expect(option.radar.indicator[0].name).toBe('<i>{​a}</i>\n{range|0 → 10 {​b)}');
    });
});
