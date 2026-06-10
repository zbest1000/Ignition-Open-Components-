import {
    ComponentMeta, PComponent, PropertyTree
} from '@inductiveautomation/perspective-client';
import { SizeObject } from '@inductiveautomation/perspective-common';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.OEE";

export interface OEEProps extends BaseEChartProps {
    availability?: number;
    performance?: number;
    quality?: number;
    oeeOverride?: number | null;
    showLabels?: boolean;
}

function buildOption(props: OEEProps): object {
    if (props.option && Object.keys(props.option).length > 0) return props.option;

    const a = props.availability ?? 92;
    const p = props.performance ?? 95;
    const q = props.quality ?? 97;
    const oee = props.oeeOverride != null ? props.oeeOverride : Math.round(a * p * q / 10000);

    const detail = props.showLabels !== false
        ? { width: 40, height: 14, fontSize: 14, color: 'inherit', formatter: '{value}%' }
        : { show: false };

    return {
        series: [{
            type: 'gauge', startAngle: 90, endAngle: -270,
            pointer: { show: false },
            progress: { show: true, overlap: false, roundCap: true, clip: false },
            axisLine: { lineStyle: { width: 30 } },
            axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
            detail,
            data: [
                { value: oee, name: 'OEE',          title: { offsetCenter: ['0%', '-35%'] }, detail: { offsetCenter: ['0%', '-20%'] } },
                { value: a,   name: 'Availability',  title: { offsetCenter: ['0%',   '0%'] }, detail: { offsetCenter: ['0%',  '15%'] } },
                { value: p,   name: 'Performance',   title: { offsetCenter: ['0%',  '35%'] }, detail: { offsetCenter: ['0%',  '50%'] } },
                { value: q,   name: 'Quality',       title: { offsetCenter: ['0%',  '70%'] }, detail: { offsetCenter: ['0%',  '85%'] } },
            ]
        }]
    };
}

export class IndustrialOEEComponent extends AbstractEChartComponent<OEEProps> {
    protected getCssClass() { return 'open-industrial-oee'; }
}

export class IndustrialOEEMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialOEEComponent; }
    getDefaultSize(): SizeObject { return { width: 400, height: 400 }; }
    getPropsReducer(tree: PropertyTree): OEEProps {
        const base: OEEProps = {
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
            availability:     tree.readNumber("availability", 92),
            performance:      tree.readNumber("performance", 95),
            quality:          tree.readNumber("quality", 97),
            oeeOverride:      tree.read("oeeOverride", null),
            showLabels:       tree.readBoolean("showLabels", true),
        };
        base.option = buildOption(base);
        return base;
    }
}
