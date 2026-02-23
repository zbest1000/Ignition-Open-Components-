package com.opencomponents.echarts.common.utilities;

import com.inductiveautomation.ignition.common.jsonschema.JsonSchema;
import com.inductiveautomation.perspective.common.api.ComponentEventDescriptor;

/**
 * Shared helpers for loading component property schemas and event descriptors
 * from classpath JSON resources.
 */
public class ComponentUtilities {

    public static JsonSchema getSchemaFromFilePath(String resourcePath) {
        if (!resourcePath.startsWith("/")) {
            resourcePath = "/" + resourcePath;
        }
        return JsonSchema.parse(ComponentUtilities.class.getResourceAsStream(resourcePath));
    }

    private static class DynamicEventDescriptor extends ComponentEventDescriptor {
        public DynamicEventDescriptor(String filePath, String eventName, String description) {
            super(eventName, description, ComponentUtilities.getSchemaFromFilePath(filePath));
        }
    }

    public static ComponentEventDescriptor getEventDescriptor(
            String filePath, String eventName, String description) {
        return new DynamicEventDescriptor(filePath, eventName, description);
    }
}
