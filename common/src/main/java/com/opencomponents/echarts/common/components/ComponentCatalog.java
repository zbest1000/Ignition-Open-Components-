package com.opencomponents.echarts.common.components;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.swing.Icon;

import com.inductiveautomation.ignition.common.gson.JsonElement;
import com.inductiveautomation.ignition.common.gson.JsonObject;
import com.inductiveautomation.ignition.common.jsonschema.JsonSchema;
import com.inductiveautomation.perspective.common.api.ComponentDescriptor;
import com.inductiveautomation.perspective.common.api.ComponentDescriptorImpl;
import com.inductiveautomation.perspective.common.api.ComponentEventDescriptor;

import com.opencomponents.echarts.common.OpenEChartsComponents;
import com.opencomponents.echarts.common.OpenEChartsConstants;

/**
 * Every component of the module, built from {@code components.manifest.json}.
 * The gateway hook and the Designer hook both register and remove components
 * from this one list.
 *
 * <p>Loading validates the manifest and every prop and event schema it refers
 * to, and throws a {@link CatalogException} that names the component and the
 * resource when something is missing or malformed.
 */
public final class ComponentCatalog {

    private final List<ComponentManifest.Entry> entries;
    private final Map<String, JsonSchema> schemas;
    private final List<ComponentEventDescriptor> events;
    private final List<ComponentDescriptor> descriptors;

    private ComponentCatalog(ResourceSource source) {
        this.entries = ComponentManifest.load(source);
        this.events = ChartEvents.load(source);
        this.schemas = new HashMap<>();
        for (ComponentManifest.Entry entry : entries) {
            if (!schemas.containsKey(entry.schema())) {
                schemas.put(entry.schema(), loadPropSchema(source, entry));
            }
        }
        this.descriptors = buildDescriptors(null);
    }

    /**
     * Loads the catalog from the resources packaged with the module.
     *
     * @throws CatalogException if the manifest or a schema is missing or malformed
     */
    public static ComponentCatalog load() {
        return load(ResourceSource.CLASSPATH);
    }

    /**
     * Loads the catalog from the given resources.
     *
     * @throws CatalogException if the manifest or a schema is missing or malformed
     */
    public static ComponentCatalog load(ResourceSource source) {
        return new ComponentCatalog(source);
    }

    /** The manifest rows, in manifest order. */
    public List<ComponentManifest.Entry> entries() {
        return entries;
    }

    /** The component ids, in manifest order. */
    public List<String> ids() {
        return entries.stream().map(ComponentManifest.Entry::id).toList();
    }

    /** One descriptor per manifest row, in manifest order, without an icon (gateway scope). */
    public List<ComponentDescriptor> descriptors() {
        return descriptors;
    }

    /**
     * One descriptor per manifest row, in manifest order, each carrying the
     * given icon (Designer scope).
     *
     * @param icon the icon to show for the components, or {@code null} for none
     */
    public List<ComponentDescriptor> descriptors(Icon icon) {
        return icon == null ? descriptors : buildDescriptors(icon);
    }

    private List<ComponentDescriptor> buildDescriptors(Icon icon) {
        List<ComponentDescriptor> built = new ArrayList<>(entries.size());
        for (ComponentManifest.Entry entry : entries) {
            built.add(buildDescriptor(entry, icon));
        }
        return List.copyOf(built);
    }

    private ComponentDescriptor buildDescriptor(ComponentManifest.Entry entry, Icon icon) {
        try {
            ComponentDescriptorImpl.ComponentBuilder builder = ComponentDescriptorImpl.ComponentBuilder.newBuilder()
                .setPaletteCategory(entry.category())
                .setId(entry.id())
                .setModuleId(OpenEChartsConstants.MODULE_ID)
                .setSchema(schemas.get(entry.schema()))
                .setEvents(events)
                .setName(entry.name())
                .addPaletteEntry("", entry.name(), entry.description(), null, entry.initialProps())
                .setDefaultMetaName(entry.metaName())
                .setResources(OpenEChartsComponents.BROWSER_RESOURCES);
            if (icon != null) {
                builder.setIcon(icon);
            }
            return builder.build();
        } catch (RuntimeException e) {
            throw new CatalogException(String.format(
                "Component '%s': a descriptor could not be built from prop schema resource '%s': %s",
                entry.id(), entry.schema(), e.getMessage()), e);
        }
    }

    private static JsonSchema loadPropSchema(ResourceSource source, ComponentManifest.Entry entry) {
        String subject = String.format("Component '%s': prop schema", entry.id());
        JsonObject json = source.readObject(entry.schema(), subject);

        JsonElement type = json.get("type");
        JsonElement properties = json.get("properties");
        boolean isObjectSchema = type != null && type.isJsonPrimitive()
            && "object".equals(type.getAsString())
            && properties != null && properties.isJsonObject();
        if (!isObjectSchema) {
            throw new CatalogException(String.format(
                "%s resource '%s' must be {\"type\": \"object\", \"properties\": {...}}.",
                subject, entry.schema()));
        }
        try {
            return new JsonSchema(json);
        } catch (RuntimeException e) {
            throw new CatalogException(String.format(
                "%s resource '%s' is not a valid JSON schema: %s",
                subject, entry.schema(), e.getMessage()), e);
        }
    }
}
