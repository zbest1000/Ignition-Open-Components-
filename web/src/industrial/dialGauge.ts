import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { formatNumber, richText, toDecimals, tooltipText, withUnit } from './metricRings';
import {
    Row, asArray, asBoolean, asNumber, asString, isRecord, readBoolean, readNumber, readProp, readString, toNumber,
} from './util';

export const DIAL_GAUGE_ID = 'open.industrial.DialGauge';

export interface DialGaugeProps {
    /** The number shown; anything that is not a number draws an empty dial with a dash. */
    value: unknown;
    min: number;
    max: number;
    unit: string;
    decimals: number;
    /** Caption below the value. */
    title: string;
    /** "progress" (default), "stages", "grade" or "minimal". */
    variant: string;
    /** Value bands as objects { upTo?, color, name? }; validated in buildOption. */
    stages: unknown;
    /** Colour of the arc, pointer and value when no stage takes the value. */
    color: string;
    /** A marker on the scale; null for none. */
    target: unknown;
    showScale: boolean;
    showValue: boolean;
    /** Number of scale divisions; 0 chooses round steps. */
    splitNumber: number;
    /** Angle where the scale starts (90 is the top, 180 the left); null opens the dial at the bottom. */
    startAngle: unknown;
    /** Angle the scale covers; null is 180 for "grade" and 270 for the other variants. */
    sweep: unknown;
}

export type Variant = 'progress' | 'stages' | 'grade' | 'minimal';

export interface Stage {
    /** Exclusive upper bound of the stage; Infinity for the stage that takes everything else. */
    upTo: number;
    color: string;
    /** '' when the stage has no name. */
    name: string;
}

/** A stage clipped to the scale: the part of the dial it colours. */
export interface Band {
    from: number;
    to: number;
    color: string;
    name: string;
}

/** A rectangle in units of the dial radius; x to the right, y down, the dial centre at 0,0. */
export interface Box {
    x0: number;
    x1: number;
    y0: number;
    y1: number;
}

export interface Ticks {
    /** Number of labelled divisions between min and max. */
    splitNumber: number;
    /** Minor divisions inside one labelled division. */
    minor: number;
    /** Characters of the longest scale label. */
    labelChars: number;
}

export interface Placement {
    /** Radius of the dial with everything around it, in percent of half the smaller component side. */
    radius: number;
    /** Centre of the dial in percent of the component width and height. */
    cx: number;
    cy: number;
}

export interface NameLabels {
    /** Font size in units of the dial radius. */
    font: number;
    /** One entry per band, in order, plus one without a name for an uncoloured rest of the scale. */
    items: Array<{ width: number; text: string }>;
}

const VARIANTS: readonly Variant[] = ['progress', 'stages', 'grade', 'minimal'];
const DEFAULT_COLOR = '#5470c6';
/** The unfilled part of the dial. Translucent grey reads as "empty" on light and dark backgrounds alike. */
export const TRACK_COLOR = 'rgba(128,128,128,0.2)';
/** Captions, scale labels and the dash of a missing value: a grey that reads on light and dark themes. */
const MUTED = '#8c8c8c';
const TICK_COLOR = 'rgba(128,128,128,0.8)';
/** Ticks drawn across the coloured band of the "stages" variant. */
const BAND_TICK_COLOR = 'rgba(255,255,255,0.85)';
/** The target marker is dark with a light outline so that it shows on the track, on the arc and on any theme. */
const TARGET_COLOR = '#262626';
const TARGET_OUTLINE = '#ffffff';

/** Share of the space the dial may take; the rest is the margin around it. */
const FIT = 0.95;
/**
 * Dial radii, in pixels, from which a larger set of pixel sizes (line widths,
 * tick lengths, font sizes) applies. ECharts takes the radius of a gauge in
 * percent but these sizes in pixels, so they are stepped with media queries.
 */
