package com.opencomponents.echarts.common.utilities;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import javax.swing.Icon;

import com.inductiveautomation.ignition.common.gson.JsonObject;
import com.inductiveautomation.ignition.common.jsonschema.JsonSchema;
import com.inductiveautomation.perspective.common.api.BrowserResource;
import com.inductiveautomation.perspective.common.api.ComponentDescriptor;
import com.inductiveautomation.perspective.common.api.ComponentEventDescriptor;
import com.inductiveautomation.perspective.common.api.ExtensionFunctionDescriptor;
import com.inductiveautomation.perspective.common.api.PaletteEntry;

/**
 * Delegation wrapper around {@link ComponentDescriptor} that forwards all
 * method calls to an underlying delegate. Subclasses override only the methods
 * they need to customise (e.g.&nbsp;supplying a Designer-scope icon).
 */
public abstract class DelegatingComponentDescriptor implements ComponentDescriptor {

    private final ComponentDescriptor delegate;

    public DelegatingComponentDescriptor(ComponentDescriptor delegate) {
        this.delegate = delegate;
    }

    @Override @Nonnull public String id() { return delegate.id(); }
    @Override public String name() { return delegate.name(); }
    @Override public boolean deprecated() { return delegate.deprecated(); }
    @Override @Nonnull public Collection<PaletteEntry> paletteEntries() { return delegate.paletteEntries(); }
    @Override @Nonnull public String paletteCategory() { return delegate.paletteCategory(); }
    @Override @Nonnull public String defaultMetaName() { return delegate.defaultMetaName(); }
    @Override @Nonnull public String moduleId() { return delegate.moduleId(); }
    @Override public JsonObject defaultProperties() { return delegate.defaultProperties(); }
    @Override public Optional<JsonObject> childPositionDefaults() { return delegate.childPositionDefaults(); }
    @Override @Nonnull public Set<BrowserResource> resources() { return delegate.browserResources(); }
    @Override @Nullable public JsonSchema schema() { return delegate.schema(); }
    @Override @Nullable public JsonSchema childPositionSchema() { return delegate.childPositionSchema(); }
    @Override @Nonnull public Collection<ComponentEventDescriptor> events() { return delegate.events(); }
    @Override @Nonnull public Collection<ExtensionFunctionDescriptor> extensionFunctions() { return delegate.extensionFunctions(); }
    @Override @Nullable public JsonObject getInitialProps(String variantId) { return delegate.getInitialProps(variantId); }
    @Override public Optional<JsonObject> getExampleChildPositionDefaults() { return delegate.getExampleChildPositionDefaults(); }
    @Override @Nonnull public Optional<Icon> getIcon() { return delegate.getIcon(); }
}
