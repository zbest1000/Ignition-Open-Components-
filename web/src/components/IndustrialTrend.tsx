import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.Trend";

export type IndustrialTrendProps = BaseEChartProps;

export class IndustrialTrendComponent extends AbstractEChartComponent<IndustrialTrendProps> {
    protected getCssClass() { return 'open-industrial-trend'; }
}

export class IndustrialTrendMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialTrendComponent; }
    getDefaultSize(): SizeObject { return { width: 800, height: 350 }; }
    getPropsReducer(tree: PropertyTree): IndustrialTrendProps {
        return {
            option:           tree.read("option", {
                tooltip: { trigger: 'axis' },
                legend: { data: ['PV', 'SP'], bottom: 0 },
                grid: { top: 40, bottom: 50 },
                xAxis: { type: 'time' },
                yAxis: { type: 'value', name: '°C' },
                dataZoom: [{ type: 'inside' }, { type: 'slider' }],
                series: [
                    { name: 'PV', type: 'line', symbol: 'none', lineStyle: { width: 2 }, data: [] },
                    { name: 'SP', type: 'line', symbol: 'none', lineStyle: { width: 1, type: 'dashed' }, data: [] }
                ]
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
