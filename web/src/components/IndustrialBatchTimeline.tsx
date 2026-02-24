import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
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
    'Charge':     '#5470c6',
    'Heat':       '#ee6666',
    'React':      '#fac858',
    'Cool':       '#73c0de',
    'Transfer':   '#91cc75',
    'CIP':        '#999999',
    'Hold':       '#9a60b4',
};

function buildOption(props: BatchTimelineProps): object {
    if (props.option && Object.keys(props.option).length > 0) return props.option;

    const phases = props.phases || [];
    const colors = { ...DEFAULT_PHASE_COLORS, ...props.phaseColors };
    const batches = [...new Set(phases.map(p => p.batch))];

    const data = phases.map(p => ({
        name: p.phase,
        value: [batches.indexOf(p.batch), p.start, p.end, p.phase, p.status || 'Complete'],
        itemStyle: { color: colors[p.phase] || '#5470c6' }
    }));

    const uniquePhases = [...new Set(phases.map(p => p.phase))];

    return {
        title: { text: props.title || 'Batch Timeline', left: 'center' },
        tooltip: { trigger: 'item' },
        legend: { data: uniquePhases, bottom: 0 },
        grid: { top: 60, bottom: 60, left: 120, right: 40 },
        xAxis: { type: 'time', position: 'top' },
        yAxis: { type: 'category', data: batches, inverse: true },
        dataZoom: [{ type: 'inside' }],
        series: [{
            type: 'custom',
            encode: { x: [1, 2], y: 0 },
            data,
        }]
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
        const now = Date.now();
        const hr = 3600000;
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
            phases:          tree.read("phases", [
                { batch: 'Batch-001', phase: 'Charge',   start: now - 10*hr, end: now - 9*hr },
                { batch: 'Batch-001', phase: 'Heat',     start: now - 9*hr,  end: now - 7*hr },
                { batch: 'Batch-001', phase: 'React',    start: now - 7*hr,  end: now - 4*hr },
                { batch: 'Batch-001', phase: 'Cool',     start: now - 4*hr,  end: now - 3*hr },
                { batch: 'Batch-001', phase: 'Transfer', start: now - 3*hr,  end: now - 2.5*hr },
                { batch: 'Batch-002', phase: 'Charge',   start: now - 6*hr,  end: now - 5*hr },
                { batch: 'Batch-002', phase: 'Heat',     start: now - 5*hr,  end: now - 3*hr },
                { batch: 'Batch-002', phase: 'React',    start: now - 3*hr,  end: now },
            ]),
            phaseColors:     tree.read("phaseColors", {}),
            title:           tree.readString("title", ""),
        };
        base.option = buildOption(base);
        return base;
    }
}