export const SIZE_STEPS: readonly number[] = [54, 68, 84, 104, 128, 158, 195, 240, 296, 365];
/** Smallest readable font, in pixels. */
const MIN_FONT = 8;
/** Width of a character in units of the font size: digits and capitals of a sans-serif face, generously. */
const CHAR_WIDTH = 0.58;
const NARROW_CHARS = /[.,:;'|!il\- ]/;

function clamp(n: number, low: number, high: number): number {
    return Math.min(high, Math.max(low, n));
}

/** Removes binary floating point noise and limits the digits written into the option. */
function clean(n: number, digits = 2): number {
    return Number(n.toFixed(digits));
}

/** Approximate width of a text in units of its font size. */
export function textWidth(text: string): number {
    let width = 0;
    for (const ch of text) width += NARROW_CHARS.test(ch) ? CHAR_WIDTH / 2 : CHAR_WIDTH;
    return width;
}

/**
 * Validates a `stages` prop: entries are objects { upTo, color, name }. A
 * value belongs to the first stage, in ascending order of `upTo`, whose
 * `upTo` is greater than it; an entry without a numeric `upTo` takes every
 * value above the other stages. Entries without a colour are skipped. This
 * is the convention of the `thresholds` of Metric Rings.
 */
export function readStages(raw: unknown): Stage[] {
    const stages: Stage[] = [];
    for (const entry of asArray(raw)) {
        if (!isRecord(entry) || typeof entry.color !== 'string' || entry.color === '') continue;
        const upTo = toNumber(entry.upTo);
        stages.push({ upTo: Number.isNaN(upTo) ? Infinity : upTo, color: entry.color, name: richText(asString(entry.name, '')).trim() });
    }
    // Stable sort: of two stages with the same bound the first one listed wins.
    return stages.sort((a, b) => (a.upTo === b.upTo ? 0 : a.upTo < b.upTo ? -1 : 1));
}

/** The stage a value falls in, or undefined when none takes it (or it is not a number). */
export function stageOf(stages: readonly Stage[], value: number): Stage | undefined {
    if (Number.isNaN(value)) return undefined;
    for (const stage of stages) {
        if (value < stage.upTo) return stage;
    }
    return undefined;
}

/**
 * The stages as consecutive bands of the scale min..max. Stages that end at
 * or below `min` or start at or above `max` have no band; when the stages
 * end below `max` the rest of the scale has none either.
 */
export function bandsOf(stages: readonly Stage[], min: number, max: number): Band[] {
    const bands: Band[] = [];
    let from = min;
    for (const stage of stages) {
        if (from >= max) break;
        const to = Math.min(stage.upTo, max);
        if (to <= from) continue;
        bands.push({ from, to, color: stage.color, name: stage.name });
        from = to;
    }
    return bands;
}

/** Colour stops of a gauge axis line, [fraction of the scale, colour], ending at 1. */
export function colorStops(bands: readonly Band[], min: number, max: number, rest: string): Array<[number, string]> {
    const stops: Array<[number, string]> = [];
    for (const band of bands) {
        stops.push([band.to >= max ? 1 : clean((band.to - min) / (max - min), 6), band.color]);
    }
    if (stops.length === 0 || stops[stops.length - 1][0] < 1) stops.push([1, rest]);
    return stops;
}

/** A usable scale: min..max when max is greater, otherwise 0..100. */
export function scaleOf(min: unknown, max: unknown): [number, number] {
    const low = toNumber(min);
    const high = toNumber(max);
    return high > low ? [low, high] : [0, 100];
}

/**
 * The divisor and suffix that keep the labels of a scale short: 250k rather
 * than 250000. A gauge cannot format its labels without a function, so the
 * gauge is given the divided scale and the suffix as a label template.
 */
export function scaleUnit(min: number, max: number): { factor: number; suffix: string } {
    const largest = Math.max(Math.abs(min), Math.abs(max));
    if (largest >= 1e9) return { factor: 1e9, suffix: 'G' };
    if (largest >= 1e6) return { factor: 1e6, suffix: 'M' };
    if (largest >= 1e4) return { factor: 1e3, suffix: 'k' };
    return { factor: 1, suffix: '' };
}

/** The text ECharts writes for a scale label. */
function labelText(value: number): string {
    return String(Number(value.toFixed(10)));
}

function longestLabel(min: number, max: number, splitNumber: number): number {
    let longest = 0;
    for (let i = 0; i <= splitNumber; i++) {
        longest = Math.max(longest, labelText(min + i * (max - min) / splitNumber).length);
    }
    return longest;
}

/** How far a step is from a round one: 0 for 1, 2, 5 (times a power of ten), up to 3.5 for any two-digit step. */
function stepPenalty(step: number): number {
    const mantissa = Number((step / Math.pow(10, Math.floor(Math.log10(step)))).toPrecision(6));
    if (mantissa === 1 || mantissa === 2 || mantissa === 5) return 0;
    if (mantissa === 2.5) return 0.5;
    if (mantissa === 1.5 || mantissa === 3 || mantissa === 4 || mantissa === 7.5) return 1.5;
    return Number.isInteger(Number((mantissa * 10).toPrecision(6))) ? 3.5 : Infinity;
}

function minorOf(step: number, splitNumber: number): number {
    const mantissa = Number((step / Math.pow(10, Math.floor(Math.log10(step)))).toPrecision(6));
    const minor = mantissa === 2 || mantissa === 4 ? 4 : mantissa === 1 || mantissa === 5 || mantissa === 2.5 ? 5 : 2;
    return splitNumber * minor > 60 ? 1 : minor;
}

/**
 * The divisions of the scale. A gauge divides min..max evenly and labels
 * every division, so the number of divisions is chosen such that the step is
 * round (1, 2, 2.5, 5 times a power of ten where possible) and close to one
 * label per 40 degrees. A scale no division makes round is labelled at its
 * ends only. `requested` > 0 is taken as given.
 */
export function chooseTicks(min: number, max: number, sweep: number, requested: number): Ticks {
    const span = max - min;
    if (requested >= 1) {
        const splitNumber = clamp(Math.round(requested), 1, 24);
        return { splitNumber, minor: minorOf(span / splitNumber, splitNumber), labelChars: longestLabel(min, max, splitNumber) };
    }
    const ideal = clamp(sweep / 40, 3, 8);
    // A label may be one character longer than the ends of the scale: 0 | 2.5 | 5.
    const allowed = Math.max(labelText(min).length, labelText(max).length) + 2;
    let best = 1;
    let bestScore = Infinity;
    for (let n = 2; n <= 12; n++) {
        const score = stepPenalty(span / n) + 0.6 * Math.abs(n - ideal);
        if (score < bestScore && longestLabel(min, max, n) <= allowed) {
            best = n;
            bestScore = score;
        }
    }
    return {
        splitNumber: best,
        minor: best === 1 ? 10 : minorOf(span / best, best),
        labelChars: longestLabel(min, max, best),
    };
}

/**
 * The box around an arc of radius 1 that starts at `startAngle` (degrees,
 * counter-clockwise from the right: 90 is the top) and runs clockwise over
 * `sweep` degrees.
 */
export function arcBox(startAngle: number, sweep: number): Box {
    const box: Box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    const add = (degrees: number): void => {
        const radians = degrees * Math.PI / 180;
        const x = clean(Math.cos(radians), 6);
        const y = clean(-Math.sin(radians), 6);
        box.x0 = Math.min(box.x0, x);
        box.x1 = Math.max(box.x1, x);
        box.y0 = Math.min(box.y0, y);
        box.y1 = Math.max(box.y1, y);
    };
    const end = startAngle - sweep;
    add(startAngle);
    add(end);
    // The outermost points are where the arc crosses a multiple of 90 degrees.
    for (let quarter = Math.ceil(end / 90); quarter * 90 <= startAngle; quarter++) add(quarter * 90);
    return box;
}

function union(a: Box, b: Box): Box {
    return { x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1), y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1) };
}

