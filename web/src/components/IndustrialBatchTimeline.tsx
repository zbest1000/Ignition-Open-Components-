import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.BatchTimeline";

interface BatchPhase {
    batch: string;
    phase: string;
    start: number;
    end: number;
    status?: string;
}

export interface BatchTimelineProps extends BaseEChartProps {
    phases?: BatchPhase[];
    phaseColors?: Record<string, string>;
    title?: string;
}

const DEFAULT_PHASE_COLORS: Record<string, string> = {
    'Charge':   '#5470c6',
    'Heat':     '#ee6666',
    'React':    '#fac858',
    'Cool':     '#73c0de',
    'Transfer': '#91cc75',
    'CIP':      '#999999',
    'Hold':     '#9a60b4',
};

function buildOption(props: BatchTimelineProps): object {
    if (props.option && Object.keys(props.option).length > 0) return props.option;

    const phases = props.phases || [];
    const colors = { ...DEFAULT_PHASE_COLORS, ...props.phaseColors };
    const batches = [...new Set(phases.map(p => p.batch))];
    const phaseTypes = [...new Set(phases.map(p => p.phase))];

    const allSeries: any[] = phaseTypes.map(pt => {
        const durations = batches.map(batch => {
            const matching = phases.filter(p => p.batch === batch && p.phase === pt);
            return matching.reduce((sum, p) => sum + Math.round((p.end - p.start) / 60000), 0);
        });
        return {
            name: pt,
            type: 'bar',
            stack: 'batch',
            data: durations,
            itemStyle: { color: colors[pt] || '#5470c6' },
        };
    });

    return {
        title: { text: props.title || 'Batch Timeline', left: 'center' },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: phaseTypes, bottom: 0 },
        grid: { top: 60, bottom: 60, left: 120, right: 40 },
        xAxis: { type: 'value', name: 'Minutes' },
        yAxis: { type: 'category', data: batches, inverse: true },
        dataZoom: [{ type: 'inside' }],
        series: allSeries,
    };
}

export class IndustrialBatchTimelineComponent extends AbstractEChartComponent<BatchTimelineProps> {
    protected getCssClass() { return 'open-industrial-batch-timeline'; }
}

export class IndustrialBatchTimelineMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialBatchTimelineComponent; }
    getDefaultSize(): SizeObject { return { width: 900, height: 350 }; }
    getPropsReducer(tree: PropertyTree): BatchTimelineProps {
        const base: BatchTimelineProps = {
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
            phases:          tree.read("phases", []),
            phaseColors:     tree.read("phaseColors", {}),
            title:           tree.readString("title", ""),
        };
        base.option = buildOption(base);
        return base;
    }
}
