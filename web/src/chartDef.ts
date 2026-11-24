import type { PropertyTree } from '@inductiveautomation/perspective-client';

/**
 * One row of `common/src/main/resources/components.manifest.json`.
 *
 * The manifest is the single source of truth for which components exist. The
 * Java descriptors (gateway and designer) and this web bundle are both built
 * from it, so a component cannot be registered on one side only.
 */
export interface ChartManifestEntry {
    /** Perspective component id, e.g. "open.echarts.LineChart". Never change a published id. */
    id: string;
    name: string;
    description: string;
    /** Designer palette category. */
    category: string;
    /** Default name given to a component dropped onto a view. */
    metaName: string;
    /** Classpath location of the JSON prop schema. */
    schema: string;
    /** CSS class placed on the component root alongside the shared root class. */
    cssClass: string;
    /** Size used when the component is dropped onto a view. */
    size: { width: number; height: number };
    /** True when the chart needs echarts-gl, which is loaded on demand. */
    gl?: boolean;
    /** Initial `option` prop for a newly dropped component. */
    defaultOption?: object;
}

/**
 * Behaviour for components that derive their ECharts option from domain props
 * (the industrial components) instead of taking a raw `option`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ChartBehavior<P extends object = any> {
    /**
     * Reads the component's domain props (everything except the shared chart
     * props) from the property tree. Must only read: no option building and
     * nothing that can throw on malformed input.
     */
    readProps: (tree: PropertyTree) => P;
    /**
     * Builds the ECharts option from the domain props. Pure and deterministic:
     * the same props always give the same option. It may throw on input it
     * cannot handle; the runtime calls it inside its error handling and
     * memoises the result.
     */
    buildOption: (props: P) => object;
}

/** Behaviours keyed by component id. Components without an entry render `props.option` as given. */
export type ChartBehaviors = Record<string, ChartBehavior>;
