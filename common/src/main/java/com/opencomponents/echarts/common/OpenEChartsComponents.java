package com.opencomponents.echarts.common;

import java.util.Set;

import com.inductiveautomation.perspective.common.api.BrowserResource;

/**
 * Declares the browser resources (JS/CSS bundles) that all components in this
 * module share. These resources are loaded by the Perspective session when any
 * component from this module is present on a view.
 */
public class OpenEChartsComponents {

    public static final Set<BrowserResource> BROWSER_RESOURCES = Set.of(
        new BrowserResource(
            "open-echarts-js",
            String.format("/res/%s/OpenECharts.js", OpenEChartsConstants.MODULE_URL_ALIAS),
            BrowserResource.ResourceType.JS
        ),
        new BrowserResource(
            "open-echarts-css",
            String.format("/res/%s/OpenECharts.css", OpenEChartsConstants.MODULE_URL_ALIAS),
            BrowserResource.ResourceType.CSS
        )
    );
}
