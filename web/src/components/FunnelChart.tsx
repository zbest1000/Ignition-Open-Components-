import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.FunnelChart";

export type FunnelChartProps = BaseEChartProps;

export class FunnelChartComponent extends AbstractEChartComponent<FunnelChartProps> {
    protected getCssClass() { return 'open-echarts-funnel'; }
}

export class FunnelChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return FunnelChartComponent; }
    getDefaultSize(): SizeObject { return { width: 500, height: 400 }; }
    getPropsReducer(tree: PropertyTree): FunnelChartProps {
        return {
            option:           tree.read("option", {
                tooltip: { trigger: 'item' },
                series: [{ type: 'funnel', data: [{ value: 60, name: 'Visit' }, { value: 40, name: 'Inquiry' }, { value: 20, name: 'Order' }, { value: 80, name: 'Click' }, { value: 100, name: 'Show' }] }]
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
