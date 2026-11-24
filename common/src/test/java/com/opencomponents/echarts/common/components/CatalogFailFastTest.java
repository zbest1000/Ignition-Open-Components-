package com.opencomponents.echarts.common.components;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Set;

import com.inductiveautomation.ignition.common.gson.JsonArray;
import com.inductiveautomation.ignition.common.gson.JsonObject;
import org.junit.jupiter.api.Test;

/** A broken package must fail with a message that names the component and the resource. */
class CatalogFailFastTest {

    private static final String PIE = "open.echarts.PieChart";

    private static CatalogException failure(TestResources.Overlay source) {
        CatalogException e = assertThrows(CatalogException.class, () -> ComponentCatalog.load(source));
        assertEquals(Set.of(), source.leftOpen(), "Streams left open after a failed load");
        return e;
    }

    private static void assertMessageContains(CatalogException e, String... parts) {
        for (String part : parts) {
            assertTrue(e.getMessage().contains(part), "Expected \"" + part + "\" in: " + e.getMessage());
        }
    }

    /** The real manifest with the given field of the given component changed or removed. */
    private static String manifestWith(String id, String field, String value) {
        JsonObject manifest = TestResources.json(ComponentManifest.RESOURCE);
        for (var row : manifest.getAsJsonArray("components")) {
            if (row.getAsJsonObject().get("id").getAsString().equals(id)) {
                if (value == null) {
                    row.getAsJsonObject().remove(field);
                } else {
                    row.getAsJsonObject().addProperty(field, value);
                }
            }
        }
        return manifest.toString();
    }

    @Test
    void missingManifest() {
        CatalogException e = failure(new TestResources.Overlay().without(ComponentManifest.RESOURCE));
        assertMessageContains(e, "component manifest", "'components.manifest.json'", "not found on the classpath");
    }

    @Test
    void manifestThatIsNotJson() {
        CatalogException e = failure(new TestResources.Overlay().with(ComponentManifest.RESOURCE, "{\"components\": ["));
        assertMessageContains(e, "'components.manifest.json'", "not valid JSON");
    }

    @Test
    void manifestWithoutComponents() {
        CatalogException e = failure(new TestResources.Overlay().with(ComponentManifest.RESOURCE, "{\"components\": []}"));
        assertMessageContains(e, "'components.manifest.json'", "non-empty 'components' array");
    }

    @Test
    void manifestRowMissingARequiredField() {
        CatalogException e = failure(new TestResources.Overlay()
            .with(ComponentManifest.RESOURCE, manifestWith(PIE, "metaName", null)));
        assertMessageContains(e, "'components.manifest.json'", "component '" + PIE + "'", "'metaName'");
    }

    @Test
    void manifestRowWithoutAnId() {
        CatalogException e = failure(new TestResources.Overlay()
            .with(ComponentManifest.RESOURCE, "{\"components\": [{\"name\": \"x\"}]}"));
        assertMessageContains(e, "entry #0", "'id'");
    }

    @Test
    void manifestWithADuplicateId() {
        JsonObject manifest = TestResources.json(ComponentManifest.RESOURCE);
        JsonArray rows = manifest.getAsJsonArray("components");
        rows.add(rows.get(0).deepCopy());
        CatalogException e = failure(new TestResources.Overlay().with(ComponentManifest.RESOURCE, manifest.toString()));
        assertMessageContains(e, rows.get(0).getAsJsonObject().get("id").getAsString(), "more than once");
    }

    @Test
    void manifestWithADefaultOptionThatIsNotAnObject() {
        CatalogException e = failure(new TestResources.Overlay()
            .with(ComponentManifest.RESOURCE, manifestWith(PIE, "defaultOption", "pie")));
        assertMessageContains(e, "component '" + PIE + "'", "'defaultOption'");
    }

    @Test
    void missingPropSchemaNamesTheComponentAndTheResource() {
        CatalogException e = failure(new TestResources.Overlay()
            .with(ComponentManifest.RESOURCE, manifestWith(PIE, "schema", "props/does-not-exist.props.json")));
        assertMessageContains(e, "Component '" + PIE + "'", "'props/does-not-exist.props.json'",
            "not found on the classpath");
    }

    @Test
    void propSchemaThatIsNotJson() {
        CatalogException e = failure(new TestResources.Overlay()
            .with("props/industrial-oee.props.json", "{ \"type\": \"object\", "));
        assertMessageContains(e, "Component 'open.industrial.OEE'", "'props/industrial-oee.props.json'",
            "not valid JSON");
    }

    @Test
    void propSchemaThatIsNotAnObjectSchema() {
        CatalogException e = failure(new TestResources.Overlay()
            .with("props/industrial-oee.props.json", "{\"name\": \"oee\", \"schema\": {}}"));
        assertMessageContains(e, "Component 'open.industrial.OEE'", "'props/industrial-oee.props.json'",
            "\"properties\"");
    }

    @Test
    void missingEventDefinition() {
        CatalogException e = failure(new TestResources.Overlay().without("events/echart/onDataZoom.json"));
        assertMessageContains(e, "Event 'onDataZoom'", "'events/echart/onDataZoom.json'", "not found on the classpath");
    }

    @Test
    void eventDefinitionWithoutAPayloadSchema() {
        CatalogException e = failure(new TestResources.Overlay().with("events/echart/onClick.json",
            "{\"name\": \"onClick\", \"description\": \"d\", \"type\": \"object\", \"properties\": {}}"));
        assertMessageContains(e, "Event 'onClick'", "'events/echart/onClick.json'", "'schema' object");
    }

    @Test
    void eventDefinitionCopiedFromAnotherEvent() {
        CatalogException e = failure(new TestResources.Overlay()
            .with("events/echart/onDataZoom.json", TestResources.text("events/echart/onClick.json")));
        assertMessageContains(e, "Event 'onDataZoom'", "\"name\": \"onDataZoom\"");
    }
}
