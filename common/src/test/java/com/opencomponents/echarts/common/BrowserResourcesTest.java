package com.opencomponents.echarts.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import java.util.stream.Collectors;

import com.inductiveautomation.perspective.common.api.BrowserResource;
import org.junit.jupiter.api.Test;

class BrowserResourcesTest {

    @Test
    void buildStampIsGeneratedAndUrlSafe() {
        String stamp = BuildInfo.resourceVersion();
        assertTrue(stamp.matches("[0-9a-f]{12}"),
            "The Gradle build must stamp a 12-hex-digit resourceVersion, got '" + stamp + "'");
        assertFalse(BuildInfo.moduleVersion().isBlank(), "The module version must be stamped");
    }

    @Test
    void bundleUrlsCarryTheBuildStamp() {
        Map<BrowserResource.ResourceType, String> uris = OpenEChartsComponents.BROWSER_RESOURCES.stream()
            .collect(Collectors.toMap(r -> r.type, BrowserResource::buildResourceUri));

        String stamp = BuildInfo.resourceVersion();
        // buildResourceUri is what Perspective writes into the page; it must stay the file the
        // gateway actually serves (mounted/OpenECharts.js), plus the cache-busting query.
        assertEquals("/res/open-echarts/OpenECharts.js?v=" + stamp, uris.get(BrowserResource.ResourceType.JS));
        assertEquals("/res/open-echarts/OpenECharts.css?v=" + stamp, uris.get(BrowserResource.ResourceType.CSS));
        assertEquals(2, uris.size());
    }

    @Test
    void anUnavailableStampFallsBackToThePlainUrl() {
        assertEquals("/res/x/a.js", OpenEChartsComponents.versioned("/res/x/a.js", ""));
        assertEquals("/res/x/a.js?v=abc", OpenEChartsComponents.versioned("/res/x/a.js", "abc"));
    }
}
