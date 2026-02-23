import * as React from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart, GaugeChart,
         FunnelChart, HeatmapChart, TreeChart, TreemapChart, SunburstChart,
         GraphChart, SankeyChart, BoxplotChart, CandlestickChart, LinesChart,
         EffectScatterChart, ThemeRiverChart, RadarChart,
         PictorialBarChart, CustomChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, LegendComponent,
         GridComponent, DataZoomComponent, ToolboxComponent,
         VisualMapComponent, TimelineComponent, CalendarComponent,
         DatasetComponent, TransformComponent, GraphicComponent,
         PolarComponent, RadarComponent, GeoComponent,
         SingleAxisComponent, ParallelComponent, BrushComponent,
         AriaComponent, MarkPointComponent, MarkLineComponent,
         MarkAreaComponent, AxisPointerComponent } from 'echarts/components';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';

import {
    Component,
    ComponentMeta,
    ComponentProps,
    PComponent,
    PropertyTree,
    SizeObject
} from '@inductiveautomation/perspective-client';

import { sanitizeOption, serializeEventParams } from '../utils/optionSanitizer';

echarts.use([
    BarChart, LineChart, PieChart, ScatterChart, GaugeChart,
    FunnelChart, HeatmapChart, TreeChart, TreemapChart, SunburstChart,
    GraphChart, SankeyChart, BoxplotChart, CandlestickChart, LinesChart,
    EffectScatterChart, ThemeRiverChart, RadarChart,
    PictorialBarChart, CustomChart,
    TitleComponent, TooltipComponent, LegendComponent,
    GridComponent, DataZoomComponent, ToolboxComponent,
    VisualMapComponent, TimelineComponent, CalendarComponent,
    DatasetComponent, TransformComponent, GraphicComponent,
    PolarComponent, RadarComponent, GeoComponent,
    SingleAxisComponent, ParallelComponent, BrushComponent,
    AriaComponent, MarkPointComponent, MarkLineComponent,
    MarkAreaComponent, AxisPointerComponent,
    CanvasRenderer, SVGRenderer
]);

export const COMPONENT_TYPE = "open.echarts.EChart";

export interface EChartProps {
    option?: object;
    theme?: string;
    renderer?: 'canvas' | 'svg';
    autoResize?: boolean;
    resizeDebounceMs?: number;
    notMerge?: boolean;
    lazyUpdate?: boolean;
    showLoading?: boolean;
    loadingOptions?: object;
    sanitizeTooltip?: boolean;
}

interface EChartState {
    error: string | null;
}

export class EChartComponent extends Component<ComponentProps<EChartProps>, EChartState> {

    private chartRef: React.RefObject<HTMLDivElement>;
    private chart: echarts.ECharts | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private resizeTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(props: ComponentProps<EChartProps>) {
        super(props);
        this.chartRef = React.createRef();
        this.state = { error: null };
    }

    componentDidMount() {
        this.initChart();
        this.setupResizeObserver();
    }

    componentDidUpdate(prevProps: ComponentProps<EChartProps>) {
        const prev = prevProps.props;
        const curr = this.props.props;

        if (prev.theme !== curr.theme || prev.renderer !== curr.renderer) {
            this.disposeChart();
            this.initChart();
            return;
        }

        if (prev.option !== curr.option) {
            this.updateOption();
        }

        if (prev.showLoading !== curr.showLoading) {
            this.updateLoading();
        }
    }

    componentWillUnmount() {
        this.disposeChart();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
    }

    private initChart() {
        const node = this.chartRef.current;
        if (!node) return;

        try {
            const { theme, renderer } = this.props.props;
            const rendererType = renderer === 'svg' ? 'svg' : 'canvas';

            this.chart = echarts.init(node, theme || undefined, {
                renderer: rendererType
            });

            this.updateOption();
            this.updateLoading();
            this.bindEvents();
        } catch (err: any) {
            this.setState({ error: err?.message || 'Failed to initialise ECharts' });
        }
    }

    private disposeChart() {
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
    }

    private updateOption() {
        if (!this.chart) return;

        const { option, notMerge, lazyUpdate, sanitizeTooltip } = this.props.props;
        if (!option) return;

        try {
            const safeOption = sanitizeTooltip !== false
                ? sanitizeOption(option)
                : option;

            this.chart.setOption(safeOption, {
                notMerge: notMerge || false,
                lazyUpdate: lazyUpdate !== false
            });

            if (this.state.error) {
                this.setState({ error: null });
            }
        } catch (err: any) {
            this.setState({ error: err?.message || 'setOption failed' });
        }
    }

    private updateLoading() {
        if (!this.chart) return;
        const { showLoading, loadingOptions } = this.props.props;
        if (showLoading) {
            this.chart.showLoading('default', loadingOptions || {});
        } else {
            this.chart.hideLoading();
        }
    }

    private bindEvents() {
        if (!this.chart) return;

        const eventMap: Record<string, string> = {
            'click':               'onClick',
            'dblclick':            'onDoubleClick',
            'mouseover':           'onMouseOver',
            'mouseout':            'onMouseOut',
            'legendselectchanged': 'onLegendSelectChanged',
            'datazoom':            'onDataZoom',
            'brushselected':       'onBrushSelected',
        };

        Object.entries(eventMap).forEach(([echartsEvent, perspectiveEvent]) => {
            this.chart!.on(echartsEvent, (params: any) => {
                if (!this.props.componentEvents) return;
                try {
                    const safeParams = serializeEventParams(params);
                    this.props.componentEvents.fireComponentEvent(perspectiveEvent, safeParams);
                } catch (_) {
                    // swallow serialization errors to avoid crashing the session
                }
            });
        });
    }

    private setupResizeObserver() {
        const node = this.chartRef.current;
        if (!node || !this.props.props.autoResize) return;

        const debounceMs = this.props.props.resizeDebounceMs ?? 150;

        this.resizeObserver = new ResizeObserver(() => {
            if (this.resizeTimer) clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                if (this.chart && !this.chart.isDisposed()) {
                    this.chart.resize();
                }
            }, debounceMs);
        });

        this.resizeObserver.observe(node);
    }

    render() {
        const { error } = this.state;

        if (error) {
            return (
                <div {...this.props.emit({ classes: ['open-echarts-error'] })}>
                    <span className="open-echarts-error__message">{error}</span>
                </div>
            );
        }

        return (
            <div
                {...this.props.emit({ classes: ['open-echarts-chart'] })}
                ref={this.chartRef}
            />
        );
    }
}

export class EChartMeta implements ComponentMeta {

    getComponentType(): string {
        return COMPONENT_TYPE;
    }

    getViewComponent(): PComponent {
        return EChartComponent;
    }

    getDefaultSize(): SizeObject {
        return { width: 600, height: 400 };
    }

    getPropsReducer(tree: PropertyTree): EChartProps {
        return {
            option:            tree.read("option", {}),
            theme:             tree.readString("theme", ""),
            renderer:          tree.readString("renderer", "canvas") as 'canvas' | 'svg',
            autoResize:        tree.readBoolean("autoResize", true),
            resizeDebounceMs:  tree.readNumber("resizeDebounceMs", 150),
            notMerge:          tree.readBoolean("notMerge", false),
            lazyUpdate:        tree.readBoolean("lazyUpdate", true),
            showLoading:       tree.readBoolean("showLoading", false),
            loadingOptions:    tree.read("loadingOptions", {}),
            sanitizeTooltip:   tree.readBoolean("sanitizeTooltip", true),
        };
    }
}
