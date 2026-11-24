import {
    SPC_CONSTANTS, computeControlChart, detectRunRuleViolations, normaliseSubgroupSize, spcBehavior,
} from '../../industrial/spc';
import { Opt, fakeTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    spcBehavior.buildOption(spcBehavior.readProps(fakeTree(props)));
const lines = (series: Opt): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const l of series.markLine.data) out[l.label.formatter] = l.yAxis;
    return out;
};

describe('industrial SPC statistics', () => {
    it('Individuals & Moving Range (subgroup size 1), hand-computed', () => {
        // x = 10 12 11 13 12: mean 11.6; MR = 2 1 2 1, MRbar 1.5
        // sigma = 1.5 / 1.128 = 1.329787; 3 sigma = 3.989362
        const spc = computeControlChart([10, 12, 11, 13, 12], 1);
        expect(spc.kind).toBe('I-MR');
        expect(spc.points).toEqual([10, 12, 11, 13, 12]);
        expect(spc.dispersion).toEqual([2, 1, 2, 1]);
        expect(spc.center).toBeCloseTo(11.6, 10);
        expect(spc.ucl).toBeCloseTo(15.589362, 5);
        expect(spc.lcl).toBeCloseTo(7.610638, 5);
        expect(spc.dispersionCenter).toBeCloseTo(1.5, 10);
        expect(spc.dispersionUcl).toBeCloseTo(4.9005, 10); // 3.267 x 1.5
        expect(spc.dispersionLcl).toBe(0);
    });

    it('X-bar & R with subgroup size 2, hand-computed (bug 6)', () => {
        // subgroups (10,12) (11,13) (12,12) (9,11): means 11 12 12 10, ranges 2 2 0 2
        // grand mean 11.25, Rbar 1.5; A2 = 1.880 -> +/- 2.82; D4 = 3.267, D3 = 0
        const spc = computeControlChart([10, 12, 11, 13, 12, 12, 9, 11], 2);
        expect(spc.kind).toBe('Xbar-R');
        expect(spc.points).toEqual([11, 12, 12, 10]);
        expect(spc.dispersion).toEqual([2, 2, 0, 2]);
        expect(spc.center).toBeCloseTo(11.25, 10);
        expect(spc.ucl).toBeCloseTo(14.07, 10);
        expect(spc.lcl).toBeCloseTo(8.43, 10);
        expect(spc.dispersionCenter).toBeCloseTo(1.5, 10);
        expect(spc.dispersionUcl).toBeCloseTo(4.9005, 10);
        expect(spc.dispersionLcl).toBe(0);
    });

    it('X-bar & R with subgroup size 7 uses a non-zero D3, hand-computed', () => {
        // subgroups 1..7 and 2..8: means 4 and 5, ranges 6 and 6; A2 = 0.419, D3 = 0.076, D4 = 1.924
        const spc = computeControlChart([1, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 8], 7);
        expect(spc.points).toEqual([4, 5]);
        expect(spc.center).toBeCloseTo(4.5, 10);
        expect(spc.ucl).toBeCloseTo(7.014, 10);
        expect(spc.lcl).toBeCloseTo(1.986, 10);
        expect(spc.dispersionUcl).toBeCloseTo(11.544, 10);
        expect(spc.dispersionLcl).toBeCloseTo(0.456, 10);
    });

    it('uses the standard control chart constants for n = 2..10', () => {
        expect(Object.keys(SPC_CONSTANTS).map(Number)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(SPC_CONSTANTS[3]).toEqual({ A2: 1.023, D3: 0, D4: 2.574, d2: 1.693 });
        expect(SPC_CONSTANTS[5]).toEqual({ A2: 0.577, D3: 0, D4: 2.114, d2: 2.326 });
        expect(SPC_CONSTANTS[10]).toEqual({ A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 });
        for (let n = 2; n <= 10; n++) {
            const { A2, D3, D4, d2 } = SPC_CONSTANTS[n];
            // A2 = 3 / (d2 sqrt(n)) and D3 + D4 = 2 whenever D3 > 0, to table rounding
            expect(Math.abs(A2 - 3 / (d2 * Math.sqrt(n)))).toBeLessThan(0.0015);
            if (D3 > 0) expect(D3 + D4).toBeCloseTo(2, 10);
        }
    });

    it('ignores a trailing incomplete subgroup and non-numeric values', () => {
        expect(computeControlChart([1, 3, 5, 7, 100], 2).points).toEqual([2, 6]);
        expect(computeControlChart([1, null, 'x', 3, NaN, '5', 7], 2).points).toEqual([2, 6]);
        expect(computeControlChart([1, 2], 3)).toMatchObject({ points: [], dispersion: [], hasLimits: false });
    });

    it('normalises the subgroup size to an integer in 1..10', () => {
        expect([0, -3, NaN, 'x', null, 1, 2.9, '4', 10, 11, 500].map(normaliseSubgroupSize))
            .toEqual([1, 1, 1, 1, 1, 1, 2, 4, 10, 10, 10]);
    });

    it('has no limits with fewer than two individual values', () => {
        expect(computeControlChart([], 1)).toMatchObject({ points: [], hasLimits: false, ucl: 0, lcl: 0 });
        expect(computeControlChart([5], 1)).toMatchObject({ points: [5], dispersion: [], hasLimits: false });
        expect(computeControlChart('nope', 1).points).toEqual([]);
    });
});

describe('industrial SPC run rules', () => {
    it('rule 1: flags points strictly beyond the control limits', () => {
        expect(detectRunRuleViolations([0, 5, -5, 5.01, -5.01, 1], 0, 5, -5)).toEqual([3, 4]);
    });

    it('Western Electric rule 4: eight consecutive points on one side of the centre line', () => {
        const up = (n: number) => new Array<number>(n).fill(1);
        expect(detectRunRuleViolations(up(7), 0, 5, -5)).toEqual([]);
        expect(detectRunRuleViolations(up(8), 0, 5, -5)).toEqual([7]);
        expect(detectRunRuleViolations(up(10), 0, 5, -5)).toEqual([7, 8, 9]);
        expect(detectRunRuleViolations(up(8).map(v => -v), 0, 5, -5)).toEqual([7]);
    });

    it('a point on the centre line or on the other side restarts the run', () => {
        expect(detectRunRuleViolations([1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1], 0, 5, -5)).toEqual([]);
        expect(detectRunRuleViolations([1, 1, 1, 1, -1, 1, 1, 1, 1, 1, 1, 1, 1], 0, 5, -5)).toEqual([12]);
        expect(detectRunRuleViolations([1, -1, 1, -1, 1, -1, 1, -1, 1, -1], 0, 5, -5)).toEqual([]);
    });

    it('flags nothing when all values are identical', () => {
        const spc = computeControlChart([5, 5, 5, 5, 5, 5, 5, 5, 5, 5], 1);
        expect(detectRunRuleViolations(spc.points, spc.center, spc.ucl, spc.lcl)).toEqual([]);
    });
});

describe('industrial SPC option', () => {
    it('readProps applies the schema defaults', () => {
        const props = spcBehavior.readProps(fakeTree({}));
        expect(props).toMatchObject({
            subgroupSize: 1, showUCL: true, showLCL: true, showCenterLine: true,
            showMRChart: true, showRunRules: true, title: '',
        });
        expect(props.values).toHaveLength(20);
    });

    it('draws the default I-MR chart with hand-computed limits', () => {
        // defaults: sum 1459.4 / 20 = 72.97; sum of MR 28.3 / 19 = 1.489474; 3 sigma = 3.961365
        const option = build({});
        expect(option.title[0].text).toBe('SPC — Individuals & Moving Range');
        expect(option.series).toHaveLength(2);
        const top = lines(option.series[0]);
        expect(top.CL).toBeCloseTo(72.97, 6);
        expect(top.UCL).toBeCloseTo(76.931365, 4);
        expect(top.LCL).toBeCloseTo(69.008635, 4);
        const lower = lines(option.series[1]);
        expect(lower.CL).toBeCloseTo(1.489474, 5);
        expect(lower.UCL).toBeCloseTo(4.866111, 4);
        expect(lower.LCL).toBeUndefined();
        expect(option.xAxis[0].data).toHaveLength(20);
        expect(option.xAxis[1].data[0]).toBe(2);
        expect(option.xAxis[1].data).toHaveLength(19);
        expect(option.yAxis.map((a: Opt) => a.name)).toEqual(['Value', 'MR']);
        expect(option.series[0].markPoint).toBeUndefined();
    });

    it('switches to X-bar & R when subgroupSize > 1 (bug 6)', () => {
        const option = build({ values: [10, 12, 11, 13, 12, 12, 9, 11], subgroupSize: 2 });
        expect(option.title[0].text).toBe('SPC — X-bar & R');
        expect(option.series[0].data).toEqual([11, 12, 12, 10]);
        expect(option.series[1].data).toEqual([2, 2, 0, 2]);
        expect(lines(option.series[0]).UCL).toBeCloseTo(14.07, 10);
        expect(option.xAxis[0].data).toEqual([1, 2, 3, 4]);
        expect(option.xAxis[1].data).toEqual([1, 2, 3, 4]);
        expect(option.yAxis.map((a: Opt) => a.name)).toEqual(['X-bar', 'R']);
        expect(build({ values: [1, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 8], subgroupSize: 7 }).series[1].markLine.data)
            .toHaveLength(3); // R chart LCL is drawn when D3 > 0
    });

    it('marks run rule violations at their category index', () => {
        const values = [10, 10.5, 9.5, 10, 10.5, 9.5, 10, 10.5, 9.5, 30];
        const option = build({ values });
        // mean 12 (pulled up by the 30): the first nine points are all below it, so the 8th and 9th
        // break rule 4; MRbar 2.944 -> UCL = 12 + 3 x 2.944 / 1.128 = 19.83, so 30 breaks rule 1
        expect(option.series[0].markPoint.data.map((d: Opt) => d.coord)).toEqual([[7, 10.5], [8, 9.5], [9, 30]]);
        expect(build({ values, showRunRules: false }).series[0].markPoint).toBeUndefined();
    });

    it('honours the show* switches and a custom title', () => {
        const option = build({ showUCL: false, showLCL: false, showMRChart: false, title: 'Bore diameter' });
        expect(Object.keys(lines(option.series[0]))).toEqual(['CL']);
        expect(option.series).toHaveLength(1);
        expect(option.grid).toHaveLength(1);
        expect(option.title[0].text).toBe('Bore diameter');
        expect(build({ showUCL: false, showLCL: false, showCenterLine: false }).series[0].markLine).toBeUndefined();
    });

    it('does not flag every point when there is too little data for limits', () => {
        const option = build({ values: [72] });
        expect(option.series[0].data).toEqual([72]);
        expect(option.series[0].markLine).toBeUndefined();
        expect(option.series[0].markPoint).toBeUndefined();
        expect(option.series).toHaveLength(1);
    });

    it('degrades to an empty chart on malformed values (bug 2)', () => {
        const defaults = spcBehavior.readProps(fakeTree({}));
        expect(build({ values: null }).series[0].data).toHaveLength(20); // null reads as "not set": schema default
        for (const values of [null, undefined, 'abc', 5, {}, [null], ['x', {}]]) {
            const option = spcBehavior.buildOption({ ...defaults, values }) as Opt;
            expect(option.series[0].data).toEqual([]);
            expect(option.title[1].text).toBe('No data');
        }
    });
});
