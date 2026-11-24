import { computeDelta, kpiTileBehavior, readHistory } from '../../industrial/kpiTile';
import { Opt, expectPlainOption, fakeTree, throwingTree } from './helpers';

/** The sample a freshly dropped tile shows (the schema defaults for the props that fall back to null). */
const SAMPLE = { value: 1284, previous: 1210 };
const build = (props: Record<string, unknown>): Opt =>
    kpiTileBehavior.buildOption(kpiTileBehavior.readProps(fakeTree({ ...SAMPLE, ...props })));
const titleRow = (option: Opt): Opt => option.title[0];
const valueRow = (option: Opt): Opt => option.title[1];
const deltaRow = (option: Opt): Opt => option.title[2];
const line = (option: Opt): Opt => option.series[0];
const deltaColor = (option: Opt): string => deltaRow(option).textStyle.rich.delta.color;
const MUTED = '#8c8c8c';

describe('industrial KpiTile', () => {
    it('readProps applies the defaults; value, previous and target stay null when unset', () => {
        const props = kpiTileBehavior.readProps(fakeTree({}));
        expect(props).toMatchObject({
            title: 'Throughput', value: null, unit: 'units/h', decimals: 0, previous: null, target: null,
            deltaFormat: 'percent', deltaLabel: '', higherIsBetter: true, showSparkline: true,
            color: '#5470c6', goodColor: '#3ba272', badColor: '#e05252',
        });
        expect(props.history).toHaveLength(24);
        expect(Object.keys(props)).toHaveLength(14);
    });

    it('lays out title, value with unit, and delta as three text rows above the sparkline', () => {
        const option = build({});
        expect(option.title).toHaveLength(3);
        expect(titleRow(option)).toMatchObject({ text: 'Throughput', left: 10, top: 8, textStyle: { fontSize: 12, fontWeight: 'normal' } });
        expect(valueRow(option)).toMatchObject({ text: '1,284{unit| units/h}', top: 24, textStyle: { fontSize: 28, fontWeight: 'bold' } });
        expect(valueRow(option).textStyle.rich.unit.fontSize).toBe(12);
        expect(deltaRow(option)).toMatchObject({ text: '{delta|▲ 6.1%}{label|  vs previous}', top: 56 });
        expect(option.grid.top).toBeGreaterThanOrEqual(56 + 14);
        // Text colours are left to the theme, except the muted and the good/bad ones.
        expect(titleRow(option).textStyle.color).toBeUndefined();
        expect(valueRow(option).textStyle.color).toBeUndefined();
        // No element is HTML or a function: titles, one grid, a line and a scatter series.
        expect(Object.keys(option).sort()).toEqual(['grid', 'series', 'title', 'tooltip', 'xAxis', 'yAxis']);
        expect(option.series.map((s: Opt) => s.type)).toEqual(['line', 'scatter']);
    });

    it('computes the delta against previous, or against target when there is no previous', () => {
        // 1284 vs 1210: +74, +6.1157 %
        expect(computeDelta(1284, 1210, null, true, 0)).toEqual({ basis: 'previous', difference: 74, percent: 6.11570247934, direction: 'up', good: true });
        expect(computeDelta(1284, 1210, 1500, true, 0)).toMatchObject({ basis: 'previous', difference: 74 });
        expect(computeDelta(1284, null, 1500, true, 0)).toMatchObject({ basis: 'target', difference: -216, percent: -14.4, direction: 'down', good: false });
        expect(computeDelta(1284, 'n/a', '1000', true, 0)).toMatchObject({ basis: 'target', difference: 284, percent: 28.4 });
        // Lower is better: a decrease is good.
        expect(computeDelta(3.1, 3.5, null, false, 1)).toMatchObject({ direction: 'down', good: true });
        expect(computeDelta(3.9, 3.5, null, false, 1)).toMatchObject({ direction: 'up', good: false });
        // A negative reference: the sign of the percentage follows the change.
        expect(computeDelta(-50, -100, null, true, 0)).toMatchObject({ difference: 50, percent: 50, direction: 'up', good: true });
        // No change at the displayed precision is neither good nor bad.
        expect(computeDelta(10.04, 10, null, true, 1)).toMatchObject({ direction: 'flat', good: null });
        expect(computeDelta(10.04, 10, null, true, 2)).toMatchObject({ direction: 'up', good: true });
        expect(Number.isNaN(computeDelta(5, 0, null, true, 0)!.percent)).toBe(true);
        expect(computeDelta(0.3, 0.1, null, true, 1)!.difference).toBe(0.2); // not 0.19999999999999998
        expect(computeDelta(NaN, 5, 5, true, 0)).toBeNull();
        expect(computeDelta(5, null, undefined, true, 0)).toBeNull();
        expect(computeDelta(5, {}, [], true, 0)).toBeNull();
    });

    it('writes the delta with an arrow, in the good or bad colour', () => {
        expect(deltaColor(build({}))).toBe('#3ba272');
        expect(deltaRow(build({ value: 1100 })).text).toBe('{delta|▼ 9.1%}{label|  vs previous}'); // -110 / 1210
        expect(deltaColor(build({ value: 1100 }))).toBe('#e05252');
        expect(deltaColor(build({ value: 1100, higherIsBetter: false }))).toBe('#3ba272');
        expect(deltaColor(build({ higherIsBetter: false }))).toBe('#e05252');
        expect(deltaColor(build({ goodColor: '#0f0' }))).toBe('#0f0');
        expect(deltaColor(build({ value: 1100, badColor: '#f00' }))).toBe('#f00');
        expect(deltaColor(build({ goodColor: '' }))).toBe('#3ba272');
        const flat = build({ value: 1210 });
        expect(deltaRow(flat).text).toBe('{delta|– 0.0%}{label|  vs previous}');
        expect(deltaColor(flat)).toBe(MUTED);
    });

    it('formats the delta as a percentage or an absolute difference', () => {
        expect(deltaRow(build({ deltaFormat: 'absolute' })).text).toBe('{delta|▲ 74 units/h}{label|  vs previous}');
        expect(deltaRow(build({ deltaFormat: 'absolute', value: 3.42, previous: 3.9, unit: '%', decimals: 2 })).text)
            .toBe('{delta|▼ 0.48%}{label|  vs previous}');
        expect(deltaRow(build({ deltaFormat: 'weird' })).text).toBe('{delta|▲ 6.1%}{label|  vs previous}');
        // No percentage of zero: the difference is shown instead.
        expect(deltaRow(build({ value: 12, previous: 0 })).text).toBe('{delta|▲ 12 units/h}{label|  vs previous}');
        expect(deltaRow(build({ previous: null, target: 1500 })).text).toBe('{delta|▼ 14.4%}{label|  vs target}');
        expect(deltaRow(build({ deltaLabel: ' vs last shift ' })).text).toBe('{delta|▲ 6.1%}{label|  vs last shift}');
        expect(deltaRow(build({ value: 25000, previous: 100 })).text).toBe('{delta|▲ 24,900.0%}{label|  vs previous}');
    });

    it('shows no delta without a reference, and keeps the row', () => {
        for (const props of [{ previous: null }, { previous: 'x', target: {} }, { value: 'x', history: [] }]) {
            const option = build(props);
            expect(option.title).toHaveLength(3);
            expect(deltaRow(option).text).toBe('');
            expect(Object.keys(deltaRow(option)).sort()).toEqual(Object.keys(deltaRow(build({}))).sort());
        }
    });

    it('formats the value and shrinks long numbers', () => {
        expect(valueRow(build({ value: 3.456, decimals: 2, unit: '%' })).text).toBe('3.46{unit| %}');
        expect(valueRow(build({ value: 12, unit: '' })).text).toBe('12');
        expect(valueRow(build({ value: '77.5', decimals: 1, unit: '{kW}' })).text).toBe('77.5{unit| kW}');
        expect(valueRow(build({ value: 123 })).textStyle.fontSize).toBe(28);
        expect(valueRow(build({ value: 1234567 })).textStyle.fontSize).toBe(24); // "1,234,567"
        expect(valueRow(build({ value: 1234567.8, decimals: 1 })).textStyle.fontSize).toBe(20);
        expect(valueRow(build({ decimals: 99 })).text).toBe('1,284.0000000000{unit| units/h}');
    });

    it('falls back to the last history point, then to a dash', () => {
        expect(valueRow(build({ value: null })).text).toBe('1,284{unit| units/h}');
        expect(valueRow(build({ value: 'n/a', history: [5, 6, 'x', 7.2, null] })).text).toBe('7{unit| units/h}');
        expect(deltaRow(build({ value: null, history: [5, 6], previous: 5 })).text).toBe('{delta|▲ 20.0%}{label|  vs previous}');
        const none = build({ value: null, history: [] });
        expect(valueRow(none).text).toBe('–');
        expect(deltaRow(none).text).toBe('');
        expect(line(none).data).toEqual([]);
    });

    it('reads history as numbers, pairs or objects', () => {
        expect(readHistory([1, '2', 3.5])).toEqual([1, 2, 3.5]);
        expect(readHistory([[1700000000000, 4], ['2025-01-01', '5'], [6]])).toEqual([4, 5, 6]);
        expect(readHistory([{ t_stamp: 1, value: 7 }, { value: '8' }, { v: 9 }])).toEqual([7, 8]);
        expect(readHistory([null, undefined, 'x', NaN, Infinity, {}, [], true, 2])).toEqual([2]);
        for (const bad of [null, 'abc', 5, {}]) expect(readHistory(bad)).toEqual([]);
    });

    it('draws the history as a sparkline with its last point marked', () => {
        const option = build({ history: [10, 14, 12, 20] });
        expect(line(option)).toMatchObject({ type: 'line', data: [10, 14, 12, 20], showSymbol: false, lineStyle: { color: '#5470c6' } });
        expect(option.series[1].data).toEqual([[3, 20]]);
        expect(option.xAxis).toMatchObject({ type: 'category', show: false, data: [0, 1, 2, 3] });
        // The scale is the data range plus 12 % on either side: 10..20 -> 8.8..21.2
        expect(option.yAxis).toMatchObject({ type: 'value', show: false, min: 8.8, max: 21.2 });
        expect(line(option).tooltip.formatter).toBe('<b>{c}</b> units/h');
        expect(line(build({ unit: '' })).tooltip.formatter).toBe('<b>{c}</b>');
        expect(line(build({ unit: '<b>' })).tooltip.formatter).toBe('<b>{c}</b> &#60;b&#62;');
        expect(line(build({ color: '#123' })).lineStyle.color).toBe('#123');
        expect(build({ color: '#123' }).series[1].itemStyle.color).toBe('#123');
        // A flat history still gets a scale.
        expect(build({ history: [50, 50, 50] }).yAxis).toMatchObject({ min: 47.5, max: 52.5 });
        expect(build({ history: [0, 0] }).yAxis).toMatchObject({ min: -1, max: 1 });
    });

    it('hides the sparkline when asked or when there are fewer than two points', () => {
        for (const props of [{ showSparkline: false }, { history: [5] }, { history: [] }, { history: 'x' }]) {
            const option = build(props);
            expect(line(option).data).toEqual([]);
            expect(option.series[1].data).toEqual([]);
            expect(option.xAxis.data).toEqual([]);
            expect(option.yAxis).toMatchObject({ min: 0, max: 1 });
            expect(valueRow(option).text).toBe('1,284{unit| units/h}');
        }
    });

    it('draws the target as a dashed line when it is near the history', () => {
        const near = build({ history: [10, 14, 12, 20], target: 25 });
        expect(line(near).markLine.data).toEqual([{ yAxis: 25 }]);
        expect(line(near).markLine.lineStyle.type).toBe('dashed');
        // The scale grows to hold it: 10..25 -> 8.2..26.8
        expect(near.yAxis).toMatchObject({ min: 8.2, max: 26.8 });
        expect(line(build({ history: [10, 14, 12, 20], target: 30 })).markLine.data).toEqual([{ yAxis: 30 }]); // one range above
        // Further away it would flatten the sparkline, so it is left out.
        const far = build({ history: [10, 14, 12, 20], target: 31 });
        expect(line(far).markLine.data).toEqual([]);
        expect(far.yAxis).toMatchObject({ min: 8.8, max: 21.2 });
        expect(line(build({ history: [10, 14, 12, 20], target: -1 })).markLine.data).toEqual([]);
        expect(line(build({ history: [10, 14, 12, 20] })).markLine.data).toEqual([]);
        expect(line(build({ history: [10, 14, 12, 20], target: 'x' })).markLine.data).toEqual([]);
    });

    it('handles a large history in one pass', () => {
        const history = Array.from({ length: 200000 }, (_, i) => Math.sin(i / 50) * 10 + 100);
        const option = build({ history, value: null });
        expect(line(option).data).toHaveLength(200000);
        expect(line(option).sampling).toBe('lttb');
        expect(option.yAxis.min).toBeLessThan(90);
        expect(option.yAxis.max).toBeGreaterThan(110);
    });

    it('strips rich text markup from texts', () => {
        const option = build({ title: 'Line {a|1}', deltaLabel: '{x|y}' });
        expect(titleRow(option).text).toBe('Line a1');
        expect(deltaRow(option).text).toBe('{delta|▲ 6.1%}{label|  xy}');
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

describe('KpiTile with malformed props', () => {
    const behavior = kpiTileBehavior;

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
