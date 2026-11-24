import { computeOEE, oeeBehavior } from '../../industrial/oee';
import { Opt, fakeTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    oeeBehavior.buildOption(oeeBehavior.readProps(fakeTree(props)));
const values = (option: Opt): number[] => option.series[0].data.map((d: Opt) => d.value);

describe('industrial OEE', () => {
    it('readProps applies the schema defaults', () => {
        expect(oeeBehavior.readProps(fakeTree({}))).toEqual({
            availability: 92, performance: 95, quality: 97, oeeOverride: null, showLabels: true,
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
        // One neutral band for the unfilled part of the rings, whatever the theme's gauge colours.
        expect(option.series[0].axisLine.lineStyle.color).toEqual([[1, 'rgba(128,128,128,0.2)']]);
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
});
