import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.ThemeRiverChart";

export type ThemeRiverChartProps = BaseEChartProps;

export class ThemeRiverChartComponent extends AbstractEChartComponent<ThemeRiverChartProps> {
    protected getCssClass() { return 'open-echarts-themeriver'; }
}

export class ThemeRiverChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return ThemeRiverChartComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 400 }; }
    getPropsReducer(tree: PropertyTree): ThemeRiverChartProps {
        return {
            option:           tree.read("option", {
                singleAxis: { type: 'time' },
                series: [{ type: 'themeRiver', data: [['2024-01-01', 10, 'A'], ['2024-01-02', 15, 'A'], ['2024-01-03', 20, 'A'], ['2024-01-01', 5, 'B'], ['2024-01-02', 8, 'B'], ['2024-01-03', 12, 'B'], ['2024-01-01', 3, 'C'], ['2024-01-02', 7, 'C'], ['2024-01-03', 9, 'C']] }]
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
