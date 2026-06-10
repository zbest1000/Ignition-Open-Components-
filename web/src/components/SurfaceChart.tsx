import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.SurfaceChart";
export type SurfaceChartProps = BaseEChartProps;

export class SurfaceChartComponent extends AbstractEChartComponent<SurfaceChartProps> {
    protected getCssClass() { return 'open-echarts-surface'; }
}

export class SurfaceChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return SurfaceChartComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 500 }; }
    getPropsReducer(tree: PropertyTree): SurfaceChartProps {
        return {
            option:           tree.read("option", {
                grid3D: {},
                xAxis3D: {},
                yAxis3D: {},
                zAxis3D: {},
                series: [{ type: 'surface', wireframe: { show: true } }]
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
