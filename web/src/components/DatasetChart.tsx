import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.DatasetChart";

export type DatasetChartProps = BaseEChartProps;

export class DatasetChartComponent extends AbstractEChartComponent<DatasetChartProps> {
    protected getCssClass() { return 'open-echarts-dataset'; }
}

export class DatasetChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return DatasetChartComponent; }
    getDefaultSize(): SizeObject { return { width: 600, height: 400 }; }
    getPropsReducer(tree: PropertyTree): DatasetChartProps {
        return {
            option:           tree.read("option", {
                dataset: { source: [['Product', 'Sales', 'Profit'], ['A', 120, 50], ['B', 200, 80], ['C', 150, 60]] },
                xAxis: { type: 'category' },
                yAxis: {},
                series: [{ type: 'bar' }, { type: 'bar' }]
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
