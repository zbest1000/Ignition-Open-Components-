import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.PieChart";

export type PieChartProps = BaseEChartProps;

export class PieChartComponent extends AbstractEChartComponent<PieChartProps> {
    protected getCssClass() { return 'open-echarts-pie'; }
}

export class PieChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return PieChartComponent; }
    getDefaultSize(): SizeObject { return { width: 500, height: 400 }; }
    getPropsReducer(tree: PropertyTree): PieChartProps {
        return {
            option:           tree.read("option", {
                tooltip: { trigger: 'item' },
                legend: { orient: 'vertical', left: 'left' },
                series: [{ type: 'pie', radius: '50%', data: [
                    { value: 1048, name: 'Category A' }, { value: 735, name: 'Category B' },
                    { value: 580, name: 'Category C' }, { value: 484, name: 'Category D' }
                ]}]
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
