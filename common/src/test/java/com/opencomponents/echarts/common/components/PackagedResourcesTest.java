package com.opencomponents.echarts.common.components;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import com.inductiveautomation.ignition.common.gson.JsonObject;
import org.junit.jupiter.api.Test;

/** Guards against schema files that nothing loads, and against the shared props drifting apart. */
class PackagedResourcesTest {

    /** Props every component has; their definitions must be the same in every schema file. */
    private static final List<String> BASE_PROPS = List.of(
        "theme", "renderer", "autoResize", "resizeDebounceMs", "notMerge", "lazyUpdate",
        "showLoading", "loadingOptions", "sanitizeTooltip", "ariaLabel", "style");

    private static Set<String> referencedPropSchemas() {
        Set<String> referenced = new TreeSet<>();
        ComponentCatalog.load().entries().forEach(entry -> referenced.add(entry.schema()));
        return referenced;
    }

    @Test
    void everyPropSchemaFileIsReferencedByTheManifest() {
        assertEquals(referencedPropSchemas(), new TreeSet<>(TestResources.jsonFilesIn("props")),
            "props/ must contain exactly the schema files the manifest refers to");
    }

    @Test
    void everyEventFileIsLoaded() {
        Set<String> loaded = new TreeSet<>();
        ChartEvents.NAMES.forEach(name -> loaded.add(ChartEvents.resourcePath(name)));
        assertEquals(loaded, new TreeSet<>(TestResources.jsonFilesIn("events")),
            "events/ must contain exactly the files ChartEvents loads");
    }

    @Test
    void loadingTheCatalogReadsEveryReferencedResourceAndClosesEveryStream() {
        TestResources.Overlay source = new TestResources.Overlay();
        ComponentCatalog.load(source);

        Set<String> expected = new HashSet<>(referencedPropSchemas());
        ChartEvents.NAMES.forEach(name -> expected.add(ChartEvents.resourcePath(name)));
        expected.add(ComponentManifest.RESOURCE);
        assertEquals(expected, source.opened());
        assertEquals(Set.of(), source.leftOpen(), "Streams left open");
    }

    @Test
    void basePropsAreIdenticalInEveryPropSchema() {
        Set<String> schemas = referencedPropSchemas();
        assertTrue(schemas.size() > 1, "Expected several prop schemas");

        String referencePath = schemas.iterator().next();
        JsonObject reference = TestResources.json(referencePath).getAsJsonObject("properties");
        for (String prop : BASE_PROPS) {
            assertTrue(reference.has(prop), referencePath + " must declare base prop '" + prop + "'");
        }
        for (String path : schemas) {
            JsonObject properties = TestResources.json(path).getAsJsonObject("properties");
            for (String prop : BASE_PROPS) {
                assertEquals(reference.get(prop), properties.get(prop),
                    "Base prop '" + prop + "' in " + path + " differs from " + referencePath);
            }
        }
    }

    @Test
    void basePropsSayWhatTheyDo() {
        JsonObject properties = TestResources.json("props/echart.props.json").getAsJsonObject("properties");

        JsonObject ariaLabel = properties.getAsJsonObject("ariaLabel");
        assertEquals("string", ariaLabel.get("type").getAsString());
        assertEquals("", ariaLabel.get("default").getAsString());
        assertTrue(ariaLabel.get("description").getAsString().contains("screen readers"));

        String theme = properties.getAsJsonObject("theme").get("description").getAsString();
        assertTrue(theme.contains("registered"), theme);
        assertFalse(theme.toLowerCase().contains("gateway"), "Themes are not gateway-managed: " + theme);
        assertFalse(theme.toLowerCase().contains("inline"), "Inline theme objects are not supported: " + theme);

        String sanitize = properties.getAsJsonObject("sanitizeTooltip").get("description").getAsString();
        assertTrue(sanitize.contains("non-http(s) links"), sanitize);
    }
}
