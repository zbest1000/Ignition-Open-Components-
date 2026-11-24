package com.opencomponents.echarts.common;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;
import java.util.regex.Pattern;

/**
 * Build-time facts stamped into {@code open-echarts-build.properties} by the
 * {@code generateBuildInfo} task of the {@code common} project. The file ships
 * in the common jar, so the gateway and the Designer always read the same values.
 */
public final class BuildInfo {

    static final String RESOURCE = "/open-echarts-build.properties";

    /** Only characters that are safe, unescaped, in a URL query value. */
    private static final Pattern SAFE = Pattern.compile("[0-9A-Za-z_-]{1,64}");

    private static final Properties PROPERTIES = read();

    private BuildInfo() {
    }

    /**
     * A short token that changes whenever a different build of the module is
     * installed. Empty when the stamp is unavailable (for example when the
     * classes are run without the Gradle-generated resource); callers then
     * fall back to unversioned URLs instead of failing.
     */
    public static String resourceVersion() {
        String value = PROPERTIES.getProperty("resourceVersion", "").trim();
        return SAFE.matcher(value).matches() ? value : "";
    }

    /** The module version this build was made from, or an empty string when unknown. */
    public static String moduleVersion() {
        return PROPERTIES.getProperty("moduleVersion", "").trim();
    }

    private static Properties read() {
        Properties properties = new Properties();
        try (InputStream in = BuildInfo.class.getResourceAsStream(RESOURCE)) {
            if (in != null) {
                properties.load(in);
            }
        } catch (IOException | IllegalArgumentException e) {
            // A missing or unreadable stamp only costs cache busting; it must not stop the module.
            properties.clear();
        }
        return properties;
    }
}
