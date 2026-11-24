import { INDUSTRIAL_BEHAVIORS } from '../../industrial';
import { expectPlainOption, fakeTree, throwingTree } from './helpers';

const IDS = [
    'open.industrial.Trend',
    'open.industrial.OEE',
    'open.industrial.Pareto',
    'open.industrial.SPCChart',
    'open.industrial.StateTimeline',
    'open.industrial.Gantt',
    'open.industrial.ScheduleCalendar',
    'open.industrial.ShiftCalendar',
    'open.industrial.DowntimeTracker',
    'open.industrial.BatchTimeline',
    'open.industrial.ResourceHeatmap',
];

const SHARED_PROPS = [
    'option', 'theme', 'renderer', 'autoResize', 'resizeDebounceMs', 'notMerge',
    'lazyUpdate', 'showLoading', 'loadingOptions', 'sanitizeTooltip',
];

/** Values a broken binding can plausibly deliver. */
const GARBAGE: unknown[] = [
    null, undefined, 'abc', '', 42, -1, NaN, Infinity, true, false,
    {}, { a: 1 }, { $columns: [{ name: 't', data: [1, 2] }], $: ['ds', 192, 0] },
    [], [null], [undefined], [1, 'x', null, {}, [], true], [[null]], [[]], [{}],
    [{ start: 'x', end: {}, name: null, lane: [], state: {}, date: 12, shift: null }],
    [{ start: 5, end: 1 }], ['2025-13-45', 'nope'], [NaN, NaN],
];

describe('INDUSTRIAL_BEHAVIORS', () => {
    it('has exactly the eleven published component ids', () => {
        expect(Object.keys(INDUSTRIAL_BEHAVIORS).sort()).toEqual([...IDS].sort());
    });

    describe.each(IDS)('%s', id => {
        const behavior = INDUSTRIAL_BEHAVIORS[id];

        it('reads only domain props, never the shared chart props', () => {
            const paths: string[] = [];
            behavior.readProps(fakeTree({}, paths));
            expect(paths.length).toBeGreaterThan(0);
            for (const path of paths) {
                expect(SHARED_PROPS).not.toContain(path.split('.')[0]);
            }
        });

        it('readProps does not throw when the tree throws or holds nulls', () => {
            expect(() => behavior.readProps(throwingTree())).not.toThrow();
            const keys = Object.keys(behavior.readProps(fakeTree({})));
            const nulls: Record<string, unknown> = {};
            keys.forEach(k => { nulls[k] = null; });
            expect(behavior.readProps(fakeTree(nulls))).toEqual(behavior.readProps(fakeTree({})));
        });

        it('builds a plain, deterministic option from the default props', () => {
            const props = behavior.readProps(fakeTree({}));
            const a = behavior.buildOption(props);
            const b = behavior.buildOption(props);
            expectPlainOption(a);
            expect(a).toEqual(b);
            expect(JSON.parse(JSON.stringify(a))).toEqual(JSON.parse(JSON.stringify(b)));
        });

        it('never throws on malformed prop values', () => {
            const defaults = behavior.readProps(fakeTree({})) as Record<string, unknown>;
            for (const key of Object.keys(defaults)) {
                for (const bad of GARBAGE) {
                    // through readProps (as a binding would deliver it) and straight into buildOption
                    const viaTree = behavior.readProps(fakeTree({ [key]: bad }));
                    expectPlainOption(behavior.buildOption(viaTree));
                    expectPlainOption(behavior.buildOption({ ...defaults, [key]: bad }));
                }
            }
            // every prop bad at once
            for (const bad of GARBAGE) {
                const all: Record<string, unknown> = {};
                Object.keys(defaults).forEach(k => { all[k] = bad; });
                expectPlainOption(behavior.buildOption(all));
            }
            expectPlainOption(behavior.buildOption({}));
        });
    });
});
