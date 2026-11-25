package com.opencomponents.echarts.common.components;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

import com.inductiveautomation.ignition.common.gson.JsonElement;
import com.inductiveautomation.ignition.common.gson.JsonObject;
import com.inductiveautomation.ignition.common.gson.JsonParseException;
import com.inductiveautomation.ignition.common.gson.JsonParser;

/**
 * Where the manifest and the JSON schemas are read from. Paths are classpath
 * style without a leading slash, for example {@code props/echart.props.json}.
 */
@FunctionalInterface
public interface ResourceSource {

    /** The resources packaged with the module. */
    ResourceSource CLASSPATH = path -> ResourceSource.class.getResourceAsStream("/" + path);

    /**
     * Opens a resource.
     *
     * @return the stream, or {@code null} when the resource does not exist
     */
    InputStream open(String path) throws IOException;

    /**
     * Reads a resource as a JSON object and closes the stream.
     *
     * @param path    the resource to read
     * @param subject what the resource is, for error messages, e.g. {@code "Component 'x': prop schema"}
     * @throws CatalogException if the resource is missing, unreadable or not a JSON object
     */
    default JsonObject readObject(String path, String subject) {
        String text;
        try (InputStream in = open(path)) {
            if (in == null) {
                throw new CatalogException(String.format(
                    "%s resource '%s' was not found on the classpath.", subject, path));
            }
            text = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new CatalogException(String.format(
                "%s resource '%s' could not be read: %s", subject, path, e.getMessage()), e);
        }

        JsonElement parsed;
        try {
            parsed = JsonParser.parseString(text);
        } catch (JsonParseException e) {
            throw new CatalogException(String.format(
                "%s resource '%s' is not valid JSON: %s", subject, path, e.getMessage()), e);
        }
        if (!parsed.isJsonObject()) {
            throw new CatalogException(String.format(
                "%s resource '%s' must contain a JSON object.", subject, path));
        }
        return parsed.getAsJsonObject();
    }
}
