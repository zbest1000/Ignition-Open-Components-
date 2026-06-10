import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.GlobeChart";
export type GlobeChartProps = BaseEChartProps;

export class GlobeChartComponent extends AbstractEChartComponent<GlobeChartProps> {
    protected getCssClass() { return 'open-echarts-globe'; }
}

export class GlobeChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return GlobeChartComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 600 }; }
    getPropsReducer(tree: PropertyTree): GlobeChartProps {
        return {
            option:           tree.read("option", {
                globe: {
                    baseColor: '#111',
                    shading: 'lambert',
                    light: { ambient: { intensity: 0.6 }, main: { intensity: 0.6 } }
                }
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
