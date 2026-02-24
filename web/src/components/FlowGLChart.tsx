import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.FlowGLChart";
export type FlowGLChartProps = BaseEChartProps;

export class FlowGLChartComponent extends AbstractEChartComponent<FlowGLChartProps> {
    protected getCssClass() { return 'open-echarts-flowgl'; }
}

export class FlowGLChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return FlowGLChartComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 500 }; }
    getPropsReducer(tree: PropertyTree): FlowGLChartProps {
        return {
            option:           tree.read("option", { title: { text: 'Flow GL', subtext: 'Requires vector field data for flow visualization', left: 'center' }, series: [] }),
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
