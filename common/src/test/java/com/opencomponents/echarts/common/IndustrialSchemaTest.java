package com.opencomponents.echarts.common;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import com.inductiveautomation.ignition.common.gson.JsonObject;
import com.inductiveautomation.ignition.common.gson.JsonParser;
import com.opencomponents.echarts.common.components.ComponentDefs;
import com.opencomponents.echarts.common.components.EChart;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Verifies that the industrial components bind to dedicated property schemas
 * that declare their domain props (so they are settable in the Designer), and
 * that every chart declares the full set of chart events.
 */
class IndustrialSchemaTest {

    private JsonObject load(String resourcePath) {
        try (InputStream in = getClass().getResourceAsStream(resourcePath)) {
            assertNotNull(in, "Resource must exist on the classpath: " + resourcePath);
            String text = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            return JsonParser.parseString(text).getAsJsonObject();
        } catch (Exception e) {
            fail("Failed to load/parse " + resourcePath + ": " + e.getMessage());
            return null;
        }
    }

    private void assertSchemaDeclares(String path, String... keys) {
        JsonObject props = load(path).getAsJsonObject("properties");
        assertNotNull(props, path + " must have a 'properties' object");
        assertTrue(props.has("option"), path + " must declare 'option'");
        assertTrue(props.has("style"), path + " must declare 'style'");
        for (String key : keys) {
            assertTrue(props.has(key), path + " must declare domain prop '" + key + "'");
        }
    }

    @Test
    void spcSchemaDeclaresDomainProps() {
        assertSchemaDeclares("/props/industrial-spc.props.json",
            "values", "subgroupSize", "showUCL", "showLCL",
            "showCenterLine", "showMRChart", "showRunRules", "title");
    }

    @Test
    void stateTimelineSchemaDeclaresDomainProps() {
        assertSchemaDeclares("/props/industrial-state-timeline.props.json",
            "events", "stateColors", "title");
    }

    @Test
    void ganttSchemaDeclaresDomainProps() {
        assertSchemaDeclares("/props/industrial-gantt.props.json",
            "tasks", "showProgress", "title");
    }

    @Test
    void scheduleCalendarSchemaDeclaresDomainProps() {
        assertSchemaDeclares("/props/industrial-schedule-calendar.props.json",
            "year", "entries", "shiftColors", "showLegend", "title");
    }

    @Test
    void shiftCalendarSchemaDeclaresDomainProps() {
        assertSchemaDeclares("/props/industrial-shift-calendar.props.json",
            "patterns", "crews", "dateRange", "title");
    }

    @Test
    void downtimeTrackerSchemaDeclaresDomainProps() {
        assertSchemaDeclares("/props/industrial-downtime-tracker.props.json",
            "events", "categoryColors", "showSummary", "title");
    }

    @Test
    void batchTimelineSchemaDeclaresDomainProps() {
        assertSchemaDeclares("/props/industrial-batch-timeline.props.json",
            "phases", "phaseColors", "title");
    }

    @Test
    void resourceHeatmapSchemaDeclaresDomainProps() {
        assertSchemaDeclares("/props/industrial-resource-heatmap.props.json",
            "resources", "timeSlots", "utilization", "maxValue", "title");
    }

    @Test
    void industrialDescriptorsBindTheirDedicatedSchemas() {
        // Each industrial descriptor must resolve a schema that declares its
        // domain props — guards against a regression that rebinds them to the
        // shared echart schema (which would make those props unsettable).
        assertTrue(ComponentDefs.SPC.schema().getSchemasForProperties().containsKey("values"));
        assertTrue(ComponentDefs.STATE_TIMELINE.schema().getSchemasForProperties().containsKey("events"));
        assertTrue(ComponentDefs.GANTT.schema().getSchemasForProperties().containsKey("tasks"));
        assertTrue(ComponentDefs.SCHEDULE_CALENDAR.schema().getSchemasForProperties().containsKey("entries"));
        assertTrue(ComponentDefs.SHIFT_CALENDAR.schema().getSchemasForProperties().containsKey("patterns"));
        assertTrue(ComponentDefs.DOWNTIME_TRACKER.schema().getSchemasForProperties().containsKey("events"));
        assertTrue(ComponentDefs.BATCH_TIMELINE.schema().getSchemasForProperties().containsKey("phases"));
        assertTrue(ComponentDefs.RESOURCE_HEATMAP.schema().getSchemasForProperties().containsKey("utilization"));

        // The shared schema (used by standard charts) must NOT carry domain props.
        assertFalse(ComponentDefs.LINE.schema().getSchemasForProperties().containsKey("tasks"));
    }

    @Test
    void allChartsDeclareSevenEvents() {
        assertEquals(7, EChart.DESCRIPTOR.events().size(),
            "Universal EChart should declare 7 events");
        assertEquals(7, ComponentDefs.LINE.events().size(),
            "Standard charts should declare 7 events");
        assertEquals(7, ComponentDefs.SPC.events().size(),
            "Industrial charts should declare 7 events");
    }

    @Test
    void eventSchemaResourcesExistAndParse() {
        List<String> events = List.of(
            "/events/echart/onClick.json",
            "/events/echart/onDoubleClick.json",
            "/events/echart/onMouseOver.json",
            "/events/echart/onMouseOut.json",
            "/events/echart/onLegendSelectChanged.json",
            "/events/echart/onDataZoom.json",
            "/events/echart/onBrushSelected.json");
        for (String path : events) {
            JsonObject root = load(path);
            assertTrue(root.has("name"), path + " must have 'name'");
            assertTrue(root.has("schema"), path + " must have 'schema'");
        }
    }
}
