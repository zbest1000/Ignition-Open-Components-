import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { Row, asArray, asString, readBoolean, readProp, readString, titles, toNumber } from './util';

export const SPC_ID = 'open.industrial.SPCChart';

export interface SPCProps {
    /** Individual measurements in time order; validated in buildOption. */
    values: unknown;
    /**
     * Subgroup size. 1 gives an Individuals & Moving Range (I-MR) chart;
     * 2-10 groups consecutive values into subgroups of that size and gives an
     * X-bar & R chart. Values above 10 are treated as 10.
     */
    subgroupSize: unknown;
    showUCL: boolean;
    showLCL: boolean;
    showCenterLine: boolean;
    /** Shows the lower chart: Moving Range for I-MR, Range for X-bar & R. */
    showMRChart: boolean;
    showRunRules: boolean;
    title: string;
}

/**
 * Standard Shewhart control chart constants (ASTM E2587 / Montgomery,
 * "Introduction to Statistical Quality Control", Appendix VI), indexed by
 * subgroup size n. For n = 1 the moving range of two consecutive points is
 * used, so the n = 2 constants apply (d2 = 1.128, D4 = 3.267).
 */
export const SPC_CONSTANTS: Readonly<Record<number, { A2: number; D3: number; D4: number; d2: number }>> = {
    2: { A2: 1.880, D3: 0, D4: 3.267, d2: 1.128 },
    3: { A2: 1.023, D3: 0, D4: 2.574, d2: 1.693 },
    4: { A2: 0.729, D3: 0, D4: 2.282, d2: 2.059 },
    5: { A2: 0.577, D3: 0, D4: 2.114, d2: 2.326 },
    6: { A2: 0.483, D3: 0, D4: 2.004, d2: 2.534 },
    7: { A2: 0.419, D3: 0.076, D4: 1.924, d2: 2.704 },
    8: { A2: 0.373, D3: 0.136, D4: 1.864, d2: 2.847 },
    9: { A2: 0.337, D3: 0.184, D4: 1.816, d2: 2.970 },
    10: { A2: 0.308, D3: 0.223, D4: 1.777, d2: 3.078 },
};

export const MAX_SUBGROUP_SIZE = 10;

export interface ControlChart {
    kind: 'I-MR' | 'Xbar-R';
    subgroupSize: number;
    /** Plotted location values: individuals (I-MR) or subgroup means (X-bar). */
    points: number[];
    /** Plotted dispersion values: moving ranges (one fewer than points) or subgroup ranges. */
    dispersion: number[];
    /** False when there is too little data to estimate limits; limits are then 0 and must not be drawn. */
    hasLimits: boolean;
    center: number;
    ucl: number;
    lcl: number;
    dispersionCenter: number;
    dispersionUcl: number;
    dispersionLcl: number;
}

function mean(values: number[]): number {
    let sum = 0;
    for (const v of values) sum += v;
    return values.length > 0 ? sum / values.length : 0;
}

/** Integer subgroup size in 1..10 from any input (non-numeric or < 1 gives 1). */
export function normaliseSubgroupSize(value: unknown): number {
    const n = Math.floor(toNumber(value));
    if (Number.isNaN(n) || n < 1) return 1;
    return Math.min(n, MAX_SUBGROUP_SIZE);
}

/**
 * Computes the control chart statistics.
 *
 * subgroupSize 1 - Individuals & Moving Range:
 *   CL = mean(x), sigma = MRbar / d2(2), UCL/LCL = CL +/- 3 sigma,
 *   MR chart: CL = MRbar, UCL = D4(2) * MRbar, LCL = 0.
 * subgroupSize n = 2..10 - X-bar & R, consecutive values form subgroups and
 * a trailing incomplete subgroup is ignored:
 *   CL = mean of subgroup means, UCL/LCL = CL +/- A2(n) * Rbar,
 *   R chart: CL = Rbar, UCL = D4(n) * Rbar, LCL = D3(n) * Rbar.
 *
 * Non-numeric entries in `values` are dropped before grouping.
 */