/**
 * Size and position of the dial that make `box` (in units of the dial
 * radius) fill a component of the given aspect ratio (width / height).
 */
export function placeDial(box: Box, aspect: number): Placement {
    const radius = Math.min(aspect / (box.x1 - box.x0), 1 / (box.y1 - box.y0)) * FIT;
    return {
        radius: clean(radius / (Math.min(aspect, 1) / 2) * 100),
        cx: clean((0.5 - radius * (box.x0 + box.x1) / 2 / aspect) * 100),
        cy: clean((0.5 - radius * (box.y0 + box.y1) / 2) * 100),
    };
}

/**
 * Aspect ratios at which the placement of the dial is recalculated, in
 * ascending order. Above the last one the dial is as high as the component
 * and its placement no longer changes, unless the box is off-centre.
 */
export function aspectSteps(box: Box): number[] {
    const critical = (box.x1 - box.x0) / (box.y1 - box.y0);
    const low = Math.min(critical, 1) / 3;
    const offCentre = Math.abs(box.x0 + box.x1) > 0.02;
    const high = Math.max(critical, 1) * (offCentre ? 3 : 1);
    const steps: number[] = [];
    for (let a = low; a < high / 1.04; a *= 1.1) steps.push(a);
    steps.push(high);
    // The placement has a kink where the component turns from portrait to landscape and where the dial starts to fill the height.
    for (const kink of [1, critical]) {
        if (!steps.some(step => Math.abs(step / kink - 1) < 0.03)) steps.push(kink);
    }
    return steps.sort((a, b) => a - b).map(step => clean(step, 4));
}

/** The placement used for all aspect ratios from `from` up to `to`: the smaller dial, centred for the middle of the range. */
function placeBetween(box: Box, from: number, to: number): Placement {
    const low = placeDial(box, from);
    const middle = placeDial(box, Math.sqrt(from * to));
    return { radius: Math.min(low.radius, placeDial(box, to).radius), cx: middle.cx, cy: middle.cy };
}

