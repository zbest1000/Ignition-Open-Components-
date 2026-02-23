import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.Line3DChart";
export type Line3DChartProps = BaseEChartProps;

export class Line3DChartComponent extends AbstractEChartComponent<Line3DChartProps> {
    protected getCssClass() { return 'open-echarts-line3d'; }
}

export class Line3DChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return Line3DChartComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 500 }; }
    getPropsReducer(tree: PropertyTree): Line3DChartProps {
        return {
            option:           tree.read("option", {
                grid3D: {},
                xAxis3D: {},
                yAxis3D: {},
                zAxis3D: {},
                series: [{ type: 'line3D', data: [[0,0,0],[1,1,1],[2,4,2],[3,2,3],[4,3,5],[5,5,4]] }]
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
