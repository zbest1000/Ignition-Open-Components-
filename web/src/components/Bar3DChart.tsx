import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.Bar3DChart";
export type Bar3DChartProps = BaseEChartProps;

export class Bar3DChartComponent extends AbstractEChartComponent<Bar3DChartProps> {
    protected getCssClass() { return 'open-echarts-bar3d'; }
}

export class Bar3DChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return Bar3DChartComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 500 }; }
    getPropsReducer(tree: PropertyTree): Bar3DChartProps {
        return {
            option:           tree.read("option", {
                grid3D: {},
                xAxis3D: { type: 'category', data: ['A','B','C','D','E'] },
                yAxis3D: { type: 'category', data: ['Mon','Tue','Wed','Thu','Fri'] },
                zAxis3D: { type: 'value' },
                series: [{ type: 'bar3D', data: [[0,0,5],[1,0,3],[2,0,7],[3,0,2],[4,0,6],[0,1,4],[1,1,8],[2,1,3],[3,1,5],[4,1,9]] }]
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
