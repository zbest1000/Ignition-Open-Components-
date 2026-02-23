package com.opencomponents.echarts.common;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class BrowserResourcesTest {

    @Test
    void browserResourcesContainsTwoEntries() {
        var resources = OpenEChartsComponents.BROWSER_RESOURCES;
        assertNotNull(resources);
        assertEquals(2, resources.size(), "Should have JS and CSS resources");
    }

    @Test
    void browserResourcesAreNotNull() {
        for (var r : OpenEChartsComponents.BROWSER_RESOURCES) {
            assertNotNull(r, "Each browser resource must not be null");
        }
    }
}
