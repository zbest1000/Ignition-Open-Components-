package com.opencomponents.echarts.common;

import java.util.Set;

import com.inductiveautomation.perspective.common.api.BrowserResource;

/**
 * Declares the browser resources (JS/CSS bundles) that all components in this
 * module share. Perspective loads them when any component from this module is
 * present on a view.
 *
 * <p>The URLs carry the build stamp as a query string
 * ({@code /res/open-echarts/OpenECharts.js?v=<stamp>}) so that a browser cannot
 * keep the bundle of a previously installed module version.
 *
 * <p>{@link BrowserResource}'s four-argument constructor (the {@code versionHash}
 * one) is deliberately not used: Perspective then requests
 * {@code OpenECharts.<hash>.js}, and the gateway's resource servlet looks that
 * exact file name up in {@code mounted/} without stripping the hash, so the
 * request would be a 404 unless the web build emitted hashed file names.
 */
public final class OpenEChartsComponents {

    public static final String JS_PATH = resourcePath("OpenECharts.js");

    public static final String CSS_PATH = resourcePath("OpenECharts.css");

    public static final Set<BrowserResource> BROWSER_RESOURCES = Set.of(
        new BrowserResource(
            "open-echarts-js",
            versioned(JS_PATH, BuildInfo.resourceVersion()),
            BrowserResource.ResourceType.JS
        ),
        new BrowserResource(
            "open-echarts-css",
            versioned(CSS_PATH, BuildInfo.resourceVersion()),
            BrowserResource.ResourceType.CSS
        )
    );

    private OpenEChartsComponents() {
    }

    private static String resourcePath(String fileName) {
        return String.format("/res/%s/%s", OpenEChartsConstants.MODULE_URL_ALIAS, fileName);
    }

    /** Appends {@code ?v=<version>} to a resource path; returns the path unchanged for an empty version. */
    static String versioned(String path, String version) {
        return version.isEmpty() ? path : path + "?v=" + version;
    }
}
