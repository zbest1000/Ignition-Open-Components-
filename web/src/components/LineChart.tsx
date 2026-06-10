import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.LineChart";

export type LineChartProps = BaseEChartProps;

export class LineChartComponent extends AbstractEChartComponent<LineChartProps> {
    protected getCssClass() { return 'open-echarts-line'; }
}

export class LineChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return LineChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 350 }; }
    getPropsReducer(tree: PropertyTree): LineChartProps {
        return {
            option:           tree.read("option", {
                xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
                yAxis: { type: 'value' },
                tooltip: { trigger: 'axis' },
                series: [{ type: 'line', data: [150, 230, 224, 218, 135, 147, 260] }]
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