/**
 * The stage names written along the arc: one font size for all, the largest
 * between `minFont` and `maxFont` (units of the dial radius) at which the
 * names fit their bands. A name that still does not fit is shortened, or
 * left out when fewer than three characters would remain.
 *
 * @param radius  radius the names are written at, in units of the dial radius
 */
export function fitNames(
    bands: readonly Band[], min: number, max: number, sweep: number, radius: number, maxFont: number, minFont: number,
): NameLabels {
    const span = max - min;
    // 90 % of the band: names of neighbouring bands keep a gap.
    const room = (band: Band): number => (band.to - band.from) / span * sweep * Math.PI / 180 * radius * 0.9;
    let font = maxFont;
    for (const band of bands) {
        if (band.name !== '') font = Math.min(font, room(band) / textWidth(band.name));
    }
    font = Math.max(font, minFont);

    const items: NameLabels['items'] = [];
    let end = min;
    for (const band of bands) {
        let text = band.name;
        while (text !== '' && textWidth(text) * font > room(band)) {
            const shorter = text.replace(/…$/, '').slice(0, -1).trimEnd();
            text = shorter.length < 3 ? '' : `${shorter}…`;
        }
        items.push({ width: clean(band.to - band.from, 6), text });
        end = band.to;
    }
    if (end < max) items.push({ width: clean(max - end, 6), text: '' });
    return { font: clean(font, 4), items };
}

/** Font size, in units of the dial radius, at which a text of the given width (in font sizes) fits `room`. */
export function fitFont(width: number, room: number, preferred: number, smallest: number): number {
    return clean(clamp(width > 0 ? room / width : preferred, smallest, preferred), 4);
}

/** Start angle and sweep of the scale: as given, else 180 degrees for "grade" and 270 otherwise, open at the bottom. */
export function anglesOf(variant: Variant, startAngle: unknown, sweep: unknown): { startAngle: number; sweep: number } {
    const givenSweep = toNumber(sweep);
    const angle = Number.isNaN(givenSweep) ? (variant === 'grade' ? 180 : 270) : clamp(givenSweep, 30, 360);
    const givenStart = toNumber(startAngle);
    // Angles beyond a few turns are a binding gone wrong; they would also make the search for the box of the arc long.
    const start = Number.isNaN(givenStart) || Math.abs(givenStart) > 3600 ? 90 + angle / 2 : givenStart;
    return { startAngle: clean(start), sweep: clean(angle) };
}

/** Everything about the look of a variant that does not depend on the size in pixels. Lengths are in units of the dial radius. */
interface Design {
    /** Outer radius of the arc; the rest up to 1 belongs to a scale or names outside it. */
    rho: number;
    /** Thickness of the arc. */
    width: number;
    scale: boolean;
    /** Font size of the scale labels. */
    labelFont: number;
    /** Font size and ring of the stage names; a font of 0 for none. */
    names: NameLabels;
    nameRing: [number, number];
    /** Vertical position of the value and the caption, and the room they have. */
    valueY: number;
    valueFont: number;
    captionY: number;
    captionRoom: number;
    box: Box;
}

const NO_NAMES: NameLabels = { font: 0, items: [] };

interface Model {
    variant: Variant;
    min: number;
    max: number;
    startAngle: number;
    sweep: number;
    /** NaN without a usable value. */
    value: number;
    /** The value as text without its unit, and the unit as it follows the value. */
    valueText: string;
    unitText: string;
    caption: string;
    showValue: boolean;
    color: string;
    bands: Band[];
    ticks: Ticks;
    /** The scale is labelled in thousands, millions or billions: the divisor and the suffix of the labels. */
    factor: number;
    suffix: string;
    /** NaN for no marker. */
    target: number;
    tooltip: string;
}

