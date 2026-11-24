package com.opencomponents.echarts.common.components;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Component;
import java.awt.Graphics;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import javax.swing.Icon;

import com.inductiveautomation.ignition.common.gson.JsonArray;
import com.inductiveautomation.ignition.common.gson.JsonElement;
import com.inductiveautomation.ignition.common.gson.JsonObject;
import com.inductiveautomation.perspective.common.api.ComponentDescriptor;
import com.inductiveautomation.perspective.common.api.ComponentEventDescriptor;
import com.inductiveautomation.perspective.common.api.PaletteEntry;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import com.opencomponents.echarts.common.OpenEChartsComponents;
import com.opencomponents.echarts.common.OpenEChartsConstants;

/**
 * Checks the descriptors against the manifest, which is read here with plain
 * Gson so the test does not depend on the loader it is testing.
 */
class ComponentCatalogTest {

    private static ComponentCatalog catalog;
    private static JsonArray manifestRows;
    private static Map<String, ComponentDescriptor> byId;

    @BeforeAll
    static void load() {
        catalog = ComponentCatalog.load();
        manifestRows = TestResources.json(ComponentManifest.RESOURCE).getAsJsonArray("components");
        byId = catalog.descriptors().stream().collect(Collectors.toMap(ComponentDescriptor::id, d -> d));
    }

    @Test
    void everyManifestRowYieldsExactlyOneDescriptorInManifestOrder() {
        assertTrue(manifestRows.size() > 0, "The manifest must list components");
        List<String> manifestIds = manifestRows.asList().stream()
            .map(row -> row.getAsJsonObject().get("id").getAsString())
            .toList();

        assertEquals(manifestIds, catalog.ids());
        assertEquals(manifestIds, catalog.descriptors().stream().map(ComponentDescriptor::id).toList());
    }

    @Test
    void descriptorsCarryTheManifestFields() {
        for (JsonElement element : manifestRows) {
            JsonObject row = element.getAsJsonObject();
            String id = row.get("id").getAsString();
            ComponentDescriptor descriptor = byId.get(id);
            assertNotNull(descriptor, "No descriptor for manifest row " + id);

            assertEquals(row.get("name").getAsString(), descriptor.name(), id);
            assertEquals(row.get("category").getAsString(), descriptor.paletteCategory(), id);
            assertEquals(row.get("metaName").getAsString(), descriptor.defaultMetaName(), id);
            assertEquals(OpenEChartsConstants.MODULE_ID, descriptor.moduleId(), id);
            assertEquals(OpenEChartsComponents.BROWSER_RESOURCES, descriptor.browserResources(), id);
            assertFalse(descriptor.deprecated(), id);
        }
    }

    @Test
    void everyDescriptorHasAParsedPropSchemaWithTheSharedProps() {
        for (ComponentDescriptor descriptor : catalog.descriptors()) {
            assertNotNull(descriptor.schema(), descriptor.id());
            Set<String> declared = descriptor.schema().getSchemasForProperties().keySet();
            assertTrue(declared.containsAll(Set.of("option", "theme", "ariaLabel", "maps", "style")),
                descriptor.id() + " schema declares " + declared);
        }
    }

    @Test
    void paletteEntriesTakeLabelTooltipAndInitialPropsFromTheManifest() {
        for (JsonElement element : manifestRows) {
            JsonObject row = element.getAsJsonObject();
            String id = row.get("id").getAsString();
            List<PaletteEntry> entries = List.copyOf(byId.get(id).paletteEntries());
            assertEquals(1, entries.size(), id + " should have one palette entry");

            PaletteEntry entry = entries.get(0);
            assertEquals("", entry.getVariantId(), id);
            assertEquals(row.get("name").getAsString(), entry.getLabel(), id);
            assertEquals(row.get("description").getAsString(), entry.getTooltip(), id);

            if (row.has("defaultOption")) {
                JsonObject expected = new JsonObject();
                expected.add("option", row.get("defaultOption"));
                assertEquals(expected, entry.getInitialProps(), id + " initial props");
                // What the Designer asks for when the component is dropped.
                assertEquals(expected, byId.get(id).getInitialProps(""), id);
            } else {
                // Perspective turns "no initial props" into an empty object.
                assertEquals(new JsonObject(), entry.getInitialProps(),
                    id + " has no defaultOption, so no initial props");
            }
        }
    }

