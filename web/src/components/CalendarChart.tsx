import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.CalendarChart";

export type CalendarChartProps = BaseEChartProps;

export class CalendarChartComponent extends AbstractEChartComponent<CalendarChartProps> {
    protected getCssClass() { return 'open-echarts-calendar'; }
}

export class CalendarChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return CalendarChartComponent; }
    getDefaultSize(): SizeObject { return { width: 800, height: 200 }; }
    getPropsReducer(tree: PropertyTree): CalendarChartProps {
        return {
            option:           tree.read("option", {
                calendar: { range: '2024' },
                visualMap: { min: 0, max: 1000 },
                series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: [] }]
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
