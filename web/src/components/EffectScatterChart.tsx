import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.EffectScatterChart";

export type EffectScatterChartProps = BaseEChartProps;

export class EffectScatterChartComponent extends AbstractEChartComponent<EffectScatterChartProps> {
    protected getCssClass() { return 'open-echarts-effectscatter'; }
}

export class EffectScatterChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return EffectScatterChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 400 }; }
    getPropsReducer(tree: PropertyTree): EffectScatterChartProps {
        return {
            option:           tree.read("option", {
                xAxis: { scale: true },
                yAxis: { scale: true },
                series: [{
                    type: 'effectScatter',
                    symbolSize: 20,
                    data: [[172, 120], [133, 160], [180, 80], [153, 130], [110, 180]],
                    rippleEffect: { brushType: 'stroke' }
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
