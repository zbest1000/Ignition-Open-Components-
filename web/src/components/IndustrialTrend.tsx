import * as React from 'react';
import {
    ComponentMeta, ComponentProps, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.Trend";

interface TrendLimits {
    hiAlarm?: number;
    hiWarning?: number;
    loWarning?: number;
    loAlarm?: number;
}

interface TrendData {
    pvData?: any[];
    spData?: any[];
    timeField?: string;
    valueField?: string;
}

export interface IndustrialTrendProps extends BaseEChartProps {
    data?: TrendData;
    limits?: TrendLimits;
    yAxisLabel?: string;
    showSetpoint?: boolean;
    showDataZoom?: boolean;
}

function buildMarkLines(limits: TrendLimits): any[] {
    const lines: any[] = [];
    if (limits.hiAlarm != null)
        lines.push({ yAxis: limits.hiAlarm, lineStyle: { color: '#ee6666', type: 'solid', width: 2 }, label: { formatter: 'Hi Alarm' } });
    if (limits.hiWarning != null)
        lines.push({ yAxis: limits.hiWarning, lineStyle: { color: '#fac858', type: 'dashed' }, label: { formatter: 'Hi Warn' } });
    if (limits.loWarning != null)
        lines.push({ yAxis: limits.loWarning, lineStyle: { color: '#fac858', type: 'dashed' }, label: { formatter: 'Lo Warn' } });
    if (limits.loAlarm != null)
        lines.push({ yAxis: limits.loAlarm, lineStyle: { color: '#ee6666', type: 'solid', width: 2 }, label: { formatter: 'Lo Alarm' } });
    return lines;
}

function buildOption(props: IndustrialTrendProps): object {
    if (props.option && Object.keys(props.option).length > 0) return props.option;

    const data = props.data || {};
    const pvData = data.pvData || [];
    const spData = data.spData || [];
    const limits = props.limits || {};
    const markLines = buildMarkLines(limits);

    const series: any[] = [
        { name: 'PV', type: 'line', symbol: 'none', lineStyle: { width: 2 }, data: pvData }
    ];

    if (props.showSetpoint !== false && spData.length > 0) {
        series.push({ name: 'SP', type: 'line', symbol: 'none', lineStyle: { width: 1, type: 'dashed' }, data: spData });
    }

    if (markLines.length > 0) {
        series[0].markLine = { silent: true, symbol: 'none', data: markLines };
    }

    return {
        tooltip: { trigger: 'axis' },
        legend: { data: series.map(s => s.name), bottom: 0 },
        grid: { top: 40, bottom: 50 },
        xAxis: { type: 'time' },
        yAxis: { type: 'value', name: props.yAxisLabel || '' },
        dataZoom: props.showDataZoom !== false ? [{ type: 'inside' }, { type: 'slider' }] : [],
        series
    };
}

export class IndustrialTrendComponent extends AbstractEChartComponent<IndustrialTrendProps> {
    protected getCssClass() { return 'open-industrial-trend'; }

    componentDidUpdate(prevProps: ComponentProps<IndustrialTrendProps>) {
        const curr = this.props.props;
        const built = { ...curr, option: buildOption(curr) };
        const prev = prevProps.props;
        const prevBuilt = { ...prev, option: buildOption(prev) };

        if (JSON.stringify(built.option) !== JSON.stringify(prevBuilt.option) ||
            curr.theme !== prev.theme || curr.renderer !== prev.renderer) {
            (this.props as any).props = built;
        }
        super.componentDidUpdate(prevProps);
    }
}

export class IndustrialTrendMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialTrendComponent; }
    getDefaultSize(): SizeObject { return { width: 800, height: 350 }; }
    getPropsReducer(tree: PropertyTree): IndustrialTrendProps {
        const base: IndustrialTrendProps = {
            option:           tree.read("option", {}),
            theme:            tree.readString("theme", ""),
            renderer:         tree.readString("renderer", "canvas") as 'canvas' | 'svg',
            autoResize:       tree.readBoolean("autoResize", true),
            resizeDebounceMs: tree.readNumber("resizeDebounceMs", 150),
            notMerge:         tree.readBoolean("notMerge", false),
            lazyUpdate:       tree.readBoolean("lazyUpdate", true),
            showLoading:      tree.readBoolean("showLoading", false),
            loadingOptions:   tree.read("loadingOptions", {}),
            sanitizeTooltip:  tree.readBoolean("sanitizeTooltip", true),
            data:             tree.read("data", {}),
            limits:           tree.read("limits", {}),
            yAxisLabel:       tree.readString("yAxisLabel", ""),
            showSetpoint:     tree.readBoolean("showSetpoint", true),
            showDataZoom:     tree.readBoolean("showDataZoom", true),
        };
        base.option = buildOption(base);
        return base;
    }
}
