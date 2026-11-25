package com.opencomponents.echarts.designer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.lang.reflect.Proxy;
import java.util.HashSet;
import java.util.Set;

import javax.swing.Icon;

import com.inductiveautomation.ignition.client.icons.InteractiveIcon;
import com.inductiveautomation.ignition.common.BundleUtil;
import com.inductiveautomation.ignition.designer.model.DesignerContext;
import com.inductiveautomation.perspective.common.api.ComponentDescriptor;
import com.inductiveautomation.perspective.common.api.ComponentRegistry;
import com.inductiveautomation.perspective.designer.DesignerComponentRegistry;
import org.junit.jupiter.api.Test;

import com.opencomponents.echarts.common.components.ComponentCatalog;

class OpenEChartsDesignerHookTest {

    private static final String BUNDLE_KEY = "open-echarts.module";

    private final Set<String> ownIds = Set.copyOf(ComponentCatalog.load().ids());

    /** A Designer context on which every call returns null, i.e. a Designer without Perspective. */
    private static DesignerContext designerWithoutPerspective() {
        return (DesignerContext) Proxy.newProxyInstance(
            DesignerContext.class.getClassLoader(),
            new Class<?>[] {DesignerContext.class},
            (proxy, method, args) -> null);
    }

    private static OpenEChartsDesignerHook hookFor(ComponentRegistry registry) {
        return new OpenEChartsDesignerHook() {
            @Override
            protected ComponentRegistry findComponentRegistry() {
                return registry;
            }
        };
    }

    private Set<String> ownComponentsIn(ComponentRegistry registry) {
        Set<String> present = new HashSet<>(registry.get().keySet());
        present.retainAll(ownIds);
        return present;
    }

    private static boolean bundleLoaded() {
        return "Open ECharts".equals(BundleUtil.get().getStringLenient(BUNDLE_KEY));
    }

    @Test
    void theSvgIconLoadsAndPaintsSomething() {
        Icon icon = OpenEChartsDesignerHook.createIcon();
        assertEquals(16, icon.getIconWidth());
        assertEquals(16, icon.getIconHeight());
        assertPaints(icon, "icon");
        // The variant the Designer shows on a selected row is derived from the same file.
        assertPaints(((InteractiveIcon) icon).getSelected(), "selected icon");
    }

    private static void assertPaints(Icon icon, String what) {
        BufferedImage image = new BufferedImage(16, 16, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = image.createGraphics();
        icon.paintIcon(null, g, 0, 0);
        g.dispose();

        int painted = 0;
        for (int x = 0; x < 16; x++) {
            for (int y = 0; y < 16; y++) {
                if ((image.getRGB(x, y) >>> 24) != 0) {
                    painted++;
                }
            }
        }
        assertTrue(painted > 20,
            "The " + what + " should paint its bars, but only " + painted + " pixels are not transparent");
    }

    @Test
    void startupPutsEveryComponentOnThePaletteWithTheIconAndShutdownRemovesThem() {
        ComponentRegistry registry = new DesignerComponentRegistry();
        Set<String> before = Set.copyOf(registry.get().keySet());
        OpenEChartsDesignerHook hook = hookFor(registry);

        hook.startup(designerWithoutPerspective(), null);
        assertEquals(ownIds, ownComponentsIn(registry));
        Icon shared = null;
        for (String id : ownIds) {
            ComponentDescriptor descriptor = registry.find(id).orElseThrow();
            Icon icon = descriptor.getIcon().orElseThrow(() -> new AssertionError(id + " has no icon"));
            shared = shared == null ? icon : shared;
            assertSame(shared, icon, "All components share the one icon");
        }
        assertTrue(bundleLoaded(), "The i18n bundle should be registered while the hook is running");

        hook.shutdown();
        assertEquals(before, registry.get().keySet(), "Shutdown must remove exactly what startup added");
        assertNotEquals("Open ECharts", BundleUtil.get().getStringLenient(BUNDLE_KEY),
            "The i18n bundle should be removed on shutdown");
    }

    @Test
    void startupAndShutdownAreIdempotentAndTheHookCanBeRestarted() {
        ComponentRegistry registry = new DesignerComponentRegistry();
        Set<String> before = Set.copyOf(registry.get().keySet());
        OpenEChartsDesignerHook hook = hookFor(registry);
        DesignerContext context = designerWithoutPerspective();

        hook.shutdown();
        hook.startup(context, null);
        hook.startup(context, null);
        assertEquals(ownIds, ownComponentsIn(registry));

        hook.shutdown();
        hook.shutdown();
        assertEquals(before, registry.get().keySet());

        hook.startup(context, null);
        assertEquals(ownIds, ownComponentsIn(registry));
        hook.shutdown();
        assertEquals(before, registry.get().keySet());
    }

    @Test
    void aMissingPerspectiveDesignerInterfaceFailsStartupWithAClearMessage() {
        OpenEChartsDesignerHook hook = new OpenEChartsDesignerHook();

        IllegalStateException e = assertThrows(IllegalStateException.class,
            () -> hook.startup(designerWithoutPerspective(), null));
        assertTrue(e.getMessage().contains("Perspective module is not available"), e.getMessage());

        // Nothing was registered, so shutting down afterwards has nothing to do and must not throw.
        hook.shutdown();
    }

    @Test
    void componentsAreStillRegisteredWhenTheIconCannotBeLoaded() {
        ComponentRegistry registry = new DesignerComponentRegistry();
        OpenEChartsDesignerHook hook = new OpenEChartsDesignerHook() {
            @Override
            protected ComponentRegistry findComponentRegistry() {
                return registry;
            }

            @Override
            protected Icon loadIcon() {
                return null;
            }
        };

        hook.startup(designerWithoutPerspective(), null);
        assertEquals(ownIds, ownComponentsIn(registry));
        hook.shutdown();
    }
}
