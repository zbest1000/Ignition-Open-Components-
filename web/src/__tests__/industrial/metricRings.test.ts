import {
    MAX_RINGS, RING_PALETTE, TRACK_COLOR, buildRings, formatNumber, metricRingsBehavior, readMetrics, readThresholds,
    richText, summarize, thresholdColor, tooltipText, withUnit,
} from '../../industrial/metricRings';
import { Opt, expectPlainOption, fakeTree, throwingTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    metricRingsBehavior.buildOption(metricRingsBehavior.readProps(fakeTree(props)));
const series = (option: Opt, name: string): Opt => option.series.find((s: Opt) => s.name === name);
const rings = (option: Opt): Opt => series(option, 'rings');
const percents = (option: Opt): number[] => rings(option).data.map((d: Opt) => d.value);
const colors = (option: Opt): string[] => rings(option).data.map((d: Opt) => d.itemStyle.color);
const center = (option: Opt): Opt => option.title[0];
const list = (option: Opt): Opt[] => option.title.slice(2);
const listed = (option: Opt): Opt[] => list(option).filter((t: Opt) => t.text !== '');
const metric = (value: unknown, extra: Record<string, unknown> = {}): Record<string, unknown> => ({ name: 'M', value, ...extra });
const many = (n: number): unknown[] => Array.from({ length: n }, (_, i) => ({ name: `M${i + 1}`, value: (i + 1) * 5 }));
const TRAFFIC = [{ upTo: 60, color: 'red' }, { upTo: 85, color: 'orange' }, { color: 'green' }];
const TICK = 2.2 / 360 * 100;

describe('industrial MetricRings', () => {
    it('readProps applies the schema defaults', () => {
        const props = metricRingsBehavior.readProps(fakeTree({}));
        expect(props).toMatchObject({
            min: 0, max: 100, unit: '%', decimals: 0, centerTitle: 'Average load', centerValue: null, summary: 'average',
            thresholds: [], showLabels: true, labelPosition: 'bottom', showTargets: true, ringThickness: 0, ringGap: 25,
            startAngle: 90, sweep: 360,
        });
        expect((props.metrics as Opt[]).map(m => m.name)).toEqual(['Power', 'Steam', 'Chilled water', 'Compressed air']);
        expect(Object.keys(props)).toHaveLength(16);
    });

    it('draws one ring per metric on a 0-100 polar scale, outermost first', () => {
        const option = build({});
        expect(option.series.map((s: Opt) => s.name)).toEqual(['rings', 'targetOffset', 'target']);
        expect(rings(option)).toMatchObject({
            type: 'bar', coordinateSystem: 'polar', roundCap: true, showBackground: true,
            backgroundStyle: { color: TRACK_COLOR }, barCategoryGap: '25%',
        });
        expect(percents(option)).toEqual([73, 81, 54, 68]);
        expect(rings(option).data.map((d: Opt) => d.name)).toEqual(['Power', 'Steam', 'Chilled water', 'Compressed air']);
        expect(colors(option)).toEqual(RING_PALETTE.slice(0, 4));
        expect(option.angleAxis).toMatchObject({ type: 'value', min: 0, max: 100, startAngle: 90, endAngle: -270, clockwise: true, show: false });
        expect(option.radiusAxis).toMatchObject({ type: 'category', inverse: true, show: false, data: ['0', '1', '2', '3'] });
        expect(option.tooltip).toEqual({ trigger: 'item' });
        expect(rings(option).data[0].tooltip.formatter).toBe('{b}: <b>73%</b> (target 80%)');
    });

    it('places a value in its own or the shared range', () => {
        // (6.8 - 0) / 10 = 68 %; (7.5 - 4) / (14 - 4) = 35 %; (150 - 100) / (300 - 100) = 25 %
        const option = build({
            min: 100, max: 300, unit: 'rpm', decimals: 0,
            metrics: [
                metric(6.8, { min: 0, max: 10, unit: 'bar', decimals: 1 }),
                metric(7.5, { min: 4, max: 14, unit: '°C', decimals: 1 }),
                metric(150),
                metric('250'),
            ],
        });
        expect(percents(option)).toEqual([68, 35, 25, 75]);
        expect(listed(option).map(t => t.text)).toEqual(['{dot|●}6.8 bar', '{dot|●}7.5°C', '{dot|●}150 rpm', '{dot|●}250 rpm']);
    });

    it('clamps the ring, not the displayed value, and repairs unusable ranges', () => {
        const option = build({ metrics: [metric(140), metric(-20), metric(50, { min: 80, max: 20 }), metric(50, { min: 'x', max: null })] });
        expect(percents(option)).toEqual([100, 0, 50, 50]);
        expect(listed(option).map(t => t.text)).toEqual(['{dot|●}140%', '{dot|●}-20%', '{dot|●}50%', '{dot|●}50%']);
        // Shared range unusable as well: 0-100.
        expect(percents(build({ min: 5, max: 5, metrics: [metric(40)] }))).toEqual([40]);
        expect(percents(build({ min: 'a', max: {}, metrics: [metric(40)] }))).toEqual([40]);
    });

    it('summarises the metrics in the centre', () => {
        // Defaults 73, 81, 54, 68: mean 69; product 0.73 x 0.81 x 0.54 x 0.68 = 21.7 %; sum 276.
        expect(center(build({})).text).toBe('69%');
        expect(center(build({})).subtext).toBe('Average load');
        expect(center(build({ summary: 'product' })).text).toBe('22%');
        expect(center(build({ summary: 'product', decimals: 2 })).text).toBe('21.71%');
        expect(center(build({ summary: 'min' })).text).toBe('54%');
        expect(center(build({ summary: 'max' })).text).toBe('81%');
        expect(center(build({ summary: 'sum', unit: 'kW' })).text).toBe('276 kW');
        expect(center(build({ summary: 'bogus' })).text).toBe('69%');
        // "none" leaves the caption alone in the centre.
        expect(center(build({ summary: 'none' }))).toMatchObject({ text: 'Average load', subtext: '' });
        expect(center(build({ summary: 'none', centerTitle: '' }))).toMatchObject({ text: '', subtext: '' });

        expect(summarize([{ value: 10, fraction: 0.1 }, { value: 30, fraction: 0.5 }], 'average')).toBe(20);
        expect(summarize([{ value: 10, fraction: 0.1 }, { value: 30, fraction: 0.5 }], 'product')).toBeCloseTo(5, 10);
        expect(summarize([{ value: NaN, fraction: 0 }, { value: 30, fraction: 0.5 }], 'product')).toBe(50);
        expect(summarize([{ value: NaN, fraction: 0 }], 'sum')).toBeNaN();
        expect(summarize([], 'average')).toBeNaN();
        expect(summarize([{ value: 1, fraction: 1 }], 'none')).toBeNaN();
    });

    it('uses the fill of each ring for the product, whatever its unit', () => {
        // 5 of 0-10 bar is 50 %, 150 of 100-200 is 50 %: 25 %.
        const option = build({ summary: 'product', unit: 'bar', metrics: [metric(5, { max: 10 }), metric(150, { min: 100, max: 200 })] });
        expect(center(option).text).toBe('25%');
        // Values beyond the range count as a full or an empty ring.
        expect(center(build({ summary: 'product', metrics: [metric(140), metric(50)] })).text).toBe('50%');
    });

    it('shows an explicit centerValue instead of the summary', () => {
        expect(center(build({ centerValue: 42.46, decimals: 1, unit: 'bar' })).text).toBe('42.5 bar');
        expect(center(build({ centerValue: 0 })).text).toBe('0%');
        expect(center(build({ centerValue: '87.5' })).text).toBe('88%');
        expect(center(build({ centerValue: ' OK ' })).text).toBe('OK');
        expect(center(build({ centerValue: 'A{b|c}' })).text).toBe('Abc');
        for (const none of [null, '', '  ', {}, [], true]) expect(center(build({ centerValue: none })).text).toBe('69%');
    });

    it('sizes the centre value by its length and the room in the hole', () => {
        expect(center(build({ metrics: many(1) })).textStyle.fontSize).toBe(32);
        expect(center(build({ metrics: many(4) })).textStyle.fontSize).toBe(28);
        expect(center(build({ metrics: many(6) })).textStyle.fontSize).toBe(22);
        expect(center(build({ metrics: many(9) })).textStyle.fontSize).toBe(18);
        expect(center(build({ metrics: many(1), centerValue: 1234.5, decimals: 1, unit: 'kWh' })).textStyle.fontSize).toBe(20); // 11 chars
        expect(center(build({ metrics: many(1), centerValue: 12.5, decimals: 1, unit: 'bar' })).textStyle.fontSize).toBe(26); // 8 chars
    });

    it('colours rings by thresholds, which win over metric colours', () => {
        const bands = readThresholds(TRAFFIC);
        expect(bands).toEqual([{ upTo: 60, color: 'red' }, { upTo: 85, color: 'orange' }, { upTo: Infinity, color: 'green' }]);
        expect([0, 59.99, 60, 84.9, 85, 1000, -5].map(v => thresholdColor(bands, v)))
            .toEqual(['red', 'red', 'orange', 'orange', 'green', 'green', 'red']);
        expect(thresholdColor(bands, NaN)).toBeUndefined();
        // Order in the prop does not matter; without a catch-all band high values are not coloured.
        const unordered = readThresholds([{ upTo: 85, color: 'orange' }, { upTo: '60', color: 'red' }]);
        expect([10, 70, 90].map(v => thresholdColor(unordered, v))).toEqual(['red', 'orange', undefined]);
        expect(readThresholds([null, 'x', 5, {}, { upTo: 5 }, { upTo: 5, color: '' }, { upTo: 5, color: 7 }])).toEqual([]);
        expect(readThresholds('nope')).toEqual([]);

        const option = build({ thresholds: TRAFFIC, metrics: [metric(40, { color: '#123' }), metric(70), metric(90), metric(85)] });
        expect(colors(option)).toEqual(['red', 'orange', 'green', 'green']);
        // The value list shows the same colours.
        expect(listed(option).map(t => t.textStyle.rich.dot.color)).toEqual(['red', 'orange', 'green', 'green']);
        // No band for the value: the metric colour, then the palette.
        expect(colors(build({ thresholds: [{ upTo: 50, color: 'red' }], metrics: [metric(40), metric(70, { color: '#123' }), metric(90)] })))
            .toEqual(['red', '#123', RING_PALETTE[2]]);
    });

    it('lets a metric bring its own thresholds, in its own units', () => {
        const option = build({
            thresholds: TRAFFIC,
            metrics: [
                metric(6.8, { max: 10, thresholds: [{ upTo: 6, color: 'red' }, { color: 'green' }] }),
                metric(6.8, { max: 10 }),
                metric(90, { thresholds: [], color: '#123' }),
            ],
        });
        expect(colors(option)).toEqual(['green', 'red', '#123']);
    });

    it('marks targets with a short segment across the ring', () => {
        const option = build({});
        const offsets = series(option, 'targetOffset').data;
        const ticks = series(option, 'target').data;
        [80, 75, 70, 85].forEach((target, i) => {
            expect(offsets[i]).toBeCloseTo(target - TICK / 2, 10);
            expect(ticks[i]).toBeCloseTo(TICK, 10);
        });
        expect(series(option, 'targetOffset')).toMatchObject({ stack: 'target', barGap: '-100%', silent: true, itemStyle: { color: 'transparent' } });
        expect(series(option, 'target')).toMatchObject({ stack: 'target', barGap: '-100%', silent: true });

        // In the units of the metric; outside the range or unusable: no marker.
        const mixed = build({ metrics: [
            metric(5, { max: 10, target: 7, unit: 'bar', decimals: 1 }), metric(5, { target: 120 }), metric(5, { target: 'x' }),
            metric(5), metric(5, { target: 0 }), metric(5, { target: 100 }),
        ] });
        const t = series(mixed, 'target').data;
        expect(t.map((v: unknown) => v !== '-')).toEqual([true, false, false, false, true, true]);
        const o = series(mixed, 'targetOffset').data;
        expect(o[0]).toBeCloseTo(70 - TICK / 2, 10);
        expect(o[4]).toBe(0); // kept on the ring at its ends
        expect(o[5]).toBeCloseTo(100 - TICK, 10);
        expect(rings(mixed).data[0].tooltip.formatter).toBe('{b}: <b>5.0 bar</b> (target 7.0 bar)');
        expect(rings(mixed).data[1].tooltip.formatter).toBe('{b}: <b>5%</b>');

        const off = build({ showTargets: false });
        expect(series(off, 'target').data).toEqual([]);
        expect(series(off, 'targetOffset').data).toEqual([]);
        expect(rings(off).data[0].tooltip.formatter).toBe('{b}: <b>73%</b>');
        // A wider marker in value terms when the ring covers a smaller angle.
        expect(series(build({ sweep: 180 }), 'target').data[0]).toBeCloseTo(2.2 / 180 * 100, 10);
    });

    it('lists values and names below the rings in up to three columns', () => {
        const cells = (n: number): Array<[string, string]> => listed(build({ metrics: many(n) })).map(t => [t.left, t.top]);
        expect(cells(1)).toEqual([['50%', '88%']]);
        expect(cells(3)).toEqual([['16.6666666667%', '88%'], ['50%', '88%'], ['83.3333333333%', '88%']]);
        expect(cells(4)).toEqual([['34%', '76%'], ['66%', '76%'], ['34%', '88%'], ['66%', '88%']]);
        expect(cells(6).map(c => c[1])).toEqual(['76%', '76%', '76%', '88%', '88%', '88%']);
        expect(cells(9).map(c => c[1])).toEqual(['64%', '64%', '64%', '76%', '76%', '76%', '88%', '88%', '88%']);

        const four = build({});
        expect(four.polar).toEqual({ center: ['50%', '38%'], radius: ['36.04%', '68%'] });
        expect(center(four)).toMatchObject({ left: '50%', top: '35.5%', textAlign: 'center', textVerticalAlign: 'middle' });
        expect(listed(four)[2]).toMatchObject({ text: '{dot|●}54%', subtext: 'Chilled water', textAlign: 'center', textVerticalAlign: 'top' });
        // One row leaves more room for the rings than three.
        expect(build({ metrics: many(2) }).polar.radius[1]).toBe('80%');
        expect(build({ metrics: many(9) }).polar.radius[1]).toBe('56%');
    });

    it('lists the values to the right when asked', () => {
        const option = build({ labelPosition: 'right' });
        expect(option.polar.center).toEqual(['35%', '50%']);
        expect(option.polar.radius[1]).toBe('64%');
        expect(listed(option).map(t => [t.left, t.top, t.textAlign])).toEqual([
            ['73%', '23%', 'left'], ['73%', '38%', 'left'], ['73%', '53%', 'left'], ['73%', '68%', 'left'],
        ]);
        // Eight entries share 84 % of the height.
        const tops = listed(build({ labelPosition: 'right', metrics: many(8) })).map(t => parseFloat(t.top));
        for (let i = 1; i < tops.length; i++) expect(tops[i] - tops[i - 1]).toBeCloseTo(10.5, 8);
        expect(build({ labelPosition: 'sideways' }).polar.center).toEqual(['50%', '38%']);
    });

    it('always emits the same title slots, so a merged option leaves no stale text', () => {
        const keys = (t: Opt): string[] => Object.keys(t).sort();
        for (const props of [{}, { metrics: [] }, { metrics: many(1) }, { metrics: many(12) }, { showLabels: false }, { labelPosition: 'right' }]) {
            const option = build(props);
            expect(option.title).toHaveLength(11);
            for (const slot of list(option)) expect(keys(slot)).toEqual(keys(list(option)[0]));
            expect(keys(center(option))).toEqual(keys(list(option)[0]));
        }
        expect(listed(build({ metrics: many(1) }))).toHaveLength(1);
        expect(list(build({ metrics: many(1) }))[5]).toMatchObject({ text: '', subtext: '' });
    });

    it('summarises metrics that do not fit the list, and truncates long names', () => {
        const bottom = listed(build({ metrics: many(12) }));
        expect(bottom).toHaveLength(9);
        expect(bottom[7].subtext).toBe('M8');
        expect(bottom[8]).toMatchObject({ text: '+4 more', subtext: '' });
        const right = listed(build({ metrics: many(10), labelPosition: 'right' }));
        expect(right).toHaveLength(8);
        expect(right[7].text).toBe('+3 more');
        expect(listed(build({ metrics: many(9) }))[8].subtext).toBe('M9');
        const long = { name: 'Steam header pressure north', value: 5 };
        // The fewer columns, the more of a name fits.
        expect(listed(build({ metrics: [long] }))[0].subtext).toBe('Steam header pressure north');
        expect(listed(build({ metrics: [long, long, long, long] }))[0].subtext).toBe('Steam header pressure…');
        expect(listed(build({ metrics: [long, long, long] }))[0].subtext).toBe('Steam header pr…');
        expect(listed(build({ metrics: [long], labelPosition: 'right' }))[0].subtext).toBe('Steam header pres…');
        // The full name stays in the tooltip.
        expect(rings(build({ metrics: [{ name: 'Steam header pressure north', value: 5 }] })).data[0].name).toBe('Steam header pressure north');
    });

    it('hides the list and uses the room for the rings when showLabels is false', () => {
        const option = build({ showLabels: false });
        expect(listed(option)).toEqual([]);
        expect(option.polar).toEqual({ center: ['50%', '50%'], radius: ['46.64%', '88%'] });
        expect(center(option).text).toBe('69%');
    });

    it('chooses the thickness from the ring count unless ringThickness is set', () => {
        const hole = (props: Record<string, unknown>): number => {
            const [inner, outer] = build({ showLabels: false, ...props }).polar.radius.map(parseFloat);
            return Math.round(inner / outer * 100);
        };
        expect([1, 2, 3, 4, 5, 6, 8, 12].map(n => hole({ metrics: many(n) }))).toEqual([80, 68, 60, 53, 47, 43, 38, 32]);
        expect(hole({ ringThickness: 30 })).toBe(70);
        expect(hole({ ringThickness: 2 })).toBe(95);
        expect(hole({ ringThickness: 500 })).toBe(10);
        expect(hole({ ringThickness: -4 })).toBe(53);
        expect(hole({ ringThickness: 'thick' })).toBe(53);
    });

    it('applies ringGap, startAngle and sweep within their limits', () => {
        expect(rings(build({ ringGap: 0 })).barCategoryGap).toBe('0%');
        expect(rings(build({ ringGap: 400 })).barCategoryGap).toBe('90%');
        expect(rings(build({ ringGap: -3 })).barCategoryGap).toBe('0%');
        expect(series(build({ ringGap: 40 }), 'target').barCategoryGap).toBe('40%');
        expect(build({ startAngle: 225, sweep: 270 }).angleAxis).toMatchObject({ startAngle: 225, endAngle: -45 });
        expect(build({ sweep: 1000 }).angleAxis.endAngle).toBe(-270);
        expect(build({ sweep: 5 }).angleAxis.endAngle).toBe(60);
        expect(build({ startAngle: 'north', sweep: null }).angleAxis).toMatchObject({ startAngle: 90, endAngle: -270 });
    });

    it('skips unusable metrics and keeps a named one without a value as an empty ring', () => {
        const option = build({ metrics: [null, 5, 'x', [], {}, { name: '' }, { value: 'n/a' }, { name: 'Level' }, { value: 30 }, { name: 7, value: '60' }] });
        expect(rings(option).data.map((d: Opt) => d.name)).toEqual(['Level', 'Metric 2', '7']);
        expect(percents(option)).toEqual([0, 30, 60]);
        expect(listed(option).map(t => t.text)).toEqual(['{dot|●}–', '{dot|●}30%', '{dot|●}60%']);
        expect(center(option).text).toBe('45%'); // the empty ring is not part of the average
        expect(readMetrics({ metrics: [{ name: 'Level' }] })[0]).toMatchObject({ fraction: 0, ring: { text: '–', percent: 0, targetPercent: null } });
        expect(center(build({ metrics: [{ name: 'Level' }] })).text).toBe('Average load');
    });

    it('shows a notice instead of rings when there are no metrics', () => {
        for (const bad of [[], 'abc', 42, {}, [null], [{}]]) {
            const option = build({ metrics: bad });
            expect(option.title[1].text).toBe('No data');
            expect(rings(option).data).toEqual([]);
            expect(center(option)).toMatchObject({ text: '', subtext: '' });
            expect(listed(option)).toEqual([]);
            expectPlainOption(option);
        }
        expect(build({}).title[1].text).toBe('');
    });

    it(`draws at most ${MAX_RINGS} rings`, () => {
        const option = build({ metrics: many(40), summary: 'sum' });
        expect(percents(option)).toHaveLength(12);
        expect(center(option).text).toBe('390%'); // 5 + 10 + ... + 60
    });

    it('escapes units in tooltips and labels', () => {
        const option = build({ unit: '<b>{c}</b>', metrics: [metric(5, { target: 6 })] });
        expect(rings(option).data[0].tooltip.formatter).not.toMatch(/<b>\{c\}|\{c\}/);
        expect(rings(option).data[0].tooltip.formatter).toContain('&#60;b&#62;&#123;c&#125;');
        expect(listed(option)[0].text).toBe('{dot|●}5 <b>c</b>');
        expect(tooltipText('a&b "q" {c}')).toBe('a&#38;b &#34;q&#34; &#123;c&#125;');
        expect(richText('{a|b}')).toBe('ab');
    });

    it('formats numbers and units', () => {
        expect(formatNumber(1234567.891, 2)).toBe('1,234,567.89');
        expect(formatNumber(999.5, 0)).toBe('1,000');
        expect(formatNumber(-1234.5, 1)).toBe('-1,234.5');
        expect(formatNumber(-0.04, 1)).toBe('0.0');
        expect(formatNumber(0.5, 3)).toBe('0.500');
        expect(withUnit('5', '%')).toBe('5%');
        expect(withUnit('5', '°C')).toBe('5°C');
        expect(withUnit('5', 'bar')).toBe('5 bar');
        expect(withUnit('5', '')).toBe('5');
    });

    it('buildRings draws name/value rows in the hole when asked', () => {
        const option = buildRings({
            rings: [
                { name: 'A', percent: 40, text: '40%', color: '#111', targetPercent: null },
                { name: 'B', percent: 60, text: '60%', targetPercent: 50, targetText: '50%' },
            ],
            center: [50, 50], outerRadius: 75, innerRadius: 60, gap: 0, startAngle: 90, sweep: 360,
            holeLabels: { show: true, formatter: '{value}%', values: [40, 60], texts: [null, '60.0%'] },
        }) as Opt;
        expect(option.series.map((s: Opt) => s.name)).toEqual(['labels', 'rings', 'targetOffset', 'target']);
        expect(option.series[0]).toMatchObject({ type: 'gauge', center: ['50%', '50%'], radius: '75%', min: 0, max: 100, silent: true });
        expect(option.series[0].data).toEqual([
            { value: 40, name: 'A', title: { offsetCenter: ['0%', '-17%'] }, detail: { offsetCenter: ['0%', '-4%'] }, itemStyle: { color: '#111' } },
            { value: 60, name: 'B', title: { offsetCenter: ['0%', '13%'] }, detail: { offsetCenter: ['0%', '26%'], formatter: '60.0%' } },
        ]);
        expect(option.title).toBeUndefined();
        expect(option.series[1].data[1].itemStyle).toBeUndefined();
        expectPlainOption(option);
    });

    it('builds a plain option for odd numeric props', () => {
        for (const bad of [NaN, Infinity, -Infinity, -1, 1e9, '7', null]) {
            expectPlainOption(metricRingsBehavior.buildOption({
                ...metricRingsBehavior.readProps(fakeTree({})),
                min: bad as number, max: bad as number, decimals: bad as number, ringThickness: bad as number,
                ringGap: bad as number, startAngle: bad as number, sweep: bad as number,
            }));
        }
    });
});

/** Values a broken binding can plausibly deliver (the list of index.test.ts). */
const GARBAGE: unknown[] = [
    null, undefined, 'abc', '', 42, -1, NaN, Infinity, true, false,
    {}, { a: 1 }, { $columns: [{ name: 't', data: [1, 2] }], $: ['ds', 192, 0] },
    [], [null], [undefined], [1, 'x', null, {}, [], true], [[null]], [[]], [{}],
    [{ start: 'x', end: {}, name: null, lane: [], state: {}, date: 12, shift: null }],
    [{ name: {}, value: [], target: 'x', min: {}, max: [], ranges: 'x', thresholds: 5, color: 7, unit: {}, decimals: 'x' }],
    [{ name: 'a', value: Infinity, target: -Infinity, min: NaN, max: NaN, ranges: [NaN, null, {}], thresholds: [null, {}] }],
    [{ start: 5, end: 1 }], ['2025-13-45', 'nope'], [NaN, NaN],
];

describe('MetricRings with malformed props', () => {
    const behavior = metricRingsBehavior;

    it('reads only domain props and survives a throwing tree and nulls', () => {
        const paths: string[] = [];
        behavior.readProps(fakeTree({}, paths));
        const shared = ['option', 'theme', 'renderer', 'autoResize', 'resizeDebounceMs', 'notMerge', 'lazyUpdate', 'showLoading', 'loadingOptions', 'sanitizeTooltip'];
        for (const path of paths) expect(shared).not.toContain(path.split('.')[0]);
        expect(() => behavior.readProps(throwingTree())).not.toThrow();
        const nulls: Record<string, unknown> = {};
        Object.keys(behavior.readProps(fakeTree({}))).forEach(k => { nulls[k] = null; });
        expect(behavior.readProps(fakeTree(nulls))).toEqual(behavior.readProps(fakeTree({})));
    });

    it('is deterministic', () => {
        const props = behavior.readProps(fakeTree({}));
        const a = behavior.buildOption(props);
        expectPlainOption(a);
        expect(a).toEqual(behavior.buildOption(props));
    });

    it('never throws and always returns a plain option', () => {
        const defaults = behavior.readProps(fakeTree({})) as unknown as Record<string, unknown>;
        for (const key of Object.keys(defaults)) {
            for (const bad of GARBAGE) {
                expectPlainOption(behavior.buildOption(behavior.readProps(fakeTree({ [key]: bad }))));
                expectPlainOption(behavior.buildOption({ ...defaults, [key]: bad } as never));
            }
        }
        for (const bad of GARBAGE) {
            const all: Record<string, unknown> = {};
            Object.keys(defaults).forEach(k => { all[k] = bad; });
            expectPlainOption(behavior.buildOption(all as never));
        }
        expectPlainOption(behavior.buildOption({} as never));
    });
});
