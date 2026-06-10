import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.TreemapChart";

export type TreemapChartProps = BaseEChartProps;

export class TreemapChartComponent extends AbstractEChartComponent<TreemapChartProps> {
    protected getCssClass() { return 'open-echarts-treemap'; }
}

export class TreemapChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return TreemapChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 500 }; }
    getPropsReducer(tree: PropertyTree): TreemapChartProps {
        return {
            option:           tree.read("option", {
                series: [{
                    type: 'treemap',
                    data: [{
                        name: 'Root',
                        value: 100,
                        children: [
                            { name: 'A', value: 40, children: [{ name: 'A1', value: 25 }, { name: 'A2', value: 15 }] },
                            { name: 'B', value: 35, children: [{ name: 'B1', value: 20 }, { name: 'B2', value: 15 }] },
                            { name: 'C', value: 25 }
                        ]
                    }]
                }]
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
