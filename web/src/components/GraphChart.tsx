import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.GraphChart";

export type GraphChartProps = BaseEChartProps;

export class GraphChartComponent extends AbstractEChartComponent<GraphChartProps> {
    protected getCssClass() { return 'open-echarts-graph'; }
}

export class GraphChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return GraphChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 500 }; }
    getPropsReducer(tree: PropertyTree): GraphChartProps {
        return {
            option:           tree.read("option", {
                series: [{
                    type: 'graph',
                    layout: 'force',
                    roam: true,
                    data: [
                        { name: 'Node1', x: 300, y: 100 },
                        { name: 'Node2', x: 200, y: 200 },
                        { name: 'Node3', x: 400, y: 200 },
                        { name: 'Node4', x: 300, y: 300 }
                    ],
                    links: [
                        { source: 'Node1', target: 'Node2' },
                        { source: 'Node1', target: 'Node3' },
                        { source: 'Node2', target: 'Node4' },
                        { source: 'Node3', target: 'Node4' }
                    ]
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
