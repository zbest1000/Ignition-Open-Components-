package com.opencomponents.echarts.common.components;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import com.inductiveautomation.perspective.common.api.ComponentDescriptor;
import com.inductiveautomation.perspective.common.api.ComponentRegistry;
import org.junit.jupiter.api.Test;

class ComponentRegistrarTest {

    private final ComponentCatalog catalog = ComponentCatalog.load();

    /** A registry that refuses one component id. */
    private static final class RefusingRegistry extends ComponentRegistry {
        private final String refused;

        RefusingRegistry(String refused) {
            this.refused = refused;
        }

        @Override
        public void registerComponent(ComponentDescriptor descriptor) {
            if (descriptor.id().equals(refused)) {
                throw new IllegalArgumentException("refused");
            }
            super.registerComponent(descriptor);
        }
    }

    @Test
    void registersEveryComponentAndRemovesThemAgain() {
        // A real registry already holds Perspective's own components; those must be left alone.
        ComponentRegistry registry = new ComponentRegistry();
        Set<String> before = Set.copyOf(registry.get().keySet());

        List<String> registered = ComponentRegistrar.registerAll(registry, catalog.descriptors());
        assertEquals(catalog.ids(), registered);
        Set<String> expected = new HashSet<>(before);
        expected.addAll(catalog.ids());
        assertEquals(expected, registry.get().keySet());
        for (String id : catalog.ids()) {
            assertSame(catalog.descriptors().get(catalog.ids().indexOf(id)), registry.find(id).orElseThrow());
        }

        assertEquals(List.of(), ComponentRegistrar.removeAll(registry, registered));
        assertEquals(before, registry.get().keySet());
    }

    @Test
    void aFailedRegistrationLeavesNothingRegistered() {
        List<String> ids = catalog.ids();
        String refused = ids.get(ids.size() / 2);
        ComponentRegistry registry = new RefusingRegistry(refused);
        Set<String> before = Set.copyOf(registry.get().keySet());

        IllegalStateException e = assertThrows(IllegalStateException.class,
            () -> ComponentRegistrar.registerAll(registry, catalog.descriptors()));

        assertTrue(e.getMessage().contains("'" + refused + "'"), e.getMessage());
        assertEquals(before, registry.get().keySet(), "Earlier registrations must be rolled back");
    }

    @Test
    void removingIsSafeWhenNothingIsRegistered() {
        ComponentRegistry registry = new ComponentRegistry();
        Set<String> before = Set.copyOf(registry.get().keySet());
        assertEquals(List.of(), ComponentRegistrar.removeAll(registry, catalog.ids()));
        assertEquals(before, registry.get().keySet());
    }
}
