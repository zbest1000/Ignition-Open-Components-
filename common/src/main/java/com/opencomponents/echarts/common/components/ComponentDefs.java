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
 * Covers all ECharts 2D types, ECharts-GL 3D/WebGL types, and
 * industrial domain components.
 */
public class ComponentDefs {

    private static final List<ComponentEventDescriptor> CHART_EVENTS = List.of(
        ComponentUtilities.getEventDescriptor("events/echart/onClick.json",
            "onClick", "Fired when the chart is clicked."),
        ComponentUtilities.getEventDescriptor("events/echart/onDoubleClick.json",
            "onDoubleClick", "Fired when the chart is double-clicked."),
        ComponentUtilities.getEventDescriptor("events/echart/onMouseOver.json",
            "onMouseOver", "Fired when the pointer moves over a chart element."),
        ComponentUtilities.getEventDescriptor("events/echart/onMouseOut.json",
            "onMouseOut", "Fired when the pointer leaves a chart element."),
        ComponentUtilities.getEventDescriptor("events/echart/onLegendSelectChanged.json",
            "onLegendSelectChanged", "Fired when a legend item's selected state changes."),
        ComponentUtilities.getEventDescriptor("events/echart/onDataZoom.json",
            "onDataZoom", "Fired when the data zoom range changes."),
        ComponentUtilities.getEventDescriptor("events/echart/onBrushSelected.json",
            "onBrushSelected", "Fired when a brush selection changes.")
    );

    private static final String SCHEMA = "/props/echart.props.json";
    private static final String EC  = OpenEChartsConstants.COMPONENT_CATEGORY;
    private static final String GL  = "Open Components / ECharts 3D";
    private static final String IND = OpenEChartsConstants.INDUSTRIAL_COMPONENT_CATEGORY;

    private static ComponentDescriptor chart(
            String id, String name, String description,
            String category, String metaName) {
        return chartWithSchema(id, name, description, category, metaName, SCHEMA);
    }

    private static ComponentDescriptor chartWithSchema(
            String id, String name, String description,
            String category, String metaName, String schemaPath) {
        return ComponentDescriptorImpl.ComponentBuilder.newBuilder()
            .setPaletteCategory(category)
            .setId(id)
            .setModuleId(OpenEChartsConstants.MODULE_ID)
            .setSchema(ComponentUtilities.getSchemaFromFilePath(schemaPath))
            .setEvents(CHART_EVENTS)
            .setName(name)
            .addPaletteEntry("", name, description, null, null)
            .setDefaultMetaName(metaName)
            .setResources(OpenEChartsComponents.BROWSER_RESOURCES)
            .build();
    }

    // ── Basic 2D ────────────────────────────────────────────────────────

    public static final String LINE_ID          = "open.echarts.LineChart";
    public static final String BAR_ID           = "open.echarts.BarChart";
    public static final String PIE_ID           = "open.echarts.PieChart";
    public static final String SCATTER_ID       = "open.echarts.ScatterChart";
    public static final String EFFECTSCATTER_ID = "open.echarts.EffectScatterChart";

    public static final ComponentDescriptor LINE = chart(LINE_ID,
        "Line Chart", "Line, area, step, and stacked area charts.", EC, "lineChart");
    public static final ComponentDescriptor BAR = chart(BAR_ID,
        "Bar Chart", "Bar, stacked, horizontal, polar, waterfall, and race charts.", EC, "barChart");
    public static final ComponentDescriptor PIE = chart(PIE_ID,
        "Pie Chart", "Pie, donut, rose, and nested pie charts.", EC, "pieChart");
    public static final ComponentDescriptor SCATTER = chart(SCATTER_ID,
        "Scatter Chart", "Scatter, bubble, and large-scale scatter plots.", EC, "scatterChart");
    public static final ComponentDescriptor EFFECTSCATTER = chart(EFFECTSCATTER_ID,
        "Effect Scatter Chart", "Ripple-effect scatter with animated markers.", EC, "effectScatterChart");

    // ── KPI / proportion ────────────────────────────────────────────────

    public static final String GAUGE_ID  = "open.echarts.GaugeChart";
    public static final String FUNNEL_ID = "open.echarts.FunnelChart";

    public static final ComponentDescriptor GAUGE = chart(GAUGE_ID,
        "Gauge Chart", "Gauge, speed, progress, ring, temperature, and clock.", EC, "gaugeChart");
    public static final ComponentDescriptor FUNNEL = chart(FUNNEL_ID,
        "Funnel Chart", "Funnel and conversion pipeline charts.", EC, "funnelChart");

    // ── Financial / statistical ─────────────────────────────────────────

    public static final String CANDLESTICK_ID = "open.echarts.CandlestickChart";
    public static final String BOXPLOT_ID     = "open.echarts.BoxplotChart";
    public static final String HEATMAP_ID     = "open.echarts.HeatmapChart";

