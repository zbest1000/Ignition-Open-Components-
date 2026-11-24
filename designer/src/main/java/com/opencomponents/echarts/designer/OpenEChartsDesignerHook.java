package com.opencomponents.echarts.designer;

import java.util.List;

import javax.swing.Icon;

import com.inductiveautomation.ignition.common.BundleUtil;
import com.inductiveautomation.ignition.common.licensing.LicenseState;
import com.inductiveautomation.ignition.common.util.LoggerEx;
import com.inductiveautomation.ignition.designer.model.AbstractDesignerModuleHook;
import com.inductiveautomation.ignition.designer.model.DesignerContext;
import com.inductiveautomation.ignition.designer.navtree.icon.InteractiveSvgIcon;
import com.inductiveautomation.perspective.common.api.ComponentRegistry;
import com.inductiveautomation.perspective.designer.api.PerspectiveDesignerInterface;

import com.opencomponents.echarts.common.components.CatalogException;
import com.opencomponents.echarts.common.components.ComponentCatalog;
import com.opencomponents.echarts.common.components.ComponentRegistrar;

/**
 * Designer-scope hook for the Open ECharts module. Puts the module's
 * components on the Perspective component palette.
 */
public class OpenEChartsDesignerHook extends AbstractDesignerModuleHook {

    static final String BUNDLE_PREFIX = "open-echarts";

    /** Classpath location of the component icon (an SVG, rendered at 16x16). */
    static final String ICON_RESOURCE = "images/echart-icon.svg";

    static final String PERSPECTIVE_UNAVAILABLE =
        "The Perspective module is not available in this Designer, so the Open ECharts components "
            + "cannot be added to the component palette.";

    private static final LoggerEx LOG =
        LoggerEx.newBuilder().build(OpenEChartsDesignerHook.class);

    private DesignerContext context;
    /** Non-null exactly while this module's components are registered. */
    private ComponentRegistry registry;
    private List<String> registeredIds = List.of();

    /**
     * Registers the components. Either all of them end up registered or none
     * does: any failure is logged, leaves the registry as it was and is rethrown.
     */
    @Override
    public synchronized void startup(DesignerContext context, LicenseState activationState) {
        if (registry != null) {
            LOG.warn("Open ECharts is already started in this Designer; ignoring the repeated startup.");
            return;
        }
        this.context = context;
        try {
            ComponentCatalog catalog = ComponentCatalog.load();
            ComponentRegistry found = findComponentRegistry();
            registeredIds = ComponentRegistrar.registerAll(found, catalog.descriptors(loadIcon()));
            registry = found;
            BundleUtil.get().addBundle(BUNDLE_PREFIX, OpenEChartsDesignerHook.class.getClassLoader(), BUNDLE_PREFIX);
            LOG.infof("Added %d Open ECharts components to the Perspective palette.", registeredIds.size());
        } catch (CatalogException e) {
            this.context = null;
            LOG.error("Open ECharts could not start because its packaged component definitions are invalid: "
                + e.getMessage(), e);
            throw e;
        } catch (IllegalStateException e) {
            this.context = null;
            LOG.error("Open ECharts could not start: " + e.getMessage(), e);
            throw e;
        }
    }

    /** Removes whatever {@link #startup} registered. Safe to call repeatedly or without a startup. */
    @Override
    public synchronized void shutdown() {
        if (registry == null) {
            return;
        }
        List<String> failed = ComponentRegistrar.removeAll(registry, registeredIds);
        if (!failed.isEmpty()) {
            LOG.warnf("Could not remove %d Open ECharts component(s) from the palette: %s", failed.size(), failed);
        }
        BundleUtil.get().removeBundle(BUNDLE_PREFIX);
        registry = null;
        registeredIds = List.of();
        context = null;
    }

    /**
     * Finds the Designer's Perspective component registry.
     *
     * @throws IllegalStateException if Perspective is not installed in the Designer
     */
    protected ComponentRegistry findComponentRegistry() {
        ComponentRegistry found;
        try {
            // PerspectiveDesignerInterface.get returns null when the Perspective module has no
            // Designer hook, and throws when its classes cannot be loaded.
            PerspectiveDesignerInterface perspective = PerspectiveDesignerInterface.get(context);
            found = perspective == null ? null : perspective.getDesignerComponentRegistry();
        } catch (RuntimeException | LinkageError e) {
            throw new IllegalStateException(PERSPECTIVE_UNAVAILABLE, e);
        }
        if (found == null) {
            throw new IllegalStateException(PERSPECTIVE_UNAVAILABLE);
        }
        return found;
    }

    /**
     * Loads the icon shown for the components. The components work without
     * it, so a failure is logged and {@code null} is returned.
     */
    protected Icon loadIcon() {
        try {
            return createIcon();
        } catch (RuntimeException | LinkageError e) {
            LOG.warn("The Open ECharts component icon could not be loaded; components will use the default icon.", e);
            return null;
        }
    }

    /** Builds the SVG icon; throws if the resource is missing or cannot be rendered. */
    static Icon createIcon() {
        if (OpenEChartsDesignerHook.class.getClassLoader().getResource(ICON_RESOURCE) == null) {
            throw new IllegalStateException("Icon resource '" + ICON_RESOURCE + "' was not found on the classpath.");
        }
        // true: derive the selected/inherited variants by recolouring this one file instead of loading
        // "echart-icon-selected.svg"; false: no disabled variant.
        return new InteractiveSvgIcon(OpenEChartsDesignerHook.class, ICON_RESOURCE, true, false);
    }
}
