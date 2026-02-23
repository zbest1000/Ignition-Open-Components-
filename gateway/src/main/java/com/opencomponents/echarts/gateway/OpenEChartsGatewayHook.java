package com.opencomponents.echarts.gateway;

import java.util.Optional;

import com.inductiveautomation.ignition.common.licensing.LicenseState;
import com.inductiveautomation.ignition.common.util.LoggerEx;
import com.inductiveautomation.ignition.gateway.dataroutes.RouteGroup;
import com.inductiveautomation.ignition.gateway.model.AbstractGatewayModuleHook;
import com.inductiveautomation.ignition.gateway.model.GatewayContext;
import com.inductiveautomation.perspective.common.api.ComponentRegistry;
import com.inductiveautomation.perspective.gateway.api.PerspectiveContext;

import com.opencomponents.echarts.common.OpenEChartsConstants;
import com.opencomponents.echarts.common.components.ComponentDefs;
import com.opencomponents.echarts.gateway.api.ThemeEndpoints;
import com.opencomponents.echarts.gateway.api.ThemeRepository;

/**
 * Gateway-scope hook for the Open ECharts module. Registers all Perspective
 * components, serves bundled web resources, and exposes a REST API for
 * theme management.
 */
public class OpenEChartsGatewayHook extends AbstractGatewayModuleHook {

    private static final LoggerEx log =
        LoggerEx.newBuilder().build(OpenEChartsGatewayHook.class);

    private GatewayContext gatewayContext;
    private PerspectiveContext perspectiveContext;
    private ComponentRegistry componentRegistry;
    private ThemeRepository themeRepository;
    private ThemeEndpoints themeEndpoints;

    @Override
    public void setup(GatewayContext context) {
        this.gatewayContext = context;
        this.themeRepository = new ThemeRepository(context.getSystemManager().getDataDir().toPath());
        this.themeEndpoints = new ThemeEndpoints(themeRepository);
        log.info("Setting up Open ECharts module.");
    }

    @Override
    public void startup(LicenseState activationState) {
        log.info("Starting Open ECharts module.");

        this.perspectiveContext = PerspectiveContext.get(this.gatewayContext);
        this.componentRegistry = this.perspectiveContext.getComponentRegistry();

        if (this.componentRegistry != null) {
            log.info("Registering " + ComponentDefs.ALL.size() + " Open ECharts components.");
            ComponentDefs.ALL.forEach(this.componentRegistry::registerComponent);
        } else {
            log.error("Component registry not found — Open ECharts components will not function.");
        }
    }

    @Override
    public void shutdown() {
        log.info("Shutting down Open ECharts module.");
        if (this.componentRegistry != null) {
            ComponentDefs.ALL_IDS.forEach(this.componentRegistry::removeComponent);
        } else {
            log.warn("Component registry was null during shutdown.");
        }
    }

    @Override
    public void mountRouteHandlers(RouteGroup routes) {
        themeEndpoints.mount(routes);
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
