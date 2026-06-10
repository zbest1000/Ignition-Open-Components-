import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.Scatter3DChart";
export type Scatter3DChartProps = BaseEChartProps;

export class Scatter3DChartComponent extends AbstractEChartComponent<Scatter3DChartProps> {
    protected getCssClass() { return 'open-echarts-scatter3d'; }
}

export class Scatter3DChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return Scatter3DChartComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 500 }; }
    getPropsReducer(tree: PropertyTree): Scatter3DChartProps {
        return {
            option:           tree.read("option", {
                grid3D: {},
                xAxis3D: {},
                yAxis3D: {},
                zAxis3D: {},
                series: [{ type: 'scatter3D', symbolSize: 5, data: [[1,2,3],[4,5,6],[7,8,9],[2,3,1],[5,6,4],[8,9,7],[3,1,2],[6,4,5],[9,7,8]] }]
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
