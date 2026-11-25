import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { Ring, buildRings, readThresholds, thresholdColor, toDecimals } from './metricRings';
import { asArray, isRecord, readBoolean, readProp, toLabel, toNumber } from './util';

export const OEE_ID = 'open.industrial.OEE';

export interface OEEProps {
    /** Availability, performance and quality as percentages (0-100), not fractions. */
    availability: unknown;
    performance: unknown;
    quality: unknown;
    /** When a number, shown instead of the computed OEE; null/blank means "compute". */
    oeeOverride: unknown;
    showLabels: boolean;
    /** Ring names: { oee, availability, performance, quality }. */
    labels?: unknown;
    /** Ring colours: { oee, availability, performance, quality }, or an array in ring order starting with OEE. */
    colors?: unknown;
    /** Value bands as objects { upTo?, color } that colour every ring by its value. */
    thresholds?: unknown;
    /** OEE target in percent, marked on the OEE ring; null for none. */
    target?: unknown;
    /** Decimals of every value; null keeps the factors as given and OEE as a whole percent. */
    decimals?: unknown;
    /** Factors as objects { name, value, color?, target? }; when non-empty they replace A, P and Q. */
    metrics?: unknown;
}

export interface OEEValues {
    oee: number;
    availability: number;
    performance: number;
    quality: number;
}

export interface OEEFactor {
    name: string;
    /** Percent, clamped to 0-100. */
    value: number;
    color?: string;
    /** Target in percent, or NaN. */
    target: number;
}

const FACTOR_KEYS = ['availability', 'performance', 'quality'] as const;
const FACTOR_NAMES = ['Availability', 'Performance', 'Quality'];
/** The band of rings, in percent of half the smaller side: 30 px of a 150 px radius at 400 x 400. */
const OUTER_RADIUS = 75;
const INNER_RADIUS = 60;
/** Radial share of one ring while there are at most four; more rings grow the band inwards down to MIN_INNER_RADIUS. */
const RING_SHARE = (OUTER_RADIUS - INNER_RADIUS) / 4;
const MIN_INNER_RADIUS = 45;

/** Percentage clamped to the gauge range; unusable input counts as 0. */
function toPercent(value: unknown): number {
    const n = toNumber(value);
    if (Number.isNaN(n)) return 0;
    return Math.min(100, Math.max(0, n));
}

/**
 * OEE = Availability x Performance x Quality, all in percent (0-100).
 *
 * Inputs outside 0-100 are clamped (the gauge scale is 0-100 and a factor
 * above 100 % would otherwise inflate OEE); a missing or non-numeric factor
 * counts as 0, which also makes the computed OEE 0 rather than NaN. The
 * computed OEE is rounded to a whole percent; a numeric `oeeOverride`
 * replaces it (clamped, not rounded).
 */
export function computeOEE(props: Pick<OEEProps, 'availability' | 'performance' | 'quality' | 'oeeOverride'>): OEEValues {
    const availability = toPercent(props.availability);
    const performance = toPercent(props.performance);
    const quality = toPercent(props.quality);
    const override = toNumber(props.oeeOverride);
    const oee = Number.isNaN(override)
        ? Math.round(availability * performance * quality / 10000)
        : toPercent(override);
    return { oee, availability, performance, quality };
}

/**
 * The product rule for any number of factors given in percent: the factors
 * are multiplied as fractions and the result is a percentage, unrounded. For
 * three factors this is A x P x Q / 10000. No factors give 0.
 */
export function productOfFactors(values: readonly number[]): number {
    if (values.length === 0) return 0;
    let product = values[0];
    for (let i = 1; i < values.length; i++) product *= values[i];
    return product / Math.pow(100, values.length - 1);
}

function colorOf(value: unknown): string | undefined {
    return typeof value === 'string' && value !== '' ? value : undefined;
}

/**
 * The factors multiplied into OEE: the entries of a non-empty `metrics` prop,
 * otherwise availability, performance and quality. A metrics entry that is
 * not an object is skipped; one without a usable value counts as 0, like a
 * bad A, P or Q.
 */
