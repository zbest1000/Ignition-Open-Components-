import { batchTimelineBehavior } from '../../industrial/batchTimeline';
import { Opt, fakeTree } from './helpers';

const MIN = 60000;
const build = (props: Record<string, unknown>): Opt =>
    batchTimelineBehavior.buildOption(batchTimelineBehavior.readProps(fakeTree(props)));

describe('industrial BatchTimeline', () => {
    it('readProps applies the schema defaults', () => {
        expect(batchTimelineBehavior.readProps(fakeTree({}))).toEqual({ phases: [], phaseColors: {}, title: '' });
    });

    it('stacks minutes per batch and phase', () => {
        const option = build({
            phases: [
                { batch: 'B-001', phase: 'Charge', start: 0, end: 60 * MIN },
                { batch: 'B-001', phase: 'Heat', start: 60 * MIN, end: 150 * MIN, status: 'Complete' },
                { batch: 'B-002', phase: 'Charge', start: 0, end: 45 * MIN },
            ],
        });
        expect(option.yAxis).toEqual({ type: 'category', data: ['B-001', 'B-002'], inverse: true });
        expect(option.legend.data).toEqual(['Charge', 'Heat']);
        expect(option.series).toEqual([
            { name: 'Charge', type: 'bar', stack: 'batch', data: [60, 45], itemStyle: { color: '#5470c6' } },
            { name: 'Heat', type: 'bar', stack: 'batch', data: [90, 0], itemStyle: { color: '#ee6666' } },
        ]);
        expect(option.title[0].text).toBe('Batch Timeline');
    });

    it('handles reversed, zero-length and sub-minute phases', () => {
        const option = build({
            phases: [
                { batch: 'B', phase: 'Cool', start: 10 * MIN, end: 5 * MIN },
                { batch: 'B', phase: 'Hold', start: 7 * MIN, end: 7 * MIN },
                { batch: 'B', phase: 'CIP', start: 0, end: 90000 },
            ],
            phaseColors: { CIP: '#abcdef' },
            title: 'Reactor 2',
        });
        expect(option.series.map((s: Opt) => s.data)).toEqual([[0], [0], [1.5]]);
        expect(option.series[2].itemStyle.color).toBe('#abcdef');
        expect(option.title[0].text).toBe('Reactor 2');
    });

    it('degrades to an empty chart on malformed phases (bug 2)', () => {
        for (const phases of [null, 'abc', { $columns: [] }, [null], [{ batch: 'x' }]]) {
            const option = build({ phases });
            expect(option.series).toEqual([]);
            expect(option.title[1].text).toBe('No data');
        }
    });
});
