package com.opencomponents.echarts.common.components;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.inductiveautomation.ignition.common.gson.JsonElement;
import com.inductiveautomation.ignition.common.gson.JsonNull;
import com.inductiveautomation.ignition.common.gson.JsonObject;
import com.inductiveautomation.ignition.common.gson.JsonPrimitive;
import com.inductiveautomation.ignition.common.jsonschema.JsonSchema;
import com.inductiveautomation.perspective.common.api.ComponentDescriptor;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** The prop schemas the descriptors are bound to, exercised through the parsed {@link JsonSchema}. */
class PropSchemaTest {

    /** Domain props each industrial component must expose so they can be set and bound in the Designer. */
    private static final Map<String, List<String>> DOMAIN_PROPS = Map.ofEntries(
        Map.entry("open.industrial.Trend", List.of("data", "limits", "yAxisLabel", "showSetpoint", "showDataZoom")),
        Map.entry("open.industrial.OEE", List.of("availability", "performance", "quality", "oeeOverride", "showLabels")),
        Map.entry("open.industrial.Pareto", List.of("categories", "counts", "showCumulativeLine", "show80PercentLine")),
        Map.entry("open.industrial.SPCChart", List.of("values", "subgroupSize", "showUCL", "showLCL",
            "showCenterLine", "showMRChart", "showRunRules", "title")),
        Map.entry("open.industrial.StateTimeline", List.of("events", "stateColors", "title")),
        Map.entry("open.industrial.Gantt", List.of("tasks", "showProgress", "title")),
        Map.entry("open.industrial.ScheduleCalendar", List.of("year", "entries", "shiftColors", "showLegend", "title")),
        Map.entry("open.industrial.ShiftCalendar", List.of("patterns", "crews", "dateRange", "title")),
        Map.entry("open.industrial.DowntimeTracker", List.of("events", "categoryColors", "showSummary", "title")),
        Map.entry("open.industrial.BatchTimeline", List.of("phases", "phaseColors", "title")),
        Map.entry("open.industrial.ResourceHeatmap", List.of("resources", "timeSlots", "utilization", "maxValue", "title"))
    );

    private static Map<String, ComponentDescriptor> byId;

    @BeforeAll
    static void load() {
        byId = ComponentCatalog.load().descriptors().stream()
            .collect(Collectors.toMap(ComponentDescriptor::id, d -> d));
    }

    private static JsonObject props(String key, JsonElement value) {
        JsonObject props = new JsonObject();
        props.add(key, value);
        return props;
    }

    @Test
    void industrialComponentsBindSchemasThatDeclareTheirDomainProps() {
        for (Map.Entry<String, List<String>> expected : DOMAIN_PROPS.entrySet()) {
            ComponentDescriptor descriptor = byId.get(expected.getKey());
            assertTrue(descriptor != null, "Manifest no longer lists " + expected.getKey());
            Set<String> declared = descriptor.schema().getSchemasForProperties().keySet();
            assertTrue(declared.containsAll(expected.getValue()),
                expected.getKey() + " must declare " + expected.getValue() + " but declares " + declared);
        }
    }

    @Test
    void genericChartsDoNotCarryIndustrialProps() {
        Set<String> declared = byId.get("open.echarts.LineChart").schema().getSchemasForProperties().keySet();
        assertFalse(declared.contains("tasks"));
        assertFalse(declared.contains("availability"));
    }

    @Test
    void schemasRejectUnknownPropsAndWrongTypes() {
        JsonSchema schema = byId.get("open.echarts.PieChart").schema();
        assertEquals(Set.of(), schema.validate(props("renderer", new JsonPrimitive("svg"))));
        assertFalse(schema.validate(props("renderer", new JsonPrimitive("webgl"))).isEmpty(), "enum");
        assertFalse(schema.validate(props("autoResize", new JsonPrimitive("yes"))).isEmpty(), "type");
        assertFalse(schema.validate(props("ariaLabel", new JsonPrimitive(5))).isEmpty(), "ariaLabel type");
        assertFalse(schema.validate(props("noSuchProp", new JsonPrimitive(1))).isEmpty(), "additionalProperties");
    }