export function readFactors(props: OEEProps): OEEFactor[] {
    const factors: OEEFactor[] = [];
    for (const row of asArray(props.metrics)) {
        if (!isRecord(row)) continue;
        factors.push({
            name: toLabel(row.name) ?? `Factor ${factors.length + 1}`,
            value: toPercent(row.value),
            color: colorOf(row.color),
            target: toNumber(row.target),
        });
    }
    if (factors.length > 0) return factors;

    const labels = isRecord(props.labels) ? props.labels : {};
    const colors = isRecord(props.colors) ? props.colors : {};
    return FACTOR_KEYS.map((key, i) => ({
        name: toLabel(labels[key]) ?? FACTOR_NAMES[i],
        value: toPercent(props[key]),
        color: colorOf(colors[key]),
        target: NaN,
    }));
}

function readProps(tree: PropertyTree): OEEProps {
    return {
        availability: readProp(tree, 'availability', 92),
        performance: readProp(tree, 'performance', 95),
        quality: readProp(tree, 'quality', 97),
        oeeOverride: readProp(tree, 'oeeOverride', null),
        showLabels: readBoolean(tree, 'showLabels', true),
        labels: readProp(tree, 'labels', {}),
        colors: readProp(tree, 'colors', {}),
        thresholds: readProp(tree, 'thresholds', []),
        target: readProp(tree, 'target', null),
        decimals: readProp(tree, 'decimals', null),
        metrics: readProp(tree, 'metrics', []),
    };
}

function buildOption(props: OEEProps): object {
    const factors = readFactors(props);
    const override = toNumber(props.oeeOverride);
    const hasDecimals = !Number.isNaN(toNumber(props.decimals));
    const decimals = toDecimals(props.decimals, 0);
    const round = (n: number): number => Number(n.toFixed(decimals));

    // Without `decimals` the values are those of the original component: the
    // computed OEE as a whole percent, everything else as given.
    const computed = productOfFactors(factors.map(factor => factor.value));
    let oee = Number.isNaN(override) ? Math.round(computed) : toPercent(override);
    if (hasDecimals) oee = round(Number.isNaN(override) ? computed : oee);

    const labels = isRecord(props.labels) ? props.labels : {};
    const colors = isRecord(props.colors) ? props.colors : {};
    const colorList = asArray(props.colors);
    const bands = readThresholds(props.thresholds);
    const oeeTarget = toNumber(props.target);

    const rows = [
        { name: toLabel(labels.oee) ?? 'OEE', value: oee, color: colorOf(colors.oee), target: oeeTarget },
        ...factors.map(factor => ({ ...factor, value: hasDecimals ? round(factor.value) : factor.value })),
    ];
    const rings: Ring[] = rows.map((row, i) => {
        const text = hasDecimals ? `${row.value.toFixed(decimals)}%` : `${row.value}%`;
        const hasTarget = !Number.isNaN(row.target) && row.target >= 0 && row.target <= 100;
        return {
            name: row.name,
            percent: row.value,
            text,
            // Unset colours are left to the theme palette.
            color: thresholdColor(bands, row.value) ?? row.color ?? colorOf(colorList[i]),
            targetText: hasTarget ? `${row.target}%` : '',
            targetPercent: hasTarget ? row.target : null,
        };
    });

    return buildRings({
        rings,
        center: [50, 50],
        outerRadius: OUTER_RADIUS,
        innerRadius: Math.max(MIN_INNER_RADIUS, OUTER_RADIUS - RING_SHARE * Math.max(4, rings.length)),
        gap: 0,
        startAngle: 90,
        sweep: 360,
        holeLabels: {
            show: props.showLabels !== false,
            formatter: '{value}%',
            values: rows.map(row => row.value),
            texts: rings.map(ring => (hasDecimals ? ring.text : null)),
        },
    });
}

export const oeeBehavior: ChartBehavior<OEEProps> = { readProps, buildOption };
