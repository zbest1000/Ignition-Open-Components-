import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.SankeyChart";

export type SankeyChartProps = BaseEChartProps;

export class SankeyChartComponent extends AbstractEChartComponent<SankeyChartProps> {
    protected getCssClass() { return 'open-echarts-sankey'; }
}

export class SankeyChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return SankeyChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 500 }; }
    getPropsReducer(tree: PropertyTree): SankeyChartProps {
        return {
            option:           tree.read("option", {
                series: [{
                    type: 'sankey',
                    data: [
                        { name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'E' }
                    ],
                    links: [
                        { source: 'A', target: 'B', value: 5 },
                        { source: 'A', target: 'C', value: 3 },
                        { source: 'B', target: 'D', value: 4 },
                        { source: 'B', target: 'E', value: 2 },
                        { source: 'C', target: 'D', value: 2 },
                        { source: 'C', target: 'E', value: 1 }
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
