import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.ResourceHeatmap";

export interface ResourceHeatmapProps extends BaseEChartProps {
    resources?: string[];
    timeSlots?: string[];
    utilization?: number[][];
    title?: string;
    maxValue?: number;
}

function buildOption(props: ResourceHeatmapProps): object {
    if (props.option && Object.keys(props.option).length > 0) return props.option;

    const resources = props.resources || ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
    const timeSlots = props.timeSlots || [
        '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    ];
    const utilization = props.utilization || [];
    const maxVal = props.maxValue || 100;

    const data: [number, number, number][] = [];
    if (utilization.length > 0) {
        for (let r = 0; r < utilization.length; r++) {
            for (let t = 0; t < (utilization[r]?.length || 0); t++) {
                data.push([t, r, utilization[r][t]]);
            }
        }
    } else {
        for (let r = 0; r < resources.length; r++) {
            for (let t = 0; t < timeSlots.length; t++) {
                data.push([t, r, Math.round(40 + Math.random() * 55)]);
            }
        }
    }

    return {
        title: { text: props.title || 'Resource Utilization', left: 'center' },
        tooltip: { position: 'top' },
        grid: { top: 60, bottom: 60, left: 100, right: 80 },
        xAxis: { type: 'category', data: timeSlots, splitArea: { show: true } },
        yAxis: { type: 'category', data: resources, splitArea: { show: true } },
        visualMap: {
            min: 0, max: maxVal, calculable: true,
            orient: 'vertical', right: 10, top: 'center',
            inRange: {
                color: ['#91cc75', '#fac858', '#ee6666']
            },
            text: [`${maxVal}%`, '0%'],
        },
        series: [{
            type: 'heatmap',
            data,
            label: { show: true, formatter: (p: any) => p.value[2] + '%' },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
        }]
    };
}

export class IndustrialResourceHeatmapComponent extends AbstractEChartComponent<ResourceHeatmapProps> {
    protected getCssClass() { return 'open-industrial-resource-heatmap'; }
}

export class IndustrialResourceHeatmapMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialResourceHeatmapComponent; }
    getDefaultSize(): SizeObject { return { width: 800, height: 400 }; }
    getPropsReducer(tree: PropertyTree): ResourceHeatmapProps {
        const base: ResourceHeatmapProps = {
            option:          tree.read("option", {}),
            theme:           tree.readString("theme", ""),
            renderer:        tree.readString("renderer", "canvas") as 'canvas' | 'svg',
            autoResize:      tree.readBoolean("autoResize", true),
            resizeDebounceMs: tree.readNumber("resizeDebounceMs", 150),
            notMerge:        tree.readBoolean("notMerge", false),
            lazyUpdate:      tree.readBoolean("lazyUpdate", true),
            showLoading:     tree.readBoolean("showLoading", false),
            loadingOptions:  tree.read("loadingOptions", {}),
            sanitizeTooltip: tree.readBoolean("sanitizeTooltip", true),
            resources:       tree.read("resources", ['Line 1', 'Line 2', 'Line 3', 'Line 4']),
            timeSlots:       tree.read("timeSlots", ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']),
            utilization:     tree.read("utilization", []),
            title:           tree.readString("title", ""),
            maxValue:        tree.readNumber("maxValue", 100),
        };
        base.option = buildOption(base);
        return base;
    }
}
