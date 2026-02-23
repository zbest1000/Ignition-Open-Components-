package com.opencomponents.echarts.common.components;

import java.util.List;

import com.inductiveautomation.perspective.common.api.ComponentDescriptor;
import com.inductiveautomation.perspective.common.api.ComponentDescriptorImpl;
import com.inductiveautomation.perspective.common.api.ComponentEventDescriptor;

import com.opencomponents.echarts.common.OpenEChartsConstants;
import com.opencomponents.echarts.common.OpenEChartsComponents;
import com.opencomponents.echarts.common.utilities.ComponentUtilities;

/**
 * Central registry of all component descriptors in the module.
 * Each entry maps a unique component ID to its palette metadata,
 * property schema, and event list.
 */
public class ComponentDefs {

    private static final List<ComponentEventDescriptor> CHART_EVENTS = List.of(
        ComponentUtilities.getEventDescriptor("events/echart/onClick.json",
            "onClick", "Fired when the chart is clicked."),
        ComponentUtilities.getEventDescriptor("events/echart/onDoubleClick.json",
            "onDoubleClick", "Fired when the chart is double-clicked.")
    );

    private static ComponentDescriptor chart(
            String id, String name, String description,
            String category, String schema, String metaName) {
        return ComponentDescriptorImpl.ComponentBuilder.newBuilder()
            .setPaletteCategory(category)
            .setId(id)
            .setModuleId(OpenEChartsConstants.MODULE_ID)
            .setSchema(ComponentUtilities.getSchemaFromFilePath(schema))
            .setEvents(CHART_EVENTS)
            .setName(name)
            .addPaletteEntry("", name, description, null, null)
            .setDefaultMetaName(metaName)
            .setResources(OpenEChartsComponents.BROWSER_RESOURCES)
            .build();
    }

    private static final String CAT = OpenEChartsConstants.COMPONENT_CATEGORY;
    private static final String IND = OpenEChartsConstants.INDUSTRIAL_COMPONENT_CATEGORY;
    private static final String SCHEMA = "/props/echart.props.json";

    // ── ECharts chart groups ────────────────────────────────────────────

    public static final String LINE_ID       = "open.echarts.LineChart";
    public static final String BAR_ID        = "open.echarts.BarChart";
    public static final String PIE_ID        = "open.echarts.PieChart";
    public static final String SCATTER_ID    = "open.echarts.ScatterChart";
    public static final String GAUGE_ID      = "open.echarts.GaugeChart";
    public static final String STAT_ID       = "open.echarts.StatChart";
    public static final String HIERARCHY_ID  = "open.echarts.HierarchyChart";
    public static final String RELATION_ID   = "open.echarts.RelationChart";
    public static final String RADAR_ID      = "open.echarts.RadarChart";

    public static final ComponentDescriptor LINE = chart(
        LINE_ID, "Line Chart",
        "Line, area, and step charts for time-series and category data.",
        CAT, SCHEMA, "lineChart");

    public static final ComponentDescriptor BAR = chart(
        BAR_ID, "Bar Chart",
        "Bar, stacked bar, and horizontal bar charts.",
        CAT, SCHEMA, "barChart");

    public static final ComponentDescriptor PIE = chart(
        PIE_ID, "Pie Chart",
        "Pie, donut, and rose charts for proportional data.",
        CAT, SCHEMA, "pieChart");

    public static final ComponentDescriptor SCATTER = chart(
        SCATTER_ID, "Scatter Chart",
        "Scatter, bubble, and effect-scatter plots.",
        CAT, SCHEMA, "scatterChart");

    public static final ComponentDescriptor GAUGE = chart(
        GAUGE_ID, "Gauge Chart",
        "Gauge and funnel charts for KPI displays.",
        CAT, SCHEMA, "gaugeChart");

    public static final ComponentDescriptor STAT = chart(
        STAT_ID, "Statistical Chart",
        "Candlestick, boxplot, and heatmap charts for statistical analysis.",
        CAT, SCHEMA, "statChart");

    public static final ComponentDescriptor HIERARCHY = chart(
        HIERARCHY_ID, "Hierarchy Chart",
        "Tree, treemap, and sunburst charts for hierarchical data.",
        CAT, SCHEMA, "hierarchyChart");

    public static final ComponentDescriptor RELATION = chart(
        RELATION_ID, "Relation Chart",
        "Graph network and Sankey flow diagrams.",
        CAT, SCHEMA, "relationChart");

    public static final ComponentDescriptor RADAR = chart(
        RADAR_ID, "Radar Chart",
        "Radar / spider charts for multi-variable comparison.",
        CAT, SCHEMA, "radarChart");

    // ── Industrial components ───────────────────────────────────────────

    public static final String TREND_ID  = "open.industrial.Trend";
    public static final String OEE_ID    = "open.industrial.OEE";
    public static final String PARETO_ID = "open.industrial.Pareto";

    public static final ComponentDescriptor TREND = chart(
        TREND_ID, "Industrial Trend",
        "Time-series process variable trend with setpoint and alarm limits.",
        IND, SCHEMA, "industrialTrend");

    public static final ComponentDescriptor OEE = chart(
        OEE_ID, "OEE Summary",
        "Overall Equipment Effectiveness multi-ring gauge (A/P/Q).",
        IND, SCHEMA, "oeeChart");

    public static final ComponentDescriptor PARETO = chart(
        PARETO_ID, "Pareto Chart",
        "Pareto analysis with bar counts and cumulative percentage line.",
        IND, SCHEMA, "paretoChart");

    /** All descriptors in registration order. */
    public static final List<ComponentDescriptor> ALL = List.of(
        EChart.DESCRIPTOR,
        LINE, BAR, PIE, SCATTER, GAUGE, STAT, HIERARCHY, RELATION, RADAR,
        TREND, OEE, PARETO
    );

    /** All component IDs in registration order. */
    public static final List<String> ALL_IDS = List.of(
        EChart.COMPONENT_ID,
        LINE_ID, BAR_ID, PIE_ID, SCATTER_ID, GAUGE_ID,
        STAT_ID, HIERARCHY_ID, RELATION_ID, RADAR_ID,
        TREND_ID, OEE_ID, PARETO_ID
    );
}
