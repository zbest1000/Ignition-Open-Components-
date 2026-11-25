import { downtimeTrackerBehavior } from '../../industrial/downtimeTracker';
import { Opt, fakeTree } from './helpers';

const MIN = 60000;
const build = (props: Record<string, unknown>): Opt =>
    downtimeTrackerBehavior.buildOption(downtimeTrackerBehavior.readProps(fakeTree(props)));

const EVENTS = [
    { equipment: 'Line 1', category: 'Mechanical', start: 0, end: 30 * MIN, reason: 'Belt' },
    { equipment: 'Line 1', category: 'Electrical', start: 60 * MIN, end: 75 * MIN },
    { equipment: 'Line 2', category: 'Mechanical', start: 0, end: 10 * MIN },
];

describe('industrial DowntimeTracker', () => {
    it('readProps applies the schema defaults', () => {
        expect(downtimeTrackerBehavior.readProps(fakeTree({}))).toEqual({
            events: [], categoryColors: {}, title: '', showSummary: true,
        });
    });

    it('stacks downtime minutes per equipment and category', () => {
        const option = build({ events: EVENTS });
        expect(option.yAxis.data).toEqual(['Line 1', 'Line 2']);
        expect(option.legend.data).toEqual(['Mechanical', 'Electrical']);
        expect(option.series).toEqual([
            { name: 'Mechanical', type: 'bar', stack: 'downtime', data: [30, 10], itemStyle: { color: '#ee6666' } },
            { name: 'Electrical', type: 'bar', stack: 'downtime', data: [15, 0], itemStyle: { color: '#fac858' } },
        ]);
        expect(option.title[0].text).toBe('Downtime Tracker');
    });

    it('shows the total downtime as a summary line unless switched off', () => {
        expect(build({ events: EVENTS }).title[0].subtext).toBe('Total downtime: 55 min');
        expect(build({ events: EVENTS, showSummary: false }).title[0].subtext).toBe('');
        expect(build({ events: [] }).title[0].subtext).toBe('');
    });

    it('sums sub-minute events before rounding (was rounded per event)', () => {
        const events = [];
        for (let i = 0; i < 6; i++) events.push({ equipment: 'L', category: 'Operator', start: i * MIN, end: i * MIN + 20000 });
        // 6 x 20 s = 2 min; rounding each event first gave 0
        expect(build({ events }).series[0].data).toEqual([2]);
    });

    it('does not double count duplicated or overlapping records of one category', () => {
        const option = build({
            events: [EVENTS[0], EVENTS[0], { equipment: 'Line 1', category: 'Mechanical', start: 20 * MIN, end: 40 * MIN }],
        });
        expect(option.series[0].data).toEqual([40]);
    });

    it('applies categoryColors and a custom title', () => {
        const option = build({ events: EVENTS, categoryColors: { Mechanical: '#010101' }, title: 'Stops' });
        expect(option.series[0].itemStyle.color).toBe('#010101');
        expect(option.title[0].text).toBe('Stops');
    });

    it('degrades to an empty chart on malformed events (bug 2)', () => {
        for (const events of [null, 'abc', { $columns: [] }, [null], [{ equipment: 'x' }]]) {
            const option = build({ events });
            expect(option.series).toEqual([]);
            expect(option.title[1].text).toBe('No data');
        }
        // an open event (no end yet) keeps its equipment visible with no time
        const open = build({ events: [{ equipment: 'Line 9', category: 'Planned', start: 5, end: null }] });
        expect(open.yAxis.data).toEqual(['Line 9']);
        expect(open.series[0].data).toEqual([0]);
    });
});
