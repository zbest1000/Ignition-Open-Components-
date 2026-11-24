import {
    analyseCapability, autoBinCount, capabilityHistogramBehavior, capabilityReadout, computeHistogram,
    markerRows, normalDensity,
} from '../../industrial/capabilityHistogram';
import { Opt, expectPlainOption, fakeTree, throwingTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    capabilityHistogramBehavior.buildOption(capabilityHistogramBehavior.readProps(fakeTree(props)));

/** Sample limits of the schema; readProps itself falls back to "no limit". */
const SPEC = { lsl: 24.95, usl: 25.05, target: 25 };

const TINY = [2, 4, 4, 4, 5, 5, 7, 9];
const series = (o: Opt, name: string): Opt => o.series.find((s: Opt) => s.name === name);
const markers = (o: Opt): Opt[] => series(o, 'In spec').markLine.data;

const GARBAGE: unknown[] = [
    null, undefined, 'abc', '', 42, -1, 0, NaN, Infinity, true, false, {}, { a: 1 },
    [], [null], [1, 'x', null, {}, [], true], [[null]], [{}], [NaN, NaN], [5], [5, 5], ['1', '2'],
];

describe('industrial CapabilityHistogram', () => {
    it('readProps applies the defaults; limits fall back to none', () => {
        const props = capabilityHistogramBehavior.readProps(fakeTree({}));
        expect(props).toMatchObject({
            lsl: null, usl: null, target: null, bins: 'auto',
            showNormalCurve: true, showStats: true, sigmaMethod: 'overall', decimals: 3, unit: 'mm', title: '',
            barColor: '#5470c6', outOfSpecColor: '#ee6666', curveColor: '#e6a23c', limitColor: '#d9534f', targetColor: '#3ba272',
        });
        expect((props.values as number[]).length).toBe(120);
        expect(() => capabilityHistogramBehavior.readProps(throwingTree())).not.toThrow();
    });

    describe('statistics', () => {
        it('matches a dataset computed by hand', () => {
            // mean = 40 / 8 = 5; squared deviations 9+1+1+1+0+0+4+16 = 32; s = sqrt(32 / 7)
            // moving ranges 2,0,0,1,0,2,2 -> mean 1 -> sigma within = 1 / 1.128
            const { stats, values } = analyseCapability(TINY, 1, 11, 6);
            expect(values).toEqual(TINY);
            expect(stats.n).toBe(8);
            expect(stats.mean).toBe(5);
            expect(stats.min).toBe(2);
            expect(stats.max).toBe(9);
            expect(stats.target).toBe(6);
            expect(stats.sigmaOverall).toBeCloseTo(2.138090, 6);
            expect(stats.sigmaWithin).toBeCloseTo(0.886525, 6);
            // overall: Pp = 10 / (6 s), Ppu = 6 / (3 s), Ppl = 4 / (3 s)
            expect(stats.pp).toBeCloseTo(0.779512, 6);
            expect(stats.ppu).toBeCloseTo(0.935414, 6);
            expect(stats.ppl).toBeCloseTo(0.623610, 6);
            expect(stats.ppk).toBeCloseTo(0.623610, 6);
            // within: Cp = 10 * 1.128 / 6 = 1.88, Cpu = 6 * 1.128 / 3 = 2.256, Cpl = 4 * 1.128 / 3 = 1.504
            expect(stats.cp).toBeCloseTo(1.88, 10);
            expect(stats.cpu).toBeCloseTo(2.256, 10);
            expect(stats.cpl).toBeCloseTo(1.504, 10);
            expect(stats.cpk).toBeCloseTo(1.504, 10);
            expect([stats.belowLsl, stats.aboveUsl]).toEqual([0, 0]);
        });

        it('textbook case: a capable but off-centre process (Pp = 1, Ppk = 0.67)', () => {
            // mean 50, squared deviations 9+1+0+0+1+9 = 20, s = sqrt(20 / 5) = 2
            const data = [47, 49, 50, 50, 51, 53];
            const centred = analyseCapability(data, 44, 56).stats;
            expect(centred.sigmaOverall).toBeCloseTo(2, 12);
            expect(centred.pp).toBeCloseTo(1, 12);
            expect(centred.ppk).toBeCloseTo(1, 12);
            const shifted = analyseCapability(data, 46, 58).stats;
            expect(shifted.pp).toBeCloseTo(1, 12);
            expect(shifted.ppl).toBeCloseTo(2 / 3, 12);
            expect(shifted.ppu).toBeCloseTo(4 / 3, 12);
            expect(shifted.ppk).toBeCloseTo(2 / 3, 12);
            // moving ranges 2,1,0,1,2 -> mean 1.2; Cp = 12 * 1.128 / (6 * 1.2) = 1.88; Cpk = 4 * 1.128 / (3 * 1.2)
            expect(shifted.sigmaWithin).toBeCloseTo(1.2 / 1.128, 12);
            expect(shifted.cp).toBeCloseTo(1.88, 10);
            expect(shifted.cpk).toBeCloseTo(1.253333, 6);
        });

        it('one-sided specifications give only the index of that side', () => {
            const upper = analyseCapability(TINY, null, 11).stats;
            expect(upper.lsl).toBeNull();
            expect(upper.pp).toBeNull();
            expect(upper.ppl).toBeNull();
            expect(upper.ppu).toBeCloseTo(0.935414, 6);
            expect(upper.ppk).toBeCloseTo(0.935414, 6);
            expect(upper.cp).toBeNull();
            expect(upper.cpk).toBeCloseTo(2.256, 10);
            const lower = analyseCapability(TINY, 1, '').stats;
            expect(lower.usl).toBeNull();
            expect(lower.ppk).toBeCloseTo(0.623610, 6);
            expect(lower.cpk).toBeCloseTo(1.504, 10);
            const none = analyseCapability(TINY).stats;
            expect([none.pp, none.ppk, none.cp, none.cpk, none.target]).toEqual([null, null, null, null, null]);
        });

        it('counts values strictly outside the limits and swaps reversed limits', () => {
            const { stats } = analyseCapability(TINY, 8, 4);
            expect([stats.lsl, stats.usl]).toEqual([4, 8]);
            expect(stats.belowLsl).toBe(1); // 2; the three 4s sit on the limit and are in spec
            expect(stats.aboveUsl).toBe(1); // 9
            expect(stats.ppk as number).toBeLessThan(stats.pp as number);
        });

        it('a mean outside the limits gives a negative Ppk', () => {
            const { stats } = analyseCapability(TINY, 6, 11);
            expect(stats.ppl).toBeCloseTo(-1 / (3 * 2.138090), 5);
            expect(stats.ppk).toBeCloseTo(-0.155902, 5);
        });

        it('constant data: sigma is 0 and no index is defined', () => {
            const { stats } = analyseCapability([0.1, 0.1, 0.1, 0.1], 0, 1);
            expect(stats.mean).toBe(0.1);
            expect(stats.sigmaOverall).toBe(0);
            expect(stats.sigmaWithin).toBe(0);
            expect([stats.pp, stats.ppk, stats.ppl, stats.ppu, stats.cp, stats.cpk]).toEqual([null, null, null, null, null, null]);
        });

        it('fewer than two values: no sigma, no indices', () => {
            const one = analyseCapability([7], 0, 10).stats;
            expect(one).toMatchObject({ n: 1, mean: 7, min: 7, max: 7, sigmaOverall: null, sigmaWithin: null, pp: null, ppk: null, cp: null, cpk: null });
            const none = analyseCapability([], 0, 10).stats;
            expect(none).toMatchObject({ n: 0, mean: null, min: null, max: null, sigmaOverall: null, ppk: null, belowLsl: 0 });
            expect(analyseCapability('nope').stats.n).toBe(0);
            expect(analyseCapability(null).stats.n).toBe(0);
        });

        it('ignores non-numeric entries and reads numeric strings', () => {
            const { values, stats } = analyseCapability([2, 'x', null, '4', NaN, {}, 4, Infinity, 4, 5, 5, 7, 9], '1', '11');
            expect(values).toEqual(TINY);
            expect(stats.mean).toBe(5);
            expect(stats.sigmaWithin).toBeCloseTo(0.886525, 6);
        });

        it('normalDensity is the normal pdf', () => {
            expect(normalDensity(0, 0, 1)).toBeCloseTo(0.3989423, 7);
            expect(normalDensity(1, 0, 1)).toBeCloseTo(0.2419707, 7);
            expect(normalDensity(12, 10, 2)).toBeCloseTo(0.2419707 / 2, 7);
        });

        it('handles 100 000 values', () => {
            const big = new Array<number>(100000);
            for (let i = 0; i < big.length; i++) big[i] = (i % 1000) / 1000;
            const { stats, values } = analyseCapability(big, 0.1, 0.9);
            expect(stats.n).toBe(100000);
            expect(stats.mean).toBeCloseTo(0.4995, 10);
            // population variance of 0, 0.001 .. 0.999 is (1000^2 - 1) / 12 / 1000^2
            expect(stats.sigmaOverall).toBeCloseTo(Math.sqrt(0.08333325 * 100000 / 99999), 9);
            expect(stats.belowLsl).toBe(100 * 100);
            expect(stats.aboveUsl).toBe(99 * 100);
            const fixed = computeHistogram(values, 0, 0.999, 10);
            expect(fixed.counts).toEqual(new Array(10).fill(10000));
            const auto = computeHistogram(values, 0, 0.999, 'auto');
            expect(auto.rule).toBe('freedman-diaconis');
            expect(auto.counts.reduce((a, b) => a + b, 0)).toBe(100000);
            const option = build({ values: big, lsl: 0.1, usl: 0.9 });
            expect(series(option, 'Count').data.length).toBe(auto.counts.length);
            expectPlainOption(option);
        });
    });

    describe('bins', () => {
        it('fixed count: equal bins over [min, max]; lower edge inclusive, upper exclusive, last bin closed', () => {
            const h = computeHistogram(TINY, 2, 9, 7);
            expect(h.rule).toBe('fixed');
            expect(h.edges).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
            // 4 -> [4,5), 5 -> [5,6), 7 -> [7,8), the maximum 9 -> [8,9]
            expect(h.counts).toEqual([1, 0, 3, 2, 0, 1, 1]);
            expect(computeHistogram(TINY, 2, 9, '2').counts).toEqual([6, 2]); // [2,5.5) and [5.5,9]
            expect(computeHistogram(TINY, 2, 9, 3.9).counts.length).toBe(3);
            expect(computeHistogram(TINY, 2, 9, 100000).counts.length).toBe(200);
        });

        it('assigns values on an edge correctly despite floating point division', () => {
            // (0.3 - 0.1) / 0.1 = 1.9999999999999998: 0.3 still belongs to [0.3, 0.4)
            const h = computeHistogram([0.1, 0.2, 0.3, 0.7], 0.1, 0.7, 6);
            expect(h.edges).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
            expect(h.counts).toEqual([1, 1, 1, 0, 0, 1]);
        });

        it('auto: Freedman-Diaconis with round, aligned edges', () => {
            // quartiles (linear interpolation): Q1 = 4, Q3 = 5.5, IQR = 1.5; h = 2 * 1.5 / 8^(1/3) = 1.5
            // bins = ceil(7 / 1.5) = 5 -> width 7 / 5 = 1.4 rounded up to 2 -> edges 2, 4, 6, 8, 10
            expect(autoBinCount(TINY, 2, 9)).toEqual({ count: 5, rule: 'freedman-diaconis' });
            const h = computeHistogram(TINY, 2, 9, 'auto');
            expect(h.rule).toBe('freedman-diaconis');
            expect(h.edges).toEqual([2, 4, 6, 8, 10]);
            expect(h.counts).toEqual([1, 5, 1, 1]);
            expect(computeHistogram(TINY, 2, 9).edges).toEqual(h.edges);
            expect(computeHistogram(TINY, 2, 9, 0).edges).toEqual(h.edges);
            expect(computeHistogram(TINY, 2, 9, 'lots').edges).toEqual(h.edges);
        });

        it('auto: falls back to Sturges when the IQR is zero', () => {
            // n = 8 -> ceil(log2 8) + 1 = 4 bins -> width 8 / 4 = 2 -> edges 0, 2, .. 10
            const data = [1, 1, 1, 1, 1, 1, 1, 9];
            expect(autoBinCount(data, 1, 9)).toEqual({ count: 4, rule: 'sturges' });
            const h = computeHistogram(data, 1, 9, 'auto');
            expect(h.rule).toBe('sturges');
            expect(h.edges).toEqual([0, 2, 4, 6, 8, 10]);
            expect(h.counts).toEqual([7, 0, 0, 0, 1]);
        });

        it('auto: the default sample gets 0.01 mm bins without an empty leading bin', () => {
            const { values, stats } = analyseCapability(capabilityHistogramBehavior.readProps(fakeTree({})).values);
            const h = computeHistogram(values, stats.min as number, stats.max as number, 'auto');
            expect(h.edges).toEqual([24.97, 24.98, 24.99, 25, 25.01, 25.02, 25.03, 25.04, 25.05, 25.06]);
            expect(h.counts.reduce((a, b) => a + b, 0)).toBe(120);
            expect(h.counts[0]).toBeGreaterThan(0);
            expect(h.counts[h.counts.length - 1]).toBe(2); // 25.052 and 25.054
        });

        it('constant data: one bin centred on the value', () => {
            expect(computeHistogram([5, 5, 5], 5, 5, 'auto')).toEqual({ edges: [4.975, 5.025], counts: [3], rule: 'single' });
            expect(computeHistogram([5, 5, 5], 5, 5, 12)).toEqual({ edges: [4.975, 5.025], counts: [3], rule: 'single' });
            expect(computeHistogram([0], 0, 0)).toEqual({ edges: [-0.5, 0.5], counts: [1], rule: 'single' });
            expect(computeHistogram([5], 5, 5, 'auto', 0.2)).toEqual({ edges: [4.9, 5.1], counts: [1], rule: 'single' });
            expect(computeHistogram([], 0, 0)).toEqual({ edges: [], counts: [], rule: 'single' });
        });
    });

    describe('readout', () => {
        it('reports Pp / Ppk for the overall sigma and Cp / Cpk for the within sigma', () => {
            const { stats } = analyseCapability(TINY, 1, 11);
            expect(capabilityReadout(stats, false, 2, 'mm')).toEqual([
                'n 8 · Mean 5.00 mm · σ overall 2.138', 'Pp 0.78 · Ppk 0.62 · Out of spec 0',
            ]);
            expect(capabilityReadout(stats, true, 2, '')).toEqual([
                'n 8 · Mean 5.00 · σ within 0.887', 'Cp 1.88 · Cpk 1.50 · Out of spec 0',
            ]);
        });

        it('marks one-sided indices and reports the out-of-spec share', () => {
            expect(capabilityReadout(analyseCapability(TINY, null, 6).stats, false, 1, '')[1]).toBe('Ppk 0.16 (USL only) · Out of spec 2 (25.0 %)');
            expect(capabilityReadout(analyseCapability(TINY, 3, null).stats, true, 1, '')[1]).toBe('Cpk 0.75 (LSL only) · Out of spec 1 (12.5 %)');
        });

        it('leaves out what cannot be computed', () => {
            expect(capabilityReadout(analyseCapability(TINY).stats, false, 0, '')).toEqual(['n 8 · Mean 5 · σ overall 2.1']);
            expect(capabilityReadout(analyseCapability([5, 5], 4, 6).stats, false, 1, '')).toEqual(['n 2 · Mean 5.0 · σ overall 0.00', 'Out of spec 0']);
            expect(capabilityReadout(analyseCapability([5]).stats, false, 1, '')).toEqual(['n 1 · Mean 5.0']);
            expect(capabilityReadout(analyseCapability([]).stats, false, 1, '')).toEqual([]);
        });

        it('is shown as the subtitle and can be hidden', () => {
            const option = build(SPEC);
            expect(option.title[0].subtext).toBe('n 120 · Mean 25.006 mm · σ overall 0.0150\nPp 1.11 · Ppk 0.98 · Out of spec 2 (1.7 %)');
            expect(build({ ...SPEC, sigmaMethod: 'Within' }).title[0].subtext).toContain('σ within');
            expect(build({ ...SPEC, sigmaMethod: 'Within' }).title[0].subtext).toMatch(/\nCp \d\.\d\d · Cpk \d\.\d\d · /);
            expect(build({ ...SPEC, showStats: false }).title[0].subtext).toBeUndefined();
            expect(build({ title: 'Shaft Ø' }).title[0].text).toBe('Shaft Ø');
            // the plot moves down to make room for the title
            expect(build({ title: 'Shaft Ø' }).grid.top).toBeGreaterThan(build({}).grid.top);
            expect(build({}).grid.top).toBeGreaterThan(build({ showStats: false }).grid.top);
        });
    });

    describe('chart', () => {
        it('draws the bins as an outline on a value axis, with one hit bar per bin', () => {
            const option = build({ values: TINY, bins: 7 });
            expect(option.xAxis.type).toBe('value');
            expect(series(option, 'In spec').data.slice(0, 8)).toEqual([
                [2, 0], [2, 1], [3, 1], [3, 0], // [2,3): 1
                [4, 0], [4, 3], [5, 3], [5, 0], // [4,5): 3  ([3,4) is empty)
            ]);
            expect(series(option, 'Out of spec')).toBeUndefined();
            const hits = series(option, 'Count');
            expect(hits.itemStyle.color).toBe('transparent');
            expect(hits.data.map((d: Opt) => d.value)).toEqual([[2.5, 1], [3.5, 0], [4.5, 3], [5.5, 2], [6.5, 0], [7.5, 1], [8.5, 1]]);
            expect(hits.data[2].tooltip.formatter).toBe('[4.000, 5.000) mm<br/><b>3</b> of 8 (37.5 %)');
            expect(hits.data[6].tooltip.formatter).toBe('[8.000, 9.000] mm<br/><b>1</b> of 8 (12.5 %)');
            expect(option.yAxis).toMatchObject({ min: 0, minInterval: 1, name: 'Count' });
        });

        it('splits the histogram at the limits into in-spec and out-of-spec parts', () => {
            // bins [2,4) [4,6) [6,8) [8,10]; LSL 3 cuts the first bin, USL 8 is a bin edge
            const option = build({ values: TINY, lsl: 3, usl: 8 });
            expect(series(option, 'In spec').data).toEqual([
                [3, 0], [3, 1], [4, 1], [4, 0],
                [4, 0], [4, 5], [6, 5], [6, 0],
                [6, 0], [6, 1], [8, 1], [8, 0],
            ]);
            expect(series(option, 'Out of spec').data).toEqual([
                [2, 0], [2, 1], [3, 1], [3, 0],
                null,
                [8, 0], [8, 1], [10, 1], [10, 0],
            ]);
            expect(series(option, 'Out of spec').areaStyle.color).toBe('#ee6666');
            expect(series(build({ values: TINY, lsl: 3, outOfSpecColor: '#123456' }), 'Out of spec').lineStyle.color).toBe('#123456');
        });

        it('marks LSL, USL, target and mean; missing limits have no line', () => {
            const all = markers(build(SPEC));
            expect(all.map(m => m.label.formatter)).toEqual(['LSL', 'USL', 'Target', 'Mean']);
            expect(all.map(m => m.xAxis).slice(0, 3)).toEqual([24.95, 25.05, 25]);
            expect(all[3].xAxis).toBeCloseTo(25.005925, 6);
            expect(all.map(m => m.lineStyle.color)).toEqual(['#d9534f', '#d9534f', '#3ba272', '#e6a23c']);
            expect(markers(build({ usl: 25.05 })).map(m => m.label.formatter)).toEqual(['USL', 'Mean']);
            expect(markers(build({ lsl: 24.95 })).map(m => m.label.formatter)).toEqual(['LSL', 'Mean']);
            expect(markers(build({})).map(m => m.label.formatter)).toEqual(['Mean']);
            expect(markers(build({ lsl: 'n/a', usl: '', target: {} })).length).toBe(1);
            const custom = markers(build({ ...SPEC, limitColor: '#010101', targetColor: '#020202', curveColor: '#030303' }));
            expect(custom.map(m => m.lineStyle.color)).toEqual(['#010101', '#010101', '#020202', '#030303']);
        });

        it('stacks marker labels that would overprint, and reserves room for them', () => {
            // mean 25.006 and target 25.000 are a few pixels apart
            const close = markers(build(SPEC));
            expect(close.map(m => m.label.distance)).toEqual([4, 4, 4, 18]);
            const apart = markers(build({ usl: 25.05 }));
            expect(apart.map(m => m.label.distance)).toEqual([4, 4]);
            expect(build(SPEC).grid.top - build({ usl: 25.05 }).grid.top).toBe(14);
            expect(markerRows([{ label: 'LSL', value: 0 }, { label: 'USL', value: 10 }, { label: 'Target', value: 5 }, { label: 'Mean', value: 5.1 }], 0, 10))
                .toEqual([0, 0, 0, 1]);
            expect(markerRows([{ label: 'A', value: 5 }, { label: 'B', value: 5 }, { label: 'C', value: 5 }], 0, 10)).toEqual([0, 1, 2]);
            expect(markerRows([{ label: 'A', value: 5 }], 3, 3)).toEqual([0]);
        });

        it('keeps limits, target and the curve inside the axis range', () => {
            const option = build({ lsl: 24.9, usl: 25.2, target: 25.15 });
            expect(option.xAxis.min).toBeLessThan(24.9);
            expect(option.xAxis.max).toBeGreaterThan(25.2);
            expect(Math.round((option.xAxis.max - option.xAxis.min) / option.xAxis.interval)).toBeGreaterThanOrEqual(4);
            const plain = build(SPEC);
            expect([plain.xAxis.min, plain.xAxis.max, plain.xAxis.interval]).toEqual([24.94, 25.08, 0.02]);
        });

        it('scales the normal curve to the histogram (n x bin width x density)', () => {
            const option = build({ values: TINY, bins: 7 });
            const curve = series(option, 'Normal fit').data as number[][];
            const s = Math.sqrt(32 / 7);
            const peak = curve.reduce((a, b) => (b[1] > a[1] ? b : a));
            expect(peak[0]).toBeCloseTo(5, 1);
            expect(peak[1]).toBeCloseTo(8 * 1 * normalDensity(5, 5, s), 2);
            for (const [x, y] of curve) expect(y).toBeCloseTo(8 * normalDensity(x, 5, s), 4);
            // the within sigma gives a narrower, taller curve
            const within = series(build({ values: TINY, bins: 7, sigmaMethod: 'within' }), 'Normal fit').data as number[][];
            expect(Math.max(...within.map(p => p[1]))).toBeCloseTo(8 * normalDensity(5, 5, 1 / 1.128), 1);
            expect(series(build({ values: TINY, showNormalCurve: false }), 'Normal fit')).toBeUndefined();
            expect(series(build({ values: TINY, curveColor: '#abcdef' }), 'Normal fit').lineStyle.color).toBe('#abcdef');
        });

        it('constant data and single values still give a chart, without a curve', () => {
            const constant = build({ values: [5, 5, 5, 5], lsl: 4, usl: 6 });
            expect(series(constant, 'Normal fit')).toBeUndefined();
            expect(series(constant, 'Count').data.map((d: Opt) => d.value)).toEqual([[5, 4]]);
            expect(series(constant, 'In spec').data).toEqual([[4.9, 0], [4.9, 4], [5.1, 4], [5.1, 0]]);
            expect(constant.title[0].subtext).toBe('n 4 · Mean 5.000 mm · σ overall 0.0000\nOut of spec 0');
            const single = build({ values: [25.01] });
            expect(series(single, 'Count').data.length).toBe(1);
            expect(single.title[0].subtext).toBe('n 1 · Mean 25.010 mm');
            expectPlainOption(constant);
            expectPlainOption(single);
        });

        it('uses the unit, decimals and bar colour', () => {
            const option = build({ values: TINY, bins: 7, unit: '<i>{c}', decimals: 1, barColor: '#445566' });
            expect(option.xAxis.name).toBe('<i>{c}');
            expect(series(option, 'Count').data[0].tooltip.formatter).toBe('[2.0, 3.0) &#60;i&#62;&#123;c&#125;<br/><b>1</b> of 8 (12.5 %)');
            expect(series(option, 'In spec').areaStyle.color).toBe('#445566');
            expect(build({ values: TINY, unit: '' }).title[0].subtext).toBe('n 8 · Mean 5.000 · σ overall 2.1381');
        });

        it('shows "No data" for empty or unusable values', () => {
            for (const values of [[], 'x', 42, [null, 'a', {}]]) {
                const option = build({ values, ...SPEC });
                expect(option.title[1].text).toBe('No data');
                expect(option.series).toEqual([]);
                expectPlainOption(option);
            }
            expect(build({}).title[1].text).toBe('');
        });
    });

    it('is plain, deterministic and never throws on malformed props', () => {
        const defaults = { ...capabilityHistogramBehavior.readProps(fakeTree({})), ...SPEC } as unknown as Record<string, unknown>;
        const a = capabilityHistogramBehavior.buildOption(defaults as never);
        expectPlainOption(a);
        expect(a).toEqual(build(SPEC));
        for (const key of Object.keys(defaults)) {
            for (const bad of GARBAGE) {
                expectPlainOption(build({ ...SPEC, [key]: bad }));
                expectPlainOption(capabilityHistogramBehavior.buildOption({ ...defaults, [key]: bad } as never));
                expectPlainOption(capabilityHistogramBehavior.buildOption({ ...defaults, values: [1, 2, 2, 3, 10], [key]: bad } as never));
            }
        }
        for (const bad of GARBAGE) {
            const all: Record<string, unknown> = {};
            Object.keys(defaults).forEach(k => { all[k] = bad; });
            expectPlainOption(capabilityHistogramBehavior.buildOption(all as never));
        }
        expectPlainOption(capabilityHistogramBehavior.buildOption({} as never));
        // extreme magnitudes
        expectPlainOption(build({ values: [1e-12, 2e-12, 3e-12], lsl: 0, usl: 1e-11 }));
        expectPlainOption(build({ values: [1e15, 1e15 + 2, 1e15 + 4], lsl: -1e300, usl: 1e300 }));
        expectPlainOption(build({ values: [-5, -4.5, -4, -3], lsl: -6, usl: -2, target: -4 }));
    });
});
