import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.BarChart";

export type BarChartProps = BaseEChartProps;

export class BarChartComponent extends AbstractEChartComponent<BarChartProps> {
    protected getCssClass() { return 'open-echarts-bar'; }
}

export class BarChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return BarChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 350 }; }
    getPropsReducer(tree: PropertyTree): BarChartProps {
        return {
            option:           tree.read("option", {
                xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
                yAxis: { type: 'value' },
                tooltip: { trigger: 'axis' },
                series: [{ type: 'bar', data: [120, 200, 150, 80, 70, 110, 130] }]
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
