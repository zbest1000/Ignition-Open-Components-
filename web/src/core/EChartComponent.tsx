import * as React from 'react';
import { Component, ComponentProps } from '@inductiveautomation/perspective-client';
import type { EChartsType } from 'echarts/core';

import type { ChartBehavior } from '../chartDef';
import { deepEqual } from '../utils/deepEqual';
import { CHART_EVENTS, ChartEventName, serializeEventParams } from '../utils/eventPayload';
import { declaresRichTextTooltip, sanitizeOption } from '../utils/optionSanitizer';
import { echarts } from './echarts';
import { loadGL } from './glLoader';
import { registerMaps } from './maps';

/** The props every chart component has, plus the domain props of components with a behaviour. */
export interface ChartProps {
    option?: object | null;
    theme?: string;
    renderer?: string;
    autoResize?: boolean;
    resizeDebounceMs?: number;
    notMerge?: boolean;
    lazyUpdate?: boolean;
    showLoading?: boolean;
    loadingOptions?: object;
    sanitizeTooltip?: boolean;
    ariaLabel?: string;
    /** Maps for geo charts, by name: GeoJSON, `{ geoJSON, specialAreas }` or `{ svg }`. */
    maps?: object;
    /** What the component's behaviour read from the property tree; absent for plain charts. */
    domain?: object;
}

/** What distinguishes one chart component type from another. */
export interface ChartConfig {
    cssClass: string;
    gl: boolean;
    behavior?: ChartBehavior;
    /** Drawn when a component without a behaviour has no option of its own. */
    defaultOption?: object;
}

interface ChartState {
    error: string | null;
    /** True while echarts-gl is being downloaded. */
    loadingLibrary: boolean;
}

interface SetOptionOpts {
    notMerge: boolean;
    lazyUpdate: boolean;
    replaceMerge?: string[];
}

/** True for ECharts' compound form: `{ baseOption, options }` (timeline) or `{ baseOption, media }`. */
function isCompoundOption(option: unknown): boolean {
    return typeof option === 'object' && option !== null
        && ('baseOption' in option || 'options' in option || 'media' in option);
}

const DEFAULT_RESIZE_DEBOUNCE_MS = 150;
/** How long a deferred option waits for an animation frame before it is applied anyway (hidden tabs get no frames). */
const LAZY_UPDATE_FALLBACK_MS = 500;
/** Brush selections fire continuously while dragging; at most one is delivered per interval, the last one always. */
const BRUSH_EVENT_INTERVAL_MS = 100;

function isNonEmptyObject(value: unknown): value is object {
    return typeof value === 'object' && value !== null && Object.keys(value).length > 0;
}

function errorMessage(err: unknown, fallback: string): string {
    const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
    return message || fallback;
}

/** Turns on ECharts' generated chart description unless the option configures `aria` itself. */
function withDefaultAria(option: Record<string, any>): Record<string, any> {
    const base = option.baseOption;
    if (typeof base === 'object' && base !== null) {
        return 'aria' in base ? option : { ...option, baseOption: { ...base, aria: { enabled: true } } };
    }
    return 'aria' in option ? option : { ...option, aria: { enabled: true } };
}

/** True when a prop that decides whether the chart can be created and drawn differs. */
function chartInputsChanged(a: ChartProps, b: ChartProps): boolean {
    return a.theme !== b.theme || a.renderer !== b.renderer || a.sanitizeTooltip !== b.sanitizeTooltip ||
        !deepEqual(a.option, b.option) || !deepEqual(a.domain, b.domain) || !deepEqual(a.maps, b.maps);
}

/**
 * The one component class behind every chart type. A concrete type only
 * supplies its {@link ChartConfig}.
 *
 * The root element is the one Perspective styles and positions through
 * emit(); it never changes and carries no ref. ECharts draws into a child
 * that is always rendered, so an error or loading message can be laid over
 * the chart without detaching the node the chart instance is bound to.
 *
 * The chart instance is re-created only when the theme or renderer changes,
 * which ECharts cannot change on a live instance. Everything else is applied
 * to the existing instance.
 */
export abstract class OpenEChartComponent extends Component<ComponentProps<ChartProps>, ChartState> {

    protected abstract readonly config: ChartConfig;

    state: ChartState = { error: null, loadingLibrary: false };

    private readonly mountRef = React.createRef<HTMLDivElement>();
    private chart: EChartsType | null = null;
    private unmounted = false;

