import { ganttBehavior } from '../../industrial/gantt';
import { Opt, expectPlainOption, fakeTree } from './helpers';

const HOUR = 3600000;
const T0 = 1700000000000;
const build = (props: Record<string, unknown>): Opt =>
    ganttBehavior.buildOption(ganttBehavior.readProps(fakeTree(props)));

describe('industrial Gantt', () => {
    it('readProps applies the schema defaults', () => {
        expect(ganttBehavior.readProps(fakeTree({}))).toEqual({ tasks: [], title: '', showProgress: true });
    });

    it('positions bars by hours from the earliest start', () => {
        const option = build({
            tasks: [
                { name: 'Design', start: T0 + 48 * HOUR, end: T0 + 72 * HOUR, category: 'Execution' },
                { name: 'Requirements', start: T0, end: T0 + 24 * HOUR, category: 'Planning' },
                { name: 'Custom', start: T0 + 2 * HOUR, end: T0 + 3 * HOUR, category: 'Review', color: '#123456' },
                { name: 'Other', start: T0, end: T0 + HOUR, category: 'constructor' },
            ],
        });
        expect(option.yAxis).toEqual({ type: 'category', data: ['Design', 'Requirements', 'Custom', 'Other'], inverse: true });
        expect(option.series).toHaveLength(2);
        expect(option.series[0]).toMatchObject({ name: 'Offset', stack: 'gantt', data: [48, 0, 2, 0] });
        expect(option.series[1].data).toEqual([
            { value: 24, itemStyle: { color: '#91cc75' } },
            { value: 24, itemStyle: { color: '#5470c6' } },
            { value: 1, itemStyle: { color: '#123456' } },
            { value: 1, itemStyle: { color: '#5470c6' } },
        ]);
        expect(option.series[1].markPoint).toBeUndefined();
        expect(option.title[0].text).toBe('Gantt Chart');
        expect(option.xAxis).toEqual({ type: 'value', name: 'Hours', min: 0 });
    });

    it('marks milestones by row index so duplicate names stay distinct', () => {
        const option = build({
            tasks: [
                { name: 'Gate', start: T0, end: T0 + HOUR },
                { name: 'Gate', start: T0 + 5 * HOUR, end: T0 + 5 * HOUR, milestone: true },
            ],
        });
        expect(option.series[1].markPoint.data).toEqual([{
            name: 'Gate (milestone)', coord: [5, 1], symbol: 'diamond', symbolSize: 14,
            itemStyle: { color: '#ee6666' }, label: { show: false },
        }]);
    });

    it('overlays progress when tasks carry it and showProgress is on', () => {
        const tasks = [
            { name: 'A', start: T0, end: T0 + 10 * HOUR, progress: 50 },
            { name: 'B', start: T0 + 10 * HOUR, end: T0 + 20 * HOUR },
            { name: 'C', start: T0 + 20 * HOUR, end: T0 + 30 * HOUR, progress: 250 },
        ];
        const option = build({ tasks });
        expect(option.series.map((s: Opt) => s.name)).toEqual(['Offset', 'Duration', 'Progress offset', 'Progress']);
        expect(option.series[3]).toMatchObject({ stack: 'progress', barGap: '-100%', data: [5, '-', 10] });
        expect(option.series[2].data).toEqual([0, 10, 20]);
        expectPlainOption(option);
        expect(build({ tasks, showProgress: false }).series).toHaveLength(2);
        expect(build({ tasks: [tasks[1]] }).series).toHaveLength(2);
    });

    it('skips null and non-object rows instead of throwing (bug 2)', () => {
        expect(build({ tasks: [null] }).series[1].data).toEqual([]);
        const option = build({
            tasks: [null, undefined, 7, 'x', [], {}, { name: 'no start', end: T0 },
                { name: 'ok', start: T0, end: T0 + 2 * HOUR }, { start: T0 + HOUR, end: T0 + 2 * HOUR }],
        });
        expect(option.yAxis.data).toEqual(['ok', 'Task 9']);
        expect(option.series[0].data).toEqual([0, 1]);
    });

    it('degrades to an empty chart when tasks is not an array (bug 2)', () => {
        for (const tasks of [null, undefined, 'abc', 5, {}, { $columns: [{ name: 'start', data: [1] }] }]) {
            const option = build({ tasks });
            expect(option.yAxis.data).toEqual([]);
            expect(option.series[0].data).toEqual([]);
            expect(option.title[1].text).toBe('No data');
            expectPlainOption(option);
        }
    });

    it('draws a reversed or open-ended task as zero-length at its start', () => {
        const option = build({
            tasks: [
                { name: 'first', start: T0, end: T0 + HOUR },
                { name: 'reversed', start: T0 + 4 * HOUR, end: T0 + 2 * HOUR },
                { name: 'open', start: T0 + 6 * HOUR, end: null },
                { name: 'zero end', start: T0 + 8 * HOUR, end: 0 },
            ],
        });
        expect(option.series[0].data).toEqual([0, 4, 6, 8]);
        expect(option.series[1].data.map((d: Opt) => d.value)).toEqual([1, 0, 0, 0]);
    });

    it('builds 200 000 tasks in one pass without a RangeError (bug 3)', () => {
        const tasks = [];
        for (let i = 0; i < 200000; i++) {
            tasks.push({ name: `T${i}`, start: T0 + (200000 - i) * HOUR, end: T0 + (200001 - i) * HOUR, milestone: i % 1000 === 0 });
        }
        const started = Date.now();
        const option = ganttBehavior.buildOption({ tasks, title: '', showProgress: true }) as Opt;
        const elapsed = Date.now() - started;
        expect(option.series[0].data).toHaveLength(200000);
        expect(option.series[0].data[199999]).toBe(0);
        expect(option.series[0].data[0]).toBe(199999);
        expect(option.series[1].markPoint.data).toHaveLength(200);
        // the old build was quadratic (5 000 tasks took ~320 ms); 200 000 would have taken minutes
        expect(elapsed).toBeLessThan(3000);
    });
});