    public static final ComponentDescriptor CANDLESTICK = chart(CANDLESTICK_ID,
        "Candlestick Chart", "K-line and OHLC financial charts.", EC, "candlestickChart");
    public static final ComponentDescriptor BOXPLOT = chart(BOXPLOT_ID,
        "Boxplot Chart", "Box-and-whisker statistical plots.", EC, "boxplotChart");
    public static final ComponentDescriptor HEATMAP = chart(HEATMAP_ID,
        "Heatmap Chart", "Heatmaps on cartesian, calendar, or geo coordinates.", EC, "heatmapChart");

    // ── Hierarchy ───────────────────────────────────────────────────────

    public static final String TREE_ID     = "open.echarts.TreeChart";
    public static final String TREEMAP_ID  = "open.echarts.TreemapChart";
    public static final String SUNBURST_ID = "open.echarts.SunburstChart";

    public static final ComponentDescriptor TREE = chart(TREE_ID,
        "Tree Chart", "Tree layouts (LR, RL, TB, BT, radial, polyline).", EC, "treeChart");
    public static final ComponentDescriptor TREEMAP = chart(TREEMAP_ID,
        "Treemap Chart", "Treemap area-proportional hierarchy.", EC, "treemapChart");
    public static final ComponentDescriptor SUNBURST = chart(SUNBURST_ID,
        "Sunburst Chart", "Sunburst radial hierarchy.", EC, "sunburstChart");

    // ── Relations / flow ────────────────────────────────────────────────

    public static final String GRAPH_ID  = "open.echarts.GraphChart";
    public static final String SANKEY_ID = "open.echarts.SankeyChart";

    public static final ComponentDescriptor GRAPH = chart(GRAPH_ID,
        "Graph Chart", "Force, circular, and grid graph networks.", EC, "graphChart");
    public static final ComponentDescriptor SANKEY = chart(SANKEY_ID,
        "Sankey Chart", "Sankey flow and energy diagrams.", EC, "sankeyChart");

    // ── Specialty 2D ────────────────────────────────────────────────────

    public static final String RADAR_ID        = "open.echarts.RadarChart";
    public static final String PARALLEL_ID     = "open.echarts.ParallelChart";
    public static final String THEMERIVER_ID   = "open.echarts.ThemeRiverChart";
    public static final String CALENDAR_ID     = "open.echarts.CalendarChart";
    public static final String PICTORIALBAR_ID = "open.echarts.PictorialBarChart";
    public static final String CUSTOM_ID       = "open.echarts.CustomChart";
    public static final String GRAPHIC_ID      = "open.echarts.GraphicChart";
    public static final String DATASET_ID      = "open.echarts.DatasetChart";

    public static final ComponentDescriptor RADAR = chart(RADAR_ID,
        "Radar Chart", "Radar / spider charts.", EC, "radarChart");
    public static final ComponentDescriptor PARALLEL = chart(PARALLEL_ID,
        "Parallel Chart", "Parallel coordinates.", EC, "parallelChart");
    public static final ComponentDescriptor THEMERIVER = chart(THEMERIVER_ID,
        "Theme River Chart", "Time-stream river.", EC, "themeRiverChart");
    public static final ComponentDescriptor CALENDAR = chart(CALENDAR_ID,
        "Calendar Chart", "Calendar heatmap/scatter overlays.", EC, "calendarChart");
    public static final ComponentDescriptor PICTORIALBAR = chart(PICTORIALBAR_ID,
        "Pictorial Bar Chart", "Symbol-based pictorial bars.", EC, "pictorialBarChart");
    public static final ComponentDescriptor CUSTOM = chart(CUSTOM_ID,
        "Custom Chart", "Custom series with renderItem logic.", EC, "customChart");
    public static final ComponentDescriptor GRAPHIC = chart(GRAPHIC_ID,
        "Graphic Chart", "Graphic shape/text/image overlays.", EC, "graphicChart");
    public static final ComponentDescriptor DATASET = chart(DATASET_ID,
        "Dataset Chart", "Dataset-driven with encode/transform.", EC, "datasetChart");

    // ── Geo / map 2D ────────────────────────────────────────────────────

    public static final String MAP_ID   = "open.echarts.MapChart";
    public static final String LINES_ID = "open.echarts.LinesChart";

    public static final ComponentDescriptor MAP = chart(MAP_ID,
        "Map Chart", "Choropleth, SVG maps, geo scatter.", EC, "mapChart");
    public static final ComponentDescriptor LINES = chart(LINES_ID,
        "Lines Chart", "Flight routes, bus lines, migration flows.", EC, "linesChart");

    // ── 3D charts (echarts-gl) ──────────────────────────────────────────

