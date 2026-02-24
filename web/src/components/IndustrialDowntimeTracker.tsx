import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.DowntimeTracker";

interface DowntimeEvent {
    equipment: string;
    start: number;
    end: number;
    category: string;
    reason?: string;
}

export interface DowntimeTrackerProps extends BaseEChartProps {
    events?: DowntimeEvent[];
    categoryColors?: Record<string, string>;
    title?: string;
    showSummary?: boolean;
}

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
    'Mechanical':  '#ee6666',
    'Electrical':  '#fac858',
    'Operator':    '#73c0de',
    'Changeover':  '#5470c6',
    'Material':    '#91cc75',
    'Planned':     '#999999',
};

function buildOption(props: DowntimeTrackerProps): object {
    if (props.option && Object.keys(props.option).length > 0) return props.option;

    const events = props.events || [];
    const colors = { ...DEFAULT_CATEGORY_COLORS, ...props.categoryColors };
    const equipment = [...new Set(events.map(e => e.equipment))];
    const categories = [...new Set(events.map(e => e.category))];

    const allSeries: any[] = categories.map(cat => {
        const durations = equipment.map(eq => {
            const evts = events.filter(e => e.equipment === eq && e.category === cat);
            return evts.reduce((sum, e) => sum + Math.round((e.end - e.start) / 60000), 0);
        });
        return {
            name: cat,
            type: 'bar',
            stack: 'downtime',
            data: durations,
            itemStyle: { color: colors[cat] || '#5470c6' },
        };
    });

    return {
        title: { text: props.title || 'Downtime Tracker', left: 'center' },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: categories, bottom: 0 },
        grid: { top: 60, bottom: 60, left: 140, right: 40 },
        xAxis: { type: 'value', name: 'Minutes' },
        yAxis: { type: 'category', data: equipment },
        dataZoom: [{ type: 'inside' }],
        series: allSeries,
    };
}

export class IndustrialDowntimeTrackerComponent extends AbstractEChartComponent<DowntimeTrackerProps> {
    protected getCssClass() { return 'open-industrial-downtime'; }
}

export class IndustrialDowntimeTrackerMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialDowntimeTrackerComponent; }
    getDefaultSize(): SizeObject { return { width: 900, height: 350 }; }
    getPropsReducer(tree: PropertyTree): DowntimeTrackerProps {
        const now = Date.now();
        const base: DowntimeTrackerProps = {
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
                { equipment: 'Line 1', start: now - 7200000, end: now - 5400000, category: 'Mechanical', reason: 'Belt failure' },
                { equipment: 'Line 1', start: now - 3600000, end: now - 2700000, category: 'Changeover', reason: 'Product A to B' },
                { equipment: 'Line 2', start: now - 6000000, end: now - 4200000, category: 'Electrical', reason: 'Drive fault' },
                { equipment: 'Line 3', start: now - 5400000, end: now - 5100000, category: 'Operator', reason: 'Wrong setup' },
            ]),
            categoryColors:  tree.read("categoryColors", {}),
            title:           tree.readString("title", ""),
            showSummary:     tree.readBoolean("showSummary", true),
        };
        base.option = buildOption(base);
        return base;
    }
}