export function computeControlChart(rawValues: unknown, rawSubgroupSize: unknown): ControlChart {
    const values: number[] = [];
    for (const raw of asArray(rawValues)) {
        const v = toNumber(raw);
        if (!Number.isNaN(v)) values.push(v);
    }
    const n = normaliseSubgroupSize(rawSubgroupSize);

    if (n === 1) {
        const mr: number[] = [];
        for (let i = 1; i < values.length; i++) {
            mr.push(Math.abs(values[i] - values[i - 1]));
        }
        const hasLimits = values.length >= 2;
        const center = mean(values);
        const mrBar = mean(mr);
        const { d2, D4 } = SPC_CONSTANTS[2];
        const sigma = mrBar / d2;
        return {
            kind: 'I-MR', subgroupSize: 1, points: values, dispersion: mr, hasLimits,
            center: hasLimits ? center : 0,
            ucl: hasLimits ? center + 3 * sigma : 0,
            lcl: hasLimits ? center - 3 * sigma : 0,
            dispersionCenter: mrBar,
            dispersionUcl: D4 * mrBar,
            dispersionLcl: 0,
        };
    }

    const means: number[] = [];
    const ranges: number[] = [];
    for (let start = 0; start + n <= values.length; start += n) {
        let sum = 0;
        let min = Infinity;
        let max = -Infinity;
        for (let i = start; i < start + n; i++) {
            const v = values[i];
            sum += v;
            if (v < min) min = v;
            if (v > max) max = v;
        }
        means.push(sum / n);
        ranges.push(max - min);
    }
    const hasLimits = means.length >= 1;
    const center = mean(means);
    const rBar = mean(ranges);
    const { A2, D3, D4 } = SPC_CONSTANTS[n];
    return {
        kind: 'Xbar-R', subgroupSize: n, points: means, dispersion: ranges, hasLimits,
        center,
        ucl: center + A2 * rBar,
        lcl: center - A2 * rBar,
        dispersionCenter: rBar,
        dispersionUcl: D4 * rBar,
        dispersionLcl: D3 * rBar,
    };
}

/**
 * Indices of points violating the two run rules this chart applies:
 *
 * - Western Electric rule 1 (= Nelson rule 1): a point beyond the 3-sigma
 *   control limits (strictly above UCL or below LCL).
 * - Western Electric rule 4: eight consecutive points on the same side of
 *   the centre line (points exactly on the line break the run). The eighth
 *   and every further point of the run are flagged. Note that Nelson rule 2
 *   uses nine points; this chart uses the Western Electric count of eight.
 *
 * The zone rules (WE rules 2 and 3) are not applied.
 */
export function detectRunRuleViolations(points: number[], center: number, ucl: number, lcl: number): number[] {
    const violations: number[] = [];
    let above = 0;
    let below = 0;
    for (let i = 0; i < points.length; i++) {
        const v = points[i];
        above = v > center ? above + 1 : 0;
        below = v < center ? below + 1 : 0;
        if (v > ucl || v < lcl || above >= 8 || below >= 8) {
            violations.push(i);
        }
    }
    return violations;
}

/**
 * Value-axis range that keeps every given value in view, with about 10 % of
 * headroom and rounded outwards to a round step. Without it ECharts starts
 * the axis at zero and ignores mark lines, which flattens a process running
 * far from zero and pushes control limits outside the plot. A range of
 * non-negative values never starts below zero. Null when there is nothing
 * finite to show.
 */
export function axisRange(values: number[]): { min: number; max: number } | null {
    let lo = Infinity;
    let hi = -Infinity;
    for (const v of values) {
        if (!Number.isFinite(v)) continue;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
    }
    if (lo > hi) return null;
    const span = hi - lo || Math.abs(hi) || 1;
    const pad = span * 0.1;
    const step = 10 ** Math.floor(Math.log10(span / 2));
    const round = (n: number): number => Number(n.toPrecision(12));
    const min = round(Math.floor((lo - pad) / step) * step);
    const max = round(Math.ceil((hi + pad) / step) * step);
    return { min: lo >= 0 ? Math.max(0, min) : min, max };
}

function limitLine(value: number, label: string, color: string, type: string): Row {
    return { yAxis: value, lineStyle: { color, type }, label: { formatter: label } };
}

function indices(from: number, count: number): number[] {
    const out = new Array<number>(count);
    for (let i = 0; i < count; i++) out[i] = from + i;
    return out;
}