    public static final String BAR3D_ID      = "open.echarts.Bar3DChart";
    public static final String LINE3D_ID     = "open.echarts.Line3DChart";
    public static final String SCATTER3D_ID  = "open.echarts.Scatter3DChart";
    public static final String SURFACE_ID    = "open.echarts.SurfaceChart";
    public static final String MAP3D_ID      = "open.echarts.Map3DChart";
    public static final String GLOBE_ID      = "open.echarts.GlobeChart";
    public static final String LINES3D_ID    = "open.echarts.Lines3DChart";
    public static final String POLYGONS3D_ID = "open.echarts.Polygons3DChart";

    public static final ComponentDescriptor BAR3D = chart(BAR3D_ID,
        "Bar 3D Chart", "3D bar charts on grid3D coordinates.", GL, "bar3DChart");
    public static final ComponentDescriptor LINE3D = chart(LINE3D_ID,
        "Line 3D Chart", "3D line/trajectory charts.", GL, "line3DChart");
    public static final ComponentDescriptor SCATTER3D = chart(SCATTER3D_ID,
        "Scatter 3D Chart", "3D scatter/point cloud visualisation.", GL, "scatter3DChart");
    public static final ComponentDescriptor SURFACE = chart(SURFACE_ID,
        "Surface Chart", "3D mathematical surface plots.", GL, "surfaceChart");
    public static final ComponentDescriptor MAP3D = chart(MAP3D_ID,
        "Map 3D Chart", "3D geo map with elevation and overlays.", GL, "map3DChart");
    public static final ComponentDescriptor GLOBE = chart(GLOBE_ID,
        "Globe Chart", "3D globe with layers and overlays.", GL, "globeChart");
    public static final ComponentDescriptor LINES3D = chart(LINES3D_ID,
        "Lines 3D Chart", "3D flight/route lines on globe or geo3D.", GL, "lines3DChart");
    public static final ComponentDescriptor POLYGONS3D = chart(POLYGONS3D_ID,
        "Polygons 3D Chart", "3D polygon regions on geo3D.", GL, "polygons3DChart");

    // ── WebGL-accelerated (echarts-gl) ──────────────────────────────────

    public static final String SCATTERGL_ID = "open.echarts.ScatterGLChart";
    public static final String GRAPHGL_ID   = "open.echarts.GraphGLChart";
    public static final String FLOWGL_ID    = "open.echarts.FlowGLChart";

    public static final ComponentDescriptor SCATTERGL = chart(SCATTERGL_ID,
        "Scatter GL Chart", "WebGL-accelerated scatter for millions of points.", GL, "scatterGLChart");
    public static final ComponentDescriptor GRAPHGL = chart(GRAPHGL_ID,
        "Graph GL Chart", "WebGL-accelerated large-scale graph layout.", GL, "graphGLChart");
    public static final ComponentDescriptor FLOWGL = chart(FLOWGL_ID,
        "Flow GL Chart", "WebGL vector field flow visualisation.", GL, "flowGLChart");

    // ── Industrial ──────────────────────────────────────────────────────

    // ── Industrial — core ─────────────────────────────────────────────

    public static final String TREND_ID  = "open.industrial.Trend";
    public static final String OEE_ID    = "open.industrial.OEE";
    public static final String PARETO_ID = "open.industrial.Pareto";
    public static final String SPC_ID    = "open.industrial.SPCChart";

    public static final ComponentDescriptor TREND = chartWithSchema(TREND_ID,
        "Industrial Trend", "Time-series PV/SP trend with alarm limits, data zoom, and quality.",
        IND, "industrialTrend", "/props/industrial-trend.props.json");
    public static final ComponentDescriptor OEE = chartWithSchema(OEE_ID,
        "OEE Summary", "Overall Equipment Effectiveness gauge with A/P/Q inputs.",
        IND, "oeeChart", "/props/industrial-oee.props.json");
    public static final ComponentDescriptor PARETO = chartWithSchema(PARETO_ID,
        "Pareto Chart", "Pareto analysis with categories, counts, and cumulative percentage.",
        IND, "paretoChart", "/props/industrial-pareto.props.json");
    public static final ComponentDescriptor SPC = chartWithSchema(SPC_ID,
        "SPC Chart", "Statistical Process Control — Individuals and Moving Range with run rules.",
        IND, "spcChart", "/props/industrial-spc.props.json");

    // ── Industrial — scheduling & timelines ─────────────────────────────

    private static final String SCHED = "Open Components / Scheduling";

    public static final String STATE_TIMELINE_ID    = "open.industrial.StateTimeline";
    public static final String GANTT_ID             = "open.industrial.Gantt";
    public static final String SCHEDULE_CALENDAR_ID = "open.industrial.ScheduleCalendar";
    public static final String SHIFT_CALENDAR_ID    = "open.industrial.ShiftCalendar";
    public static final String DOWNTIME_TRACKER_ID  = "open.industrial.DowntimeTracker";
    public static final String BATCH_TIMELINE_ID    = "open.industrial.BatchTimeline";
    public static final String RESOURCE_HEATMAP_ID  = "open.industrial.ResourceHeatmap";