function designOf(model: Model, showScale: boolean): Design {
    const { variant, ticks } = model;
    const arc = arcBox(model.startAngle, model.sweep);
    // A dial that lies in the upper half has its text above the centre; any other has it in the middle.
    // An arc that ends well above the centre is too narrow there, so its text goes in the middle too.
    const upper = arc.y1 <= 0.3 && arc.y1 >= -0.15;
    // Whether the scale passes below the centre, where a dial that is open at the bottom has room for text.
    const turns = (model.startAngle - 270) / 360;
    const closed = !upper && (turns - Math.floor(turns)) * 360 <= model.sweep;
    const hasText = model.showValue || model.caption !== '';
    const valueWidth = textWidth(model.valueText) + textWidth(model.unitText) * 0.5;

    let rho = 1;
    let width = 0.12;
    let scale = false;
    let labelFont = 0.08;
    let names = NO_NAMES;
    let nameRing: [number, number] = [0, 0];
    /** Radius of the free disc in the middle of the dial. */
    let inner: number;

    if (variant === 'stages') {
        width = 0.16;
        scale = showScale;
        labelFont = 0.075;
        inner = scale ? 1 - width - 0.04 - Math.min(0.26, ticks.labelChars * CHAR_WIDTH * labelFont) : 1 - width - 0.04;
    } else if (variant === 'grade') {
        width = 0.05;
        scale = showScale;
        if (model.bands.some(band => band.name !== '')) {
            rho = 0.83;
            names = fitNames(model.bands, model.min, model.max, model.sweep, 0.92, 0.078, 0.055);
            nameRing = [0.855, 0.985];
        }
        // Inside the arc: the ticks, then the pointer, then the text.
        inner = rho - width - (scale ? 0.09 : 0.02) - 0.17;
    } else if (variant === 'minimal') {
        width = 0.09;
        inner = 1 - width;
    } else {
        scale = showScale;
        if (scale) {
            // The scale is outside the arc: its labels end at the edge and decide how much room the arc is left.
            const longest = ticks.labelChars * CHAR_WIDTH;
            labelFont = clamp(0.135 / longest, 0.055, 0.08);
            rho = clamp(0.985 - longest * labelFont - 0.02 - 0.085, 0.62, 0.78);
        }
        inner = rho - width;
    }

    let valueY: number;
    let valueFont: number;
    let captionY: number;
    let captionRoom: number;
    let text: Box;
    if (variant === 'stages') {
        // Below the hub of the needle.
        valueY = upper || closed ? 0.3 : 0.46;
        captionY = upper ? 0.52 : closed ? 0.49 : 0.69;
        valueFont = fitFont(valueWidth, upper ? 1.1 : 0.6, closed ? 0.14 : 0.16, 0.07);
        captionRoom = upper ? 1.3 : closed ? 0.62 : 0.8;
        text = { x0: -0.4, x1: 0.4, y0: -0.1, y1: hasText ? captionY + 0.06 : 0.1 };
    } else if (upper) {
        valueFont = fitFont(valueWidth, inner * 1.3, Math.min(0.26, inner * 0.36), 0.07);
        captionY = -0.14 * inner;
        valueY = model.caption === '' ? -0.36 * inner : captionY - 0.09 - valueFont * 0.62;
        captionRoom = inner * 1.7;
        text = { x0: -0.3, x1: 0.3, y0: -0.3, y1: 0.07 };
    } else {
        valueFont = fitFont(valueWidth, inner * 1.6, Math.min(0.3, inner * 0.36), 0.07);
        valueY = model.caption === '' || !model.showValue ? 0 : -0.05 * inner;
        captionY = model.showValue ? valueY + valueFont * 0.62 + 0.09 : 0;
        captionRoom = inner * 1.5;
        text = { x0: -0.3, x1: 0.3, y0: -0.3, y1: 0.3 };
    }

    // The arc with the caps of its ends and what is outside it, and the text in the middle.
    const padded: Box = { x0: arc.x0 - 0.03, x1: arc.x1 + 0.03, y0: arc.y0 - 0.03, y1: arc.y1 + 0.03 };
    return {
        rho, width, scale, labelFont, names, nameRing,
        valueY: clean(valueY, 4), valueFont, captionY: clean(captionY, 4), captionRoom: clean(captionRoom, 4),
        box: union(padded, text),
    };
}

function percent(n: number): string {
    return `${clean(n)}%`;
}

