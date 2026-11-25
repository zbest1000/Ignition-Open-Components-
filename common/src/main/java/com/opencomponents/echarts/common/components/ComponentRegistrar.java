package com.opencomponents.echarts.common.components;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import com.inductiveautomation.perspective.common.api.ComponentDescriptor;
import com.inductiveautomation.perspective.common.api.ComponentRegistry;

/**
 * Registers and removes a set of components as a unit. Used by both the
 * gateway hook and the Designer hook (the Designer's registry is a
 * {@link ComponentRegistry} subclass).
 */
public final class ComponentRegistrar {

    private ComponentRegistrar() {
    }

    /**
     * Registers every descriptor, or none: if one registration fails, the
     * components registered so far are removed again before the failure is
     * rethrown.
     *
     * @return the ids that were registered, in registration order
     * @throws IllegalStateException if a component could not be registered
     */
    public static List<String> registerAll(ComponentRegistry registry,
                                           Collection<ComponentDescriptor> descriptors) {
        List<String> registered = new ArrayList<>(descriptors.size());
        for (ComponentDescriptor descriptor : descriptors) {
            try {
                registry.registerComponent(descriptor);
            } catch (RuntimeException e) {
                removeAll(registry, registered);
                throw new IllegalStateException(String.format(
                    "Could not register Perspective component '%s'; the %d component(s) registered "
                        + "before it were removed again.", descriptor.id(), registered.size()), e);
            }
            registered.add(descriptor.id());
        }
        return List.copyOf(registered);
    }

    /**
     * Removes the given component ids. A failure to remove one id does not
     * stop the others from being removed.
     *
     * @return the ids that could not be removed
     */
    public static List<String> removeAll(ComponentRegistry registry, Collection<String> ids) {
        List<String> failed = new ArrayList<>();
        for (String id : ids) {
            try {
                registry.removeComponent(id);
            } catch (RuntimeException e) {
                failed.add(id);
            }
        }
        return failed;
    }
}
