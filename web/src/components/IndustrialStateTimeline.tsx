import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.StateTimeline";

interface TimelineEvent {
    lane: string;
    start: number;
    end: number;
    state: string;
    color?: string;
}

export interface StateTimelineProps extends BaseEChartProps {
    events?: TimelineEvent[];
    stateColors?: Record<string, string>;
    title?: string;
}

const DEFAULT_STATE_COLORS: Record<string, string> = {
    'Running':  '#91cc75',
    'Idle':     '#fac858',
    'Alarm':    '#ee6666',
    'Stopped':  '#999999',
    'Maintenance': '#73c0de',
};

function buildOption(props: StateTimelineProps): object {
    if (props.option && Object.keys(props.option).length > 0) return props.option;

    const events = props.events || [];
    const colors = { ...DEFAULT_STATE_COLORS, ...props.stateColors };
    const lanes = [...new Set(events.map(e => e.lane))];

    const data = events.map(e => ({
        name: e.state,
        value: [lanes.indexOf(e.lane), e.start, e.end, e.state],
        itemStyle: { color: e.color || colors[e.state] || '#5470c6' }
    }));

    return {
        title: { text: props.title || 'State Timeline', left: 'center' },
        tooltip: {
            trigger: 'item',
        },
        grid: { top: 60, bottom: 40, left: 120, right: 40 },
        xAxis: { type: 'time', position: 'top' },
        yAxis: { type: 'category', data: lanes, inverse: true },
        series: [{
            type: 'custom',
            encode: { x: [1, 2], y: 0 },
            data
        }]
    };
}

export class IndustrialStateTimelineComponent extends AbstractEChartComponent<StateTimelineProps> {
    protected getCssClass() { return 'open-industrial-state-timeline'; }
}

export class IndustrialStateTimelineMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialStateTimelineComponent; }
    getDefaultSize(): SizeObject { return { width: 900, height: 300 }; }
    getPropsReducer(tree: PropertyTree): StateTimelineProps {
        const now = Date.now();
        const base: StateTimelineProps = {
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
            events:          tree.read("events", [
                { lane: 'Reactor A', start: now - 7200000, end: now - 5400000, state: 'Running' },
                { lane: 'Reactor A', start: now - 5400000, end: now - 3600000, state: 'Alarm' },
                { lane: 'Reactor A', start: now - 3600000, end: now, state: 'Running' },
                { lane: 'Pump B', start: now - 7200000, end: now - 6000000, state: 'Running' },
                { lane: 'Pump B', start: now - 6000000, end: now - 4800000, state: 'Maintenance' },
                { lane: 'Pump B', start: now - 4800000, end: now, state: 'Running' },
                { lane: 'Conveyor C', start: now - 7200000, end: now - 1800000, state: 'Running' },
                { lane: 'Conveyor C', start: now - 1800000, end: now, state: 'Idle' },
            ]),
            stateColors:     tree.read("stateColors", {}),
            title:           tree.readString("title", ""),
        };
        base.option = buildOption(base);
        return base;
    }
}
