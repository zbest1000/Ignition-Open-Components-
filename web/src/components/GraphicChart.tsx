import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.GraphicChart";

export type GraphicChartProps = BaseEChartProps;

export class GraphicChartComponent extends AbstractEChartComponent<GraphicChartProps> {
    protected getCssClass() { return 'open-echarts-graphic'; }
}

export class GraphicChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return GraphicChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 400 }; }
    getPropsReducer(tree: PropertyTree): GraphicChartProps {
        return {
            option:           tree.read("option", {
                graphic: [
                    {
                        type: 'group',
                        left: 'center',
                        top: 'center',
                        children: [
                            {
                                type: 'rect',
                                shape: { width: 200, height: 40, r: 5 },
                                style: { fill: '#5470c6', stroke: '#333', lineWidth: 1 },
                                left: 'center',
                                top: 0
                            },
                            {
                                type: 'text',
                                style: { text: 'Graphic Overlay', fill: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
                                left: 'center',
                                top: 10
                            }
                        ]
                    }
                ]
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
