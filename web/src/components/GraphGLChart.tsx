import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.GraphGLChart";
export type GraphGLChartProps = BaseEChartProps;

export class GraphGLChartComponent extends AbstractEChartComponent<GraphGLChartProps> {
    protected getCssClass() { return 'open-echarts-graphgl'; }
}

export class GraphGLChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return GraphGLChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 500 }; }
    getPropsReducer(tree: PropertyTree): GraphGLChartProps {
        return {
            option:           tree.read("option", {
                series: [{
                    type: 'graphGL',
                    nodes: [{ name: 'Node1', x: 0, y: 0 }, { name: 'Node2', x: 100, y: 100 }],
                    edges: [{ source: 0, target: 1 }],
                    forceAtlas2: { steps: 5 }
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