    private glReady = false;
    private glLoading = false;

    /** The option last handed to the chart (or queued for it), before sanitising. */
    private applied: { option: unknown; sanitize: boolean } | null = null;
    /**
     * The option waiting for the next frame when `lazyUpdate` is on. Only the
     * latest is kept: `replace` records that it, or one it superseded, has to
     * replace the chart's option instead of merging into it.
     */
    private pending: { option: Record<string, any>; replace: boolean; richText: boolean } | null = null;
    private frame: number | null = null;
    private frameFallback: ReturnType<typeof setTimeout> | null = null;
    /**
     * Whether every option given to this chart instance declared a rich text
     * tooltip; null before the first one. ECharts fixes the tooltip's render
     * mode when it creates the tooltip, so only then is it certain that
     * formatters are drawn as text and need no HTML sanitising.
     */
    private richTextOnly: boolean | null = null;
    private brushTimer: ReturnType<typeof setTimeout> | null = null;
    private brushParams: unknown = null;
    /** The option last built by the behaviour, and the domain props it was built from. */
    private built: { domain: object; option: object } | null = null;
    /** The props at the time the chart last failed; it is not retried until they change. */
    private failedProps: ChartProps | null = null;

    private loadingShown: { show: boolean; options: object } | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private resizeTimer: ReturnType<typeof setTimeout> | null = null;
    /** True when the chart was created in a zero-sized element and has not been drawn yet. */
    private awaitingSize = false;

    componentDidMount(): void {
        const node = this.mountRef.current;
        if (node && typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(this.onResize);
            this.resizeObserver.observe(node);
        }
        this.sync(null);
    }

    componentDidUpdate(prevProps: ComponentProps<ChartProps>): void {
        if (prevProps.props !== this.props.props) {
            this.sync(prevProps.props);
        }
    }

