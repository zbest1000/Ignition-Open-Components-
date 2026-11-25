import { bulletChartBehavior, computeBullets } from '../../industrial/bulletChart';
import { Opt, expectPlainOption, fakeTree, throwingTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    bulletChartBehavior.buildOption(bulletChartBehavior.readProps(fakeTree(props)));
const series = (option: Opt, name: string): Opt => option.series.find((s: Opt) => s.name === name);
const bars = (option: Opt): unknown[] => series(option, 'actual').data.map((d: Opt) => d.value);
const barColors = (option: Opt): string[] => series(option, 'actual').data.map((d: Opt) => d.itemStyle.color);
const band = (option: Opt, index: number): unknown[] => series(option, `band${index}`).data.map((d: Opt) => d.value);
const bandColors = (option: Opt, index: number): unknown[] => series(option, `band${index}`).data.map((d: Opt) => d.itemStyle?.color);
const GREYS = ['rgba(128,128,128,0.45)', 'rgba(128,128,128,0.28)', 'rgba(128,128,128,0.14)'];
const STATUS = ['red', 'orange', 'green'];
const one = (item: Record<string, unknown>, props: Record<string, unknown> = {}): Opt => build({ items: [{ name: 'A', ...item }], ...props });

describe('industrial BulletChart', () => {
    it('readProps applies the schema defaults', () => {
        const props = bulletChartBehavior.readProps(fakeTree({}));
        expect(props).toMatchObject({
            title: '', orientation: 'horizontal', unit: 'pcs', decimals: 0, percentOfTarget: false, ranges: [75, 95],
            bandColors: GREYS, color: '#5470c6', statusColors: [], targetColor: '#262626', showValues: true,
        });
        expect((props.items as Opt[]).map(i => i.name)).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4']);
        expect(Object.keys(props)).toHaveLength(12);
    });

    it('derives scale, bands and status of each item', () => {
        // Line 1: target 1200 -> scale to 1440 (120 %), bands at 900 (75 %) and 1140 (95 %); 1180 is in the top band.
        expect(computeBullets([{ name: 'Line 1', value: 1180, target: 1200 }], [75, 95])).toEqual([
            { name: 'Line 1', value: 1180, target: 1200, max: 1440, bounds: [900, 1140], band: 2, color: undefined },
        ]);
        const row = (item: Record<string, unknown>, ranges: unknown = [75, 95]): Opt => computeBullets([item], ranges)[0];
        expect(row({ value: 540, target: 900 })).toMatchObject({ max: 1080, bounds: [675, 855], band: 0 });
        expect(row({ value: 700, target: 900 })).toMatchObject({ band: 1 });
        expect(row({ value: 675, target: 900 }).band).toBe(1); // a boundary belongs to the band above it
        // The scale is extended to hold a value beyond 120 % of the target, or beyond the item's max.
        expect(row({ value: 2000, target: 1000 })).toMatchObject({ max: 2000, bounds: [750, 950], band: 2 });
        expect(row({ value: 120, target: 90, max: 100 })).toMatchObject({ max: 120 });
        expect(row({ value: 50, target: 90, max: 100 })).toMatchObject({ max: 100, bounds: [67.5, 85.5] });
        // Own ranges are in the units of the value; unsorted, duplicated and unusable entries are repaired.
        expect(row({ value: 4.4, target: 4.7, max: 5, ranges: [4.25, 3.5, 4.25, 'x', -1, 0, 9] })).toMatchObject({ bounds: [3.5, 4.25], band: 2 });
        expect(row({ value: 10, target: 100, ranges: [] })).toMatchObject({ bounds: [], band: 0 });
        expect(row({ value: 10, target: 100, ranges: [10, 20, 30, 40, 50, 60] }).bounds).toEqual([10, 20, 30, 40]);
        // Without a target: no shared bands, the scale ends at 120 % of the value.
        expect(row({ value: 50 })).toMatchObject({ max: 60, bounds: [], band: 0 });
        expect(Number.isNaN(row({ value: 50 }).target)).toBe(true);
        expect(Number.isNaN(row({ value: 50, target: 0 }).target)).toBe(true);
        expect(Number.isNaN(row({ value: 50, target: -5 }).target)).toBe(true);
        // Without a value: the bands and the target are still drawn.
        expect(row({ name: 'x', target: 100 })).toMatchObject({ max: 120, bounds: [75, 95], band: -1 });
        expect(row({ value: -30, target: 100 })).toMatchObject({ max: 120, band: 0 });
        expect(row({ value: 50, target: 100 }, 'x').bounds).toEqual([]);
        expect(row({ value: 50, target: 100 }, [150, 50]).bounds).toEqual([50]); // 150 % is beyond the 120 % scale
    });

    it('stacks the bands behind a narrower bar, on axes of their own', () => {
        const option = build({});
        expect(option.series.map((s: Opt) => s.name)).toEqual(['band0', 'band1', 'band2', 'actual', 'targetOffset', 'target']);
        expect(bars(option)).toEqual([1180, 860, 1320, 540]);
        // Line 1: 0-900, 900-1140, 1140-1440. Line 3 (target 1250): 937.5, 1187.5, 1500.
        expect(band(option, 0)).toEqual([900, 750, 937.5, 675]);
        expect(band(option, 1)).toEqual([240, 200, 250, 180]);
        expect(band(option, 2)).toEqual([300, 250, 312.5, 225]);
        expect(bandColors(option, 0)).toEqual([GREYS[0], GREYS[0], GREYS[0], GREYS[0]]);
        expect(bandColors(option, 2)).toEqual([GREYS[2], GREYS[2], GREYS[2], GREYS[2]]);
        for (const i of [0, 1, 2]) expect(series(option, `band${i}`)).toMatchObject({ stack: 'bands', yAxisIndex: 1, silent: true });
        expect(series(option, 'actual')).toMatchObject({ yAxisIndex: 0, barWidth: '26%' });
        expect(parseFloat(series(option, 'band0').barWidth)).toBeGreaterThan(parseFloat(series(option, 'actual').barWidth));
        expect(option.yAxis).toHaveLength(3);
        expect(option.yAxis[0]).toMatchObject({ type: 'category', data: ['Line 1', 'Line 2', 'Line 3', 'Line 4'], inverse: true });
        expect(option.xAxis).toEqual([{ type: 'value', min: 0, splitLine: { show: false }, axisLabel: { formatter: '{value}', hideOverlap: true } }]);
        expect(barColors(option)).toEqual(['#5470c6', '#5470c6', '#5470c6', '#5470c6']);
        expect(option.title[1].text).toBe('');
    });

    it('marks each target with a thin segment centred on it', () => {
        const option = build({});
        // The widest scale is 1500 (Line 3), so the marker is 15 wide.
        expect(series(option, 'target').data).toEqual([15, 15, 15, 15]);
        expect(series(option, 'targetOffset').data).toEqual([1192.5, 992.5, 1242.5, 892.5]);
        expect(series(option, 'target')).toMatchObject({ stack: 'target', yAxisIndex: 2, itemStyle: { color: '#262626' } });
        expect(series(option, 'targetOffset')).toMatchObject({ stack: 'target', yAxisIndex: 2, itemStyle: { color: 'transparent' } });
        expect(series(build({ targetColor: '#fff' }), 'target').itemStyle.color).toBe('#fff');
        expect(series(build({ targetColor: '' }), 'target').itemStyle.color).toBe('#262626');
        const mixed = build({ items: [{ name: 'a', value: 5 }, { name: 'b', value: 5, target: 10 }] });
        expect(series(mixed, 'target').data).toEqual(['-', 0.12]);
        expect(series(mixed, 'targetOffset').data).toEqual(['-', 9.94]);
    });

    it('writes value and attainment beside each bar and in the tooltip', () => {
        const option = build({});
        expect(option.yAxis[1].data).toEqual([
            '{v|1,180 pcs}{p|  98%}', '{v|860 pcs}{p|  86%}', '{v|1,320 pcs}{p|  106%}', '{v|540 pcs}{p|  60%}',
        ]);
        expect(option.yAxis[1]).toMatchObject({ position: 'right', axisLabel: { show: true } });
        expect(series(option, 'actual').data[0].tooltip.formatter).toBe('{b}<br>Actual: <b>1,180 pcs</b><br>Target: 1,200 pcs (98%)');
        expect(build({ showValues: false }).yAxis[1].axisLabel.show).toBe(false);

        const plain = build({ unit: '', decimals: 2, items: [{ name: 'a', value: 4.4 }, { name: 'b', target: 5 }] });
        expect(plain.yAxis[1].data).toEqual(['{v|4.40}', '{v|–}']);
        expect(series(plain, 'actual').data[0].tooltip.formatter).toBe('{b}<br>Actual: <b>4.40</b>');
        expect(series(plain, 'actual').data[1].tooltip.formatter).toBe('{b}<br>Actual: <b>–</b><br>Target: 5.00');
        expect(bars(plain)).toEqual([4.4, '-']);

        const unit = one({ value: 5, target: 10 }, { unit: '<i>{c}|x' });
        expect(unit.yAxis[1].data[0]).toBe('{v|5 <i>cx}{p|  50%}');
        expect(series(unit, 'actual').data[0].tooltip.formatter).toContain('5 &#60;i&#62;&#123;c&#125;|x');
    });

    it('scales every row to its own target with percentOfTarget', () => {
        const option = build({ percentOfTarget: true });
        // Line 1: 1180 / 1200 = 98.33 %; every row ends at 120 % with bands at 75 % and 95 %.
        expect(bars(option).map(v => Math.round((v as number) * 100) / 100)).toEqual([98.33, 86, 105.6, 60]);
        expect(band(option, 0)).toEqual([75, 75, 75, 75]);
        expect(band(option, 1)).toEqual([20, 20, 20, 20]);
        expect(band(option, 2)).toEqual([25, 25, 25, 25]);
        expect(series(option, 'target').data).toEqual([1.2, 1.2, 1.2, 1.2]);
        expect(series(option, 'targetOffset').data).toEqual([99.4, 99.4, 99.4, 99.4]);
        expect(option.xAxis[0].axisLabel.formatter).toBe('{value}%');
        // Labels keep the real values.
        expect(option.yAxis[1].data[0]).toBe('{v|1,180 pcs}{p|  98%}');
        // Without a target the row is scaled to its own scale: 50 of 60.
        expect(bars(one({ value: 50 }, { percentOfTarget: true }))[0]).toBeCloseTo(83.3333, 3);
    });

    it('colours a bar by its band when statusColors are given', () => {
        expect(barColors(build({ statusColors: STATUS }))).toEqual(['green', 'orange', 'green', 'red']);
        // Fewer colours than bands: the last colour serves the higher bands.
        expect(barColors(build({ statusColors: ['red', 'green'] }))).toEqual(['green', 'green', 'green', 'red']);
        expect(barColors(build({ statusColors: [null, '', 5] }))).toEqual(['#5470c6', '#5470c6', '#5470c6', '#5470c6']);
        // Without them: the item colour, then the bar colour.
        expect(barColors(build({ color: '#111', items: [{ name: 'a', value: 1 }, { name: 'b', value: 1, color: '#222' }] }))).toEqual(['#111', '#222']);
        expect(barColors(build({ color: '' }))[0]).toBe('#5470c6');
        expect(barColors(one({ target: 5 }, { statusColors: STATUS }))).toEqual(['#5470c6']);
    });

    it('aligns the band colours of rows with fewer bands to the light end', () => {
        const option = build({ items: [
            { name: 'three', value: 5, target: 10 },
            { name: 'one', value: 5 },
            { name: 'two', value: 5, max: 10, ranges: [4] },
        ] });
        expect(band(option, 0)).toEqual([7.5, 6, 4]);
        expect(band(option, 1)).toEqual([2, '-', 6]);
        expect(band(option, 2)).toEqual([2.5, '-', '-']);
        expect(bandColors(option, 0)).toEqual([GREYS[0], GREYS[2], GREYS[1]]);
        expect(bandColors(option, 1)).toEqual([GREYS[1], undefined, GREYS[2]]);
        const custom = build({ bandColors: ['#a', '#b'] });
        expect([0, 1, 2].map(i => bandColors(custom, i)[0])).toEqual(['#a', '#b', '#b']);
        expect(bandColors(build({ bandColors: 'x' }), 0)[0]).toBe(GREYS[0]);
        expect(bandColors(build({ bandColors: [] }), 1)[0]).toBe(GREYS[1]);
    });

    it('swaps the axes for a vertical chart', () => {
        const option = build({ orientation: 'vertical' });
        expect(option.xAxis).toHaveLength(3);
        expect(option.yAxis).toHaveLength(1);
        expect(option.yAxis[0].type).toBe('value');
        expect(option.xAxis[0]).toMatchObject({ type: 'category', inverse: false, data: ['Line 1', 'Line 2', 'Line 3', 'Line 4'] });
        expect(option.xAxis[1].position).toBe('top');
        expect(series(option, 'actual').xAxisIndex).toBe(0);
        expect(series(option, 'actual').yAxisIndex).toBeUndefined();
        expect(series(option, 'band0').xAxisIndex).toBe(1);
        expect(series(option, 'target').xAxisIndex).toBe(2);
        expect(build({ orientation: 'diagonal' }).yAxis).toHaveLength(3);
    });

    it('shows a title and makes room for it', () => {
        expect(build({}).title[0].text).toBe('');
        expect(build({}).grid.top).toBe(14);
        const titled = build({ title: 'Production vs plan' });
        expect(titled.title[0]).toEqual({ text: 'Production vs plan', left: 'center' });
        expect(titled.grid.top).toBe(44);
    });

    it('skips unusable items and shows a notice when none is left', () => {
        const option = build({ items: [null, 3, 'x', [], {}, { name: '' }, { value: 'n/a' }, { name: 'named' }, { value: 30 }, { name: 9, value: '60', target: '50' }] });
        expect(option.yAxis[0].data).toEqual(['named', 'Item 2', '9']);
        expect(bars(option)).toEqual(['-', 30, 60]);
        for (const bad of [[], 'abc', 42, {}, [null], [{}]]) {
            const empty = build({ items: bad });
            expect(empty.title[1].text).toBe('No data');
            expect(empty.series.map((s: Opt) => s.name)).toEqual(['actual', 'targetOffset', 'target']);
            expect(empty.yAxis).toHaveLength(3);
            expectPlainOption(empty);
        }
    });

    it('handles zero, negative and many items', () => {
        const zero = one({ value: 0 });
        expect(bars(zero)).toEqual([0]);
        expect(band(zero, 0)).toEqual(['-']);
        expect(bars(one({ value: -5, target: 10 }))).toEqual([0]);
        expect(one({ value: -5, target: 10 }).yAxis[1].data[0]).toBe('{v|-5 pcs}{p|  -50%}');
        const many = build({ items: Array.from({ length: 500 }, (_, i) => ({ name: `L${i}`, value: i, target: 100 })) });
        expect(bars(many)).toHaveLength(60);
        expectPlainOption(many);
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

describe('BulletChart with malformed props', () => {
    const behavior = bulletChartBehavior;

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