function readProps(tree: PropertyTree): SPCProps {
    return {
        values: readProp(tree, 'values', [72.1, 73.4, 71.8, 74.2, 72.9, 73.1, 71.5, 73.8, 74.5, 72.3, 73.7, 71.9, 74.1, 72.6, 73.3, 72.8, 74.0, 71.7, 73.5, 72.2]),
        subgroupSize: readProp(tree, 'subgroupSize', 1),
        showUCL: readBoolean(tree, 'showUCL', true),
        showLCL: readBoolean(tree, 'showLCL', true),
        showCenterLine: readBoolean(tree, 'showCenterLine', true),
        showMRChart: readBoolean(tree, 'showMRChart', true),
        showRunRules: readBoolean(tree, 'showRunRules', true),
        title: readString(tree, 'title', ''),
    };
}

function buildOption(props: SPCProps): object {
    const spc = computeControlChart(props.values, props.subgroupSize);
    const individuals = spc.kind === 'I-MR';
    const showLower = props.showMRChart !== false;

    const markLines: Row[] = [];
    if (spc.hasLimits) {
        if (props.showCenterLine !== false) markLines.push(limitLine(spc.center, 'CL', '#5470c6', 'solid'));
        if (props.showUCL !== false) markLines.push(limitLine(spc.ucl, 'UCL', '#ee6666', 'dashed'));
        if (props.showLCL !== false) markLines.push(limitLine(spc.lcl, 'LCL', '#ee6666', 'dashed'));
    }

    const violations = spc.hasLimits && props.showRunRules !== false
        ? detectRunRuleViolations(spc.points, spc.center, spc.ucl, spc.lcl)
        : [];

    const main: Row = {
        type: 'line', data: spc.points, xAxisIndex: 0, yAxisIndex: 0,
        symbol: 'circle', symbolSize: 6,
    };
    if (markLines.length > 0) {
        main.markLine = { silent: true, symbol: 'none', data: markLines };
    }
    if (violations.length > 0) {
        main.markPoint = {
            symbol: 'circle',
            data: violations.map(i => ({
                coord: [i, spc.points[i]], symbol: 'circle', symbolSize: 10, itemStyle: { color: '#ee6666' },
            })),
        };
    }

    const grid: Row[] = [{ top: 60, bottom: showLower ? '55%' : 50 }];
    const xAxis: Row[] = [{ type: 'category', data: indices(1, spc.points.length), gridIndex: 0 }];
    const yAxis: Row[] = [{
        type: 'value', gridIndex: 0, name: individuals ? 'Value' : 'X-bar',
        ...axisRange(spc.points.concat(markLines.map(line => line.yAxis as number))),
    }];
    const series: Row[] = [main];

    if (showLower && spc.dispersion.length > 0) {
        const lowerLines: Row[] = [
            limitLine(spc.dispersionCenter, 'CL', '#5470c6', 'solid'),
            limitLine(spc.dispersionUcl, 'UCL', '#ee6666', 'dashed'),
        ];
        if (spc.dispersionLcl > 0) {
            lowerLines.push(limitLine(spc.dispersionLcl, 'LCL', '#ee6666', 'dashed'));
        }
        grid.push({ top: '55%', bottom: 40 });
        // The first moving range belongs to the second individual value.
        xAxis.push({ type: 'category', data: indices(individuals ? 2 : 1, spc.dispersion.length), gridIndex: 1 });
        yAxis.push({
            type: 'value', gridIndex: 1, name: individuals ? 'MR' : 'R',
            ...axisRange(spc.dispersion.concat(0, lowerLines.map(line => line.yAxis as number))),
        });
        series.push({
            type: 'line', data: spc.dispersion, xAxisIndex: 1, yAxisIndex: 1,
            symbol: 'circle', symbolSize: 4,
            markLine: { silent: true, symbol: 'none', data: lowerLines },
        });
    }

    const defaultTitle = individuals ? 'SPC — Individuals & Moving Range' : 'SPC — X-bar & R';
    return {
        title: titles(asString(props.title, '') || defaultTitle, spc.points.length === 0),
        tooltip: { trigger: 'axis' },
        grid,
        xAxis,
        yAxis,
        series,
    };
}

export const spcBehavior: ChartBehavior<SPCProps> = { readProps, buildOption };
