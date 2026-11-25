import { computeOEE, oeeBehavior, productOfFactors, readFactors } from '../../industrial/oee';
import { Opt, expectPlainOption, fakeTree, throwingTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    oeeBehavior.buildOption(oeeBehavior.readProps(fakeTree(props)));
const values = (option: Opt): number[] => option.series[0].data.map((d: Opt) => d.value);
const rings = (option: Opt): Opt => option.series.find((s: Opt) => s.name === 'rings');
const ringValues = (option: Opt): number[] => rings(option).data.map((d: Opt) => d.value);
const ringColors = (option: Opt): unknown[] => rings(option).data.map((d: Opt) => d.itemStyle?.color);
const targets = (option: Opt): unknown[] => option.series.find((s: Opt) => s.name === 'target').data;
const texts = (option: Opt): unknown[] => option.series[0].data.map((d: Opt) => d.detail.formatter);
const THRESHOLDS = [{ upTo: 60, color: 'red' }, { upTo: 85, color: 'orange' }, { color: 'green' }];

describe('industrial OEE', () => {
    it('readProps applies the schema defaults', () => {
        expect(oeeBehavior.readProps(fakeTree({}))).toEqual({
            availability: 92, performance: 95, quality: 97, oeeOverride: null, showLabels: true,
            labels: {}, colors: {}, thresholds: [], target: null, decimals: null, metrics: [],
        });
    });

    it('computes OEE = A x P x Q for percentage inputs', () => {
        // 92 % x 95 % x 97 % = 84.778 % -> 85
        expect(values(build({}))).toEqual([85, 92, 95, 97]);
        expect(computeOEE({ availability: 50, performance: 50, quality: 50, oeeOverride: null }).oee).toBe(13); // 12.5
        expect(computeOEE({ availability: 100, performance: 100, quality: 100, oeeOverride: null }).oee).toBe(100);
        expect(computeOEE({ availability: 90, performance: 0, quality: 99, oeeOverride: null }).oee).toBe(0);
    });

    it('names the four rings and uses a 0-100 gauge', () => {
        const option = build({});
        expect(option.series[0].data.map((d: Opt) => d.name)).toEqual(['OEE', 'Availability', 'Performance', 'Quality']);
        expect(option.series[0].min).toBe(0);
        expect(option.series[0].max).toBe(100);
        expect(option.series[0].detail.formatter).toBe('{value}%');
        // One neutral track for the unfilled part of the rings, whatever the theme's colours.
        expect(rings(option).backgroundStyle.color).toBe('rgba(128,128,128,0.2)');
        expect(build({ showLabels: false }).series[0].detail).toEqual({ show: false });
    });

    it('keeps all four name/value rows inside the hole of the ring', () => {
        // The ring is 30 px of a 150 px radius at the default 400 x 400 size, so text must stay
        // well within 80 % of the radius; the Quality value used to sit at 85 % and was cut off.
        const offsets = build({}).series[0].data.flatMap((d: Opt) => [d.title.offsetCenter[1], d.detail.offsetCenter[1]]);
        const percents = offsets.map((o: string) => parseFloat(o));
        expect(percents).toEqual([...percents].sort((a, b) => a - b));
        for (const p of percents) expect(Math.abs(p)).toBeLessThanOrEqual(60);
        for (let i = 1; i < percents.length; i++) expect(percents[i] - percents[i - 1]).toBeGreaterThanOrEqual(13);
    });

    it('clamps factors to 0-100 before multiplying', () => {
        expect(values(build({ availability: 120, performance: 110, quality: -5 }))).toEqual([0, 100, 100, 0]);
        expect(values(build({ availability: 150, performance: 80, quality: 100 }))).toEqual([80, 100, 80, 100]);
    });

    it('uses a numeric oeeOverride (including 0) and ignores a non-numeric one', () => {
        expect(values(build({ oeeOverride: 42.5 }))[0]).toBe(42.5);
        expect(values(build({ oeeOverride: 0 }))[0]).toBe(0);
        expect(values(build({ oeeOverride: '61' }))[0]).toBe(61);
        expect(values(build({ oeeOverride: 250 }))[0]).toBe(100);
        expect(values(build({ oeeOverride: 'n/a' }))[0]).toBe(85);
        expect(values(build({ oeeOverride: '' }))[0]).toBe(85);
        expect(values(build({ oeeOverride: null }))[0]).toBe(85);
    });

    it('treats unusable factors as 0 instead of producing NaN', () => {
        expect(values(build({ availability: 'bad' }))).toEqual([0, 0, 95, 97]);
        expect(values(oeeBehavior.buildOption({
            availability: NaN, performance: undefined, quality: {}, oeeOverride: undefined, showLabels: true,
        }) as Opt)).toEqual([0, 0, 0, 0]);
        expect(values(build({ availability: '90', performance: '100', quality: '100' }))).toEqual([90, 90, 100, 100]);
    });

    it('draws the rings from the same values as the labels', () => {
        const option = build({});
        expect(option.series.map((s: Opt) => s.name)).toEqual(['labels', 'rings', 'targetOffset', 'target']);
        expect(ringValues(option)).toEqual([85, 92, 95, 97]);
        expect(rings(option).data.map((d: Opt) => d.name)).toEqual(['OEE', 'Availability', 'Performance', 'Quality']);
        expect(ringValues(build({ availability: 150, quality: 'bad', oeeOverride: 42.5 }))).toEqual([42.5, 100, 95, 0]);
        // The band of rings is the 30 px of a 150 px radius the gauge used at 400 x 400, OEE outermost, no gaps.
        expect(option.polar).toEqual({ center: ['50%', '50%'], radius: ['60%', '75%'] });
        expect(option.radiusAxis.inverse).toBe(true);
        expect(rings(option).barCategoryGap).toBe('0%');
        expect(option.angleAxis).toMatchObject({ min: 0, max: 100, startAngle: 90, endAngle: -270, clockwise: true });
        // Colours are left to the theme palette unless props set them.
        expect(ringColors(option)).toEqual([undefined, undefined, undefined, undefined]);
        expect(option.series[0].data.every((d: Opt) => d.itemStyle === undefined)).toBe(true);
        expect(targets(option)).toEqual([]);
        expect(rings(option).data[1].tooltip.formatter).toBe('{b}: <b>92%</b>');
    });

    it('hides names and values when showLabels is false', () => {
        const option = build({ showLabels: false });
        expect(option.series[0].title).toEqual({ show: false });
        expect(option.series[0].detail).toEqual({ show: false });
        expect(ringValues(option)).toEqual([85, 92, 95, 97]);
    });

    it('renames the rings with labels', () => {
        const names = (o: Opt): string[] => o.series[0].data.map((d: Opt) => d.name);
        expect(names(build({ labels: { oee: 'GAE', availability: 'Verfügbarkeit', performance: 'Leistung', quality: 'Qualität' } })))
            .toEqual(['GAE', 'Verfügbarkeit', 'Leistung', 'Qualität']);
        expect(names(build({ labels: { quality: 'FPY', performance: '', availability: null, extra: 'x' } })))
            .toEqual(['OEE', 'Availability', 'Performance', 'FPY']);
        for (const bad of [null, 'abc', 5, [], ['a', 'b']]) {
            expect(names(build({ labels: bad }))).toEqual(['OEE', 'Availability', 'Performance', 'Quality']);
        }
    });

    it('colours the rings from colors, as an object or an array', () => {
        const byKey = build({ colors: { oee: '#111', quality: '#444', performance: '' } });
        expect(ringColors(byKey)).toEqual(['#111', undefined, undefined, '#444']);
        // The labels take the colour of their ring.
        expect(byKey.series[0].data.map((d: Opt) => d.itemStyle?.color)).toEqual(['#111', undefined, undefined, '#444']);
        expect(ringColors(build({ colors: ['#a', '#b', '#c', '#d', '#e'] }))).toEqual(['#a', '#b', '#c', '#d']);
        expect(ringColors(build({ colors: ['#a', null, 7] }))).toEqual(['#a', undefined, undefined, undefined]);
        expect(ringColors(build({ colors: 'red' }))).toEqual([undefined, undefined, undefined, undefined]);
    });

    it('colours every ring by its value with thresholds, which win over colors', () => {
        // OEE 59.5 -> 60 is not below 60: orange. 59 is red. 85 is not below 85: green.
        const option = build({ availability: 70, performance: 85, quality: 100, thresholds: THRESHOLDS, colors: { oee: '#111' } });
        expect(values(option)).toEqual([60, 70, 85, 100]); // 70 x 85 x 100 = 59.5 -> 60
        expect(ringColors(option)).toEqual(['orange', 'orange', 'green', 'green']);
        expect(ringColors(build({ availability: 59, thresholds: THRESHOLDS }))).toEqual(['red', 'red', 'green', 'green']);
        // Values no band takes keep their own colour.
        expect(ringColors(build({ thresholds: [{ upTo: 90, color: 'red' }], colors: { quality: '#444' } })))
            .toEqual(['red', undefined, undefined, '#444']);
        expect(ringColors(build({ thresholds: [null, 5, { upTo: 50 }, { color: '' }] })))
            .toEqual([undefined, undefined, undefined, undefined]);
    });

    it('marks the OEE target on the OEE ring only', () => {
        const option = build({ target: 85 });
        const tick = 2.2 / 360 * 100;
        expect(targets(option)[0]).toBeCloseTo(tick, 10);
        expect(targets(option).slice(1)).toEqual(['-', '-', '-']);
        const offsets = option.series.find((s: Opt) => s.name === 'targetOffset').data;
        expect(offsets[0]).toBeCloseTo(85 - tick / 2, 10);
        expect(offsets.slice(1)).toEqual(['-', '-', '-']);
        expect(rings(option).data[0].tooltip.formatter).toBe('{b}: <b>85%</b> (target 85%)');
        for (const none of [null, '', 'abc', -1, 101, {}]) expect(targets(build({ target: none }))).toEqual([]);
        expect(targets(build({ target: '90' }))[0]).toBeCloseTo(tick, 10);
    });

    it('rounds every value to decimals when set, and leaves them alone when not', () => {
        // 91.26 x 88.5 x 99.24 / 10000 = 80.152...
        const raw = { availability: 91.26, performance: 88.5, quality: 99.24 };
        expect(values(build(raw))).toEqual([80, 91.26, 88.5, 99.24]);
        expect(texts(build(raw))).toEqual([undefined, undefined, undefined, undefined]);
        const one = build({ ...raw, decimals: 1 });
        expect(values(one)).toEqual([80.2, 91.3, 88.5, 99.2]);
        expect(texts(one)).toEqual(['80.2%', '91.3%', '88.5%', '99.2%']);
        expect(ringValues(one)).toEqual([80.2, 91.3, 88.5, 99.2]);
        expect(texts(build({ ...raw, decimals: 0 }))).toEqual(['80%', '91%', '89%', '99%']);
        expect(values(build({ ...raw, decimals: 2, oeeOverride: 61.237 }))[0]).toBe(61.24);
        expect(values(build({ ...raw, decimals: 'x' }))).toEqual([80, 91.26, 88.5, 99.24]);
        expect(texts(build({ decimals: 99 }))[0]).toBe('84.7780000000%'); // capped at 10 decimals
    });

    it('multiplies the factors of a metrics array instead of A, P and Q', () => {
        expect(productOfFactors([92, 95, 97])).toBe(92 * 95 * 97 / 10000);
        expect(productOfFactors([90, 90, 90, 90])).toBeCloseTo(65.61, 10);
        expect(productOfFactors([80])).toBe(80);
        expect(productOfFactors([])).toBe(0);

        const metrics = [
            { name: 'Availability', value: 90 }, { name: 'Performance', value: 90 },
            { name: 'Quality', value: 90, color: '#333' }, { name: 'Loading', value: 90, target: 95 },
        ];
        const option = build({ metrics, availability: 1, performance: 1, quality: 1, labels: { availability: 'ignored' } });
        expect(values(option)).toEqual([66, 90, 90, 90, 90]); // 0.9^4 = 65.61 %
        expect(option.series[0].data.map((d: Opt) => d.name)).toEqual(['OEE', 'Availability', 'Performance', 'Quality', 'Loading']);
        expect(ringColors(option)).toEqual([undefined, undefined, undefined, '#333', undefined]);
        expect(targets(option).map(t => t !== '-')).toEqual([false, false, false, false, true]);
        expect(values(build({ metrics, decimals: 2 }))[0]).toBe(65.61);
        expect(values(build({ metrics, oeeOverride: 50 }))[0]).toBe(50);
        // Five rings: the band grows inwards by one ring's share.
        expect(option.polar.radius).toEqual(['56.25%', '75%']);
    });

    it('validates the metrics array like A, P and Q', () => {
        const option = build({ metrics: [null, 'x', 5, { value: 150 }, { name: 'B', value: 'bad' }, { name: 'C', value: '50' }] });
        expect(option.series[0].data.map((d: Opt) => d.name)).toEqual(['OEE', 'Factor 1', 'B', 'C']);
        expect(values(option)).toEqual([0, 100, 0, 50]);
        // Nothing usable in metrics: back to A, P and Q.
        for (const bad of [null, 'abc', {}, [], [null, 1, 'x']]) {
            expect(values(build({ metrics: bad }))).toEqual([85, 92, 95, 97]);
        }
        expect(readFactors({ ...oeeBehavior.readProps(fakeTree({})), metrics: [{ value: 40 }] }))
            .toEqual([{ name: 'Factor 1', value: 40, color: undefined, target: NaN }]);
    });

    it('fits the name/value rows of up to four factors and labels only OEE beyond', () => {
        const factors = (n: number): unknown[] => Array.from({ length: n }, (_, i) => ({ name: `F${i}`, value: 90 }));
        for (const n of [1, 2, 3, 4]) {
            const data = build({ metrics: factors(n) }).series[0].data;
            const percents = data.flatMap((d: Opt) => [parseFloat(d.title.offsetCenter[1]), parseFloat(d.detail.offsetCenter[1])]);
            expect(percents).toEqual([...percents].sort((a: number, b: number) => a - b));
            for (const p of percents) expect(Math.abs(p)).toBeLessThanOrEqual(60);
            for (let i = 1; i < percents.length; i++) expect(percents[i] - percents[i - 1]).toBeGreaterThanOrEqual(11);
        }
        const many = build({ metrics: factors(8) });
        expect(many.series[0].data[0].title.show).toBeUndefined();
        expect(many.series[0].data.slice(1).every((d: Opt) => d.title.show === false && d.detail.show === false)).toBe(true);
        expect(ringValues(many)).toHaveLength(9);
        expect(many.polar.radius).toEqual(['45%', '75%']);
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

describe('OEE with malformed props', () => {
    const behavior = oeeBehavior;

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
