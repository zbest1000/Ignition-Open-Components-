import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.StatChart";

export type StatChartProps = BaseEChartProps;

export class StatChartComponent extends AbstractEChartComponent<StatChartProps> {
    protected getCssClass() { return 'open-echarts-stat'; }
}

export class StatChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return StatChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 400 }; }
    getPropsReducer(tree: PropertyTree): StatChartProps {
        return {
            option:           tree.read("option", {
                xAxis: { type: 'category', data: ['A', 'B', 'C'] },
                yAxis: { type: 'value' },
                series: [{ type: 'boxplot', data: [
                    [655,850,940,980,1070], [760,800,845,885,960], [780,840,855,880,940]
                ]}]
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
