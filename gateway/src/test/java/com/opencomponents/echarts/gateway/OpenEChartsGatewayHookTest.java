package com.opencomponents.echarts.gateway;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Proxy;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import com.inductiveautomation.ignition.gateway.model.GatewayContext;
import com.inductiveautomation.perspective.common.api.ComponentDescriptor;
import com.inductiveautomation.perspective.common.api.ComponentRegistry;
import org.junit.jupiter.api.Test;

import com.opencomponents.echarts.common.components.ComponentCatalog;

class OpenEChartsGatewayHookTest {

    private final Set<String> ownIds = Set.copyOf(ComponentCatalog.load().ids());

    /** A gateway context on which every call returns null, i.e. a gateway without Perspective. */
    private static GatewayContext gatewayWithoutPerspective() {
        return (GatewayContext) Proxy.newProxyInstance(
            GatewayContext.class.getClassLoader(),
            new Class<?>[] {GatewayContext.class},
            (proxy, method, args) -> null);
    }

    /** A hook wired to the given registry instead of a running Perspective module. */
    private static OpenEChartsGatewayHook hookFor(ComponentRegistry registry) {
        OpenEChartsGatewayHook hook = new OpenEChartsGatewayHook() {
            @Override
            protected ComponentRegistry findComponentRegistry() {
                return registry;
            }
        };
        hook.setup(gatewayWithoutPerspective());
        return hook;
    }

    private Set<String> ownComponentsIn(ComponentRegistry registry) {
        Set<String> present = new HashSet<>(registry.get().keySet());
        present.retainAll(ownIds);
        return present;
    }

    @Test
    void startupRegistersEveryComponentAndShutdownRemovesThem() {
        ComponentRegistry registry = new ComponentRegistry();
        Set<String> before = Set.copyOf(registry.get().keySet());
        OpenEChartsGatewayHook hook = hookFor(registry);

        hook.startup(null);
        assertEquals(ownIds, ownComponentsIn(registry));

        hook.shutdown();
        assertEquals(before, registry.get().keySet(), "Shutdown must remove exactly what startup added");
    }

    @Test
    void startupAndShutdownAreIdempotentAndTheHookCanBeRestarted() {
        ComponentRegistry registry = new ComponentRegistry();
        Set<String> before = Set.copyOf(registry.get().keySet());
        OpenEChartsGatewayHook hook = hookFor(registry);

        hook.shutdown();
        hook.startup(null);
        hook.startup(null);
        assertEquals(ownIds, ownComponentsIn(registry));

        hook.shutdown();
        hook.shutdown();
        assertEquals(before, registry.get().keySet());

        hook.startup(null);
        assertEquals(ownIds, ownComponentsIn(registry));
        hook.shutdown();
        assertEquals(before, registry.get().keySet());
    }

    @Test
    void aMissingPerspectiveModuleFailsStartupWithAClearMessage() {
        OpenEChartsGatewayHook hook = new OpenEChartsGatewayHook();
        hook.setup(gatewayWithoutPerspective());

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> hook.startup(null));
        assertTrue(e.getMessage().contains("Perspective module is not available"), e.getMessage());

        // Nothing was registered, so shutting down afterwards has nothing to do and must not throw.
        hook.shutdown();
    }

    @Test
    void aRegistrationFailureLeavesNoComponentBehindAndCanBeRetried() {
        String refused = ownIds.iterator().next();
        boolean[] refuse = {true};
        ComponentRegistry registry = new ComponentRegistry() {
            @Override
            public void registerComponent(ComponentDescriptor descriptor) {
                if (refuse[0] && descriptor.id().equals(refused)) {
                    throw new IllegalArgumentException("refused");
                }
                super.registerComponent(descriptor);
            }
        };
        OpenEChartsGatewayHook hook = hookFor(registry);

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> hook.startup(null));
        assertTrue(e.getMessage().contains(refused), e.getMessage());
        assertEquals(Set.of(), ownComponentsIn(registry), "No half-registered state");

        refuse[0] = false;
        hook.startup(null);
        assertEquals(ownIds, ownComponentsIn(registry));
        hook.shutdown();
    }

    @Test
    void servesTheWebBundleFromTheMountedFolderUnderTheModuleAlias() {
        OpenEChartsGatewayHook hook = new OpenEChartsGatewayHook();
        assertEquals(Optional.of("mounted"), hook.getMountedResourceFolder());
        assertEquals(Optional.of("open-echarts"), hook.getMountPathAlias());
        assertTrue(hook.isFreeModule());
        assertFalse(ownIds.isEmpty());
    }
}
