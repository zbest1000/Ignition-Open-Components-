import { resourceHeatmapBehavior } from '../../industrial/resourceHeatmap';
import { Opt, expectPlainOption, fakeTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    resourceHeatmapBehavior.buildOption(resourceHeatmapBehavior.readProps(fakeTree(props)));

describe('industrial ResourceHeatmap', () => {
    it('readProps applies the schema defaults', () => {
        const props = resourceHeatmapBehavior.readProps(fakeTree({}));
        expect(props.resources).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4']);
        expect(props.timeSlots).toHaveLength(13);
        expect(props).toMatchObject({ utilization: [], title: '', maxValue: 100 });
    });

    it('renders an empty state, not random values, when utilization is empty (bug 1)', () => {
        const random = jest.spyOn(Math, 'random');
        try {
            const first = build({});
            const second = build({});
            expect(random).not.toHaveBeenCalled();
            expect(first.series[0].data).toEqual([]);
            expect(first).toEqual(second);
            expect(first.title[1].text).toBe('No data');
            expect(first.title[0].text).toBe('Resource Utilization');
            expect(first.yAxis.data).toEqual(['Line 1', 'Line 2', 'Line 3', 'Line 4']);
            expect(first.xAxis.data).toHaveLength(13);
        } finally {
            random.mockRestore();
        }
    });

    it('labels cells with a string template, not a function (bug 1)', () => {
        const option = build({ utilization: [[10, 20]] });
        expect(option.series[0].label).toEqual({ show: true, formatter: '{@[2]}%' });
        expectPlainOption(option);
        expect(JSON.parse(JSON.stringify(option))).toEqual(option);
    });

    it('maps utilization[resource][slot] to [slot, resource, value] cells', () => {
        const option = build({
            resources: ['R1', 'R2'], timeSlots: ['08:00', '09:00', '10:00'],
            utilization: [[10, 20, 30], [40, '50', 60]], title: 'Lines', maxValue: 120,
        });
        expect(option.series[0].data).toEqual([[0, 0, 10], [1, 0, 20], [2, 0, 30], [0, 1, 40], [1, 1, 50], [2, 1, 60]]);
        // The handles carry the percentages; end texts would print them a second time.
        expect(option.visualMap).toMatchObject({ min: 0, max: 120, calculable: true, formatter: '{value}%' });
        expect(option.visualMap.text).toBeUndefined();
        expect(option.title[0].text).toBe('Lines');
        expect(option.title[1].text).toBe('');
    });

    it('skips missing cells, ragged rows and cells outside the axes', () => {
        const option = build({
            resources: ['R1', 'R2'], timeSlots: ['a', 'b'],
            utilization: [[1, null, 3], 'row', [NaN, 'x'], [9, 9]],
        });
        expect(option.series[0].data).toEqual([[0, 0, 1]]);
    });

    it('falls back to 100 for an unusable maxValue', () => {
        for (const maxValue of [0, -5, NaN, 'x', null, {}]) {
            expect(build({ maxValue }).visualMap.max).toBe(100);
        }
    });

    it('degrades to an empty chart on malformed input (bug 2)', () => {
        for (const bad of [null, 'abc', 5, { $columns: [] }, [null], [[null]], [{}]]) {
            const option = build({ utilization: bad });
            expect(option.series[0].data).toEqual([]);
            expect(option.title[1].text).toBe('No data');
        }
        const axes = build({ resources: 'abc', timeSlots: { a: 1 }, utilization: [[1]] });
        expect(axes.xAxis.data).toEqual([]);
        expect(axes.yAxis.data).toEqual([]);
        expect(axes.series[0].data).toEqual([]);
        expect(build({ resources: ['A', null, 3], timeSlots: ['t'] }).yAxis.data).toEqual(['A', '', '3']);
    });
});