/** The parts of the three series that do not depend on the size of the component. */
function contentSeries(model: Model, design: Design): Row[] {
    const { variant } = model;
    // The gauge works on the scale as it is labelled.
    const scaled = (n: number): number => Number((n / model.factor).toPrecision(12));
    const min = scaled(model.min);
    const max = scaled(model.max);
    const hasValue = !Number.isNaN(model.value);
    const endAngle = clean(model.startAngle - model.sweep);
    const banded = variant === 'stages' || variant === 'grade';
    const rho = design.rho;
    // Positions inside a gauge are relative to its own radius, which is `rho` of the dial radius.
    const offset = (y: number): string[] => ['0%', percent(y / rho * 100)];

    let pointer: Row = { show: false };
    if (variant === 'stages') {
        pointer = { show: hasValue, length: '58%', width: '5%', offsetCenter: [0, 0], itemStyle: { color: model.color } };
    } else if (variant === 'grade') {
        // A triangle just inside the ticks, pointing at the arc.
        const tip = rho - design.width - (design.scale ? 0.09 : 0.02) - 0.015;
        pointer = {
            show: hasValue, icon: 'triangle', length: percent(0.13 / rho * 100), width: percent(0.11 / rho * 100),
            offsetCenter: [0, percent(-(tip - 0.13) / rho * 100)], itemStyle: { color: model.color },
        };
    }

    const dial: Row = {
        type: 'gauge', id: 'dial', name: 'dial', z: 2,
        min, max, startAngle: model.startAngle, endAngle, clockwise: true,
        splitNumber: model.ticks.splitNumber,
        axisLine: {
            show: true, roundCap: !banded,
            lineStyle: {
                color: colorStops(
                    banded ? model.bands : [], model.min, model.max, banded && model.bands.length === 0 ? model.color : TRACK_COLOR),
            },
        },
        progress: { show: !banded && hasValue, overlap: true, roundCap: true, clip: true, itemStyle: { color: model.color } },
        pointer,
        anchor: { show: variant === 'stages', showAbove: true, itemStyle: { color: hasValue ? model.color : MUTED, borderWidth: 0 } },
        axisTick: {
            show: design.scale, splitNumber: model.ticks.minor,
            lineStyle: { color: variant === 'stages' ? BAND_TICK_COLOR : variant === 'grade' ? 'auto' : TICK_COLOR },
        },
        splitLine: {
            show: design.scale,
            lineStyle: { color: variant === 'stages' ? BAND_TICK_COLOR : variant === 'grade' ? 'auto' : TICK_COLOR },
        },
        axisLabel: { show: design.scale && variant !== 'grade', color: MUTED, formatter: `{value}${model.suffix}` },
        title: {
            show: model.caption !== '', offsetCenter: offset(design.captionY), color: MUTED,
            overflow: 'truncate', ellipsis: '…',
        },
        detail: {
            show: model.showValue, offsetCenter: offset(design.valueY), color: hasValue ? model.color : MUTED,
            fontWeight: 'bold',
            formatter: `${richText(model.valueText)}{unit|${richText(model.unitText)}}`,
            rich: { unit: { fontWeight: 'normal', verticalAlign: 'bottom', color: hasValue ? model.color : MUTED } },
        },
        tooltip: { formatter: model.tooltip },
        // A gauge needs a number; without one the arc and the pointer are hidden above.
        data: [{ value: hasValue ? clamp(scaled(model.value), min, max) : min, name: model.caption }],
    };

    // The target: a short bar across the arc, drawn as the pointer of a gauge that shows nothing else.
    const across = design.width * 1.5;
    const target: Row = {
        type: 'gauge', id: 'target', name: 'target', z: 3, silent: true,
        min, max, startAngle: model.startAngle, endAngle, clockwise: true,
        axisLine: { show: false }, progress: { show: false }, anchor: { show: false },
        axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
        title: { show: false }, detail: { show: false },
        pointer: {
            show: !Number.isNaN(model.target), icon: 'rect', width: percent(0.022 / rho * 100), length: percent(across / rho * 100),
            offsetCenter: [0, percent(-(rho - design.width * 1.25) / rho * 100)],
            itemStyle: { color: TARGET_COLOR, borderColor: TARGET_OUTLINE, borderWidth: 1 },
        },
        tooltip: { show: false },
        data: [{ value: Number.isNaN(model.target) ? min : scaled(model.target) }],
    };

    // The stage names: the labels of a pie whose slices are the bands and are not drawn themselves.
    const names: Row = {
        type: 'pie', id: 'names', name: 'names', z: 1, silent: true,
        startAngle: model.startAngle, endAngle, clockwise: true,
        minAngle: 0, stillShowZeroSum: false, avoidLabelOverlap: false,
        itemStyle: { color: 'transparent', borderWidth: 0 },
        emphasis: { disabled: true },
        labelLine: { show: false },
        label: { position: 'inside', rotate: 'tangential', color: MUTED, formatter: '{b}' },
        labelLayout: { hideOverlap: true },
        tooltip: { show: false },
        data: design.names.items.map(item => ({ value: item.width, name: item.text })),
    };
    return [dial, target, names];
}

function px(units: number, radius: number, smallest = 1): number {
    return Math.max(smallest, Math.round(units * radius));
}

