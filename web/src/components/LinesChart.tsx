import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.LinesChart";

export type LinesChartProps = BaseEChartProps;

export class LinesChartComponent extends AbstractEChartComponent<LinesChartProps> {
    protected getCssClass() { return 'open-echarts-lines'; }
}

export class LinesChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return LinesChartComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 500 }; }
    getPropsReducer(tree: PropertyTree): LinesChartProps {
        return {
            option:           tree.read("option", {
                title: { text: 'Lines Chart', subtext: 'Requires geo coordinate system with registered map', left: 'center' },
                tooltip: { trigger: 'item' },
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
