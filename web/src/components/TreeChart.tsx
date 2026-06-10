import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.TreeChart";

export type TreeChartProps = BaseEChartProps;

export class TreeChartComponent extends AbstractEChartComponent<TreeChartProps> {
    protected getCssClass() { return 'open-echarts-tree'; }
}

export class TreeChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return TreeChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 500 }; }
    getPropsReducer(tree: PropertyTree): TreeChartProps {
        return {
            option:           tree.read("option", {
                series: [{
                    type: 'tree',
                    orient: 'LR',
                    label: { position: 'left' },
                    data: [{
                        name: 'Root',
                        children: [
                            { name: 'Child1', children: [{ name: 'Grandchild1' }, { name: 'Grandchild2' }] },
                            { name: 'Child2', children: [{ name: 'Grandchild3' }] }
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