/** The pixel sizes of the three series for a dial of the given radius in pixels. */
function sizedSeries(model: Model, design: Design, radius: number): Row[] {
    const { variant } = model;
    const width = px(design.width, radius);
    const dial: Row = { id: 'dial', axisLine: { lineStyle: { width } }, progress: { width } };
    const labelFont = px(design.labelFont, radius, MIN_FONT);
    // Labels are dropped rather than drawn much larger than the dial was laid out for.
    const labelsFit = design.labelFont * radius * 1.35 >= MIN_FONT;
    const bold = radius >= 150 ? 2 : 1;

    if (variant === 'stages') {
        dial.axisTick = { distance: -width, length: px(0.05, radius), lineStyle: { width: 1 } };
        dial.splitLine = { distance: -width, length: width, lineStyle: { width: bold } };
        dial.axisLabel = { show: design.scale && labelsFit, distance: width + px(0.035, radius), fontSize: labelFont };
        dial.anchor = { size: px(0.11, radius, 4) };
    } else if (variant === 'grade') {
        const gap = px(0.02, radius);
        dial.axisTick = { distance: gap, length: px(0.03, radius), lineStyle: { width: 1 } };
        dial.splitLine = { distance: gap, length: px(0.06, radius), lineStyle: { width: bold } };
        dial.axisLabel = { show: false, distance: 0, fontSize: labelFont };
        dial.anchor = { size: 0 };
    } else {
        // Outside the arc. A gauge measures these distances inwards from the inner edge of the arc.
        const gap = px(0.03, radius);
        const minor = px(0.03, radius);
        const major = px(0.055, radius);
        dial.axisTick = { show: design.scale && radius >= 100, distance: -(gap + minor) - width, length: minor, lineStyle: { width: 1 } };
        dial.splitLine = { distance: -(gap + major) - width, length: major, lineStyle: { width: bold } };
        // The label is anchored at its outer end, 0.985 of the dial radius.
        const room = px(0.985 - design.rho, radius);
        dial.axisLabel = {
            // The steps of the pixel sizes leave the smallest dials less room than the labels were laid out for.
            show: design.scale && labelsFit && model.ticks.labelChars * CHAR_WIDTH * labelFont <= room - gap - major + 1,
            distance: gap + width - room, fontSize: labelFont,
        };
        dial.anchor = { size: 0 };
    }

    const valueFont = px(design.valueFont, radius, 10);
    const captionFont = px(0.075, radius, 9);
    dial.title = { fontSize: captionFont, lineHeight: captionFont + 2, width: px(design.captionRoom, radius) };
    dial.detail = {
        fontSize: valueFont, lineHeight: valueFont,
        rich: { unit: { fontSize: Math.max(MIN_FONT, Math.round(valueFont * 0.5)), padding: [0, 0, Math.round(valueFont * 0.1), 0] } },
    };

    const nameFont = px(design.names.font, radius, MIN_FONT);
    const names: Row = {
        id: 'names',
        label: { show: design.names.font > 0 && design.names.font * radius * 1.7 >= MIN_FONT, fontSize: nameFont },
    };
    return [dial, { id: 'target' }, names];
}

/** Centre and radius of the three series. */
function placedSeries(design: Design, place: Placement): Row[] {
    const center = (): string[] => [`${place.cx}%`, `${place.cy}%`];
    return [
        { id: 'dial', center: center(), radius: percent(place.radius * design.rho) },
        { id: 'target', center: center(), radius: percent(place.radius * design.rho) },
        { id: 'names', center: center(), radius: [percent(place.radius * design.nameRing[0]), percent(place.radius * design.nameRing[1])] },
    ];
}

/** Copies `source` into `target`, objects key by key; arrays and other values replace what is there. */
function merge(target: Row, source: Row): Row {
    for (const key of Object.keys(source)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        const value = source[key];
        const existing = target[key];
        if (isRecord(value) && isRecord(existing)) merge(existing, value);
        else target[key] = value;
    }
    return target;
}

function readProps(tree: PropertyTree): DialGaugeProps {
    return {
        // Null means "no value", "no target" and "the variant's own angles": a binding
        // that delivers null must not bring the sample of the schema back.
        value: readProp(tree, 'value', null),
        min: readNumber(tree, 'min', 0),
        max: readNumber(tree, 'max', 120),
        unit: readString(tree, 'unit', '°C'),
        decimals: readNumber(tree, 'decimals', 1),
        title: readString(tree, 'title', 'Bearing temperature'),
        variant: readString(tree, 'variant', 'progress'),
        stages: readProp(tree, 'stages', []),
        color: readString(tree, 'color', DEFAULT_COLOR),
        target: readProp(tree, 'target', null),
        showScale: readBoolean(tree, 'showScale', true),
        showValue: readBoolean(tree, 'showValue', true),
        splitNumber: readNumber(tree, 'splitNumber', 0),
        startAngle: readProp(tree, 'startAngle', null),
        sweep: readProp(tree, 'sweep', null),
    };
}

