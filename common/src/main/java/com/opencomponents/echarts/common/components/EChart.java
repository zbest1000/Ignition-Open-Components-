package com.opencomponents.echarts.common.components;

import java.util.List;

import com.inductiveautomation.perspective.common.api.ComponentDescriptor;
import com.inductiveautomation.perspective.common.api.ComponentDescriptorImpl;
import com.inductiveautomation.perspective.common.api.ComponentEventDescriptor;

import com.opencomponents.echarts.common.OpenEChartsConstants;
import com.opencomponents.echarts.common.OpenEChartsComponents;
import com.opencomponents.echarts.common.utilities.ComponentUtilities;

/**
 * Descriptor for the universal EChart renderer component. This component
 * accepts any valid ECharts option JSON and renders it in a Perspective session.
 */
public class EChart {

    public static final String COMPONENT_ID = "open.echarts.EChart";

    private static final String PROPS_SCHEMA = "/props/echart.props.json";

    static ComponentEventDescriptor clickEvent = ComponentUtilities.getEventDescriptor(
        "events/echart/onClick.json",
        "onClick",
        "Fired when the chart is clicked."
    );

    static ComponentEventDescriptor doubleClickEvent = ComponentUtilities.getEventDescriptor(
        "events/echart/onDoubleClick.json",
        "onDoubleClick",
        "Fired when the chart is double-clicked."
    );

    public static ComponentDescriptor DESCRIPTOR = ComponentDescriptorImpl.ComponentBuilder.newBuilder()
        .setPaletteCategory(OpenEChartsConstants.COMPONENT_CATEGORY)
        .setId(COMPONENT_ID)
        .setModuleId(OpenEChartsConstants.MODULE_ID)
        .setSchema(ComponentUtilities.getSchemaFromFilePath(PROPS_SCHEMA))
        .setEvents(List.of(clickEvent, doubleClickEvent))
        .setName("ECharts Chart")
        .addPaletteEntry("", "ECharts Chart",
            "Universal ECharts renderer — supports all chart types via option JSON.", null, null)
        .setDefaultMetaName("echartsChart")
        .setResources(OpenEChartsComponents.BROWSER_RESOURCES)
        .build();
}
