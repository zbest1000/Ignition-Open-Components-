import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { Row, readBoolean, readProp, toNumber } from './util';

export const OEE_ID = 'open.industrial.OEE';

export interface OEEProps {
    /** Availability, performance and quality as percentages (0-100), not fractions. */
    availability: unknown;
    performance: unknown;
    quality: unknown;
    /** When a number, shown instead of the computed OEE; null/blank means "compute". */
    oeeOverride: unknown;
    showLabels: boolean;
}

export interface OEEValues {
    oee: number;
    availability: number;
    performance: number;
    quality: number;
}

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

function ring(value: number, name: string, titleY: string, detailY: string): Row {
    return { value, name, title: { offsetCenter: ['0%', titleY] }, detail: { offsetCenter: ['0%', detailY] } };
}

function readProps(tree: PropertyTree): OEEProps {
    return {
        availability: readProp(tree, 'availability', 92),
        performance: readProp(tree, 'performance', 95),
        quality: readProp(tree, 'quality', 97),
        oeeOverride: readProp(tree, 'oeeOverride', null),
        showLabels: readBoolean(tree, 'showLabels', true),
    };
}

function buildOption(props: OEEProps): object {
    const v = computeOEE(props);
    const detail = props.showLabels !== false
        ? { width: 40, height: 14, fontSize: 14, color: 'inherit', formatter: '{value}%' }
        : { show: false };

    return {
        series: [{
            type: 'gauge', startAngle: 90, endAngle: -270,
            min: 0, max: 100,
            pointer: { show: false },
            progress: { show: true, overlap: false, roundCap: true, clip: false },
            axisLine: { lineStyle: { width: 30 } },
            axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
            detail,
            data: [
                ring(v.oee, 'OEE', '-35%', '-20%'),
                ring(v.availability, 'Availability', '0%', '15%'),
                ring(v.performance, 'Performance', '35%', '50%'),
                ring(v.quality, 'Quality', '70%', '85%'),
            ],
        }],
    };
}

export const oeeBehavior: ChartBehavior<OEEProps> = { readProps, buildOption };
