import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.Gantt";

interface GanttTask {
    name: string;
    start: number;
    end: number;
    progress?: number;
    category?: string;
    color?: string;
    milestone?: boolean;
}

interface GanttDependency {
    from: string;
    to: string;
}

export interface GanttProps extends BaseEChartProps {
    tasks?: GanttTask[];
    dependencies?: GanttDependency[];
    title?: string;
    showProgress?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
    'Planning':    '#5470c6',
    'Execution':   '#91cc75',
    'Review':      '#fac858',
    'Maintenance': '#73c0de',
};

function buildOption(props: GanttProps): object {
    if (props.option && Object.keys(props.option).length > 0) return props.option;

    const tasks = props.tasks || [];
    const taskNames = tasks.map(t => t.name);

    const data = tasks.map((t, _i) => ({
        name: t.name,
        value: [taskNames.indexOf(t.name), t.start, t.end, t.progress ?? 100],
        itemStyle: {
            color: t.color || CATEGORY_COLORS[t.category || ''] || '#5470c6',
            opacity: t.milestone ? 1 : 0.85,
        },
    }));

    const milestoneData = tasks
        .filter(t => t.milestone)
        .map(t => ({
            coord: [t.start, taskNames.indexOf(t.name)],
            symbol: 'diamond',
            symbolSize: 14,
            itemStyle: { color: '#ee6666' },
        }));

    return {
        title: { text: props.title || 'Gantt Chart', left: 'center' },
        tooltip: { trigger: 'item' },
        grid: { top: 60, bottom: 40, left: 160, right: 40 },
        xAxis: { type: 'time', position: 'top' },
        yAxis: { type: 'category', data: taskNames, inverse: true },
        dataZoom: [{ type: 'inside' }, { type: 'slider' }],
        series: [{
            type: 'custom',
            encode: { x: [1, 2], y: 0 },
            data,
            markPoint: milestoneData.length > 0 ? { data: milestoneData } : undefined,
        }]
    };
}

export class IndustrialGanttComponent extends AbstractEChartComponent<GanttProps> {
    protected getCssClass() { return 'open-industrial-gantt'; }
}

export class IndustrialGanttMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialGanttComponent; }
    getDefaultSize(): SizeObject { return { width: 900, height: 400 }; }
    getPropsReducer(tree: PropertyTree): GanttProps {
        const now = Date.now();
        const day = 86400000;
        const base: GanttProps = {
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
            tasks:           tree.read("tasks", [
                { name: 'Requirements',  start: now, end: now + 3 * day, category: 'Planning' },
                { name: 'Design',        start: now + 2 * day, end: now + 5 * day, category: 'Planning' },
                { name: 'Fabrication',   start: now + 5 * day, end: now + 12 * day, category: 'Execution' },
                { name: 'Assembly',      start: now + 10 * day, end: now + 15 * day, category: 'Execution' },
                { name: 'Testing',       start: now + 15 * day, end: now + 18 * day, category: 'Review' },
                { name: 'Commissioning', start: now + 18 * day, end: now + 18 * day, category: 'Review', milestone: true },
            ]),
            dependencies:    tree.read("dependencies", []),
            title:           tree.readString("title", ""),
            showProgress:    tree.readBoolean("showProgress", true),
        };
        base.option = buildOption(base);
        return base;
    }
}
