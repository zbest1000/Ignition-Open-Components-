import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.CandlestickChart";

export type CandlestickChartProps = BaseEChartProps;

export class CandlestickChartComponent extends AbstractEChartComponent<CandlestickChartProps> {
    protected getCssClass() { return 'open-echarts-candlestick'; }
}

export class CandlestickChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return CandlestickChartComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 400 }; }
    getPropsReducer(tree: PropertyTree): CandlestickChartProps {
        return {
            option:           tree.read("option", {
                xAxis: { type: 'category', data: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05'] },
                yAxis: { type: 'value' },
                series: [{ type: 'candlestick', data: [[20, 34, 10, 38], [40, 35, 30, 50], [31, 38, 33, 44], [38, 15, 5, 42], [20, 30, 12, 36]] }]
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
