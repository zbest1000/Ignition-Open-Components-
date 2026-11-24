package com.opencomponents.echarts.common.components;

import java.util.ArrayList;
import java.util.List;

import com.inductiveautomation.ignition.common.gson.JsonElement;
import com.inductiveautomation.ignition.common.gson.JsonObject;
import com.inductiveautomation.ignition.common.jsonschema.JsonSchema;
import com.inductiveautomation.perspective.common.api.ComponentEventDescriptor;

/**
 * The component events every chart fires. Each event is described by one file,
 * {@code events/echart/<name>.json}, of the form
 * {@code {"name": ..., "description": ..., "schema": {...}}} where
 * {@code schema} is the JSON schema of the event payload.
 */
public final class ChartEvents {

    /** Event names, in the order they are shown in the Designer. */
    public static final List<String> NAMES = List.of(
        "onClick",
        "onDoubleClick",
        "onMouseOver",
        "onMouseOut",
        "onLegendSelectChanged",
        "onDataZoom",
        "onBrushSelected"
    );

    private ChartEvents() {
    }

    /** Classpath location of an event's definition file. */
    public static String resourcePath(String eventName) {
        return "events/echart/" + eventName + ".json";
    }

    /**
     * Loads the event descriptors.
     *
     * @throws CatalogException if an event file is missing or malformed
     */
    public static List<ComponentEventDescriptor> load(ResourceSource source) {
        List<ComponentEventDescriptor> events = new ArrayList<>(NAMES.size());
        for (String name : NAMES) {
            events.add(loadEvent(source, name));
        }
        return List.copyOf(events);
    }

    private static ComponentEventDescriptor loadEvent(ResourceSource source, String name) {
        String path = resourcePath(name);
        String subject = String.format("Event '%s': definition", name);
        JsonObject file = source.readObject(path, subject);

        if (!name.equals(stringOrNull(file.get("name")))) {
            throw malformed(subject, path, String.format("must have \"name\": \"%s\".", name));
        }
        String description = stringOrNull(file.get("description"));
        if (description == null || description.isBlank()) {
            throw malformed(subject, path, "must have a non-empty 'description' string.");
        }
        // The payload schema is the nested 'schema' object, not the file itself.
        JsonElement schema = file.get("schema");
        if (schema == null || !schema.isJsonObject()) {
            throw malformed(subject, path, "must have a 'schema' object.");
        }
        JsonObject payload = schema.getAsJsonObject();
        JsonElement properties = payload.get("properties");
        if (!"object".equals(stringOrNull(payload.get("type")))
                || properties == null || !properties.isJsonObject()) {
            throw malformed(subject, path,
                "'schema' must be {\"type\": \"object\", \"properties\": {...}}.");
        }

        try {
            return new ComponentEventDescriptor(name, description, new JsonSchema(payload));
        } catch (RuntimeException e) {
            throw new CatalogException(String.format(
                "%s resource '%s' has a 'schema' that is not a valid JSON schema: %s",
                subject, path, e.getMessage()), e);
        }
    }

    private static String stringOrNull(JsonElement value) {
        boolean isString = value != null && value.isJsonPrimitive() && value.getAsJsonPrimitive().isString();
        return isString ? value.getAsString() : null;
    }

    private static CatalogException malformed(String subject, String path, String problem) {
        return new CatalogException(String.format("%s resource '%s' %s", subject, path, problem));
    }
}
