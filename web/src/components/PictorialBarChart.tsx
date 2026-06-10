import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.PictorialBarChart";

export type PictorialBarChartProps = BaseEChartProps;

export class PictorialBarChartComponent extends AbstractEChartComponent<PictorialBarChartProps> {
    protected getCssClass() { return 'open-echarts-pictorialbar'; }
}

export class PictorialBarChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return PictorialBarChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 400 }; }
    getPropsReducer(tree: PropertyTree): PictorialBarChartProps {
        return {
            option:           tree.read("option", {
                xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E'] },
                yAxis: { type: 'value' },
                series: [{ type: 'pictorialBar', symbol: 'roundRect', data: [120, 200, 150, 80, 70] }]
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
