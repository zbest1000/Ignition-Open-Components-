import { computeWaterfall, waterfallAxisRange, waterfallBehavior, wrapLabel } from '../../industrial/waterfall';
import { Opt, expectPlainOption, fakeTree, throwingTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    waterfallBehavior.buildOption(waterfallBehavior.readProps(fakeTree(props)));

const values = (series: Opt): unknown[] => series.data.map((d: Opt) => (typeof d === 'object' ? d.value : d));

const GARBAGE: unknown[] = [
    null, undefined, 'abc', '', 42, -1, NaN, Infinity, true, false, {}, { a: 1 },
    [], [null], [1, 'x', null, {}, [], true], [[null]], [{}], [{ name: {}, value: 'x', type: 5 }],
    [{ value: Infinity }, { value: NaN, type: 'total' }], [{ type: 'subtotal' }],
];

describe('industrial Waterfall', () => {
    it('readProps applies the schema defaults', () => {
        const props = waterfallBehavior.readProps(fakeTree({}));
        expect(props).toMatchObject({
            title: '', unit: 'min', decimals: 0,
            increaseColor: '#3ba272', decreaseColor: '#ee6666', totalColor: '#5470c6',
            showValues: true, showConnectors: true, orientation: 'vertical', startAtZero: true,
        });
        expect((props.steps as unknown[]).length).toBe(8);
        expect(() => waterfallBehavior.readProps(throwingTree())).not.toThrow();
    });

    describe('running sum', () => {
        it('computes the default OEE time-loss bridge', () => {
            // 480 -38 = 442, -27 = 415 (subtotal), -31 = 384, -42 = 342, -14 = 328 (total)
            const bars = computeWaterfall(waterfallBehavior.readProps(fakeTree({})).steps);
            expect(bars.map(b => b.end)).toEqual([480, 442, 415, 415, 384, 342, 328, 328]);
            expect(bars.map(b => b.start)).toEqual([0, 480, 442, 0, 415, 384, 342, 0]);
            expect(bars.map(b => b.type)).toEqual(['total', 'delta', 'delta', 'subtotal', 'delta', 'delta', 'delta', 'total']);
            expect(bars[3]).toEqual({ name: 'Run time', type: 'subtotal', value: 415, start: 0, end: 415 });
        });

        it('starts at zero, so a chart may begin with a delta', () => {
            expect(computeWaterfall([{ name: 'a', value: 5 }, { name: 'b', value: -8 }, { name: 'c', type: 'total' }]))
                .toEqual([
                    { name: 'a', type: 'delta', value: 5, start: 0, end: 5 },
                    { name: 'b', type: 'delta', value: -8, start: 5, end: -3 },
                    { name: 'c', type: 'total', value: -3, start: 0, end: -3 },
                ]);
        });

        it('a total with a value sets the running sum; a subtotal ignores its value', () => {
            const bars = computeWaterfall([
                { name: 'a', value: 10 },
                { name: 's', value: 999, type: 'subtotal' },
                { name: 't', value: 100, type: 'total' },
                { name: 'b', value: -1 },
                { name: 'u', type: 'TOTAL ' },
            ]);
            expect(bars.map(b => b.end)).toEqual([10, 10, 100, 99, 99]);
            expect(bars[4].type).toBe('total');
        });

        it('does not accumulate floating point noise', () => {
            const bars = computeWaterfall([{ value: 0.1 }, { value: 0.2 }, { value: -0.3 }, { type: 'total' }]);
            expect(bars.map(b => b.end)).toEqual([0.1, 0.3, 0, 0]);
        });

        it('accepts numeric strings, skips unusable rows and names unnamed steps by position', () => {
            const bars = computeWaterfall([null, 7, { name: 'x', value: '12.5' }, { name: 'bad', value: 'n/a' }, { value: 1 }, { name: 3, type: 'bogus', value: 2 }]);
            expect(bars.map(b => [b.name, b.type, b.end])).toEqual([['x', 'delta', 12.5], ['#5', 'delta', 13.5], ['3', 'delta', 15.5]]);
            expect(computeWaterfall('nope')).toEqual([]);
            expect(computeWaterfall(null)).toEqual([]);
        });
    });

    describe('bar geometry', () => {
        it('lifts floating bars with a transparent base', () => {
            const option = build({});
            const [base, positive, negative] = option.series;
            expect(base.itemStyle.color).toBe('transparent');
            expect(base.silent).toBe(true);
            expect(new Set(option.series.slice(0, 3).map((s: Opt) => s.stack)).size).toBe(1);
            expect(base.data).toEqual([0, 442, 415, 0, 384, 342, 328, 0]);
            expect(values(positive)).toEqual([480, 38, 27, 415, 31, 42, 14, 328]);
            expect(values(negative)).toEqual(['-', '-', '-', '-', '-', '-', '-', '-']);
        });

        it('splits bars at zero when the running total goes negative and comes back', () => {
            // levels: 120 -> 30 -> -45 (subtotal) -> -75 -> 65 -> 65
            const option = build({
                steps: [
                    { name: 'Open', value: 120, type: 'total' }, { name: 'A', value: -90 }, { name: 'B', value: -75 },
                    { name: 'Sub', type: 'subtotal' }, { name: 'C', value: -30 }, { name: 'D', value: 140 }, { name: 'Close', type: 'total' },
                ],
            });
            const [base, positive, negative] = option.series;
            // A: 120 -> 30 above zero; B: 30 -> -45 crosses; Sub: 0 -> -45; C: -45 -> -75 below; D: -75 -> 65 crosses
            expect(base.data).toEqual([0, 30, 0, 0, -45, 0, 0]);
            expect(values(positive)).toEqual([120, 90, 30, '-', '-', 65, 65]);
            expect(values(negative)).toEqual(['-', '-', -45, -45, -30, -75, '-']);
            expect(base.markLine.data).toEqual([{ yAxis: 0 }]);
            expect(option.yAxis.min).toBeLessThan(-75);
            expect(option.yAxis.max).toBeGreaterThan(120);
        });

        it('colours increases, decreases and totals, and honours the colour props', () => {
            const steps = [{ name: 't', value: 10, type: 'total' }, { name: 'up', value: 5 }, { name: 'down', value: -3 }, { name: 's', type: 'subtotal' }];
            const colors = (o: Opt): string[] => o.series[1].data.map((d: Opt) => d.itemStyle.color);
            expect(colors(build({ steps }))).toEqual(['#5470c6', '#3ba272', '#ee6666', '#5470c6']);
            expect(colors(build({ steps, increaseColor: '#111111', decreaseColor: '#222222', totalColor: '#333333' })))
                .toEqual(['#333333', '#111111', '#222222', '#333333']);
            expect(colors(build({ steps, increaseColor: '', decreaseColor: '  ', totalColor: null }))).toEqual(['#5470c6', '#3ba272', '#ee6666', '#5470c6']);
        });
    });

    describe('labels, connectors and tooltips', () => {
        const labelSeries = (o: Opt): Opt => o.series.find((s: Opt) => s.name === 'values');
        const connectorSeries = (o: Opt): Opt => o.series.find((s: Opt) => s.name === 'connectors');

        it('labels deltas with a sign and totals without', () => {
            const labels = labelSeries(build({}));
            expect(labels.data.map((d: Opt) => d.name)).toEqual(['480', '−38', '−27', '415', '−31', '−42', '−14', '328']);
            expect(labels.data[1].value).toEqual([1, 480]);
            expect(labels.label.formatter).toBe('{b}');
            const signed = labelSeries(build({ steps: [{ value: 1.25 }, { value: -0.04 }, { value: 0 }, { type: 'total' }], decimals: 1 }));
            expect(signed.data.map((d: Opt) => d.name)).toEqual(['+1.3', '0.0', '0.0', '1.2']);
        });

        it('puts the label of a bar below zero underneath it', () => {
            const labels = labelSeries(build({ steps: [{ value: -20, type: 'total' }, { value: -30 }, { value: 70 }] }));
            expect(labels.data.map((d: Opt) => [d.value, d.label.position])).toEqual([
                [[0, -20], 'bottom'], [[1, -50], 'bottom'], [[2, 20], 'top'],
            ]);
        });

        it('showValues: false removes the labels', () => {
            expect(labelSeries(build({ showValues: false }))).toBeUndefined();
        });

        it('connects each bar to the next at the running total', () => {
            const connectors = connectorSeries(build({ steps: [{ value: 10, type: 'total' }, { value: -4 }, { type: 'total' }] }));
            expect(connectors.data).toEqual([[0, 10], [1, 10], null, [1, 6], [2, 6]]);
            expect(connectors.silent).toBe(true);
            expect(connectorSeries(build({ showConnectors: false }))).toBeUndefined();
        });

        it('draws no connector into a total that restates the running sum', () => {
            const connectors = connectorSeries(build({ steps: [{ value: 10 }, { value: 50, type: 'total' }, { value: 1 }] }));
            expect(connectors.data).toEqual([[1, 50], [2, 50]]);
        });

        it('tooltips show the delta and the running total, with the unit escaped', () => {
            const option = build({ steps: [{ name: 'a', value: 10, type: 'total' }, { name: 'b', value: -4 }], unit: '<b>{c}' });
            const unit = '&#60;b&#62;&#123;c&#125;';
            expect(option.series[1].data[0].tooltip.formatter).toBe(`{b}<br/><b>10 ${unit}</b>`);
            expect(option.series[1].data[1].tooltip.formatter).toBe(`{b}<br/><b>−4 ${unit}</b><br/>Running total: 6 ${unit}`);
            expect(option.yAxis.name).toBe('<b>{c}');
            expect(option.tooltip.trigger).toBe('item');
        });
    });

    describe('axes and layout', () => {
        it('vertical: categories on x, wrapped; value axis named by the unit', () => {
            const option = build({});
            expect(option.xAxis.type).toBe('category');
            expect(option.xAxis.data[5]).toBe('Reduced\nspeed');
            expect(option.xAxis.axisLine.onZero).toBe(false);
            expect(option.yAxis).toMatchObject({ type: 'value', name: 'min', min: 0, max: 600, interval: 200 });
        });

        it('horizontal: categories on y, first step on top, coordinates swapped', () => {
            const option = build({ orientation: 'Horizontal', steps: [{ name: 'A long step name', value: 10, type: 'total' }, { name: 'b', value: -4 }] });
            expect(option.yAxis).toMatchObject({ type: 'category', inverse: true, data: ['A long step name', 'b'] });
            expect(option.xAxis.type).toBe('value');
            const labels = option.series.find((s: Opt) => s.name === 'values');
            expect(labels.data[1]).toMatchObject({ value: [10, 1], label: { position: 'right' } });
            expect(option.series.find((s: Opt) => s.name === 'connectors').data).toEqual([[10, 0], [10, 1]]);
        });

        it('rotates instead of wrapping when there are many bars', () => {
            const steps = Array.from({ length: 12 }, (_, i) => ({ name: `Cost centre ${i}`, value: i - 5 }));
            const option = build({ steps });
            expect(option.xAxis.data[3]).toBe('Cost centre 3');
            expect(option.xAxis.axisLabel.rotate).toBe(40);
        });

        it('startAtZero: false zooms in on the running total', () => {
            const steps = [{ name: 'a', value: 10400, type: 'total' }, { name: 'b', value: -120 }, { name: 'c', value: 260 }, { name: 'd', type: 'total' }];
            expect(build({ steps }).yAxis.min).toBe(0);
            const zoomed = build({ steps, startAtZero: false }).yAxis;
            expect(zoomed.min).toBeGreaterThan(10000);
            expect(zoomed.min).toBeLessThan(10280);
            expect(zoomed.max).toBeGreaterThan(10540);
            // ... but never when the running total touches or crosses zero
            const crossing = [{ name: 'a', value: 5 }, { name: 'b', value: -8 }];
            expect(build({ steps: crossing, startAtZero: false }).yAxis.min).toBeLessThan(-3);
            expect(build({ steps: crossing, startAtZero: false }).yAxis.max).toBeGreaterThan(5);
        });

        it('waterfallAxisRange rounds outwards to a round interval and stops at zero', () => {
            expect(waterfallAxisRange(0, 480, 0, 0.12)).toEqual({ min: 0, max: 600, interval: 200 });
            expect(waterfallAxisRange(-75, 120, 0.12, 0.12)).toEqual({ min: -100, max: 150, interval: 50 });
            expect(waterfallAxisRange(-50, 0, 0.12, 0)).toEqual({ min: -60, max: 0, interval: 20 });
            const flat = waterfallAxisRange(0, 0, 0, 0);
            expect(flat.max).toBeGreaterThan(flat.min);
        });

        it('wrapLabel breaks at spaces, at most three lines', () => {
            expect(wrapLabel('Run time')).toBe('Run time');
            expect(wrapLabel('Scrap & rework')).toBe('Scrap &\nrework');
            expect(wrapLabel('Compressed air leaks fixed during the weekend shift')).toBe('Compressed\nair leaks\nfixed…');
            expect(wrapLabel('')).toBe('');
        });

        it('shows the title and the "No data" notice', () => {
            expect(build({ title: 'OEE losses' }).title[0].text).toBe('OEE losses');
            expect(build({}).title[1].text).toBe('');
            for (const steps of [[], 'x', 42, [{ name: 'only bad', value: 'x' }]]) {
                const option = build({ steps });
                expect(option.title[1].text).toBe('No data');
                expectPlainOption(option);
            }
        });
    });

    it('is plain, deterministic and never throws on malformed props', () => {
        const defaults = waterfallBehavior.readProps(fakeTree({})) as unknown as Record<string, unknown>;
        const a = waterfallBehavior.buildOption(defaults as never);
        expectPlainOption(a);
        expect(a).toEqual(waterfallBehavior.buildOption(waterfallBehavior.readProps(fakeTree({}))));
        for (const key of Object.keys(defaults)) {
            for (const bad of GARBAGE) {
                expectPlainOption(build({ [key]: bad }));
                expectPlainOption(waterfallBehavior.buildOption({ ...defaults, [key]: bad } as never));
            }
        }
        for (const bad of GARBAGE) {
            const all: Record<string, unknown> = {};
            Object.keys(defaults).forEach(k => { all[k] = bad; });
            expectPlainOption(waterfallBehavior.buildOption(all as never));
        }
        expectPlainOption(waterfallBehavior.buildOption({} as never));
    });

    it('handles a long bridge', () => {
        const steps = Array.from({ length: 5000 }, (_, i) => ({ name: `s${i}`, value: (i % 7) - 3 }));
        const option = build({ steps });
        expect(option.series[0].data.length).toBe(5000);
        expectPlainOption(option);
    });
});
