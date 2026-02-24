import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.MapChart";

export type MapChartProps = BaseEChartProps;

export class MapChartComponent extends AbstractEChartComponent<MapChartProps> {
    protected getCssClass() { return 'open-echarts-map'; }
}

export class MapChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return MapChartComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 500 }; }
    getPropsReducer(tree: PropertyTree): MapChartProps {
        return {
            option:           tree.read("option", {
                title: { text: 'Map Chart', subtext: 'Register GeoJSON via echarts.registerMap() before use', left: 'center' },
                tooltip: { trigger: 'item' },
                series: []
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
