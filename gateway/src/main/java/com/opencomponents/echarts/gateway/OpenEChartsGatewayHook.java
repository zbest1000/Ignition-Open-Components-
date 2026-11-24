package com.opencomponents.echarts.gateway;

import java.util.List;
import java.util.Optional;

import com.inductiveautomation.ignition.common.licensing.LicenseState;
import com.inductiveautomation.ignition.common.util.LoggerEx;
import com.inductiveautomation.ignition.gateway.model.AbstractGatewayModuleHook;
import com.inductiveautomation.ignition.gateway.model.GatewayContext;
import com.inductiveautomation.perspective.common.api.ComponentRegistry;
import com.inductiveautomation.perspective.gateway.api.PerspectiveContext;

import com.opencomponents.echarts.common.OpenEChartsConstants;
import com.opencomponents.echarts.common.components.CatalogException;
import com.opencomponents.echarts.common.components.ComponentCatalog;
import com.opencomponents.echarts.common.components.ComponentRegistrar;

/**
 * Gateway-scope hook for the Open ECharts module. Registers the module's
 * Perspective components and serves the bundled web resources from
 * {@code mounted/} under {@code /res/open-echarts/}.
 */
public class OpenEChartsGatewayHook extends AbstractGatewayModuleHook {

    static final String PERSPECTIVE_UNAVAILABLE =
        "The Perspective module is not available on this gateway, so the Open ECharts components "
            + "cannot be registered. Install and enable Perspective, then restart the Open ECharts module.";

    private static final LoggerEx LOG =
        LoggerEx.newBuilder().build(OpenEChartsGatewayHook.class);

    private GatewayContext gatewayContext;
    /** Non-null exactly while this module's components are registered. */
    private ComponentRegistry componentRegistry;
    private List<String> registeredIds = List.of();

    @Override
    public void setup(GatewayContext context) {
        this.gatewayContext = context;
    }

    /**
     * Registers the components. Either all of them end up registered or none
     * does: any failure is logged, leaves the registry as it was and is
     * rethrown so the gateway reports the module as faulted.
     */
    @Override
    public synchronized void startup(LicenseState activationState) {
        if (componentRegistry != null) {
            LOG.warn("Open ECharts is already started; ignoring the repeated startup.");
            return;
        }
        try {
            ComponentCatalog catalog = ComponentCatalog.load();
            ComponentRegistry registry = findComponentRegistry();
            registeredIds = ComponentRegistrar.registerAll(registry, catalog.descriptors());
            componentRegistry = registry;
            LOG.infof("Registered %d Open ECharts components.", registeredIds.size());
        } catch (CatalogException e) {
            LOG.error("Open ECharts could not start because its packaged component definitions are invalid: "
                + e.getMessage(), e);
            throw e;
        } catch (IllegalStateException e) {
            LOG.error("Open ECharts could not start: " + e.getMessage(), e);
            throw e;
        }
    }

    /** Removes whatever {@link #startup} registered. Safe to call repeatedly or without a startup. */
    @Override
    public synchronized void shutdown() {
        if (componentRegistry == null) {
            return;
        }
        List<String> failed = ComponentRegistrar.removeAll(componentRegistry, registeredIds);
        if (!failed.isEmpty()) {
            LOG.warnf("Could not remove %d Open ECharts component(s) from the registry: %s", failed.size(), failed);
        }
        LOG.infof("Removed %d Open ECharts components.", registeredIds.size() - failed.size());
        componentRegistry = null;
        registeredIds = List.of();
    }

    /**
     * Finds Perspective's component registry.
     *
     * @throws IllegalStateException if Perspective is not installed or not running
     */
    protected ComponentRegistry findComponentRegistry() {
        if (gatewayContext == null) {
            throw new IllegalStateException("startup() was called before setup(); there is no gateway context.");
        }
        ComponentRegistry registry;
        try {
            // PerspectiveContext.get dereferences the Perspective module's hook, so it throws
            // (rather than returning null) when Perspective is absent.
            PerspectiveContext perspective = PerspectiveContext.get(gatewayContext);
            registry = perspective == null ? null : perspective.getComponentRegistry();
        } catch (RuntimeException | LinkageError e) {
            throw new IllegalStateException(PERSPECTIVE_UNAVAILABLE, e);
        }
        if (registry == null) {
            throw new IllegalStateException(PERSPECTIVE_UNAVAILABLE);
        }
        return registry;
    }

    @Override
    public Optional<String> getMountedResourceFolder() {
        return Optional.of("mounted");
    }

    @Override
    public Optional<String> getMountPathAlias() {
        return Optional.of(OpenEChartsConstants.MODULE_URL_ALIAS);
    }

    @Override
    public boolean isFreeModule() {
        return true;
    }
}
