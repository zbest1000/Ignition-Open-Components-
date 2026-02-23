package com.opencomponents.echarts.common.components;

import java.util.List;

import com.inductiveautomation.perspective.common.api.ComponentDescriptor;
import com.inductiveautomation.perspective.common.api.ComponentDescriptorImpl;
import com.inductiveautomation.perspective.common.api.ComponentEventDescriptor;

import com.opencomponents.echarts.common.OpenEChartsConstants;
import com.opencomponents.echarts.common.OpenEChartsComponents;
import com.opencomponents.echarts.common.utilities.ComponentUtilities;

/**
 * Central registry of every component descriptor in the module.
 * Mirrors the ECharts examples gallery categories one-to-one.
 */
public class ComponentDefs {

    private static final List<ComponentEventDescriptor> CHART_EVENTS = List.of(
        ComponentUtilities.getEventDescriptor("events/echart/onClick.json",
            "onClick", "Fired when the chart is clicked."),
        ComponentUtilities.getEventDescriptor("events/echart/onDoubleClick.json",
            "onDoubleClick", "Fired when the chart is double-clicked.")
    );

    private static final String SCHEMA = "/props/echart.props.json";
    private static final String EC  = OpenEChartsConstants.COMPONENT_CATEGORY;
    private static final String IND = OpenEChartsConstants.INDUSTRIAL_COMPONENT_CATEGORY;

    private static ComponentDescriptor chart(
            String id, String name, String description,
            String category, String metaName) {
        return ComponentDescriptorImpl.ComponentBuilder.newBuilder()
            .setPaletteCategory(category)
            .setId(id)
            .setModuleId(OpenEChartsConstants.MODULE_ID)
            .setSchema(ComponentUtilities.getSchemaFromFilePath(SCHEMA))
            .setEvents(CHART_EVENTS)
            .setName(name)
            .addPaletteEntry("", name, description, null, null)
            .setDefaultMetaName(metaName)
            .setResources(OpenEChartsComponents.BROWSER_RESOURCES)
            .build();
    }

    // ── Basic chart types ───────────────────────────────────────────────

    public static final String LINE_ID    = "open.echarts.LineChart";
    public static final String BAR_ID     = "open.echarts.BarChart";
    public static final String PIE_ID     = "open.echarts.PieChart";
    public static final String SCATTER_ID = "open.echarts.ScatterChart";

    public static final ComponentDescriptor LINE = chart(LINE_ID,
        "Line Chart", "Line, area, step, and stacked area charts.", EC, "lineChart");
    public static final ComponentDescriptor BAR = chart(BAR_ID,
        "Bar Chart", "Bar, stacked, horizontal, polar, waterfall, and race charts.", EC, "barChart");
    public static final ComponentDescriptor PIE = chart(PIE_ID,
        "Pie Chart", "Pie, donut, rose, and nested pie charts.", EC, "pieChart");
    public static final ComponentDescriptor SCATTER = chart(SCATTER_ID,
        "Scatter Chart", "Scatter, bubble, and effect-scatter plots.", EC, "scatterChart");

    // ── KPI / proportion ────────────────────────────────────────────────

    public static final String GAUGE_ID  = "open.echarts.GaugeChart";
    public static final String FUNNEL_ID = "open.echarts.FunnelChart";

    public static final ComponentDescriptor GAUGE = chart(GAUGE_ID,
        "Gauge Chart", "Gauge, speed, progress, ring, temperature, and clock displays.", EC, "gaugeChart");
    public static final ComponentDescriptor FUNNEL = chart(FUNNEL_ID,
        "Funnel Chart", "Funnel and conversion pipeline charts.", EC, "funnelChart");

    // ── Financial / statistical ─────────────────────────────────────────

    public static final String CANDLESTICK_ID = "open.echarts.CandlestickChart";
    public static final String BOXPLOT_ID     = "open.echarts.BoxplotChart";
    public static final String HEATMAP_ID     = "open.echarts.HeatmapChart";

    public static final ComponentDescriptor CANDLESTICK = chart(CANDLESTICK_ID,
        "Candlestick Chart", "Candlestick (K-line) and OHLC financial charts.", EC, "candlestickChart");
    public static final ComponentDescriptor BOXPLOT = chart(BOXPLOT_ID,
        "Boxplot Chart", "Box-and-whisker plots for statistical distributions.", EC, "boxplotChart");
    public static final ComponentDescriptor HEATMAP = chart(HEATMAP_ID,
        "Heatmap Chart", "Heatmaps on cartesian, calendar, or geo coordinates.", EC, "heatmapChart");

    // ── Hierarchy ───────────────────────────────────────────────────────

    public static final String TREE_ID     = "open.echarts.TreeChart";
    public static final String TREEMAP_ID  = "open.echarts.TreemapChart";
    public static final String SUNBURST_ID = "open.echarts.SunburstChart";

    public static final ComponentDescriptor TREE = chart(TREE_ID,
        "Tree Chart", "Tree layouts (LR, RL, TB, BT, radial, polyline).", EC, "treeChart");
    public static final ComponentDescriptor TREEMAP = chart(TREEMAP_ID,
        "Treemap Chart", "Treemap area-proportional hierarchy visualisation.", EC, "treemapChart");
    public static final ComponentDescriptor SUNBURST = chart(SUNBURST_ID,
        "Sunburst Chart", "Sunburst radial hierarchy visualisation.", EC, "sunburstChart");

    // ── Relations / flow ────────────────────────────────────────────────

