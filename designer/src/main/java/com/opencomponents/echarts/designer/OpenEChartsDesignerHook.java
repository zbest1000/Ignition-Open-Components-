package com.opencomponents.echarts.designer;

import com.inductiveautomation.ignition.common.BundleUtil;
import com.inductiveautomation.ignition.common.licensing.LicenseState;
import com.inductiveautomation.ignition.common.util.LoggerEx;
import com.inductiveautomation.ignition.designer.model.AbstractDesignerModuleHook;
import com.inductiveautomation.ignition.designer.model.DesignerContext;
import com.inductiveautomation.perspective.designer.DesignerComponentRegistry;
import com.inductiveautomation.perspective.designer.api.PerspectiveDesignerInterface;

import com.opencomponents.echarts.common.components.ComponentDefs;

/**
 * Designer-scope hook for the Open ECharts module. Registers all components
 * onto the Perspective component palette.
 */
public class OpenEChartsDesignerHook extends AbstractDesignerModuleHook {

    private static final LoggerEx log =
        LoggerEx.newBuilder().build(OpenEChartsDesignerHook.class);

    private DesignerContext context;
    private DesignerComponentRegistry registry;

    static {
        BundleUtil.get().addBundle(
            "open-echarts",
            OpenEChartsDesignerHook.class.getClassLoader(),
            "open-echarts"
        );
    }

    @Override
    public void startup(DesignerContext context, LicenseState activationState) {
        log.info("Starting Open ECharts Designer hook.");
        this.context = context;
        init();
    }

    private void init() {
        PerspectiveDesignerInterface pdi = PerspectiveDesignerInterface.get(context);
        registry = pdi.getDesignerComponentRegistry();

        ComponentDefs.ALL.forEach(registry::registerComponent);
    }

    @Override
    public void shutdown() {
        log.info("Shutting down Open ECharts Designer hook.");
        if (registry != null) {
            ComponentDefs.ALL_IDS.forEach(registry::removeComponent);
        }
    }
}
