import { stateTimelineBehavior } from '../../industrial/stateTimeline';
import { Opt, fakeTree } from './helpers';

const MIN = 60000;
const build = (props: Record<string, unknown>): Opt =>
    stateTimelineBehavior.buildOption(stateTimelineBehavior.readProps(fakeTree(props)));

describe('industrial StateTimeline', () => {
    it('readProps applies the schema defaults', () => {
        expect(stateTimelineBehavior.readProps(fakeTree({}))).toEqual({ events: [], stateColors: {}, title: '' });
    });

    it('stacks minutes per lane and state', () => {
        const option = build({
            events: [
                { lane: 'Reactor A', state: 'Running', start: 0, end: 30 * MIN },
                { lane: 'Reactor A', state: 'Idle', start: 30 * MIN, end: 45 * MIN },
                { lane: 'Reactor B', state: 'Running', start: 0, end: 10 * MIN },
            ],
        });
        expect(option.yAxis.data).toEqual(['Reactor A', 'Reactor B']);
        expect(option.legend.data).toEqual(['Running', 'Idle']);
        expect(option.series).toEqual([
            { name: 'Running', type: 'bar', stack: 'timeline', data: [30, 10], itemStyle: { color: '#91cc75' } },
            { name: 'Idle', type: 'bar', stack: 'timeline', data: [15, 0], itemStyle: { color: '#fac858' } },
        ]);
        expect(option.title[0].text).toBe('State Timeline');
        expect(option.title[1].text).toBe('');
        expect(option.xAxis.name).toBe('Minutes');
    });

    it('resolves colours: event colour, then stateColors, then defaults, then fallback', () => {
        const option = build({
            events: [
                { lane: 'A', state: 'Running', start: 0, end: MIN },
                { lane: 'A', state: 'Alarm', start: 0, end: MIN, color: '#000001' },
                { lane: 'A', state: 'Custom', start: 0, end: MIN },
                { lane: 'A', state: 'constructor', start: 0, end: MIN },
            ],
            stateColors: { Running: '#000002', Alarm: '#000003' },
            title: 'Line 4',
        });
        expect(option.series.map((s: Opt) => s.itemStyle.color)).toEqual(['#000002', '#000001', '#5470c6', '#5470c6']);
        expect(option.title[0].text).toBe('Line 4');
    });

    it('does not let reversed intervals subtract from the total', () => {
        const option = build({
            events: [
                { lane: 'A', state: 'Running', start: 0, end: 60 * MIN },
                { lane: 'A', state: 'Running', start: 90 * MIN, end: 70 * MIN },
            ],
        });
        expect(option.series[0].data).toEqual([60]);
    });

    it('degrades to an empty chart on malformed events (bug 2)', () => {
        for (const events of [null, 'abc', { $columns: [] }, [null], [1, 'x'], [{}]]) {
            const option = build({ events });
            expect(option.series).toEqual([]);
            expect(option.yAxis.data).toEqual([]);
            expect(option.title[1].text).toBe('No data');
        }
        const partial = build({ events: [null, { lane: 'A', state: 'Idle', start: 0, end: 2 * MIN }, { lane: 'B' }] });
        expect(partial.series[0].data).toEqual([2]);
    });
});