    public static final String GRAPH_ID  = "open.echarts.GraphChart";
    public static final String SANKEY_ID = "open.echarts.SankeyChart";

    public static final ComponentDescriptor GRAPH = chart(GRAPH_ID,
        "Graph Chart", "Force, circular, and grid graph network diagrams.", EC, "graphChart");
    public static final ComponentDescriptor SANKEY = chart(SANKEY_ID,
        "Sankey Chart", "Sankey flow and energy diagrams.", EC, "sankeyChart");

    // ── Specialty ───────────────────────────────────────────────────────

    public static final String RADAR_ID        = "open.echarts.RadarChart";
    public static final String PARALLEL_ID     = "open.echarts.ParallelChart";
    public static final String THEMERIVER_ID   = "open.echarts.ThemeRiverChart";
    public static final String CALENDAR_ID     = "open.echarts.CalendarChart";
    public static final String PICTORIALBAR_ID = "open.echarts.PictorialBarChart";
    public static final String CUSTOM_ID       = "open.echarts.CustomChart";
    public static final String GRAPHIC_ID      = "open.echarts.GraphicChart";
    public static final String DATASET_ID      = "open.echarts.DatasetChart";

    public static final ComponentDescriptor RADAR = chart(RADAR_ID,
        "Radar Chart", "Radar / spider charts for multi-variable comparison.", EC, "radarChart");
    public static final ComponentDescriptor PARALLEL = chart(PARALLEL_ID,
        "Parallel Chart", "Parallel coordinates for multi-dimensional analysis.", EC, "parallelChart");
    public static final ComponentDescriptor THEMERIVER = chart(THEMERIVER_ID,
        "Theme River Chart", "Theme river time-stream visualisation.", EC, "themeRiverChart");
    public static final ComponentDescriptor CALENDAR = chart(CALENDAR_ID,
        "Calendar Chart", "Calendar heatmap, scatter, and graph overlays.", EC, "calendarChart");
    public static final ComponentDescriptor PICTORIALBAR = chart(PICTORIALBAR_ID,
        "Pictorial Bar Chart", "Symbol-based pictorial bar charts.", EC, "pictorialBarChart");
    public static final ComponentDescriptor CUSTOM = chart(CUSTOM_ID,
        "Custom Chart", "Custom series with user-defined rendering logic.", EC, "customChart");
    public static final ComponentDescriptor GRAPHIC = chart(GRAPHIC_ID,
        "Graphic Chart", "Graphic overlay elements (shapes, text, images).", EC, "graphicChart");
    public static final ComponentDescriptor DATASET = chart(DATASET_ID,
        "Dataset Chart", "Dataset-driven charts with encode and transform.", EC, "datasetChart");

    // ── Geo / map ───────────────────────────────────────────────────────

    public static final String MAP_ID   = "open.echarts.MapChart";
    public static final String LINES_ID = "open.echarts.LinesChart";

    public static final ComponentDescriptor MAP = chart(MAP_ID,
        "Map Chart", "Geo/map visualisations (choropleth, scatter on map, SVG maps).", EC, "mapChart");
    public static final ComponentDescriptor LINES = chart(LINES_ID,
        "Lines Chart", "Lines series for flight routes, bus lines, and migration flows.", EC, "linesChart");

    // ── Industrial ──────────────────────────────────────────────────────

    public static final String TREND_ID  = "open.industrial.Trend";
    public static final String OEE_ID    = "open.industrial.OEE";
    public static final String PARETO_ID = "open.industrial.Pareto";

    public static final ComponentDescriptor TREND = chart(TREND_ID,
        "Industrial Trend", "Time-series process variable trend with setpoint and alarm limits.", IND, "industrialTrend");
    public static final ComponentDescriptor OEE = chart(OEE_ID,
        "OEE Summary", "Overall Equipment Effectiveness multi-ring gauge (A/P/Q).", IND, "oeeChart");
    public static final ComponentDescriptor PARETO = chart(PARETO_ID,
        "Pareto Chart", "Pareto analysis with bar counts and cumulative percentage line.", IND, "paretoChart");

    // ── Master lists ────────────────────────────────────────────────────

    public static final List<ComponentDescriptor> ALL = List.of(
        EChart.DESCRIPTOR,
        LINE, BAR, PIE, SCATTER,
        GAUGE, FUNNEL,
        CANDLESTICK, BOXPLOT, HEATMAP,
        TREE, TREEMAP, SUNBURST,
        GRAPH, SANKEY,
        RADAR, PARALLEL, THEMERIVER, CALENDAR, PICTORIALBAR, CUSTOM, GRAPHIC, DATASET,
        MAP, LINES,
        TREND, OEE, PARETO
    );

    public static final List<String> ALL_IDS = List.of(
        EChart.COMPONENT_ID,
        LINE_ID, BAR_ID, PIE_ID, SCATTER_ID,
        GAUGE_ID, FUNNEL_ID,
        CANDLESTICK_ID, BOXPLOT_ID, HEATMAP_ID,
        TREE_ID, TREEMAP_ID, SUNBURST_ID,
        GRAPH_ID, SANKEY_ID,
        RADAR_ID, PARALLEL_ID, THEMERIVER_ID, CALENDAR_ID, PICTORIALBAR_ID, CUSTOM_ID, GRAPHIC_ID, DATASET_ID,
        MAP_ID, LINES_ID,
        TREND_ID, OEE_ID, PARETO_ID
    );
}
