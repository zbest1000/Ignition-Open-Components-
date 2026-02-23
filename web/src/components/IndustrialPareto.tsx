import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.Pareto";

export type ParetoProps = BaseEChartProps;

export class IndustrialParetoComponent extends AbstractEChartComponent<ParetoProps> {
    protected getCssClass() { return 'open-industrial-pareto'; }
}

export class IndustrialParetoMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialParetoComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 400 }; }
    getPropsReducer(tree: PropertyTree): ParetoProps {
        return {
            option:           tree.read("option", {
                tooltip: { trigger: 'axis' },
                legend: { data: ['Count', 'Cumulative %'], bottom: 0 },
                grid: { top: 40, bottom: 50 },
                xAxis: { type: 'category', data: ['Mechanical', 'Electrical', 'Operator', 'Material', 'Other'] },
                yAxis: [
                    { type: 'value', name: 'Count' },
                    { type: 'value', name: '%', max: 100, axisLabel: { formatter: '{value}%' } }
                ],
                series: [
                    { name: 'Count', type: 'bar', data: [42, 28, 18, 12, 5] },
                    { name: 'Cumulative %', type: 'line', yAxisIndex: 1, data: [37, 62, 78, 89, 100],
                      markLine: { data: [{ yAxis: 80, label: { formatter: '80%' } }] } }
                ]
            }),
            theme:            tree.readString("theme", ""),
            renderer:         tree.readString("renderer", "canvas") as 'canvas' | 'svg',
            autoResize:       tree.readBoolean("autoResize", true),
            resizeDebounceMs: tree.readNumber("resizeDebounceMs", 150),
            notMerge:         tree.readBoolean("notMerge", false),
            lazyUpdate:       tree.readBoolean("lazyUpdate", true),
            showLoading:      tree.readBoolean("showLoading", false),
            loadingOptions:   tree.read("loadingOptions", {}),
            sanitizeTooltip:  tree.readBoolean("sanitizeTooltip", true),
        };
    }
}