    @Test
    void aDroppedChartStartsAsItsOwnChartTypeNotAsABarChart() {
        assertEquals("pie", firstSeriesType("open.echarts.PieChart"));
        assertEquals("line", firstSeriesType("open.echarts.LineChart"));
        assertEquals("bar", firstSeriesType("open.echarts.BarChart"));

        // No two rows that declare a series may start as the same chart unless the manifest says so:
        // the initial option must be the row's own, not one shared default.
        for (JsonElement element : manifestRows) {
            JsonObject row = element.getAsJsonObject();
            if (row.has("defaultOption")) {
                JsonObject initial = byId.get(row.get("id").getAsString()).getInitialProps("");
                assertEquals(row.get("defaultOption"), initial.get("option"), row.get("id").getAsString());
            }
        }
    }

    private static String firstSeriesType(String id) {
        JsonObject option = byId.get(id).getInitialProps("").getAsJsonObject("option");
        return option.getAsJsonArray("series").get(0).getAsJsonObject().get("type").getAsString();
    }

    @Test
    void initialPropsAreCopiesSoOneDropCannotAlterTheNext() {
        ComponentManifest.Entry pie = catalog.entries().stream()
            .filter(e -> e.id().equals("open.echarts.PieChart")).findFirst().orElseThrow();
        JsonObject first = pie.initialProps();
        first.getAsJsonObject("option").addProperty("mutated", true);
        assertFalse(pie.initialProps().getAsJsonObject("option").has("mutated"));
    }

    /**
     * The gateway builds a component's props as a deep merge of the schema
     * defaults and the props saved in the view (ComponentModel calls
     * JsonUtilities.merge). A non-empty default for {@code option} would
     * therefore leak its keys (axes, tooltip...) into every user option that
     * does not set them, e.g. cartesian axes under a pie chart.
     */
    @Test
    void theSchemaDefaultForOptionIsEmptySoItCannotLeakIntoSavedOptions() {
        for (ComponentDescriptor descriptor : catalog.descriptors()) {
            JsonElement option = descriptor.defaultProperties().get("option");
            assertNotNull(option, descriptor.id() + " must default 'option' so the prop exists");
            assertEquals(new JsonObject(), option, descriptor.id() + " default option");
        }
    }

    @Test
    void idsAndMetaNamesAreUnique() {
        Set<String> ids = new HashSet<>();
        Set<String> metaNames = new HashSet<>();
        for (ComponentManifest.Entry entry : catalog.entries()) {
            assertTrue(ids.add(entry.id()), "Duplicate component id " + entry.id());
            assertTrue(metaNames.add(entry.metaName()), "Duplicate metaName " + entry.metaName());
        }
    }

    @Test
    void everyComponentDeclaresTheChartEvents() {
        for (ComponentDescriptor descriptor : catalog.descriptors()) {
            List<String> names = descriptor.events().stream().map(ComponentEventDescriptor::getName).toList();
            assertEquals(ChartEvents.NAMES, names, descriptor.id());
        }
    }

    @Test
    void gatewayDescriptorsHaveNoIconAndDesignerDescriptorsCarryTheGivenOne() {
        Icon icon = new Icon() {
            @Override
            public void paintIcon(Component c, Graphics g, int x, int y) {
                // nothing to paint
            }

            @Override
            public int getIconWidth() {
                return 16;
            }

            @Override
            public int getIconHeight() {
                return 16;
            }
        };

        for (ComponentDescriptor descriptor : catalog.descriptors()) {
            assertTrue(descriptor.getIcon().isEmpty(), descriptor.id());
        }
        List<ComponentDescriptor> withIcon = catalog.descriptors(icon);
        assertNotSame(catalog.descriptors(), withIcon);
        assertEquals(catalog.ids(), withIcon.stream().map(ComponentDescriptor::id).toList());
        for (ComponentDescriptor descriptor : withIcon) {
            assertSame(icon, descriptor.getIcon().orElseThrow(), descriptor.id());
        }
        assertSame(catalog.descriptors(), catalog.descriptors(null));
    }
}
