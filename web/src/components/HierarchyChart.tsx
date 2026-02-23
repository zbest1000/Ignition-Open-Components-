import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.HierarchyChart";

export type HierarchyChartProps = BaseEChartProps;

export class HierarchyChartComponent extends AbstractEChartComponent<HierarchyChartProps> {
    protected getCssClass() { return 'open-echarts-hierarchy'; }
}

export class HierarchyChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return HierarchyChartComponent; }
    getDefaultSize(): SizeObject { return { width: 500, height: 500 }; }
    getPropsReducer(tree: PropertyTree): HierarchyChartProps {
        return {
            option:           tree.read("option", {
                series: [{ type: 'treemap', data: [
                    { name: 'A', value: 10, children: [{ name: 'A1', value: 4 }, { name: 'A2', value: 6 }] },
                    { name: 'B', value: 15, children: [{ name: 'B1', value: 8 }, { name: 'B2', value: 7 }] },
                    { name: 'C', value: 8 }
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
