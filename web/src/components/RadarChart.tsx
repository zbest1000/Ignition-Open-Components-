import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.RadarChart";

export type RadarChartProps = BaseEChartProps;

export class RadarChartComponent extends AbstractEChartComponent<RadarChartProps> {
    protected getCssClass() { return 'open-echarts-radar'; }
}

export class RadarChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return RadarChartComponent; }
    getDefaultSize(): SizeObject { return { width: 500, height: 450 }; }
    getPropsReducer(tree: PropertyTree): RadarChartProps {
        return {
            option:           tree.read("option", {
                radar: { indicator: [
                    { name: 'Sales', max: 6500 }, { name: 'Admin', max: 16000 },
                    { name: 'IT', max: 30000 }, { name: 'Support', max: 38000 },
                    { name: 'Dev', max: 52000 }, { name: 'Marketing', max: 25000 }
                ]},
                series: [{ type: 'radar',
                    data: [{ value: [4200, 3000, 20000, 35000, 50000, 18000], name: 'Budget' }]
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
