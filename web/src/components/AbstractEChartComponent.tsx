import * as React from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart as ELineChart, PieChart as EPieChart,
         ScatterChart as EScatterChart, GaugeChart as EGaugeChart,
         FunnelChart, HeatmapChart, TreeChart, TreemapChart, SunburstChart,
         GraphChart, SankeyChart, BoxplotChart, CandlestickChart, LinesChart,
         EffectScatterChart, ThemeRiverChart, RadarChart as ERadarChart,
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
    ComponentProps,
} from '@inductiveautomation/perspective-client';

import { sanitizeOption, serializeEventParams } from '../utils/optionSanitizer';

echarts.use([
    BarChart, ELineChart, EPieChart, EScatterChart, EGaugeChart,
    FunnelChart, HeatmapChart, TreeChart, TreemapChart, SunburstChart,
    GraphChart, SankeyChart, BoxplotChart, CandlestickChart, LinesChart,
    EffectScatterChart, ThemeRiverChart, ERadarChart,
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

export { echarts };

export interface BaseEChartProps {
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

interface BaseState {
    error: string | null;
}

/**
 * Shared base class for all ECharts-based Perspective components.
 * Handles instance lifecycle, resize, loading state, event bridging,
 * and option sanitisation. Subclasses just provide their component type
 * and CSS class name.
 */
export abstract class AbstractEChartComponent<
    P extends BaseEChartProps = BaseEChartProps
> extends Component<ComponentProps<P>, BaseState> {

    private chartRef: React.RefObject<HTMLDivElement>;
    private chart: echarts.ECharts | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private resizeTimer: ReturnType<typeof setTimeout> | null = null;

    protected abstract getCssClass(): string;

    constructor(props: ComponentProps<P>) {
        super(props);
        this.chartRef = React.createRef();
        this.state = { error: null };
    }

    componentDidMount() {
        this.initChart();
        this.setupResizeObserver();
    }

    componentDidUpdate(prevProps: ComponentProps<P>) {
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
            this.chart = echarts.init(node, theme || undefined, {
                renderer: renderer === 'svg' ? 'svg' : 'canvas'
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
                ? sanitizeOption(option) : option;

            this.chart.setOption(safeOption, {
                notMerge: notMerge || false,
                lazyUpdate: lazyUpdate !== false
            });

            if (this.state.error) this.setState({ error: null });
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
                } catch (_) { /* swallow */ }
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
                if (this.chart && !this.chart.isDisposed()) this.chart.resize();
            }, debounceMs);
        });
        this.resizeObserver.observe(node);
    }

    render() {
        if (this.state.error) {
            return (
                <div {...this.props.emit({ classes: ['open-echarts-error'] })}>
                    <span className="open-echarts-error__message">{this.state.error}</span>
                </div>
            );
        }
        return (
            <div
                {...this.props.emit({ classes: [this.getCssClass()] })}
                ref={this.chartRef}
            />
        );
    }
}
