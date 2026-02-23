package com.opencomponents.echarts.common;

import com.opencomponents.echarts.common.components.ComponentDefs;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.HashSet;

class ComponentDefsTest {

    @Test
    void allListHas40Components() {
        assertEquals(40, ComponentDefs.ALL.size(),
            "Should register exactly 40 components (1 universal + 26 2D + 8 3D + 3 GL + 3 industrial) but got "
            + ComponentDefs.ALL.size());
    }

    @Test
    void allIdsHas40Entries() {
        assertEquals(40, ComponentDefs.ALL_IDS.size());
    }

    @Test
    void allIdsAreUnique() {
        var unique = new HashSet<>(ComponentDefs.ALL_IDS);
        assertEquals(ComponentDefs.ALL_IDS.size(), unique.size(),
            "Component IDs must be unique");
    }

    @Test
    void allDescriptorsHaveNonNullId() {
        for (var descriptor : ComponentDefs.ALL) {
            assertNotNull(descriptor.id(), "Descriptor ID must not be null");
            assertFalse(descriptor.id().isBlank(), "Descriptor ID must not be blank");
        }
    }

    @Test
    void allDescriptorsHaveCorrectModuleId() {
        for (var descriptor : ComponentDefs.ALL) {
            assertEquals(OpenEChartsConstants.MODULE_ID, descriptor.moduleId(),
                "Descriptor " + descriptor.id() + " should have correct module ID");
        }
    }

    @Test
    void allDescriptorsHaveBrowserResources() {
        for (var descriptor : ComponentDefs.ALL) {
            assertNotNull(descriptor.browserResources(),
                "Descriptor " + descriptor.id() + " should have browser resources");
            assertFalse(descriptor.browserResources().isEmpty(),
                "Descriptor " + descriptor.id() + " should have non-empty browser resources");
        }
    }

    @Test
    void allDescriptorsHaveSchema() {
        for (var descriptor : ComponentDefs.ALL) {
            assertNotNull(descriptor.schema(),
                "Descriptor " + descriptor.id() + " should have a schema");
        }
    }

    @Test
    void allDescriptorsHaveEvents() {
        for (var descriptor : ComponentDefs.ALL) {
            assertNotNull(descriptor.events(),
                "Descriptor " + descriptor.id() + " should have events");
            assertTrue(descriptor.events().size() >= 2,
                "Descriptor " + descriptor.id() + " should have at least onClick and onDoubleClick");
        }
    }

    @Test
    void idsListMatchesDescriptorIds() {
        for (int i = 0; i < ComponentDefs.ALL.size(); i++) {
            assertEquals(ComponentDefs.ALL_IDS.get(i), ComponentDefs.ALL.get(i).id(),
                "ID list and descriptor list should be in sync at index " + i);
        }
    }

    @Test
    void industrialComponentsUseIndustrialCategory() {
        assertTrue(ComponentDefs.TREND.paletteCategory()
            .contains("Industrial"));
        assertTrue(ComponentDefs.OEE.paletteCategory()
            .contains("Industrial"));
        assertTrue(ComponentDefs.PARETO.paletteCategory()
            .contains("Industrial"));
    }

    @Test
    void threeDComponentsUse3DCategory() {
        assertTrue(ComponentDefs.BAR3D.paletteCategory()
            .contains("3D"));
        assertTrue(ComponentDefs.GLOBE.paletteCategory()
            .contains("3D"));
        assertTrue(ComponentDefs.SCATTERGL.paletteCategory()
            .contains("3D"));
    }
}
