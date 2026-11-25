package com.opencomponents.echarts.common.components;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.inductiveautomation.ignition.common.gson.JsonArray;
import com.inductiveautomation.ignition.common.gson.JsonElement;
import com.inductiveautomation.ignition.common.gson.JsonObject;

/**
 * Reads {@code components.manifest.json}, the single list of the components
 * this module provides. The web bundle is generated from the same file, so a
 * component cannot exist on the Java side only or on the browser side only.
 */
public final class ComponentManifest {

    /** Classpath location of the manifest. */
    public static final String RESOURCE = "components.manifest.json";

    private static final String SUBJECT = "Open ECharts component manifest";

    private ComponentManifest() {
    }

    /**
     * One manifest row. Only the fields the Java side needs are kept;
     * {@code cssClass}, {@code size} and {@code gl} are used by the web bundle.
     *
     * @param id            Perspective component id, e.g. {@code open.echarts.PieChart}
     * @param name          display name, also the palette label
     * @param description   palette tooltip
     * @param category      palette category
     * @param metaName      default name of a component dropped onto a view
     * @param schema        classpath location of the prop schema
     * @param defaultOption initial {@code option} prop of a newly dropped component, or {@code null}
     */
    public record Entry(String id, String name, String description, String category,
                        String metaName, String schema, JsonObject defaultOption) {

        /**
         * The props a component gets when it is dropped from the palette:
         * {@code {"option": defaultOption}}, or {@code null} when the row has no
         * {@code defaultOption} (the component then starts from its schema defaults).
         */
        public JsonObject initialProps() {
            if (defaultOption == null) {
                return null;
            }
            JsonObject props = new JsonObject();
            props.add("option", defaultOption.deepCopy());
            return props;
        }
    }

    /**
     * Loads and validates the manifest.
     *
     * @throws CatalogException if the manifest is missing or malformed
     */
    public static List<Entry> load(ResourceSource source) {
        JsonObject root = source.readObject(RESOURCE, SUBJECT);
        JsonElement components = root.get("components");
        if (components == null || !components.isJsonArray() || components.getAsJsonArray().size() == 0) {
            throw malformed("must have a non-empty 'components' array.");
        }

        JsonArray rows = components.getAsJsonArray();
        List<Entry> entries = new ArrayList<>(rows.size());
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < rows.size(); i++) {
            Entry entry = parseRow(rows.get(i), i);
            if (!ids.add(entry.id())) {
                throw malformed(String.format("lists component id '%s' more than once.", entry.id()));
            }
            entries.add(entry);
        }
        return List.copyOf(entries);
    }

    private static Entry parseRow(JsonElement element, int index) {
        if (!element.isJsonObject()) {
            throw malformed(String.format("entry #%d is not a JSON object.", index));
        }
        JsonObject row = element.getAsJsonObject();
        String id = requireString(row, "id", "entry #" + index);
        String where = String.format("component '%s'", id);

        JsonObject defaultOption = null;
        JsonElement option = row.get("defaultOption");
        if (option != null && !option.isJsonNull()) {
            if (!option.isJsonObject()) {
                throw malformed(String.format("%s: 'defaultOption' must be a JSON object.", where));
            }
            defaultOption = option.getAsJsonObject();
        }

        return new Entry(
            id,
            requireString(row, "name", where),
            requireString(row, "description", where),
            requireString(row, "category", where),
            requireString(row, "metaName", where),
            requireString(row, "schema", where),
            defaultOption);
    }

    private static String requireString(JsonObject row, String field, String where) {
        JsonElement value = row.get(field);
        boolean isString = value != null && value.isJsonPrimitive() && value.getAsJsonPrimitive().isString();
        if (!isString || value.getAsString().isBlank()) {
            throw malformed(String.format("%s: required field '%s' is missing or not a non-empty string.",
                where, field));
        }
        return value.getAsString();
    }

    private static CatalogException malformed(String problem) {
        return new CatalogException(String.format("%s '%s' %s", SUBJECT, RESOURCE, problem));
    }
}
