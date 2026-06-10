import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.ScatterChart";

export type ScatterChartProps = BaseEChartProps;

export class ScatterChartComponent extends AbstractEChartComponent<ScatterChartProps> {
    protected getCssClass() { return 'open-echarts-scatter'; }
}

export class ScatterChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return ScatterChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 400 }; }
    getPropsReducer(tree: PropertyTree): ScatterChartProps {
        return {
            option:           tree.read("option", {
                xAxis: {}, yAxis: {},
                tooltip: { trigger: 'item' },
                series: [{ type: 'scatter', symbolSize: 10,
                    data: [[10,8],[8,7],[13,8],[9,9],[11,8],[14,10],[6,7],[4,4],[12,11],[7,5]]
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
