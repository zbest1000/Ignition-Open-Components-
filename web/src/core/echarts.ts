/**
 * The ECharts build used by every component: the core plus all 2D charts and
 * components, registered once. echarts-gl is not part of it; see glLoader.ts.
 */
import * as echarts from 'echarts/core';
import {
    BarChart, LineChart, PieChart, ScatterChart, GaugeChart, FunnelChart, HeatmapChart, TreeChart, TreemapChart,
    SunburstChart, GraphChart, SankeyChart, BoxplotChart, CandlestickChart, LinesChart, EffectScatterChart,
    ThemeRiverChart, RadarChart, PictorialBarChart, CustomChart, MapChart, ParallelChart,
} from 'echarts/charts';
import {
    TitleComponent, TooltipComponent, LegendComponent, GridComponent, DataZoomComponent, ToolboxComponent,
    VisualMapComponent, TimelineComponent, CalendarComponent, DatasetComponent, TransformComponent,
    GraphicComponent, PolarComponent, RadarComponent, GeoComponent, SingleAxisComponent, ParallelComponent,
    BrushComponent, AriaComponent, MarkPointComponent, MarkLineComponent, MarkAreaComponent, AxisPointerComponent,
} from 'echarts/components';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';

echarts.use([
    BarChart, LineChart, PieChart, ScatterChart, GaugeChart, FunnelChart, HeatmapChart, TreeChart, TreemapChart,
    SunburstChart, GraphChart, SankeyChart, BoxplotChart, CandlestickChart, LinesChart, EffectScatterChart,
    ThemeRiverChart, RadarChart, PictorialBarChart, CustomChart, MapChart, ParallelChart,
    TitleComponent, TooltipComponent, LegendComponent, GridComponent, DataZoomComponent, ToolboxComponent,
    VisualMapComponent, TimelineComponent, CalendarComponent, DatasetComponent, TransformComponent,
    GraphicComponent, PolarComponent, RadarComponent, GeoComponent, SingleAxisComponent, ParallelComponent,
    BrushComponent, AriaComponent, MarkPointComponent, MarkLineComponent, MarkAreaComponent, AxisPointerComponent,
    LabelLayout, CanvasRenderer, SVGRenderer,
]);

export { echarts };
