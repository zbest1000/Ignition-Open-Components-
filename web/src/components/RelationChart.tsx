import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.RelationChart";

export type RelationChartProps = BaseEChartProps;

export class RelationChartComponent extends AbstractEChartComponent<RelationChartProps> {
    protected getCssClass() { return 'open-echarts-relation'; }
}

export class RelationChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return RelationChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 500 }; }
    getPropsReducer(tree: PropertyTree): RelationChartProps {
        return {
            option:           tree.read("option", {
                series: [{ type: 'sankey', layout: 'none', emphasis: { focus: 'adjacency' },
                    data: [{ name: 'A' },{ name: 'B' },{ name: 'C' },{ name: 'D' }],
                    links: [
                        { source: 'A', target: 'C', value: 5 },
                        { source: 'A', target: 'D', value: 3 },
                        { source: 'B', target: 'C', value: 8 },
                        { source: 'B', target: 'D', value: 6 },
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
