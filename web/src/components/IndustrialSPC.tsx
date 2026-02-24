import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.SPCChart";

export interface SPCProps extends BaseEChartProps {
    values?: number[];
    subgroupSize?: number;
    showUCL?: boolean;
    showLCL?: boolean;
    showCenterLine?: boolean;
    showMRChart?: boolean;
    showRunRules?: boolean;
    title?: string;
}

function computeSPC(values: number[]) {
    if (!values || values.length < 2) {
        return { mean: 0, ucl: 0, lcl: 0, mrValues: [], mrMean: 0, mrUcl: 0 };
    }
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;

    const mrValues: number[] = [];
    for (let i = 1; i < n; i++) {
        mrValues.push(Math.abs(values[i] - values[i - 1]));
    }
    const mrMean = mrValues.length > 0 ? mrValues.reduce((a, b) => a + b, 0) / mrValues.length : 0;

    const d2 = 1.128;
    const d4 = 3.267;
    const sigma = mrMean / d2;
    const ucl = mean + 3 * sigma;
    const lcl = mean - 3 * sigma;
    const mrUcl = d4 * mrMean;

    return { mean, ucl, lcl, mrValues, mrMean, mrUcl };
}

function detectRunRuleViolations(values: number[], mean: number, ucl: number, lcl: number): number[] {
    const violations: number[] = [];
    for (let i = 0; i < values.length; i++) {
        if (values[i] > ucl || values[i] < lcl) {
            violations.push(i);
            continue;
        }
        if (i >= 7) {
            const last8 = values.slice(i - 7, i + 1);
            if (last8.every(v => v > mean) || last8.every(v => v < mean)) {
                violations.push(i);
            }
        }
    }
    return violations;
}

function buildOption(props: SPCProps): object {
    if (props.option && Object.keys(props.option).length > 0) return props.option;

    const values = props.values || [];
    const spc = computeSPC(values);
    const indices = values.map((_: number, i: number) => i + 1);

    const markLines: any[] = [];
    if (props.showCenterLine !== false) {
        markLines.push({ yAxis: spc.mean, lineStyle: { color: '#5470c6', type: 'solid' }, label: { formatter: 'CL' } });
    }
    if (props.showUCL !== false) {
        markLines.push({ yAxis: spc.ucl, lineStyle: { color: '#ee6666', type: 'dashed' }, label: { formatter: 'UCL' } });
    }
    if (props.showLCL !== false) {
        markLines.push({ yAxis: spc.lcl, lineStyle: { color: '#ee6666', type: 'dashed' }, label: { formatter: 'LCL' } });
    }

    const violations = props.showRunRules !== false ? detectRunRuleViolations(values, spc.mean, spc.ucl, spc.lcl) : [];
    const violationData = violations.map(i => ({ coord: [i, values[i]], symbol: 'circle', symbolSize: 10, itemStyle: { color: '#ee6666' } }));

    const grids: any[] = [{ top: 60, bottom: props.showMRChart !== false ? '55%' : 50 }];
    const xAxes: any[] = [{ type: 'category', data: indices, gridIndex: 0 }];
    const yAxes: any[] = [{ type: 'value', gridIndex: 0, name: 'Value' }];
    const series: any[] = [{
        type: 'line', data: values, xAxisIndex: 0, yAxisIndex: 0,
        symbol: 'circle', symbolSize: 6,
        markLine: markLines.length > 0 ? { silent: true, symbol: 'none', data: markLines } : undefined,
        markPoint: violationData.length > 0 ? { data: violationData, symbol: 'circle' } : undefined,
    }];

    if (props.showMRChart !== false && spc.mrValues.length > 0) {
        grids.push({ top: '55%', bottom: 40 });
        xAxes.push({ type: 'category', data: indices.slice(1), gridIndex: 1 });
        yAxes.push({ type: 'value', gridIndex: 1, name: 'MR' });
        series.push({
            type: 'line', data: spc.mrValues, xAxisIndex: 1, yAxisIndex: 1,
            symbol: 'circle', symbolSize: 4,
            markLine: { silent: true, symbol: 'none', data: [
                { yAxis: spc.mrMean, lineStyle: { color: '#5470c6' }, label: { formatter: 'CL' } },
                { yAxis: spc.mrUcl, lineStyle: { color: '#ee6666', type: 'dashed' }, label: { formatter: 'UCL' } },
            ]}
        });
    }

    return {
        title: { text: props.title || 'SPC — Individuals & Moving Range', left: 'center' },
        tooltip: { trigger: 'axis' },
        grid: grids,
        xAxis: xAxes,
        yAxis: yAxes,
        series,
    };
}

export class IndustrialSPCComponent extends AbstractEChartComponent<SPCProps> {
    protected getCssClass() { return 'open-industrial-spc'; }
}

export class IndustrialSPCMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialSPCComponent; }
    getDefaultSize(): SizeObject { return { width: 800, height: 500 }; }
    getPropsReducer(tree: PropertyTree): SPCProps {
        const base: SPCProps = {
            option:         tree.read("option", {}),
            theme:          tree.readString("theme", ""),
            renderer:       tree.readString("renderer", "canvas") as 'canvas' | 'svg',
            autoResize:     tree.readBoolean("autoResize", true),
            resizeDebounceMs: tree.readNumber("resizeDebounceMs", 150),
            notMerge:       tree.readBoolean("notMerge", false),
            lazyUpdate:     tree.readBoolean("lazyUpdate", true),
            showLoading:    tree.readBoolean("showLoading", false),
            loadingOptions: tree.read("loadingOptions", {}),
            sanitizeTooltip: tree.readBoolean("sanitizeTooltip", true),
            values:         tree.read("values", [72.1,73.4,71.8,74.2,72.9,73.1,71.5,73.8,74.5,72.3,73.7,71.9,74.1,72.6,73.3,72.8,74.0,71.7,73.5,72.2]),
            subgroupSize:   tree.readNumber("subgroupSize", 1),
            showUCL:        tree.readBoolean("showUCL", true),
            showLCL:        tree.readBoolean("showLCL", true),
            showCenterLine: tree.readBoolean("showCenterLine", true),
            showMRChart:    tree.readBoolean("showMRChart", true),
            showRunRules:   tree.readBoolean("showRunRules", true),
            title:          tree.readString("title", ""),
        };
        base.option = buildOption(base);
        return base;
    }
}
