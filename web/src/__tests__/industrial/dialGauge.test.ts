import {
    SIZE_STEPS, TRACK_COLOR, anglesOf, arcBox, aspectSteps, bandsOf, chooseTicks, colorStops, dialGaugeBehavior, fitFont,
    fitNames, placeDial, readStages, scaleOf, scaleUnit, stageOf, textWidth,
} from '../../industrial/dialGauge';
import { sanitizeOption } from '../../utils/optionSanitizer';
import { Opt, expectPlainOption, fakeTree } from './helpers';

const GREEN = '#3ba272';
const AMBER = '#e6a23c';
const RED = '#e05252';
const BLUE = '#5470c6';
const MUTED = '#8c8c8c';
const STAGES = [
    { upTo: 80, color: GREEN, name: 'Normal' },
    { upTo: 100, color: AMBER, name: 'High' },
    { color: RED, name: 'Critical' },
];
/** The sample a freshly dropped gauge shows (the schema defaults of the props that fall back to null or nothing). */
const SAMPLE = { value: 72.4, target: 90, stages: STAGES };
const build = (props: Record<string, unknown>): Opt =>
    dialGaugeBehavior.buildOption(dialGaugeBehavior.readProps(fakeTree({ ...SAMPLE, ...props })));
const dial = (option: Opt): Opt => option.baseOption.series[0];
const target = (option: Opt): Opt => option.baseOption.series[1];
const names = (option: Opt): Opt => option.baseOption.series[2];
/** The media rules that apply to a component of the given size, merged in order, as ECharts does. */
const at = (option: Opt, width: number, height: number): Opt[] => {
    const merged: Opt[] = [{}, {}, {}];
    const assign = (to: Opt, from: Opt): void => {
        for (const key of Object.keys(from)) {
            if (typeof from[key] === 'object' && from[key] !== null && !Array.isArray(from[key])) {
                to[key] = to[key] || {};
                assign(to[key], from[key]);
            } else {
                to[key] = from[key];
            }
        }
    };
    for (const rule of option.media) {
        const q = rule.query;
        const applies = (q.minWidth === undefined || width >= q.minWidth) && (q.minHeight === undefined || height >= q.minHeight)
            && (q.minAspectRatio === undefined || width / height >= q.minAspectRatio);
        if (applies) rule.option.series.forEach((part: Opt, i: number) => assign(merged[i], part));
    }
    return merged;
};

