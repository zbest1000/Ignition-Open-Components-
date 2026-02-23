import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.ParallelChart";

export type ParallelChartProps = BaseEChartProps;

export class ParallelChartComponent extends AbstractEChartComponent<ParallelChartProps> {
    protected getCssClass() { return 'open-echarts-parallel'; }
}

export class ParallelChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return ParallelChartComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 400 }; }
    getPropsReducer(tree: PropertyTree): ParallelChartProps {
        return {
            option:           tree.read("option", {
                parallelAxis: [
                    { dim: 0, name: 'name' },
                    { dim: 1, name: 'dim0' },
                    { dim: 2, name: 'dim1' },
                    { dim: 3, name: 'dim2' }
                ],
                series: [{ type: 'parallel', data: [['A', 1, 2, 3], ['B', 2, 3, 4], ['C', 3, 4, 5], ['D', 4, 5, 6], ['E', 5, 6, 7]] }]
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
