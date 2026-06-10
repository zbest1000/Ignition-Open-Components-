import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.GaugeChart";

export type GaugeChartProps = BaseEChartProps;

export class GaugeChartComponent extends AbstractEChartComponent<GaugeChartProps> {
    protected getCssClass() { return 'open-echarts-gauge'; }
}

export class GaugeChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return GaugeChartComponent; }
    getDefaultSize(): SizeObject { return { width: 400, height: 350 }; }
    getPropsReducer(tree: PropertyTree): GaugeChartProps {
        return {
            option:           tree.read("option", {
                series: [{ type: 'gauge', detail: { valueAnimation: true },
                    data: [{ value: 72, name: 'Score' }] }]
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
