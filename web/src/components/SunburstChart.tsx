import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.echarts.SunburstChart";

export type SunburstChartProps = BaseEChartProps;

export class SunburstChartComponent extends AbstractEChartComponent<SunburstChartProps> {
    protected getCssClass() { return 'open-echarts-sunburst'; }
}

export class SunburstChartMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return SunburstChartComponent; }
    getDefaultSize(): SizeObject { return { width: 500, height: 500 }; }
    getPropsReducer(tree: PropertyTree): SunburstChartProps {
        return {
            option:           tree.read("option", {
                series: [{
                    type: 'sunburst',
                    radius: [0, '90%'],
                    data: [{
                        name: 'Root',
                        value: 100,
                        children: [
                            { name: 'A', value: 40, children: [{ name: 'A1', value: 20 }, { name: 'A2', value: 20 }] },
                            { name: 'B', value: 35, children: [{ name: 'B1', value: 15 }, { name: 'B2', value: 20 }] },
                            { name: 'C', value: 25 }
                        ]
                    }]
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
