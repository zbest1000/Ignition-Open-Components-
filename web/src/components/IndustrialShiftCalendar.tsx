import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.ShiftCalendar";

interface ShiftPattern {
    name: string;
    color: string;
    days: number[];
}

interface CrewAssignment {
    crew: string;
    pattern: string;
    startDate: string;
    rotationDays?: number;
}

export interface ShiftCalendarProps extends BaseEChartProps {
    patterns?: ShiftPattern[];
    crews?: CrewAssignment[];
    dateRange?: [string, string];
    title?: string;
}

function buildOption(props: ShiftCalendarProps): object {
    if (props.option && Object.keys(props.option).length > 0) return props.option;

    const patterns = props.patterns || [
        { name: 'Day', color: '#5470c6', days: [1, 2, 3, 4, 5] },
        { name: 'Night', color: '#3ba272', days: [1, 2, 3, 4, 5] },
        { name: 'Off', color: '#e0e0e0', days: [0, 6] },
    ];
    const crews = props.crews || [
        { crew: 'Crew A', pattern: 'Day', startDate: '2025-01-01' },
        { crew: 'Crew B', pattern: 'Night', startDate: '2025-01-01' },
    ];

    const crewNames = crews.map(c => c.crew);
    const range = props.dateRange || ['2025-01-01', '2025-01-31'];

    const patternMap: Record<string, ShiftPattern> = {};
    patterns.forEach(p => { patternMap[p.name] = p; });

    const data: any[] = [];
    const start = new Date(range[0]);
    const end = new Date(range[1]);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay();
        const dateStr = d.toISOString().slice(0, 10);
        crews.forEach((c, ci) => {
            const pat = patternMap[c.pattern];
            if (pat && pat.days.includes(dayOfWeek)) {
                data.push([dateStr, ci, pat.name]);
            }
        });
    }

    const pieces = patterns.map((p, i) => ({
        value: i, label: p.name, color: p.color,
    }));

    const heatData = data.map(d => {
        const pIdx = patterns.findIndex(p => p.name === d[2]);
        return [d[0], d[1], pIdx >= 0 ? pIdx : 0];
    });

    return {
        title: { text: props.title || 'Shift Calendar', left: 'center' },
        tooltip: { trigger: 'item' },
        grid: { top: 60, bottom: 60, left: 100, right: 40 },
        xAxis: { type: 'category', data: (() => {
            const dates: string[] = [];
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                dates.push(d.toISOString().slice(0, 10));
            }
            return dates;
        })(), axisLabel: { rotate: 45, fontSize: 9 } },
        yAxis: { type: 'category', data: crewNames },
        visualMap: { type: 'piecewise', pieces, orient: 'horizontal', left: 'center', bottom: 10 },
        series: [{ type: 'heatmap', data: heatData, label: { show: false } }],
    };
}

export class IndustrialShiftCalendarComponent extends AbstractEChartComponent<ShiftCalendarProps> {
    protected getCssClass() { return 'open-industrial-shift-calendar'; }
}

export class IndustrialShiftCalendarMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialShiftCalendarComponent; }
    getDefaultSize(): SizeObject { return { width: 900, height: 300 }; }
    getPropsReducer(tree: PropertyTree): ShiftCalendarProps {
        const base: ShiftCalendarProps = {
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
            patterns:        tree.read("patterns", []),
            crews:           tree.read("crews", []),
            dateRange:       tree.read("dateRange", ['2025-01-01', '2025-01-31']),
            title:           tree.readString("title", ""),
        };
        base.option = buildOption(base);
        return base;
    }
}