function modelOf(props: Partial<DialGaugeProps>): Model {
    const variant = VARIANTS.includes(props.variant as Variant) ? props.variant as Variant : 'progress';
    const [min, max] = scaleOf(props.min, props.max);
    const angles = anglesOf(variant, props.startAngle, props.sweep);
    // On a closed circle the labels of min and max would be written over each other.
    if (asBoolean(props.showScale, true) && (variant === 'progress' || variant === 'stages')) {
        angles.sweep = Math.min(angles.sweep, 340);
    }
    const value = toNumber(props.value);
    const hasValue = !Number.isNaN(value);
    const unit = asString(props.unit, '').trim();
    const decimals = toDecimals(props.decimals, 1);
    const caption = richText(asString(props.title, '')).trim();

    const stages = readStages(props.stages);
    const stage = stageOf(stages, value);
    const fallback = typeof props.color === 'string' && props.color.trim() !== '' ? props.color : DEFAULT_COLOR;

    const valueText = hasValue ? formatNumber(value, decimals) : '–';
    const full = hasValue ? withUnit(valueText, unit) : valueText;
    const given = toNumber(props.target);
    const target = given >= min && given <= max ? given : NaN;

    // {b} is HTML-encoded by ECharts; the value carries the unit, which is free text.
    let tooltip = `${caption === '' ? '' : '{b}: '}<b>${tooltipText(full)}</b>`;
    if (stage && stage.name !== '') tooltip += ` ${tooltipText(stage.name)}`;
    if (!Number.isNaN(target)) tooltip += ` (target ${tooltipText(withUnit(formatNumber(target, decimals), unit))})`;

    const unitOfScale = scaleUnit(min, max);
    const ticks = chooseTicks(
        Number((min / unitOfScale.factor).toPrecision(12)), Number((max / unitOfScale.factor).toPrecision(12)),
        angles.sweep, asNumber(props.splitNumber, 0));
    ticks.labelChars += unitOfScale.suffix.length;

    return {
        variant, min, max, startAngle: angles.startAngle, sweep: angles.sweep,
        value, valueText, unitText: full.slice(valueText.length), caption,
        showValue: asBoolean(props.showValue, true),
        color: stage ? stage.color : fallback,
        bands: bandsOf(stages, min, max),
        ticks, factor: unitOfScale.factor, suffix: unitOfScale.suffix,
        target,
        tooltip,
    };
}

/**
 * A dial for one value, in four looks: a thick progress arc with a scale
 * around it, a band of stages with a needle, a thin band with the stage
 * names along it and a pointer, and a bare arc for small tiles.
 *
 * The dial is a gauge series; the target marker is the pointer of a second
 * gauge and the stage names are the labels of an undrawn pie, so that all
 * text and every marker belong to a series and none is left behind when the
 * option is merged into an earlier one.
 *
 * ECharts sizes a gauge in percent of the component but its lines and text
 * in pixels. The option therefore comes with media queries: one list steps
 * the pixel sizes with the radius the dial has, the other places the dial
 * for the aspect ratio of the component. Each list starts with a rule that
 * always applies, so that a component that shrinks leaves nothing behind.
 */
function buildOption(props: DialGaugeProps): object {
    const model = modelOf(props || {});
    const design = designOf(model, asBoolean(props?.showScale, true));
    const box = design.box;
    const steps = aspectSteps(box);

    const series = contentSeries(model, design);
    const smallest = sizedSeries(model, design, SIZE_STEPS[0]);
    const narrowest = placedSeries(design, placeDial(box, steps[0]));
    series.forEach((part, i) => merge(merge(part, smallest[i]), narrowest[i]));

    const media: Row[] = [{
        query: { minWidth: 0 },
        option: {
            series: sizedSeries(model, design, SIZE_STEPS[0])
                .map((part, i) => merge(part, placedSeries(design, placeDial(box, steps[0]))[i])),
        },
    }];
    for (let i = 1; i < SIZE_STEPS.length; i++) {
        media.push({
            query: {
                minWidth: Math.ceil(SIZE_STEPS[i] * (box.x1 - box.x0) / FIT),
                minHeight: Math.ceil(SIZE_STEPS[i] * (box.y1 - box.y0) / FIT),
            },
            option: { series: sizedSeries(model, design, SIZE_STEPS[i]) },
        });
    }
    for (let i = 0; i < steps.length; i++) {
        const place = i + 1 < steps.length ? placeBetween(box, steps[i], steps[i + 1]) : placeDial(box, steps[i]);
        media.push({ query: { minAspectRatio: steps[i] }, option: { series: placedSeries(design, place) } });
    }

    return { baseOption: { tooltip: { trigger: 'item' }, series }, media };
}

export const dialGaugeBehavior: ChartBehavior<DialGaugeProps> = { readProps, buildOption };