    @Test
    void oeeOverrideIsANumberOrNull() {
        ComponentDescriptor oee = byId.get("open.industrial.OEE");
        JsonSchema schema = oee.schema();

        assertEquals(Set.of(), schema.validate(props("oeeOverride", JsonNull.INSTANCE)));
        assertEquals(Set.of(), schema.validate(props("oeeOverride", new JsonPrimitive(87.5))));
        assertFalse(schema.validate(props("oeeOverride", new JsonPrimitive("87"))).isEmpty());
        // The declared default (null) must itself be valid against the declared type.
        assertTrue(oee.defaultProperties().get("oeeOverride").isJsonNull());
        assertEquals(Set.of(), schema.validate(oee.defaultProperties()));
    }

    @Test
    void spcSubgroupSizeIsLimitedToTheSupportedChartTypes() {
        JsonSchema schema = byId.get("open.industrial.SPCChart").schema();
        assertEquals(Set.of(), schema.validate(props("subgroupSize", new JsonPrimitive(1))));
        assertEquals(Set.of(), schema.validate(props("subgroupSize", new JsonPrimitive(10))));
        assertFalse(schema.validate(props("subgroupSize", new JsonPrimitive(0))).isEmpty());
        assertFalse(schema.validate(props("subgroupSize", new JsonPrimitive(11))).isEmpty());
    }

    @Test
    void trendLimitsMayBeNull() {
        JsonSchema schema = byId.get("open.industrial.Trend").schema();
        JsonObject limits = new JsonObject();
        limits.add("hiAlarm", JsonNull.INSTANCE);
        limits.addProperty("loAlarm", 10);
        assertEquals(Set.of(), schema.validate(props("limits", limits)));
        limits.addProperty("hiWarning", "high");
        assertFalse(schema.validate(props("limits", limits)).isEmpty());
    }

    @Test
    void aDroppedShiftCalendarAndResourceHeatmapArePopulated() {
        JsonObject shift = byId.get("open.industrial.ShiftCalendar").defaultProperties();
        Set<String> patterns = shift.getAsJsonArray("patterns").asList().stream()
            .map(p -> p.getAsJsonObject().get("name").getAsString()).collect(Collectors.toSet());
        assertFalse(patterns.isEmpty());
        assertFalse(shift.getAsJsonArray("crews").isEmpty());
        for (JsonElement crew : shift.getAsJsonArray("crews")) {
            assertTrue(patterns.contains(crew.getAsJsonObject().get("pattern").getAsString()),
                "Default crew refers to an undefined pattern: " + crew);
        }

        JsonObject heatmap = byId.get("open.industrial.ResourceHeatmap").defaultProperties();
        int rows = heatmap.getAsJsonArray("resources").size();
        int columns = heatmap.getAsJsonArray("timeSlots").size();
        assertEquals(rows, heatmap.getAsJsonArray("utilization").size(), "one utilization row per resource");
        for (JsonElement row : heatmap.getAsJsonArray("utilization")) {
            assertEquals(columns, row.getAsJsonArray().size(), "one utilization value per time slot");
        }
    }

    @Test
    void everySchemaAcceptsItsOwnDefaults() {
        for (ComponentDescriptor descriptor : byId.values()) {
            assertEquals(Set.of(), descriptor.schema().validate(descriptor.defaultProperties()),
                descriptor.id() + " defaults must satisfy its own schema");
        }
    }

    @Test
    void initialPropsSatisfyTheSchema() {
        for (ComponentDescriptor descriptor : byId.values()) {
            JsonObject initial = descriptor.getInitialProps("");
            if (initial != null) {
                assertEquals(Set.of(), descriptor.schema().validate(initial), descriptor.id());
            }
        }
    }
}