    componentWillUnmount(): void {
        this.unmounted = true;
        this.disposeChart();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    /** Brings the chart in line with the current props. `prev` is null when nothing has been applied yet. */
    private sync(prev: ChartProps | null): void {
        const props = this.props.props;

        if (this.chart && prev && (prev.theme !== props.theme || prev.renderer !== props.renderer)) {
            this.disposeChart();
        }
        if (!this.chart) {
            if (this.failedProps && !chartInputsChanged(this.failedProps, props)) return;
            if (!this.createChart()) return;
        }

        // Maps must be known to ECharts before an option refers to them, and a
        // chart drawn before its map arrived has to be given its option again.
        const mapsChanged = registerMaps(props.maps, props.sanitizeTooltip !== false);
        this.applyOption(mapsChanged);
        this.applyLoading();
        if (prev && !prev.autoResize && props.autoResize) {
            this.resizeToFit();
        }
    }

    /** Creates the chart instance. Returns false if it cannot exist yet. */
    private createChart(): boolean {
        if (this.config.gl && !this.glReady) {
            this.requestGL();
            return false;
        }
        const node = this.mountRef.current;
        if (!node) return false;

        const { theme, renderer } = this.props.props;
        try {
            this.chart = echarts.init(node, theme || undefined, { renderer: renderer === 'svg' ? 'svg' : 'canvas' });
        } catch (err) {
            this.fail(err, 'Failed to initialise ECharts');
            return false;
        }
        this.failedProps = null;
        this.awaitingSize = node.clientWidth === 0 || node.clientHeight === 0;
        this.bindEvents(this.chart);
        return true;
    }

    private requestGL(): void {
        if (this.glLoading) return;
        this.glLoading = true;
        this.setState({ loadingLibrary: true });

        const done = (err?: unknown) => {
            this.glLoading = false;
            if (this.unmounted) return;
            this.setState({ loadingLibrary: false });
            if (err === undefined) {
                this.glReady = true;
                this.sync(null);
            } else {
                this.fail(err, 'Failed to load echarts-gl');
            }
        };
        loadGL().then(() => done(), err => done(err ?? new Error('Failed to load echarts-gl')));
    }

    private disposeChart(): void {
        this.cancelFrame();
        if (this.resizeTimer !== null) {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = null;
        }
        if (this.brushTimer !== null) {
            clearTimeout(this.brushTimer);
            this.brushTimer = null;
        }
        this.brushParams = null;
        this.pending = null;
        this.richTextOnly = null;
        this.applied = null;
        this.loadingShown = null;
        if (this.chart) {
            const chart = this.chart;
            this.chart = null;
            try {
                chart.dispose();
            } catch {
                // An instance that failed half-way may not dispose cleanly; it is unreachable either way.
            }
        }
    }

    /**
     * Shows the error and discards the chart instance, which ECharts may have
     * left in an unusable state. A new instance is created when the props change.
     */
    private fail(err: unknown, fallback: string): void {
        this.disposeChart();
        this.failedProps = this.props.props;
        this.setState({ error: errorMessage(err, fallback) });
    }

    private clearError(): void {
        if (this.state.error !== null) this.setState({ error: null });
    }

    /**
     * The option to draw. A non-empty `option` prop always wins. Without one,
     * a behaviour builds the option from its domain props, and a plain chart
     * falls back to its manifest default: the schema default for `option` is
     * {}, so a view that never stored an option would otherwise be blank.
     */
    private resolveOption(props: ChartProps): unknown {
        const { behavior, defaultOption } = this.config;
        if (isNonEmptyObject(props.option)) return props.option;
        if (!behavior) return defaultOption || props.option;

        const domain = props.domain || {};
        if (!this.built || !deepEqual(this.built.domain, domain)) {
            this.built = { domain, option: behavior.buildOption(domain) };
        }
        return this.built.option;
    }

    /** @param replace  apply the option even if it is unchanged, replacing rather than merging */
    private applyOption(replace = false): void {
        const props = this.props.props;
        const sanitize = props.sanitizeTooltip !== false;
        let option: Record<string, any>;
        let richText = false;
        let sanitizeChanged = replace;

        try {
            const resolved = this.resolveOption(props);
            // Perspective hands over a fresh copy of every prop whenever any prop
            // changes, so compare by value to avoid redrawing an unchanged chart.
            if (!replace && this.applied && this.applied.sanitize === sanitize &&
                deepEqual(this.applied.option, resolved)) return;
            sanitizeChanged = replace || (this.applied !== null && this.applied.sanitize !== sanitize);
            this.applied = { option: resolved, sanitize };

            if (typeof resolved !== 'object' || resolved === null) {
                this.pending = null;
                this.cancelFrame();
                this.clearError();
                return;
            }
            richText = declaresRichTextTooltip(resolved);
            if (sanitize && richText && this.richTextOnly === false) {
                // This instance has rendered HTML tooltips, and would write the
                // formatter into the DOM whatever the option now says. Start over
                // with an instance that has only ever seen rich text.
                this.disposeChart();
                if (!this.createChart()) return;
                this.applied = { option: resolved, sanitize };
                sanitizeChanged = false;
            }
            option = withDefaultAria(
                sanitize ? sanitizeOption(resolved, { richTextTooltip: richText }) : resolved);
        } catch (err) {
            this.fail(err, 'Failed to build the chart option');
            return;
        }

        // When merging, series are matched to the new option and the rest
        // removed, so a series dropped from the option disappears. Other
        // components keep their state, e.g. the zoom window of a dataZoom.
        // Turning sanitising on has to replace everything: a merge would keep
        // the unsanitised values that the new option no longer contains. A
        // newly registered map is likewise only picked up by a full replace.
        //
        // Only the latest option is kept. If the one it supersedes had to
        // replace the chart's option, so does this one: the chart has not
        // seen the superseded option, so there is nothing valid to merge into.
        const superseded = this.pending;
        this.pending = {
            option,
            richText,
            replace: props.notMerge === true || sanitizeChanged || (superseded !== null && superseded.replace),
        };

        if (props.lazyUpdate === false) {
            this.flushPending();
        } else if (this.frame === null) {
            this.frame = requestAnimationFrame(this.flushPending);
            // Browsers stop animation frames in hidden tabs; do not let the update wait for the tab to return.
            this.frameFallback = setTimeout(this.flushPending, LAZY_UPDATE_FALLBACK_MS);
        }
    }

    private cancelFrame(): void {
        if (this.frame !== null) {
            cancelAnimationFrame(this.frame);
            this.frame = null;
        }
        if (this.frameFallback !== null) {
            clearTimeout(this.frameFallback);
            this.frameFallback = null;
        }
    }

    /**
     * Hands the pending option to ECharts. ECharts' own lazy update runs in
     * its render loop, where an error cannot be caught and would leave the
     * chart broken with no message. So the deferral is done here instead and
     * ECharts renders synchronously inside the try block. Because only the
     * latest option is ever applied, the error state always describes the
     * current props.
     */
    private readonly flushPending = (): void => {
        this.cancelFrame();
        const item = this.pending;
        this.pending = null;
        if (!this.chart || !item) return;

        // A timeline or media option (baseOption + options) is replaced as a
        // whole: its steps carry partial series that ECharts matches against the
        // base by position, which replaceMerge would treat as removed series.
        const opts: SetOptionOpts = item.replace || isCompoundOption(item.option)
            ? { notMerge: true, lazyUpdate: false }
            : { notMerge: false, lazyUpdate: false, replaceMerge: ['series'] };
        this.richTextOnly = item.richText && this.richTextOnly !== false;
        try {
            this.chart.setOption(item.option, opts);
        } catch (err) {
            this.fail(err, 'setOption failed');
            return;
        }
        this.clearError();
    };

    private applyLoading(): void {
        if (!this.chart) return;
        const show = this.props.props.showLoading === true;
        const options = this.props.props.loadingOptions || {};
        const shown = this.loadingShown;

        if (shown && shown.show === show && (!show || deepEqual(shown.options, options))) return;
        if (show) {
            // ECharts writes its defaults into the object it is given, so hand it a copy.
            this.chart.showLoading('default', { ...options });
        } else if (shown) {
            this.chart.hideLoading();
        }
        this.loadingShown = { show, options };
    }

    private bindEvents(chart: EChartsType): void {
        (Object.keys(CHART_EVENTS) as ChartEventName[]).forEach(name => {
            chart.on(name, (...args: unknown[]) => {
                if (name !== 'brushselected') {
                    this.fireEvent(name, args[0]);
                    return;
                }
                // Trailing-edge throttle: the latest selection is kept and sent
                // when the interval ends, so the final selection always arrives.
                this.brushParams = args[0];
                if (this.brushTimer === null) {
                    this.brushTimer = setTimeout(() => {
                        this.brushTimer = null;
                        const latest = this.brushParams;
                        this.brushParams = null;
                        this.fireEvent('brushselected', latest);
                    }, BRUSH_EVENT_INTERVAL_MS);
                }
            });
        });
    }

    private fireEvent(name: ChartEventName, params: unknown): void {
        const events = this.props.componentEvents;
        if (!events) return;
        try {
            events.fireComponentEvent(CHART_EVENTS[name], serializeEventParams(name, params));
        } catch {
            // A payload that cannot be delivered must not break chart interaction.
        }
    }

    private readonly onResize = (): void => {
        const node = this.mountRef.current;
        if (!this.chart || !node) return;

        if (this.awaitingSize) {
            // The first real size always draws the chart, whatever autoResize says.
            if (node.clientWidth > 0 && node.clientHeight > 0) this.resizeToFit();
            return;
        }
        if (!this.props.props.autoResize) return;

        if (this.resizeTimer !== null) clearTimeout(this.resizeTimer);
        const delay = this.props.props.resizeDebounceMs;
        this.resizeTimer = setTimeout(this.resizeToFit,
            typeof delay === 'number' && delay >= 0 ? delay : DEFAULT_RESIZE_DEBOUNCE_MS);
    };

    private readonly resizeToFit = (): void => {
        this.resizeTimer = null;
        const node = this.mountRef.current;
        const chart = this.chart;
        if (!chart || !node) return;
        if (node.clientWidth === chart.getWidth() && node.clientHeight === chart.getHeight()) return;

        try {
            chart.resize();
            this.awaitingSize = node.clientWidth === 0 || node.clientHeight === 0;
        } catch (err) {
            this.fail(err, 'Failed to resize the chart');
        }
    };

    render(): React.ReactNode {
        const { ariaLabel } = this.props.props;
        const { error, loadingLibrary } = this.state;
        // Without a label of its own the root stays neutral, and assistive
        // technology reads the description ECharts generates on the chart element.
        const labelling = ariaLabel ? { role: 'img', 'aria-label': ariaLabel } : null;

        return (
            <div {...this.props.emit({ classes: ['open-echarts-root', this.config.cssClass] })} {...labelling}>
                <div ref={this.mountRef} className="open-echarts-mount" />
                {loadingLibrary && (
                    <div className="open-echarts-loading" role="status">Loading chart…</div>
                )}
                {error !== null && (
                    <div className="open-echarts-error" role="alert">
                        <span className="open-echarts-error__message">{error}</span>
                    </div>
                )}
            </div>
        );
    }
}
