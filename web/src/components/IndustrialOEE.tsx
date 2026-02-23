import {
    ComponentMeta, PComponent, PropertyTree, SizeObject
} from '@inductiveautomation/perspective-client';
import { AbstractEChartComponent, BaseEChartProps } from './AbstractEChartComponent';

export const COMPONENT_TYPE = "open.industrial.OEE";

export type OEEProps = BaseEChartProps;

export class IndustrialOEEComponent extends AbstractEChartComponent<OEEProps> {
    protected getCssClass() { return 'open-industrial-oee'; }
}

export class IndustrialOEEMeta implements ComponentMeta {
    getComponentType(): string { return COMPONENT_TYPE; }
    getViewComponent(): PComponent { return IndustrialOEEComponent; }
    getDefaultSize(): SizeObject { return { width: 400, height: 400 }; }
    getPropsReducer(tree: PropertyTree): OEEProps {
        return {
            option:           tree.read("option", {
                series: [{
                    type: 'gauge', startAngle: 90, endAngle: -270,
                    pointer: { show: false },
                    progress: { show: true, overlap: false, roundCap: true, clip: false },
                    axisLine: { lineStyle: { width: 30 } },
                    axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
                    detail: { width: 40, height: 14, fontSize: 14, color: 'inherit', formatter: '{value}%' },
                    data: [
                        { value: 85, name: 'OEE',         title: { offsetCenter: ['0%','-35%'] }, detail: { offsetCenter: ['0%','-20%'] } },
                        { value: 92, name: 'Availability', title: { offsetCenter: ['0%','0%'] },   detail: { offsetCenter: ['0%','15%'] } },
                        { value: 95, name: 'Performance',  title: { offsetCenter: ['0%','35%'] },  detail: { offsetCenter: ['0%','50%'] } },
                        { value: 97, name: 'Quality',      title: { offsetCenter: ['0%','70%'] },  detail: { offsetCenter: ['0%','85%'] } },
                    ]
                }]
            }),
            theme:            tree.readString("theme", ""),
            renderer:         tree.readString("renderer", "canvas") as 'canvas' | 'svg',
            autoResize:       tree.readBoolean("autoResize", true),
            resizeDebounceMs: tree.readNumber("resizeDebounceMs", 150),
            notMerge:         tree.readBoolean("notMerge", false),
            lazyUpdate:       tree.readBoolean("lazyUpdate", true),
            showLoading:      tree.readBoolean("showLoading", false),
            loadingOptions:   tree.read("loadingOptions", {}),
            sanitizeTooltip:  tree.readBoolean("sanitizeTooltip", true),
        };
    }
}
