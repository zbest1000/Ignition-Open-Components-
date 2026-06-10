import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.HeatmapChart";

export type HeatmapChartProps = BaseEChartProps;

export class HeatmapChartComponent extends AbstractEChartComponent<HeatmapChartProps> {
    protected getCssClass() { return 'open-echarts-heatmap'; }
}

export class HeatmapChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return HeatmapChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 400 }; }
    getPropsReducer(tree: PropertyTree): HeatmapChartProps {
        return {
            option:           tree.read("option", {
                xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
                yAxis: { type: 'category', data: ['Morning', 'Afternoon', 'Evening'] },
                visualMap: { min: 0, max: 10 },
                series: [{ type: 'heatmap', data: [[0, 0, 5], [1, 0, 3], [2, 0, 7], [3, 0, 2], [4, 0, 8], [5, 0, 4], [6, 0, 6], [0, 1, 4], [1, 1, 9], [2, 1, 1], [3, 1, 0], [4, 1, 5], [5, 1, 10], [6, 1, 4], [0, 2, 8], [1, 2, 2], [2, 2, 6], [3, 2, 3], [4, 2, 7], [5, 2, 1], [6, 2, 8]], label: { show: true } }]
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
