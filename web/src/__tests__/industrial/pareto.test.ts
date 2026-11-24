import { computePareto, paretoBehavior } from '../../industrial/pareto';
import { Opt, fakeTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    paretoBehavior.buildOption(paretoBehavior.readProps(fakeTree(props)));

describe('industrial Pareto', () => {
    it('readProps applies the schema defaults', () => {
        expect(paretoBehavior.readProps(fakeTree({}))).toEqual({
            categories: ['Mechanical', 'Electrical', 'Operator', 'Material', 'Other'],
            counts: [42, 28, 18, 12, 5],
            showCumulativeLine: true, show80PercentLine: true,
            barLabel: 'Count', lineLabel: 'Cumulative %',
        });
    });

    it('computes the cumulative percentage of the default data', () => {
        // total 105: 42/105 = 40 %, 70/105 = 66.7 %, 88/105 = 83.8 %, 100/105 = 95.2 %, 100 %
        const option = build({});
        expect(option.xAxis.data).toEqual(['Mechanical', 'Electrical', 'Operator', 'Material', 'Other']);
        expect(option.series[0]).toEqual({ name: 'Count', type: 'bar', data: [42, 28, 18, 12, 5] });
        expect(option.series[1].data).toEqual([40, 66.7, 83.8, 95.2, 100]);
        expect(option.series[1].yAxisIndex).toBe(1);
        expect(option.series[1].markLine.data[0].yAxis).toBe(80);
        // Labelled inside the plot, without end symbols, so the "80%" axis label stays readable.
        expect(option.series[1].markLine.symbol).toBe('none');
        expect(option.series[1].markLine.data[0].label).toEqual({ formatter: '80%', position: 'insideEndTop' });
        expect(option.yAxis[1].max).toBe(100);
    });

    it('sorts categories by count, largest first, keeping ties in input order', () => {
        const p = computePareto(['a', 'b', 'c', 'd'], [5, 20, 5, 10]);
        expect(p.categories).toEqual(['b', 'd', 'a', 'c']);
        expect(p.counts).toEqual([20, 10, 5, 5]);
        expect(p.cumulative).toEqual([50, 75, 87.5, 100]);
        expect(p.total).toBe(40);
    });

    it('treats negative and non-numeric counts as zero', () => {
        const p = computePareto(['a', 'b', 'c', 'd'], [-10, 30, 'x', 10]);
        expect(p.categories).toEqual(['b', 'd', 'a', 'c']);
        expect(p.counts).toEqual([30, 10, 0, 0]);
        expect(p.cumulative).toEqual([75, 100, 100, 100]);
    });

    it('gives 0 % everywhere when the total is zero', () => {
        expect(computePareto(['a', 'b'], [0, 0]).cumulative).toEqual([0, 0]);
        expect(computePareto(['a', 'b'], [-1, -2]).cumulative).toEqual([0, 0]);
    });

    it('pairs arrays of different lengths', () => {
        expect(computePareto(['a', 'b', 'c'], [1, 3])).toEqual({
            categories: ['b', 'a', 'c'], counts: [3, 1, 0], cumulative: [75, 100, 100], total: 4,
        });
        expect(computePareto(['a'], [1, 3]).categories).toEqual(['#2', 'a']);
        expect(computePareto([null, 7], ['2', 1]).categories).toEqual(['#1', '7']);
    });

    it('omits the line, its axis and the 80 % mark when switched off', () => {
        const noLine = build({ showCumulativeLine: false });
        expect(noLine.series).toHaveLength(1);
        expect(noLine.yAxis).toHaveLength(1);
        expect(noLine.legend.data).toEqual(['Count']);
        expect(build({ show80PercentLine: false }).series[1].markLine).toBeUndefined();
        const labelled = build({ barLabel: 'Stops', lineLabel: 'Cum.' });
        expect(labelled.legend.data).toEqual(['Stops', 'Cum.']);
        expect(labelled.yAxis[0].name).toBe('Stops');
    });

    it('degrades to an empty chart on non-array input (bug 2)', () => {
        const option = build({ categories: 'abc', counts: { $columns: [] } });
        expect(option.xAxis.data).toEqual([]);
        expect(option.series[0].data).toEqual([]);
        expect(option.title.text).toBe('No data');
        expect(build({}).title.text).toBe('');
    });
});
