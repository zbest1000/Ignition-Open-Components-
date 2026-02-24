import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.CustomChart";

export type CustomChartProps = BaseEChartProps;

export class CustomChartComponent extends AbstractEChartComponent<CustomChartProps> {
    protected getCssClass() { return 'open-echarts-custom'; }
}

export class CustomChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return CustomChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 400 }; }
    getPropsReducer(tree: PropertyTree): CustomChartProps {
        return {
            option:           tree.read("option", {
                title: { text: 'Custom Chart', subtext: 'Set sanitizeTooltip=false to use renderItem functions', left: 'center' },
                tooltip: {},
                xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E'] },
                yAxis: { type: 'value' },
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
