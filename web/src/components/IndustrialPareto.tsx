import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.Pareto";

export interface ParetoProps extends BaseEChartProps {
    categories?: string[];
    counts?: number[];
    showCumulativeLine?: boolean;
    show80PercentLine?: boolean;
    barLabel?: string;
    lineLabel?: string;
}

function buildOption(props: ParetoProps): object {
    if (props.option && Object.keys(props.option).length > 0) return props.option;

    const categories = props.categories || ['Mechanical', 'Electrical', 'Operator', 'Material', 'Other'];
    const counts = props.counts || [42, 28, 18, 12, 5];
    const barLabel = props.barLabel || 'Count';
    const lineLabel = props.lineLabel || 'Cumulative %';

    const total = counts.reduce((a, b) => a + b, 0);
    const cumulative: number[] = [];
    let running = 0;
    for (const c of counts) {
        running += c;
        cumulative.push(total > 0 ? Math.round(running / total * 100) : 0);
    }

    const series: any[] = [
        { name: barLabel, type: 'bar', data: counts }
    ];

    if (props.showCumulativeLine !== false) {
        const lineSeries: any = { name: lineLabel, type: 'line', yAxisIndex: 1, data: cumulative };
        if (props.show80PercentLine !== false) {
            lineSeries.markLine = { data: [{ yAxis: 80, label: { formatter: '80%' } }] };
        }
        series.push(lineSeries);
    }

    return {
        tooltip: { trigger: 'axis' },
        legend: { data: series.map(s => s.name), bottom: 0 },
        grid: { top: 40, bottom: 50 },
        xAxis: { type: 'category', data: categories },
        yAxis: [
            { type: 'value', name: barLabel },
            ...(props.showCumulativeLine !== false
                ? [{ type: 'value', name: '%', max: 100, axisLabel: { formatter: '{value}%' } }]
                : [])
        ],
        series
    };
}

export class IndustrialParetoComponent extends AbstractEChartComponent<ParetoProps> {
    protected getCssClass() { return 'open-industrial-pareto'; }
}

export class IndustrialParetoMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialParetoComponent; }
    getDefaultSize(): SizeObject { return { width: 700, height: 400 }; }
    getPropsReducer(tree: PropertyTree): ParetoProps {
        const base: ParetoProps = {
            option:              tree.read("option", {}),
            theme:               tree.readString("theme", ""),
            renderer:            tree.readString("renderer", "canvas") as 'canvas' | 'svg',
            autoResize:          tree.readBoolean("autoResize", true),
            resizeDebounceMs:    tree.readNumber("resizeDebounceMs", 150),
            notMerge:            tree.readBoolean("notMerge", false),
            lazyUpdate:          tree.readBoolean("lazyUpdate", true),
            showLoading:         tree.readBoolean("showLoading", false),
            loadingOptions:      tree.read("loadingOptions", {}),
            sanitizeTooltip:     tree.readBoolean("sanitizeTooltip", true),
            categories:          tree.read("categories", ['Mechanical', 'Electrical', 'Operator', 'Material', 'Other']),
            counts:              tree.read("counts", [42, 28, 18, 12, 5]),
            showCumulativeLine:  tree.readBoolean("showCumulativeLine", true),
            show80PercentLine:   tree.readBoolean("show80PercentLine", true),
            barLabel:            tree.readString("barLabel", "Count"),
            lineLabel:           tree.readString("lineLabel", "Cumulative %"),
        };
        base.option = buildOption(base);
        return base;
    }
}
