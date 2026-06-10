import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.ScheduleCalendar";

interface ScheduleEntry {
    date: string;
    shift: string;
    crew?: string;
    value?: number;
    color?: string;
}

export interface ScheduleCalendarProps extends BaseEChartProps {
    year?: string;
    entries?: ScheduleEntry[];
    shiftColors?: Record<string, string>;
    title?: string;
    showLegend?: boolean;
}

const DEFAULT_SHIFT_COLORS: Record<string, string> = {
    'Day':      '#5470c6',
    'Night':    '#3ba272',
    'Swing':    '#fac858',
    'Off':      '#e0e0e0',
    'Overtime': '#ee6666',
};

function buildOption(props: ScheduleCalendarProps): object {
    if (props.option && Object.keys(props.option).length > 0) return props.option;

    const year = props.year || new Date().getFullYear().toString();
    const entries = props.entries || [];
    const colors = { ...DEFAULT_SHIFT_COLORS, ...props.shiftColors };

    const shifts = [...new Set(entries.map(e => e.shift))];
    const shiftToIndex: Record<string, number> = {};
    shifts.forEach((s, i) => { shiftToIndex[s] = i; });

    const data = entries.map(e => [e.date, shiftToIndex[e.shift] ?? 0]);

    const pieces = shifts.map((s, i) => ({
        value: i,
        label: s,
        color: colors[s] || '#999',
    }));

    return {
        title: { text: props.title || `Schedule — ${year}`, left: 'center' },
        tooltip: {
            trigger: 'item',
        },
        visualMap: {
            type: 'piecewise',
            orient: 'horizontal',
            left: 'center',
            bottom: 10,
            pieces,
            show: props.showLegend !== false,
        },
        calendar: [{
            top: 80,
            left: 50,
            right: 30,
            cellSize: ['auto', 20],
            range: year,
            yearLabel: { show: true },
            dayLabel: { firstDay: 1 },
            monthLabel: { show: true },
        }],
        series: [{
            type: 'heatmap',
            coordinateSystem: 'calendar',
            calendarIndex: 0,
            data,
        }]
    };
}

export class IndustrialScheduleCalendarComponent extends AbstractEChartComponent<ScheduleCalendarProps> {
    protected getCssClass() { return 'open-industrial-schedule-calendar'; }
}

export class IndustrialScheduleCalendarMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialScheduleCalendarComponent; }
    getDefaultSize(): SizeObject { return { width: 900, height: 250 }; }
    getPropsReducer(tree: PropertyTree): ScheduleCalendarProps {
        const base: ScheduleCalendarProps = {
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
            year:            tree.readString("year", new Date().getFullYear().toString()),
            entries:         tree.read("entries", []),
            shiftColors:     tree.read("shiftColors", {}),
            title:           tree.readString("title", ""),
            showLegend:      tree.readBoolean("showLegend", true),
        };
        base.option = buildOption(base);
        return base;
    }
}