describe('industrial DialGauge', () => {
    it('readProps applies the defaults; value, target, stages and the angles stay empty when unset', () => {
        const props = dialGaugeBehavior.readProps(fakeTree({}));
        expect(props).toEqual({
            value: null, min: 0, max: 120, unit: '°C', decimals: 1, title: 'Bearing temperature', variant: 'progress',
            stages: [], color: BLUE, target: null, showScale: true, showValue: true, splitNumber: 0,
            startAngle: null, sweep: null,
        });
    });

    describe('stages', () => {
        it('reads stages in ascending order; an entry without upTo takes the rest', () => {
            const stages = readStages([{ color: RED, name: 'C' }, { upTo: '100', color: AMBER }, { upTo: 80, color: GREEN, name: 'A{|}' }]);
            expect(stages).toEqual([
                { upTo: 80, color: GREEN, name: 'A' },
                { upTo: 100, color: AMBER, name: '' },
                { upTo: Infinity, color: RED, name: 'C' },
            ]);
            // entries without a colour and non-objects are skipped; of equal bounds the first listed wins
            expect(readStages([null, 5, 'x', { upTo: 5 }, { upTo: 5, color: '' }, { upTo: 5, color: 'a' }, { upTo: 5, color: 'b' }]))
                .toEqual([{ upTo: 5, color: 'a', name: '' }, { upTo: 5, color: 'b', name: '' }]);
            expect(readStages('nope')).toEqual([]);
            expect(readStages(null)).toEqual([]);
        });

        it('selects the stage with an exclusive upper bound', () => {
            const stages = readStages(STAGES);
            expect(stageOf(stages, 79.99)!.name).toBe('Normal');
            expect(stageOf(stages, 80)!.name).toBe('High');
            expect(stageOf(stages, 100)!.name).toBe('Critical');
            expect(stageOf(stages, 1e9)!.name).toBe('Critical');
            expect(stageOf(stages, -50)!.name).toBe('Normal');
            expect(stageOf(stages, NaN)).toBeUndefined();
            expect(stageOf(readStages(STAGES.slice(0, 2)), 100)).toBeUndefined();
            expect(stageOf([], 5)).toBeUndefined();
        });

        it('clips the stages to the scale as consecutive bands', () => {
            const stages = readStages(STAGES);
            expect(bandsOf(stages, 0, 120)).toEqual([
                { from: 0, to: 80, color: GREEN, name: 'Normal' },
                { from: 80, to: 100, color: AMBER, name: 'High' },
                { from: 100, to: 120, color: RED, name: 'Critical' },
            ]);
            // a scale that starts inside the second stage and ends inside it
            expect(bandsOf(stages, 85, 95)).toEqual([{ from: 85, to: 95, color: AMBER, name: 'High' }]);
            // stages that end below the top leave the rest without a band
            expect(bandsOf(readStages(STAGES.slice(0, 2)), 50, 120).map(b => [b.from, b.to])).toEqual([[50, 80], [80, 100]]);
            expect(bandsOf([], 0, 1)).toEqual([]);
        });

        it('turns bands into colour stops that end at 1', () => {
            const stages = readStages(STAGES);
            expect(colorStops(bandsOf(stages, 0, 120), 0, 120, TRACK_COLOR)).toEqual([[0.666667, GREEN], [0.833333, AMBER], [1, RED]]);
            expect(colorStops(bandsOf(stages, -40, 120), -40, 120, TRACK_COLOR)).toEqual([[0.75, GREEN], [0.875, AMBER], [1, RED]]);
            expect(colorStops(bandsOf(readStages(STAGES.slice(0, 1)), 0, 160), 0, 160, TRACK_COLOR)).toEqual([[0.5, GREEN], [1, TRACK_COLOR]]);
            expect(colorStops([], 0, 1, 'x')).toEqual([[1, 'x']]);
        });
    });

    describe('scale', () => {
        it('falls back to 0-100 when max is not greater than min', () => {
            expect(scaleOf(-40, 120)).toEqual([-40, 120]);
            expect(scaleOf('5', '6')).toEqual([5, 6]);
            expect(scaleOf(50, 50)).toEqual([0, 100]);
            expect(scaleOf(80, 20)).toEqual([0, 100]);
            expect(scaleOf(null, 'x')).toEqual([0, 100]);
        });

        it('chooses a number of divisions that gives round steps', () => {
            // 0-120 in steps of 20, with 4 minor divisions of 5
            expect(chooseTicks(0, 120, 270, 0)).toEqual({ splitNumber: 6, minor: 4, labelChars: 3 });
            expect(chooseTicks(-40, 120, 270, 0)).toEqual({ splitNumber: 8, minor: 4, labelChars: 3 });
            expect(chooseTicks(0, 100, 270, 0)).toEqual({ splitNumber: 5, minor: 4, labelChars: 3 });
            expect(chooseTicks(0, 1, 270, 0)).toEqual({ splitNumber: 5, minor: 4, labelChars: 3 });
            // 1500 / 6 = 250
            expect(chooseTicks(0, 1500, 270, 0)).toMatchObject({ splitNumber: 6, minor: 5 });
            // fewer divisions on a short arc: 0-100 in steps of 25 or 20, never 10
            expect(chooseTicks(0, 100, 120, 0).splitNumber).toBeLessThanOrEqual(5);
            // 37.5 / 5 = 7.5
            expect(chooseTicks(0, 37.5, 270, 0)).toEqual({ splitNumber: 5, minor: 2, labelChars: 4 });
            expect(chooseTicks(0, 7, 270, 0)).toMatchObject({ splitNumber: 7, minor: 5 });
        });

        it('labels only the ends of a scale that no division makes round', () => {
            // 0.123457 / n has more than two digits for every n
            expect(chooseTicks(0, 0.123457, 270, 0)).toMatchObject({ splitNumber: 1, minor: 10 });
        });

        it('takes a requested number of divisions as given', () => {
            expect(chooseTicks(0, 120, 270, 4)).toEqual({ splitNumber: 4, minor: 2, labelChars: 3 });
            expect(chooseTicks(0, 120, 270, 3.6).splitNumber).toBe(4);
            expect(chooseTicks(0, 120, 270, 500).splitNumber).toBe(24);
            expect(chooseTicks(0, 120, 270, -3).splitNumber).toBe(6);
        });

        it('labels large scales in thousands, millions and billions', () => {
            expect(scaleUnit(0, 9999)).toEqual({ factor: 1, suffix: '' });
            expect(scaleUnit(0, 25000)).toEqual({ factor: 1e3, suffix: 'k' });
            expect(scaleUnit(-2e6, 100)).toEqual({ factor: 1e6, suffix: 'M' });
            expect(scaleUnit(0, 3e9)).toEqual({ factor: 1e9, suffix: 'G' });
            const option = build({ variant: 'stages', min: 0, max: 2000000, value: 1234567.8, target: 1500000, unit: 'kPa' });
            expect(dial(option)).toMatchObject({ min: 0, max: 2, splitNumber: 4, axisLabel: { formatter: '{value}M' } });
            expect(dial(option).data[0].value).toBe(1.2345678);
            expect(target(option).data[0].value).toBe(1.5);
            // the value itself is written in full
            expect(dial(option).detail.formatter).toBe('1,234,567.8{unit| kPa}');
        });
    });

    describe('geometry', () => {
        it('finds the box of an arc', () => {
            // 270 degrees open at the bottom: the full width, from the top down to sin 45
            expect(arcBox(225, 270)).toEqual({ x0: -1, x1: 1, y0: -1, y1: 0.707107 });
            // the upper half
            const half = arcBox(180, 180);
            expect(half).toMatchObject({ x0: -1, x1: 1, y0: -1 });
            expect(half.y1).toBeCloseTo(0, 6);
            // the right half
            expect(arcBox(90, 180)).toMatchObject({ x1: 1, y0: -1, y1: 1 });
            expect(arcBox(90, 180).x0).toBeCloseTo(0, 6);
            // 120 degrees around the top: ends at 150 and 30 degrees
            expect(arcBox(150, 120)).toEqual({ x0: -0.866025, x1: 0.866025, y0: -1, y1: -0.5 });
            expect(arcBox(90, 360)).toEqual({ x0: -1, x1: 1, y0: -1, y1: 1 });
            // angles outside 0-360 are the same arc
            expect(arcBox(225 + 720, 270)).toEqual(arcBox(225, 270));
            expect(arcBox(-135, 270)).toEqual(arcBox(225, 270));
        });

        it('places the dial so that its box fills the component', () => {
            const square = { x0: -1, x1: 1, y0: -1, y1: 1 };
            // 5 % margin; the radius is in percent of half the smaller side
            expect(placeDial(square, 1)).toEqual({ radius: 95, cx: 50, cy: 50 });
            expect(placeDial(square, 2)).toEqual({ radius: 95, cx: 50, cy: 50 });
            expect(placeDial(square, 0.5)).toEqual({ radius: 95, cx: 50, cy: 50 });
            // the upper half in a 2:1 component: radius = height * 0.95, centre at the bottom edge of the box
            const half = { x0: -1, x1: 1, y0: -1, y1: 0 };
            expect(placeDial(half, 2)).toEqual({ radius: 190, cx: 50, cy: 97.5 });
            // in a square it is limited by the width: radius = 0.475 of the side, centred as a whole
            expect(placeDial(half, 1)).toEqual({ radius: 95, cx: 50, cy: 73.75 });
        });

        it('steps the placement over the aspect ratios in which it changes', () => {
            const half = { x0: -1, x1: 1, y0: -1, y1: 0 };
            const steps = aspectSteps(half);
            expect(steps[0]).toBeCloseTo(1 / 3, 3);
            expect(steps[steps.length - 1]).toBe(2);
            expect(steps).toContain(1);
            for (let i = 1; i < steps.length; i++) {
                expect(steps[i]).toBeGreaterThan(steps[i - 1]);
                expect(steps[i] / steps[i - 1]).toBeLessThan(1.11);
            }
            // an off-centre box keeps moving in wider components
            expect(aspectSteps({ x0: 0, x1: 1, y0: -1, y1: 0 }).pop()).toBe(3);
        });

        it('resolves the angles per variant', () => {
            expect(anglesOf('progress', null, null)).toEqual({ startAngle: 225, sweep: 270 });
            expect(anglesOf('grade', null, null)).toEqual({ startAngle: 180, sweep: 180 });
            expect(anglesOf('stages', null, 180)).toEqual({ startAngle: 180, sweep: 180 });
            expect(anglesOf('minimal', 90, '360')).toEqual({ startAngle: 90, sweep: 360 });
            expect(anglesOf('minimal', 'x', 5)).toEqual({ startAngle: 105, sweep: 30 });
            expect(anglesOf('minimal', 1e12, 1e12)).toEqual({ startAngle: 270, sweep: 360 });
        });
    });

    describe('text fitting', () => {
        it('estimates text widths with narrow punctuation', () => {
            expect(textWidth('120')).toBeCloseTo(1.74, 6);
            expect(textWidth('72.4')).toBeCloseTo(3 * 0.58 + 0.29, 6);
            expect(textWidth('')).toBe(0);
        });

        it('shrinks a font to the room, within limits', () => {
            expect(fitFont(3, 0.9, 0.2, 0.07)).toBe(0.2);
            expect(fitFont(10, 1, 0.2, 0.07)).toBe(0.1);
            expect(fitFont(100, 1, 0.2, 0.07)).toBe(0.07);
            expect(fitFont(0, 1, 0.2, 0.07)).toBe(0.2);
        });

        it('fits stage names to their bands with one font size', () => {
            const bands = bandsOf(readStages(STAGES), 0, 120);
            // 180 degrees at radius 0.92: "Critical" has 30 degrees = 0.4817 * 0.9 of room and is 5 * 0.58 + 3 * 0.29 = 3.77 fonts wide
            const fitted = fitNames(bands, 0, 120, 180, 0.92, 0.078, 0.055);
            expect(fitted.font).toBe(0.078);
            expect(fitted.items).toEqual([
                { width: 80, text: 'Normal' }, { width: 20, text: 'High' }, { width: 20, text: 'Critical' },
            ]);
            // half the arc: the font shrinks to what "Critical" needs, 0.2168 / 3.77
            const tight = fitNames(bands, 0, 120, 90, 0.92, 0.078, 0.04);
            expect(tight.font).toBeCloseTo(0.2168 / 3.77, 3);
            expect(tight.items.map(item => item.text)).toEqual(['Normal', 'High', 'Critical']);
        });

        it('shortens or drops names that do not fit at the smallest font, and adds the uncoloured rest', () => {
            const stages = readStages([
                { upTo: 4, color: RED, name: 'Trip' }, { upTo: 15, color: AMBER, name: 'Needs attention' },
                { upTo: 90, color: GREEN, name: 'Operating window' },
            ]);
            const fitted = fitNames(bandsOf(stages, 0, 100), 0, 100, 180, 0.92, 0.078, 0.055);
            expect(fitted.font).toBe(0.055);
            // 4 % of the arc is 0.104 wide: not three characters; 11 % holds 0.286 / 0.0319 = 8.9 characters
            expect(fitted.items.map(item => item.text)).toEqual(['', 'Needs at…', 'Operating window', '']);
            expect(fitted.items.map(item => item.width)).toEqual([4, 11, 75, 10]);
            for (const item of fitted.items) {
                expect(textWidth(item.text) * fitted.font).toBeLessThanOrEqual(item.width / 100 * Math.PI * 0.92 * 0.9);
            }
        });
    });

    describe('option', () => {
        it('is a base option with three series and media rules, and holds no functions', () => {
            const option = build({});
            expectPlainOption(option);
            expect(Object.keys(option)).toEqual(['baseOption', 'media']);
            expect(Object.keys(option.baseOption)).toEqual(['tooltip', 'series']);
            expect(option.baseOption.series.map((s: Opt) => [s.type, s.id])).toEqual([['gauge', 'dial'], ['gauge', 'target'], ['pie', 'names']]);
            // nothing for the sanitiser to remove
            expect(sanitizeOption(option)).toBe(option);
        });

        it('keeps the same components for every variant and prop, so that a merge leaves nothing behind', () => {
            const shape = (option: Opt): unknown => ({
                keys: Object.keys(option.baseOption),
                ids: option.baseOption.series.map((s: Opt) => s.id),
                queries: option.media.slice(0, SIZE_STEPS.length).map((rule: Opt) => Object.keys(rule.query)),
                parts: option.media.map((rule: Opt) => rule.option.series.map((s: Opt) => s.id).join()),
            });
            const reference = shape(build({}));
            for (const variant of ['progress', 'stages', 'grade', 'minimal']) {
                for (const extra of [{}, { title: '', target: null, stages: [], value: null }, { showScale: false, showValue: false }]) {
                    const option = build({ variant, ...extra });
                    expectPlainOption(option);
                    const s = shape(option) as Opt;
                    expect(s.keys).toEqual((reference as Opt).keys);
                    expect(s.ids).toEqual(['dial', 'target', 'names']);
                    expect(s.queries).toEqual((reference as Opt).queries);
                    for (const part of s.parts) expect(part).toBe('dial,target,names');
                }
            }
        });

        it('draws the default as a progress arc in the colour of the stage', () => {
            const d = dial(build({}));
            expect(d).toMatchObject({
                min: 0, max: 120, startAngle: 225, endAngle: -45, splitNumber: 6,
                axisLine: { roundCap: true, lineStyle: { color: [[1, TRACK_COLOR]] } },
                progress: { show: true, roundCap: true, itemStyle: { color: GREEN } },
                pointer: { show: false },
                axisLabel: { show: false, color: MUTED, formatter: '{value}' },
                title: { show: true, color: MUTED, overflow: 'truncate' },
                detail: { show: true, color: GREEN, formatter: '72.4{unit|°C}' },
                tooltip: { formatter: '{b}: <b>72.4°C</b> Normal (target 90.0°C)' },
                data: [{ value: 72.4, name: 'Bearing temperature' }],
            });
            expect(d.detail.rich.unit.color).toBe(GREEN);
        });

        it('colours by the stage of the value, or with `color` when none takes it', () => {
            expect(dial(build({ value: 85 })).progress.itemStyle.color).toBe(AMBER);
            expect(dial(build({ value: 100 })).detail.color).toBe(RED);
            expect(dial(build({ stages: [] })).progress.itemStyle.color).toBe(BLUE);
            expect(dial(build({ stages: [], color: '#123456' })).detail.color).toBe('#123456');
            expect(dial(build({ stages: STAGES.slice(0, 1), value: 90, color: 'teal' })).progress.itemStyle.color).toBe('teal');
            expect(dial(build({ stages: 'x', color: '' })).progress.itemStyle.color).toBe(BLUE);
        });

        it('draws the stages variant as a coloured band with a needle', () => {
            const d = dial(build({ variant: 'stages', value: 85 }));
            expect(d.axisLine).toMatchObject({ roundCap: false, lineStyle: { color: [[0.666667, GREEN], [0.833333, AMBER], [1, RED]] } });
            expect(d.progress.show).toBe(false);
            expect(d.pointer).toMatchObject({ show: true, itemStyle: { color: AMBER } });
            expect(d.pointer.icon).toBeUndefined();
            expect(d.anchor).toMatchObject({ show: true, itemStyle: { color: AMBER } });
            expect(d.detail.color).toBe(AMBER);
            // without stages the band is the plain colour
            expect(dial(build({ variant: 'stages', stages: [] })).axisLine.lineStyle.color).toEqual([[1, BLUE]]);
        });

        it('draws the grade variant as a half circle with the stage names along it', () => {
            const option = build({ variant: 'grade' });
            expect(dial(option)).toMatchObject({ startAngle: 180, endAngle: 0, pointer: { show: true, icon: 'triangle' }, axisLabel: { show: false } });
            expect(names(option)).toMatchObject({
                type: 'pie', startAngle: 180, endAngle: 0, silent: true,
                label: { position: 'inside', rotate: 'tangential', formatter: '{b}' },
                data: [{ value: 80, name: 'Normal' }, { value: 20, name: 'High' }, { value: 20, name: 'Critical' }],
            });
            // the names are outside the arc: the gauge is smaller than the ring of names
            const placed = at(option, 360, 300);
            expect(parseFloat(placed[0].radius)).toBeLessThan(parseFloat(placed[2].radius[0]));
            expect(placed[2].label.show).toBe(true);
            // other variants and unnamed stages have no names
            expect(names(build({})).data).toEqual([]);
            expect(names(build({ variant: 'grade', stages: [{ upTo: 50, color: RED }, { color: GREEN }] })).data).toEqual([]);
        });

        it('clamps the pointer and the arc to the scale but prints the real value', () => {
            const over = dial(build({ value: 150 }));
            expect(over.data[0].value).toBe(120);
            expect(over.detail.formatter).toBe('150.0{unit|°C}');
            expect(over.detail.color).toBe(RED);
            const under = dial(build({ variant: 'stages', value: -10 }));
            expect(under.data[0].value).toBe(0);
            expect(under.detail.formatter).toBe('-10.0{unit|°C}');
            expect(under.pointer.itemStyle.color).toBe(GREEN);
        });

        it('shows a dash and no arc or pointer without a number', () => {
            for (const value of [null, undefined, 'abc', '', NaN, Infinity, {}, [], true]) {
                for (const variant of ['progress', 'stages', 'grade', 'minimal']) {
                    const d = dial(build({ variant, value }));
                    expect(d.detail).toMatchObject({ formatter: '–{unit|}', color: MUTED });
                    expect(d.progress.show).toBe(false);
                    expect(d.pointer.show).toBe(false);
                    expect(d.data[0].value).toBe(0);
                    expect(d.tooltip.formatter).toBe('{b}: <b>–</b> (target 90.0°C)');
                }
            }
            // a numeric string is a number
            expect(dial(build({ value: '72.44' })).detail.formatter).toBe('72.4{unit|°C}');
        });

        it('handles negative scales, min >= max and very large numbers', () => {
            const negative = dial(build({ min: -40, max: 120, value: -12.5, variant: 'stages', stages: [{ upTo: 0, color: BLUE }, { color: GREEN }] }));
            expect(negative).toMatchObject({ min: -40, max: 120, splitNumber: 8, data: [{ value: -12.5 }] });
            expect(negative.axisLine.lineStyle.color).toEqual([[0.25, BLUE], [1, GREEN]]);
            expect(negative.detail.color).toBe(BLUE);
            expect(dial(build({ min: 50, max: 50 }))).toMatchObject({ min: 0, max: 100, data: [{ value: 72.4 }] });
            const huge = build({ value: 1.5e15, max: 1e15, decimals: 0, unit: '' });
            expectPlainOption(huge);
            expect(dial(huge).detail.formatter).toBe('1,500,000,000,000,000{unit|}');
            expect(dial(huge).data[0].value).toBe(1e6);
        });

        it('makes long values smaller instead of letting them leave the dial', () => {
            const short = at(build({}), 360, 300)[0].detail.fontSize;
            const long = at(build({ value: 1234567.8, max: 2e6, unit: 'kPa' }), 360, 300)[0].detail.fontSize;
            expect(short).toBeGreaterThanOrEqual(28);
            expect(long).toBeLessThan(short * 0.85);
            expect(long).toBeGreaterThanOrEqual(10);
        });

        it('formats unit and decimals like the other components', () => {
            expect(dial(build({ unit: 'bar', decimals: 2, value: 6.789 })).detail.formatter).toBe('6.79{unit| bar}');
            expect(dial(build({ unit: '%', decimals: 0, value: 86.5 })).detail.formatter).toBe('87{unit|%}');
            expect(dial(build({ unit: '', value: 5 })).detail.formatter).toBe('5.0{unit|}');
            expect(dial(build({ unit: '{a}|', value: 5 })).detail.formatter).toBe('5.0{unit| a}');
            expect(dial(build({ decimals: 'x' })).detail.formatter).toBe('72.4{unit|°C}');
            expect(dial(build({ unit: '<b>', title: 'T{a}' })).tooltip.formatter).toBe('{b}: <b>72.4 &#60;b&#62;</b> Normal (target 90.0 &#60;b&#62;)');
            expect(dial(build({ title: '' })).tooltip.formatter).toBe('<b>72.4°C</b> Normal (target 90.0°C)');
        });

        it('marks a target inside the scale only', () => {
            expect(target(build({}))).toMatchObject({ pointer: { show: true, icon: 'rect' }, data: [{ value: 90 }], silent: true });
            for (const value of [null, 'x', 121, -1]) {
                expect(target(build({ target: value })).pointer.show).toBe(false);
                expect(dial(build({ target: value })).tooltip.formatter).toBe('{b}: <b>72.4°C</b> Normal');
            }
            expect(target(build({ target: 0 })).pointer.show).toBe(true);
            expect(target(build({ target: '120' })).data[0].value).toBe(120);
        });

        it('hides the scale, the value and the caption on request', () => {
            for (const variant of ['progress', 'stages', 'grade']) {
                expect(dial(build({ variant })).splitLine.show).toBe(true);
                const off = dial(build({ variant, showScale: false }));
                expect(off.splitLine.show).toBe(false);
                expect(off.axisTick.show).toBe(false);
                expect(off.axisLabel.show).toBe(false);
                for (const rule of build({ variant, showScale: false }).media) {
                    expect(rule.option.series[0].axisLabel?.show ?? false).toBe(false);
                    expect(rule.option.series[0].axisTick?.show ?? false).toBe(false);
                }
            }
            expect(dial(build({ variant: 'minimal' })).splitLine.show).toBe(false);
            expect(dial(build({ showValue: false })).detail.show).toBe(false);
            expect(dial(build({ title: '  ' })).title.show).toBe(false);
            // without its scale the progress arc takes the whole radius
            expect(parseFloat(at(build({ showScale: false }), 360, 300)[0].radius))
                .toBeGreaterThan(parseFloat(at(build({}), 360, 300)[0].radius) * 1.25);
        });

        it('keeps a labelled scale from closing into a circle', () => {
            expect(dial(build({ sweep: 360, startAngle: 90 }))).toMatchObject({ startAngle: 90, endAngle: -250 });
            expect(dial(build({ sweep: 360, startAngle: 90, showScale: false }))).toMatchObject({ startAngle: 90, endAngle: -270 });
            expect(dial(build({ sweep: 360, startAngle: 90, variant: 'minimal' }))).toMatchObject({ endAngle: -270 });
        });

        it('steps the pixel sizes with the size of the component', () => {
            const option = build({});
            const small = at(option, 160, 140)[0];
            const normal = at(option, 360, 300)[0];
            const large = at(option, 500, 400)[0];
            // arc thickness, value and caption grow with the component
            expect(small.axisLine.lineStyle.width).toBeLessThan(normal.axisLine.lineStyle.width);
            expect(normal.axisLine.lineStyle.width).toBeLessThan(large.axisLine.lineStyle.width);
            expect(small.detail.fontSize).toBeGreaterThanOrEqual(10);
            expect(small.detail.fontSize).toBeLessThan(normal.detail.fontSize);
            expect(normal.detail.fontSize).toBeLessThan(large.detail.fontSize);
            expect(small.title.fontSize).toBeGreaterThanOrEqual(9);
            expect(small.progress.width).toBe(small.axisLine.lineStyle.width);
            // the scale labels are dropped where they would not fit, and never smaller than 8 px
            expect(small.axisLabel.show).toBe(false);
            expect(normal.axisLabel).toMatchObject({ show: true });
            expect(normal.axisLabel.fontSize).toBeGreaterThanOrEqual(8);
            // the first rule always applies and equals the base option, so shrinking restores everything
            expect(option.media[0].query).toEqual({ minWidth: 0 });
            expect(dial(option)).toMatchObject(option.media[0].option.series[0]);
            // the default dial: box 2.06 x 1.767 radii; at 360 x 300 its radius is 300 * 0.95 / 1.767 = 161 px, the 158 px step
            expect(option.media[5].query).toEqual({ minWidth: Math.ceil(158 * 2.06 / 0.95), minHeight: Math.ceil(158 * 1.767107 / 0.95) });
            expect(normal.axisLine.lineStyle.width).toBe(Math.round(0.12 * 158));
        });

        it('places the dial for the aspect ratio of the component', () => {
            const option = build({});
            const wide = at(option, 600, 300)[0];
            const square = at(option, 300, 300)[0];
            const tall = at(option, 200, 400)[0];
            expect(wide.center[0]).toBe('50%');
            // wide: as high as the component allows, 2 * 0.95 / 1.767 = 107.5 % of half the height, times 0.745 for the arc inside its scale
            expect(parseFloat(wide.radius)).toBeCloseTo(107.5 * 0.745, 0);
            // square and tall: limited by the width, 0.95 * 2 / 2.06 = 92.2 %
            expect(parseFloat(square.radius)).toBeCloseTo(92.2 * 0.745, 0);
            expect(parseFloat(tall.radius)).toBeCloseTo(92.2 * 0.745, 0);
            // open at the bottom, so the centre is below the middle; less so in a tall component
            expect(parseFloat(wide.center[1])).toBeGreaterThan(55);
            expect(parseFloat(tall.center[1])).toBeGreaterThan(50);
            expect(parseFloat(tall.center[1])).toBeLessThan(parseFloat(square.center[1]));
            // all three series share the centre
            const parts = at(option, 300, 300);
            expect(parts[1].center).toEqual(parts[0].center);
            expect(parts[2].center).toEqual(parts[0].center);
            expect(parts[1].radius).toBe(parts[0].radius);
        });

        it('never throws and stays plain for odd angles and scales', () => {
            for (const variant of ['progress', 'stages', 'grade', 'minimal', 'nope']) {
                for (const sweep of [null, 0, 30, 90, 120, 180, 200, 270, 300, 360, 1e9, -5]) {
                    for (const startAngle of [null, 0, 90, 135, 225, -90, 720, 1e9]) {
                        expectPlainOption(build({ variant, sweep, startAngle }));
                    }
                }
                for (const [min, max] of [[0, 1e-9], [-1e12, 1e12], [1e300, 1e308], [5, 5], [0, 13], [-0.001, 0.001]]) {
                    expectPlainOption(build({ variant, min, max, value: min, target: max }));
                }
            }
        });
    });
});
