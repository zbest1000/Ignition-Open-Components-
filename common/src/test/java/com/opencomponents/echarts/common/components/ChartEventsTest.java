package com.opencomponents.echarts.common.components;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import com.inductiveautomation.ignition.common.gson.JsonObject;
import com.inductiveautomation.ignition.common.gson.JsonParser;
import com.inductiveautomation.ignition.common.jsonschema.JsonSchema;
import com.inductiveautomation.perspective.common.api.ComponentEventDescriptor;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

/** The event payload schemas must describe what the web runtime sends (web/src/utils/eventPayload.ts). */
class ChartEventsTest {

    private static final Set<String> MOUSE_FIELDS = Set.of(
        "componentType", "seriesType", "seriesIndex", "seriesName", "name",
        "dataIndex", "data", "dataType", "value", "color", "percent");

    private static final Map<String, Set<String>> FIELDS = Map.of(
        "onClick", MOUSE_FIELDS,
        "onDoubleClick", MOUSE_FIELDS,
        "onMouseOver", MOUSE_FIELDS,
        "onMouseOut", MOUSE_FIELDS,
        "onLegendSelectChanged", Set.of("name", "selected"),
        "onDataZoom", Set.of("start", "end", "startValue", "endValue", "dataZoomId", "batch"),
        "onBrushSelected", Set.of("batch"));

    private static Map<String, ComponentEventDescriptor> events;

    @BeforeAll
    static void load() {
        events = ChartEvents.load(ResourceSource.CLASSPATH).stream()
            .collect(Collectors.toMap(ComponentEventDescriptor::getName, e -> e));
    }

    private static JsonSchema schema(String event) {
        return events.get(event).getSchema();
    }

    private static JsonObject payload(String json) {
        return JsonParser.parseString(json).getAsJsonObject();
    }

    private static void assertValid(String event, String json) {
        assertEquals(Set.of(), schema(event).validate(payload(json)), event + " should accept " + json);
    }

    private static void assertInvalid(String event, String json) {
        assertFalse(schema(event).validate(payload(json)).isEmpty(), event + " should reject " + json);
    }

    @Test
    void everyEventIsDefinedOnceWithADescription() {
        assertEquals(FIELDS.keySet(), events.keySet());
        assertEquals(FIELDS.keySet(), Set.copyOf(ChartEvents.NAMES));
        for (ComponentEventDescriptor event : events.values()) {
            assertFalse(event.getDescription().isBlank(), event.getName());
        }
    }

    @Test
    void schemasDeclareThePayloadFieldsNotTheWrapperFile() {
        for (Map.Entry<String, Set<String>> expected : FIELDS.entrySet()) {
            Set<String> declared = schema(expected.getKey()).getSchemasForProperties().keySet();
            // Parsing the whole {name, description, schema} file as a schema would declare nothing.
            assertEquals(expected.getValue(), declared, expected.getKey());
        }
    }

    @Test
    void brushBatchEntriesDeclareTheirFields() {
        List<JsonSchema> items = schema("onBrushSelected").getSchemasForProperties().get("batch").getSchemasForItems();
        assertEquals(1, items.size());
        assertEquals(Set.of("brushId", "brushIndex", "brushName", "areas", "selected"),
            items.get(0).getSchemasForProperties().keySet());
    }

    @Test
    void dataZoomBatchEntriesDeclareTheZoomWindow() {
        List<JsonSchema> items = schema("onDataZoom").getSchemasForProperties().get("batch").getSchemasForItems();
        assertEquals(Set.of("start", "end", "startValue", "endValue", "dataZoomId"),
            items.get(0).getSchemasForProperties().keySet());
    }

    @Test
    void pointerEventsAcceptARealPayloadAndRejectWrongTypes() {
        String real = "{\"componentType\":\"series\",\"seriesType\":\"pie\",\"seriesIndex\":0,"
            + "\"seriesName\":\"Access\",\"name\":\"Search\",\"dataIndex\":2,"
            + "\"data\":{\"value\":1048,\"name\":\"Search\"},\"value\":1048,\"color\":\"#5470c6\",\"percent\":36.4}";
        for (String event : List.of("onClick", "onDoubleClick", "onMouseOver", "onMouseOut")) {
            assertValid(event, real);
            assertValid(event, "{\"componentType\":\"series\",\"value\":[1,2,3],\"data\":[1,2,3]}");
            assertInvalid(event, "{\"seriesIndex\":\"zero\"}");
            assertInvalid(event, "{\"dataIndex\":1.5}");
            assertInvalid(event, "{\"seriesName\":7}");
            assertInvalid(event, "{\"percent\":\"36%\"}");
        }
    }

    @Test
    void legendEventRequiresBooleanSelectionStates() {
        assertValid("onLegendSelectChanged", "{\"name\":\"A\",\"selected\":{\"A\":false,\"B\":true}}");
        assertInvalid("onLegendSelectChanged", "{\"name\":\"A\",\"selected\":{\"A\":\"no\"}}");
        assertInvalid("onLegendSelectChanged", "{\"name\":\"A\",\"selected\":[true]}");
    }

    @Test
    void dataZoomEventAcceptsDirectAndBatchedForms() {
        assertValid("onDataZoom", "{\"start\":10,\"end\":62.5,\"dataZoomId\":\"dz-0\"}");
        assertValid("onDataZoom", "{\"batch\":[{\"start\":0,\"end\":50,\"startValue\":\"Mon\",\"endValue\":3}]}");
        assertInvalid("onDataZoom", "{\"start\":\"10%\"}");
        assertInvalid("onDataZoom", "{\"batch\":{\"start\":0}}");
        assertInvalid("onDataZoom", "{\"batch\":[{\"end\":\"far\"}]}");
    }

    @Test
    void brushEventAcceptsARealPayloadAndRejectsWrongTypes() {
        assertValid("onBrushSelected", "{\"batch\":[{\"brushId\":\"b\",\"brushIndex\":0,\"brushName\":\"n\","
            + "\"areas\":[{\"brushType\":\"rect\",\"range\":[[1,2],[3,4]]}],"
            + "\"selected\":[{\"seriesIndex\":0,\"seriesName\":\"s\",\"dataIndex\":[1,4]}]}]}");
        assertInvalid("onBrushSelected", "{\"batch\":\"none\"}");
        assertInvalid("onBrushSelected", "{\"batch\":[{\"brushIndex\":\"first\"}]}");
        assertInvalid("onBrushSelected", "{\"batch\":[{\"selected\":[{\"dataIndex\":[\"a\"]}]}]}");
        assertTrue(schema("onBrushSelected").getSchemasForProperties().containsKey("batch"));
    }
}