    public static final ComponentDescriptor STATE_TIMELINE = chartWithSchema(STATE_TIMELINE_ID,
        "State Timeline", "Equipment state/alarm timeline with colour-coded event bars on lanes.",
        SCHED, "stateTimeline", "/props/industrial-state-timeline.props.json");
    public static final ComponentDescriptor GANTT = chartWithSchema(GANTT_ID,
        "Gantt Chart", "Task scheduling with bars, dependencies, milestones, and progress.",
        SCHED, "ganttChart", "/props/industrial-gantt.props.json");
    public static final ComponentDescriptor SCHEDULE_CALENDAR = chartWithSchema(SCHEDULE_CALENDAR_ID,
        "Schedule Calendar", "Annual calendar heatmap for shift schedules and resource allocation.",
        SCHED, "scheduleCalendar", "/props/industrial-schedule-calendar.props.json");
    public static final ComponentDescriptor SHIFT_CALENDAR = chartWithSchema(SHIFT_CALENDAR_ID,
        "Shift Calendar", "Crew shift patterns with rotating assignments and day/week views.",
        SCHED, "shiftCalendar", "/props/industrial-shift-calendar.props.json");
    public static final ComponentDescriptor DOWNTIME_TRACKER = chartWithSchema(DOWNTIME_TRACKER_ID,
        "Downtime Tracker", "Categorised downtime events on equipment timeline with reason codes.",
        SCHED, "downtimeTracker", "/props/industrial-downtime-tracker.props.json");
    public static final ComponentDescriptor BATCH_TIMELINE = chartWithSchema(BATCH_TIMELINE_ID,
        "Batch Timeline", "Batch recipe phase durations (S88 model) on timeline lanes.",
        SCHED, "batchTimeline", "/props/industrial-batch-timeline.props.json");
    public static final ComponentDescriptor RESOURCE_HEATMAP = chartWithSchema(RESOURCE_HEATMAP_ID,
        "Resource Heatmap", "Equipment utilisation percentage as heatmap (resource x time).",
        SCHED, "resourceHeatmap", "/props/industrial-resource-heatmap.props.json");

    // ── Master lists ────────────────────────────────────────────────────

    public static final List<ComponentDescriptor> ALL = List.of(
        EChart.DESCRIPTOR,
        LINE, BAR, PIE, SCATTER, EFFECTSCATTER,
        GAUGE, FUNNEL,
        CANDLESTICK, BOXPLOT, HEATMAP,
        TREE, TREEMAP, SUNBURST,
        GRAPH, SANKEY,
        RADAR, PARALLEL, THEMERIVER, CALENDAR, PICTORIALBAR, CUSTOM, GRAPHIC, DATASET,
        MAP, LINES,
        BAR3D, LINE3D, SCATTER3D, SURFACE, MAP3D, GLOBE, LINES3D, POLYGONS3D,
        SCATTERGL, GRAPHGL, FLOWGL,
        TREND, OEE, PARETO, SPC,
        STATE_TIMELINE, GANTT, SCHEDULE_CALENDAR, SHIFT_CALENDAR,
        DOWNTIME_TRACKER, BATCH_TIMELINE, RESOURCE_HEATMAP
    );

    public static final List<String> ALL_IDS = List.of(
        EChart.COMPONENT_ID,
        LINE_ID, BAR_ID, PIE_ID, SCATTER_ID, EFFECTSCATTER_ID,
        GAUGE_ID, FUNNEL_ID,
        CANDLESTICK_ID, BOXPLOT_ID, HEATMAP_ID,
        TREE_ID, TREEMAP_ID, SUNBURST_ID,
        GRAPH_ID, SANKEY_ID,
        RADAR_ID, PARALLEL_ID, THEMERIVER_ID, CALENDAR_ID, PICTORIALBAR_ID, CUSTOM_ID, GRAPHIC_ID, DATASET_ID,
        MAP_ID, LINES_ID,
        BAR3D_ID, LINE3D_ID, SCATTER3D_ID, SURFACE_ID, MAP3D_ID, GLOBE_ID, LINES3D_ID, POLYGONS3D_ID,
        SCATTERGL_ID, GRAPHGL_ID, FLOWGL_ID,
        TREND_ID, OEE_ID, PARETO_ID, SPC_ID,
        STATE_TIMELINE_ID, GANTT_ID, SCHEDULE_CALENDAR_ID, SHIFT_CALENDAR_ID,
        DOWNTIME_TRACKER_ID, BATCH_TIMELINE_ID, RESOURCE_HEATMAP_ID
    );
}
