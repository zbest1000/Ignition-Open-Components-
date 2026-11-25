import type { ComponentMeta, PComponent } from '@inductiveautomation/perspective-client';
import type { ChartBehavior, ChartManifestEntry } from '../chartDef';
import { makeMeta } from '../core/meta';
import { loadGL } from '../core/glLoader';
import { registerBuiltInThemes } from '../themes';
import {
    BAR, BROKEN, chartProps, echarts, fakeTree, flush, installBrowserStubs, layout, mountComponent,
    Mounted, resizeObservers, settle,
} from './support/harness';

jest.mock('../core/glLoader', () => ({ loadGL: jest.fn(() => Promise.resolve()) }));
const loadGLMock = loadGL as jest.MockedFunction<typeof loadGL>;

const ROW: ChartManifestEntry = {
    id: 'open.echarts.BarChart', name: 'Bar Chart', description: '', category: 'c', metaName: 'barChart',
    schema: 'props/echart.props.json', cssClass: 'open-echarts-bar', size: { width: 600, height: 350 },
    defaultOption: BAR,
};

const meta: ComponentMeta = makeMeta(ROW);
const Chart: PComponent = meta.getViewComponent();

const TWO_SERIES = {
    ...BAR,
    series: [{ type: 'bar', name: 'A', data: [1, 2] }, { type: 'line', name: 'B', data: [3, 4] }],
};

let mounted: Mounted[] = [];
function mount(component: PComponent, props: Record<string, any>): Mounted {
    const m = mountComponent(component, props);
    mounted.push(m);
    return m;
}

const alertOf = (m: Mounted) => m.host.querySelector('[role="alert"]');
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

beforeAll(() => { registerBuiltInThemes(); });

beforeEach(() => {
    jest.useFakeTimers();
    installBrowserStubs();
    loadGLMock.mockClear();
    loadGLMock.mockImplementation(() => Promise.resolve());
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
    mounted.forEach(m => { try { m.unmount(); } catch { /* already unmounted */ } });
    mounted = [];
    jest.restoreAllMocks();
    jest.useRealTimers();
});

describe('meta', () => {
    it('describes the component from its manifest row', () => {
        expect(meta.getComponentType()).toBe('open.echarts.BarChart');
        expect(meta.getDefaultSize()).toEqual({ width: 600, height: 350 });
    });

    it('reads the shared props with their defaults', () => {
        expect(meta.getPropsReducer!(fakeTree({}))).toEqual({
            option: BAR, theme: '', renderer: 'canvas', autoResize: true, resizeDebounceMs: 150, notMerge: false,
            lazyUpdate: true, showLoading: false, loadingOptions: {}, sanitizeTooltip: true, ariaLabel: '', maps: {},
        });
    });

    it('reads stored values', () => {
        const props = meta.getPropsReducer!(fakeTree({ option: { series: [] }, theme: 'dark', ariaLabel: 'Flow' }));
        expect(props).toMatchObject({ option: { series: [] }, theme: 'dark', ariaLabel: 'Flow' });
    });
});

describe('lifecycle', () => {
    it('draws the chart in a child of the emit() root', () => {
        const m = mount(Chart, chartProps());
        const root = m.root();
        expect(root.getAttribute('data-component')).toBe('x');
        expect(root.classList.contains('open-echarts-root')).toBe(true);
        expect(root.classList.contains('open-echarts-bar')).toBe(true);
        expect(m.mount().parentElement).toBe(root);
        expect(m.mount().querySelector('svg')).not.toBeNull();
        expect(m.chart().getOption().series).toHaveLength(1);
        expect(alertOf(m)).toBeNull();
    });

    it('applies a changed option', () => {
        const m = mount(Chart, chartProps());
        m.update({ option: { ...BAR, series: [{ type: 'bar', name: 'A', data: [7, 8] }] } });
        expect(m.chart().getOption().series[0].data).toEqual([7, 8]);
    });

    it.each([[{}], [null], [undefined]])('draws the manifest default when the option prop is %j', (empty) => {
        // A view saved before `option` defaulted to {} in the schema stores no option at all.
        const m = mount(Chart, chartProps({ option: empty }));
        expect(m.chart().getOption().series[0]).toMatchObject({ type: 'bar', name: 'A', data: [1, 2] });

        m.update({ option: TWO_SERIES });
        expect(m.chart().getOption().series).toHaveLength(2);
        m.update({ option: {} });
        expect(m.chart().getOption().series).toHaveLength(1);
    });

    it('does not throw when there is no option and the row has no default', () => {
        const bare = makeMeta({ ...ROW, defaultOption: undefined }).getViewComponent();
        const m = mount(bare, chartProps({ option: {} }));
        expect(alertOf(m)).toBeNull();
        expect(m.chart().getOption().series).toHaveLength(0);
    });

    it('does not throw when there is no option', () => {
        const m = mount(Chart, chartProps({ option: null }));
        expect(alertOf(m)).toBeNull();
        m.update({ option: BAR });
        expect(m.chart().getOption().series).toHaveLength(1);
    });

    it('disposes the chart and stops observing on unmount', () => {
        const m = mount(Chart, chartProps());
        const chart = m.chart();
        expect(resizeObservers()).toHaveLength(1);
        m.unmount();
        expect(chart.isDisposed()).toBe(true);
        expect(resizeObservers()).toHaveLength(0);
        expect(() => flush(500)).not.toThrow();
    });

    it('re-creates the chart when the theme changes and keeps events bound', () => {
        const m = mount(Chart, chartProps());
        const first = m.chart();
        const root = m.root();
        const mountNode = m.mount();

        m.update({ theme: 'IgnitionIndustrialDark' });
        const second = m.chart();
        expect(second).not.toBe(first);
        expect(first.isDisposed()).toBe(true);
        expect(m.root()).toBe(root);
        expect(m.mount()).toBe(mountNode);
        expect(second.getOption().backgroundColor).toBe('#1a1a2e');
        expect(second.getOption().series).toHaveLength(1);

        second.trigger('click', { name: 'a', value: 1 });
        expect(m.events).toEqual([['onClick', { name: 'a', value: 1 }]]);
    });

    it('re-creates the chart when the renderer changes', () => {
        const m = mount(Chart, chartProps());
        const first = m.chart();
        const realInit = echarts.init;
        const init = jest.spyOn(echarts, 'init').mockImplementation(
            (dom: any, theme: any) => realInit(dom, theme, { renderer: 'svg' }));
        m.update({ renderer: 'canvas' });
        expect(init).toHaveBeenCalledWith(m.mount(), undefined, { renderer: 'canvas' });
        expect(first.isDisposed()).toBe(true);
        expect(m.chart()).not.toBe(first);
    });

    it('does not re-create the chart for any other prop', () => {
        const m = mount(Chart, chartProps());
        const first = m.chart();
        m.update({
            option: TWO_SERIES, autoResize: false, resizeDebounceMs: 10, notMerge: true, lazyUpdate: true,
            showLoading: true, loadingOptions: { text: 'x' }, sanitizeTooltip: false, ariaLabel: 'x',
        });
        flush();
        expect(m.chart()).toBe(first);
        expect(first.isDisposed()).toBeFalsy();
    });
});

describe('errors', () => {
    it.each([false, true])('recovers after a bad option is corrected (lazyUpdate=%s)', (lazyUpdate) => {
        const m = mount(Chart, chartProps({ lazyUpdate }));
        flush();
        const root = m.root();
        const mountNode = m.mount();
        const first = m.chart();

        m.update({ option: BROKEN, notMerge: true });
        flush();
        const alert = alertOf(m);
        expect(alert).not.toBeNull();
        expect(alert!.textContent).toMatch(/\S/);
        expect(m.root()).toBe(root);
        expect(m.mount()).toBe(mountNode);
        expect(mountNode.isConnected).toBe(true);
        expect(first.isDisposed()).toBe(true);

        m.update({ option: BAR });
        flush();
        expect(alertOf(m)).toBeNull();
        expect(m.mount()).toBe(mountNode);
        expect(m.chart()).toBeTruthy();
        expect(m.chart().getOption().series[0].type).toBe('bar');
        expect(mountNode.querySelector('svg')).not.toBeNull();
    });

    it('does not retry a failing option until something changes', () => {
        const m = mount(Chart, chartProps({ option: BROKEN }));
        expect(alertOf(m)).not.toBeNull();
        const init = jest.spyOn(echarts, 'init');
        m.update({ option: copy(BROKEN) });
        m.update({ showLoading: true });
        expect(init).not.toHaveBeenCalled();
        expect(alertOf(m)).not.toBeNull();
    });

    it('shows an init failure and recovers on the next change', () => {
        const init = jest.spyOn(echarts, 'init').mockImplementationOnce(() => { throw new Error('init exploded'); });
        const m = mount(Chart, chartProps());
        expect(alertOf(m)!.textContent).toContain('init exploded');
        expect(m.mount()).not.toBeNull();

        m.update({ option: TWO_SERIES });
        expect(init).toHaveBeenCalledTimes(2);
        expect(alertOf(m)).toBeNull();
        expect(m.chart().getOption().series).toHaveLength(2);
    });
});

describe('option updates', () => {
    it('removes a series that is no longer in the option when merging', () => {
        const m = mount(Chart, chartProps({ option: TWO_SERIES, notMerge: false }));
        expect(m.chart().getOption().series).toHaveLength(2);
        m.update({ option: BAR });
        const series = m.chart().getOption().series;
        expect(series).toHaveLength(1);
        expect(series[0].type).toBe('bar');
    });

    it('keeps the zoom window across a data update when merging', () => {
        const zoomable = { ...TWO_SERIES, dataZoom: [{ type: 'inside' }] };
        const m = mount(Chart, chartProps({ option: zoomable }));
        m.chart().dispatchAction({ type: 'dataZoom', start: 20, end: 60 });
        m.update({ option: { ...zoomable, series: [{ type: 'bar', name: 'A', data: [5, 6] }] } });
        const zoom = m.chart().getOption().dataZoom[0];
        expect([zoom.start, zoom.end]).toEqual([20, 60]);
        expect(m.chart().getOption().series).toHaveLength(1);
    });

    it('passes notMerge and lazyUpdate as currently set', () => {
        const m = mount(Chart, chartProps());
        const setOption = jest.spyOn(m.chart(), 'setOption');

        m.update({ option: TWO_SERIES });
        expect(setOption).toHaveBeenLastCalledWith(expect.anything(),
            { notMerge: false, lazyUpdate: false, replaceMerge: ['series'] });

        m.update({ option: BAR, notMerge: true });
        expect(setOption).toHaveBeenLastCalledWith(expect.anything(), { notMerge: true, lazyUpdate: false });
        expect(m.chart().getOption().series).toHaveLength(1);
    });

    it('replaces a timeline option as a whole so its steps keep their series', () => {
        const m = mount(Chart, chartProps());
        const setOption = jest.spyOn(m.chart(), 'setOption');
        m.update({
            option: {
                baseOption: {
                    timeline: { data: ['2024', '2025'] },
                    xAxis: { type: 'category', data: ['A', 'B'] },
                    yAxis: {},
                    series: [{ type: 'bar' }],
                },
                options: [{ series: [{ data: [1, 2] }] }, { series: [{ data: [3, 4] }] }],
            },
        });
        expect(setOption).toHaveBeenLastCalledWith(expect.anything(), { notMerge: true, lazyUpdate: false });
        const series = m.chart().getOption().series as Array<{ type: string; data: number[] }>;
        expect(series).toHaveLength(1);
        expect(series[0].type).toBe('bar');
        expect(series[0].data).toEqual([1, 2]);
    });

    it('defers the update to the next frame when lazyUpdate is on', () => {
        const m = mount(Chart, chartProps({ lazyUpdate: true }));
        flush();
        const setOption = jest.spyOn(m.chart(), 'setOption');
        m.update({ option: TWO_SERIES });
        expect(setOption).not.toHaveBeenCalled();
        flush();
        expect(setOption).toHaveBeenCalledTimes(1);
        expect(m.chart().getOption().series).toHaveLength(2);
    });

    it('applies only the latest option when several arrive within a frame', () => {
        const m = mount(Chart, chartProps({ lazyUpdate: true }));
        flush();
        const setOption = jest.spyOn(m.chart(), 'setOption');
        for (let i = 1; i <= 2000; i++) {
            m.update({ option: { ...BAR, series: [{ type: 'bar', name: 'A', data: [i, 2] }] } });
        }
        flush();
        expect(setOption).toHaveBeenCalledTimes(1);
        expect(m.chart().getOption().series[0].data).toEqual([2000, 2]);
    });

    it('replaces rather than merges when a skipped update asked for a full replace', () => {
        const m = mount(Chart, chartProps({ lazyUpdate: true, option: { ...BAR, title: { text: 'old' } } }));
        flush();
        const setOption = jest.spyOn(m.chart(), 'setOption');
        m.update({ option: BAR, notMerge: true });
        m.update({ option: TWO_SERIES, notMerge: false });
        flush();
        expect(setOption).toHaveBeenCalledTimes(1);
        expect(setOption.mock.calls[0][1]).toMatchObject({ notMerge: true });
        expect(m.chart().getOption().title || []).toEqual([]);
        expect(m.chart().getOption().series).toHaveLength(2);
    });

    it('applies a pending option even when no animation frame arrives (hidden tab)', () => {
        const m = mount(Chart, chartProps({ lazyUpdate: true }));
        flush();
        const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
        m.update({ option: TWO_SERIES });
        expect(raf).toHaveBeenCalled();
        flush(1500);
        expect(m.chart().getOption().series).toHaveLength(2);
    });

    it.each([
        ['no axes', BROKEN],
        ['unknown series type', { xAxis: {}, yAxis: {}, series: [{ type: 'nope', data: [1] }] }],
        ['missing axis index', { xAxis: {}, yAxis: {}, series: [{ type: 'line', xAxisIndex: 3, data: [1] }] }],
    ])('shows no error when a bad option (%s) is replaced by a good one within the same frame', (_name, bad) => {
        const m = mount(Chart, chartProps({ lazyUpdate: true }));
        flush();
        m.update({ option: bad });
        m.update({ option: { ...BAR, series: [{ type: 'bar', name: 'A', data: [5, 2] }] } });
        flush();
        expect(alertOf(m)).toBeNull();
        expect(m.chart().getOption().series[0].data).toEqual([5, 2]);
    });

    it('clears an error as soon as the latest props are good, also with lazyUpdate', () => {
        const m = mount(Chart, chartProps({ lazyUpdate: true }));
        flush();
        m.update({ option: BROKEN, notMerge: true });
        flush();
        expect(alertOf(m)).not.toBeNull();
        m.update({ option: BROKEN, notMerge: true, showLoading: true });
        m.update({ option: BAR });
        flush();
        expect(alertOf(m)).toBeNull();
        expect(m.chart().getOption().series[0].type).toBe('bar');
    });

    it('skips setOption when the option is an equal copy and only another prop changed', () => {
        const m = mount(Chart, chartProps());
        const setOption = jest.spyOn(m.chart(), 'setOption');
        m.update({ option: copy(BAR), showLoading: true });
        m.update({ option: copy(BAR), showLoading: false, ariaLabel: 'x' });
        expect(setOption).not.toHaveBeenCalled();
    });

    it('re-applies the option when sanitizeTooltip changes', () => {
        const option = { ...BAR, tooltip: { formatter: '<b onclick="x()">{b}</b>' } };
        const m = mount(Chart, chartProps({ option }));
        expect(m.chart().getOption().tooltip[0].formatter).toBe('<b>{b}</b>');
        m.update({ sanitizeTooltip: false });
        expect(m.chart().getOption().tooltip[0].formatter).toBe('<b onclick="x()">{b}</b>');
        m.update({ sanitizeTooltip: true });
        expect(m.chart().getOption().tooltip[0].formatter).toBe('<b>{b}</b>');
    });

    it('does not run the sanitiser when sanitizeTooltip is off', () => {
        const fn = () => 'kept';
        const option = { ...BAR, tooltip: { formatter: fn } };
        const m = mount(Chart, chartProps({ option, sanitizeTooltip: false }));
        expect(m.chart().getOption().tooltip[0].formatter).toBe(fn);
    });
});

describe('loading and resizing', () => {
    it('follows showLoading and loadingOptions after mount', () => {
        const m = mount(Chart, chartProps());
        const show = jest.spyOn(m.chart(), 'showLoading');
        const hide = jest.spyOn(m.chart(), 'hideLoading');

        const loadingOptions = { text: 'one' };
        m.update({ showLoading: true, loadingOptions });
        // ECharts fills in defaults on the object it is given; the prop must not be touched.
        expect(loadingOptions).toEqual({ text: 'one' });
        expect(show).toHaveBeenLastCalledWith('default', expect.objectContaining({ text: 'one' }));
        m.update({ loadingOptions: { text: 'two' } });
        expect(show).toHaveBeenLastCalledWith('default', expect.objectContaining({ text: 'two' }));
        expect(show).toHaveBeenCalledTimes(2);
        m.update({ loadingOptions: { text: 'two' } });
        expect(show).toHaveBeenCalledTimes(2);
        m.update({ showLoading: false });
        expect(hide).toHaveBeenCalled();
    });

    it('resizes after the debounce interval, using the interval currently set', () => {
        const m = mount(Chart, chartProps({ resizeDebounceMs: 150 }));
        const resize = jest.spyOn(m.chart(), 'resize');

        layout.width = 500;
        resizeObservers()[0].fire();
        flush(100);
        expect(resize).not.toHaveBeenCalled();
        flush(60);
        expect(resize).toHaveBeenCalledTimes(1);
        expect(m.chart().getWidth()).toBe(500);

        m.update({ resizeDebounceMs: 20 });
        layout.width = 450;
        resizeObservers()[0].fire();
        flush(30);
        expect(resize).toHaveBeenCalledTimes(2);
    });

    it('does not resize when the element reports the size the chart already has', () => {
        const m = mount(Chart, chartProps());
        const resize = jest.spyOn(m.chart(), 'resize');
        resizeObservers()[0].fire();
        flush(500);
        expect(resize).not.toHaveBeenCalled();
    });

    it('follows autoResize after mount', () => {
        const m = mount(Chart, chartProps({ autoResize: false }));
        const resize = jest.spyOn(m.chart(), 'resize');

        layout.width = 500;
        resizeObservers()[0].fire();
        flush(500);
        expect(resize).not.toHaveBeenCalled();

        // Turning it on catches up with the size changes that were ignored.
        m.update({ autoResize: true });
        expect(resize).toHaveBeenCalledTimes(1);
        layout.width = 450;
        resizeObservers()[0].fire();
        flush(500);
        expect(resize).toHaveBeenCalledTimes(2);

        m.update({ autoResize: false });
        layout.width = 400;
        resizeObservers()[0].fire();
        flush(500);
        expect(resize).toHaveBeenCalledTimes(2);
    });

    it('draws a chart mounted at 0x0 once it gets a size, even with autoResize off', () => {
        layout.width = 0;
        layout.height = 0;
        const m = mount(Chart, chartProps({ autoResize: false }));
        expect(alertOf(m)).toBeNull();

        layout.width = 600;
        layout.height = 400;
        resizeObservers()[0].fire();
        flush();
        expect(m.chart().getWidth()).toBe(600);
        expect(m.chart().getHeight()).toBe(400);
        expect(m.mount().querySelector('svg')).not.toBeNull();

        // After that first draw the size is left alone again.
        const resize = jest.spyOn(m.chart(), 'resize');
        layout.width = 300;
        resizeObservers()[0].fire();
        flush(500);
        expect(resize).not.toHaveBeenCalled();
    });
});

describe('events', () => {
    const interactive = {
        ...TWO_SERIES,
        legend: {},
        dataZoom: [{ type: 'inside', id: 'dz' }],
        brush: { toolbox: ['rect'], xAxisIndex: 0 },
    };

    it('delivers mouse events with the documented payload', () => {
        const m = mount(Chart, chartProps());
        const params = {
            componentType: 'series', seriesType: 'bar', seriesIndex: 0, seriesName: 'A', name: 'a', dataIndex: 0,
            data: 1, value: 1, color: '#000', event: { target: {} }, $vars: [],
        };
        (['click', 'dblclick', 'mouseover', 'mouseout'] as const).forEach(e => m.chart().trigger(e, params));
        expect(m.events.map(e => e[0])).toEqual(['onClick', 'onDoubleClick', 'onMouseOver', 'onMouseOut']);
        expect(m.events[0][1]).toEqual({
            componentType: 'series', seriesType: 'bar', seriesIndex: 0, seriesName: 'A', name: 'a', dataIndex: 0,
            data: 1, value: 1, color: '#000',
        });
    });

    it('delivers legend selection changes with the selected map', () => {
        const m = mount(Chart, chartProps({ option: interactive }));
        m.chart().dispatchAction({ type: 'legendToggleSelect', name: 'B' });
        expect(m.events.filter(e => e[0] === 'onLegendSelectChanged'))
            .toEqual([['onLegendSelectChanged', { name: 'B', selected: { A: true, B: false } }]]);
    });

    it('delivers data zoom changes with the zoom window', () => {
        const m = mount(Chart, chartProps({ option: interactive }));
        m.chart().dispatchAction({ type: 'dataZoom', dataZoomId: 'dz', start: 25, end: 75 });
        const zooms = m.events.filter(e => e[0] === 'onDataZoom');
        expect(zooms).toHaveLength(1);
        expect(zooms[0][1]).toMatchObject({ start: 25, end: 75 });
    });

    it('delivers brush selections with areas and selected data', () => {
        const m = mount(Chart, chartProps({ option: interactive }));
        m.chart().dispatchAction({
            type: 'brush',
            areas: [{ brushType: 'lineX', xAxisIndex: 0, coordRange: [0, 1] }],
        });
        flush(300);
        const brushed = m.events.filter(e => e[0] === 'onBrushSelected');
        expect(brushed.length).toBeGreaterThan(0);
        const batch = brushed[brushed.length - 1][1].batch;
        expect(batch).toHaveLength(1);
        expect(batch[0].areas).toHaveLength(1);
        expect(batch[0].selected.map((s: any) => s.seriesName)).toEqual(['A', 'B']);
        expect(batch[0].selected[0].dataIndex).toEqual([0, 1]);
    });

    it('does not fail when the component has no event bridge', () => {
        const m = mount(Chart, chartProps());
        expect(() => m.chart().trigger('click', { name: 'a' })).not.toThrow();
    });
});

describe('rich text tooltips', () => {
    const rich = (formatter: string) => ({ ...BAR, tooltip: { renderMode: 'richText', formatter } });

    it('leaves the formatter as written when the chart has only ever had a rich text tooltip', () => {
        const m = mount(Chart, chartProps({ option: rich('T < 5 & P > 2: {c}') }));
        expect(m.chart().getOption().tooltip[0].formatter).toBe('T < 5 & P > 2: {c}');
        m.update({ option: rich('a <b> c') });
        expect(m.chart().getOption().tooltip[0].formatter).toBe('a <b> c');
    });

    it('starts a new chart before trusting rich text on one that has rendered HTML tooltips', () => {
        // The tooltip view keeps the mode it was created with, so an option
        // that merely says richText must not get unsanitised markup into it.
        const m = mount(Chart, chartProps({ option: { ...BAR, tooltip: {} } }));
        const first = m.chart();
        m.update({ option: rich('<img src=x onerror="x()">') });
        expect(m.chart()).not.toBe(first);
        expect(first.isDisposed()).toBe(true);
        expect(m.chart().getOption().tooltip[0].renderMode).toBe('richText');
    });
});

describe('event volume', () => {
    const brushable = { ...BAR, brush: { toolbox: ['lineX'], xAxisIndex: 0, throttleType: 'fixRate', throttleDelay: 0 } };
    const brush = (m: Mounted, to: number) => m.chart().dispatchAction({
        type: 'brush', areas: [{ brushType: 'lineX', xAxisIndex: 0, coordRange: [0, to] }],
    });
    const brushed = (m: Mounted) => m.events.filter(e => e[0] === 'onBrushSelected');

    it('delivers a burst of brush selections once, with the final selection', () => {
        const m = mount(Chart, chartProps({ option: brushable }));
        flush(500);
        m.events.length = 0;
        for (let i = 0; i < 20; i++) brush(m, i % 2);
        brush(m, 1);
        expect(brushed(m).length).toBeLessThanOrEqual(1);
        flush(500);
        expect(brushed(m).length).toBeLessThanOrEqual(2);
        const last = brushed(m)[brushed(m).length - 1][1];
        expect(last.batch[0].selected[0]).toMatchObject({ dataIndex: [0, 1], dataIndexCount: 2 });
    });

    it('drops a pending brush selection on unmount', () => {
        const m = mount(Chart, chartProps({ option: brushable }));
        flush(500);
        brush(m, 1);
        const before = m.events.length;
        m.unmount();
        expect(() => flush(500)).not.toThrow();
        expect(m.events.length).toBe(before);
    });
});

describe('accessibility', () => {
    it('enables ECharts aria unless the option configures it', () => {
        const m = mount(Chart, chartProps());
        expect(m.chart().getOption().aria.enabled).toBe(true);
        expect(m.mount().getAttribute('aria-label')).toMatch(/\S/);

        const off = mount(Chart, chartProps({ option: { ...BAR, aria: { enabled: false } } }));
        expect(off.chart().getOption().aria.enabled).toBe(false);
    });

    it('puts aria in baseOption for a timeline option', () => {
        const m = mount(Chart, chartProps({ option: { baseOption: { ...BAR, timeline: { data: ['1'] } }, options: [{}] } }));
        expect(alertOf(m)).toBeNull();
        expect(m.chart().getOption().aria.enabled).toBe(true);
    });

    it('labels the root as an image when ariaLabel is set', () => {
        const m = mount(Chart, chartProps());
        expect(m.root().hasAttribute('role')).toBe(false);
        expect(m.root().hasAttribute('aria-label')).toBe(false);

        m.update({ ariaLabel: 'Line 3 flow rate' });
        expect(m.root().getAttribute('role')).toBe('img');
        expect(m.root().getAttribute('aria-label')).toBe('Line 3 flow rate');
    });
});

describe('components with a behaviour', () => {
    interface Domain { values: number[] }

    function setup() {
        const behavior: jest.Mocked<ChartBehavior<Domain>> = {
            readProps: jest.fn(tree => ({ values: tree.read('values', [1, 2]) })),
            buildOption: jest.fn((p: Domain) => {
                if (p.values.length === 0) throw new Error('no values');
                return { ...BAR, series: [{ type: 'bar', name: 'built', data: p.values }] };
            }),
        };
        const row: ChartManifestEntry = { ...ROW, id: 'open.industrial.Fake', cssClass: 'open-industrial-fake' };
        delete row.defaultOption;
        return { behavior, behaviorMeta: makeMeta(row, behavior) };
    }

    it('only reads in the props reducer', () => {
        const { behavior, behaviorMeta } = setup();
        const props = behaviorMeta.getPropsReducer!(fakeTree({ values: [5] }));
        expect(props).toMatchObject({ option: {}, theme: '', ariaLabel: '', domain: { values: [5] } });
        expect(behavior.readProps).toHaveBeenCalledTimes(1);
        expect(behavior.buildOption).not.toHaveBeenCalled();
    });

    it('builds the option from the domain props', () => {
        const { behaviorMeta } = setup();
        const m = mount(behaviorMeta.getViewComponent(), chartProps({ option: {}, domain: { values: [4, 5] } }));
        expect(m.root().classList.contains('open-industrial-fake')).toBe(true);
        expect(m.chart().getOption().series[0]).toMatchObject({ name: 'built', data: [4, 5] });
    });

    it('lets a non-empty option prop win', () => {
        const { behavior, behaviorMeta } = setup();
        const m = mount(behaviorMeta.getViewComponent(), chartProps({ option: BAR, domain: { values: [4, 5] } }));
        expect(m.chart().getOption().series[0].name).toBe('A');
        expect(behavior.buildOption).not.toHaveBeenCalled();

        m.update({ option: {} });
        expect(m.chart().getOption().series[0].name).toBe('built');
    });

    it('rebuilds only when the domain props change', () => {
        const { behavior, behaviorMeta } = setup();
        const m = mount(behaviorMeta.getViewComponent(), chartProps({ option: {}, domain: { values: [1] } }));
        expect(behavior.buildOption).toHaveBeenCalledTimes(1);

        m.update({ domain: { values: [1] }, showLoading: true });
        m.update({ domain: { values: [1] }, ariaLabel: 'x' });
        expect(behavior.buildOption).toHaveBeenCalledTimes(1);

        m.update({ domain: { values: [1, 2] } });
        expect(behavior.buildOption).toHaveBeenCalledTimes(2);
        expect(m.chart().getOption().series[0].data).toEqual([1, 2]);
    });

    it('shows an error when the option cannot be built and recovers', () => {
        const { behaviorMeta } = setup();
        const m = mount(behaviorMeta.getViewComponent(), chartProps({ option: {}, domain: { values: [] } }));
        expect(alertOf(m)!.textContent).toContain('no values');

        m.update({ domain: { values: [3] } });
        expect(alertOf(m)).toBeNull();
        expect(m.chart().getOption().series[0].data).toEqual([3]);
    });
});

describe('charts that need echarts-gl', () => {
    const GlChart = makeMeta({ ...ROW, id: 'open.echarts.Bar3DChart', cssClass: 'open-echarts-bar3d', gl: true })
        .getViewComponent();

    it('does not load echarts-gl for a 2D chart', () => {
        mount(Chart, chartProps());
        expect(loadGLMock).not.toHaveBeenCalled();
    });

    it('waits for echarts-gl before creating the chart, showing a loading state meanwhile', async () => {
        let resolve!: () => void;
        loadGLMock.mockImplementation(() => new Promise<void>(r => { resolve = r; }));
        const init = jest.spyOn(echarts, 'init');

        const m = mount(GlChart, chartProps());
        expect(loadGLMock).toHaveBeenCalledTimes(1);
        expect(init).not.toHaveBeenCalled();
        expect(m.host.querySelector('[role="status"]')).not.toBeNull();

        m.update({ option: TWO_SERIES });
        expect(init).not.toHaveBeenCalled();

        resolve();
        await settle();
        expect(init).toHaveBeenCalledTimes(1);
        expect(m.host.querySelector('[role="status"]')).toBeNull();
        expect(m.chart().getOption().series).toHaveLength(2);
    });

    it('shows a load failure and retries on the next change', async () => {
        loadGLMock.mockImplementationOnce(() => Promise.reject(new Error('Loading chunk echarts-gl failed')));
        const m = mount(GlChart, chartProps());
        await settle();
        expect(alertOf(m)!.textContent).toContain('Loading chunk echarts-gl failed');
        expect(m.host.querySelector('[role="status"]')).toBeNull();

        m.update({ option: TWO_SERIES });
        await settle();
        expect(alertOf(m)).toBeNull();
        expect(m.chart().getOption().series).toHaveLength(2);
    });

    it('ignores a load that finishes after unmount', async () => {
        let resolve!: () => void;
        loadGLMock.mockImplementation(() => new Promise<void>(r => { resolve = r; }));
        const init = jest.spyOn(echarts, 'init');
        const m = mount(GlChart, chartProps());
        m.unmount();
        resolve();
        await settle();
        expect(init).not.toHaveBeenCalled();
    });
});

describe('maps', () => {
    const square = (name: string, x: number) => ({
        type: 'Feature', properties: { name },
        geometry: { type: 'Polygon', coordinates: [[[x, 0], [x + 1, 0], [x + 1, 1], [x, 1], [x, 0]]] },
    });
    const PLANT = { type: 'FeatureCollection', features: [square('North', 0), square('South', 2)] };
    const mapOption = (map: string) => ({ series: [{ type: 'map', map, data: [{ name: 'North', value: 1 }] }] });
    const regions = (m: Mounted) => m.mount().querySelectorAll('path').length;

    it('registers GeoJSON from the maps prop before the option is applied', () => {
        const m = mount(Chart, chartProps({ option: mapOption('plantA'), maps: { plantA: PLANT } }));
        expect(alertOf(m)).toBeNull();
        expect(echarts.getMap('plantA')).toBeTruthy();
        expect(regions(m)).toBeGreaterThanOrEqual(2);
    });

    it('draws the map once it is supplied after the chart', () => {
        const m = mount(Chart, chartProps({ option: mapOption('plantLate') }));
        const before = alertOf(m) ? 0 : regions(m);
        m.update({ maps: { plantLate: PLANT } });
        expect(alertOf(m)).toBeNull();
        expect(regions(m)).toBeGreaterThan(before);
        expect(regions(m)).toBeGreaterThanOrEqual(2);
    });

    it('registers again only when a map changes', () => {
        const register = jest.spyOn(echarts, 'registerMap');
        const m = mount(Chart, chartProps({ option: mapOption('plantB'), maps: { plantB: PLANT } }));
        expect(register).toHaveBeenCalledTimes(1);
        const setOption = jest.spyOn(m.chart(), 'setOption');

        m.update({ maps: { plantB: copy(PLANT) }, showLoading: true });
        expect(register).toHaveBeenCalledTimes(1);
        expect(setOption).not.toHaveBeenCalled();

        m.update({ maps: { plantB: { ...PLANT, features: [square('North', 0)] } } });
        expect(register).toHaveBeenCalledTimes(2);
        expect(setOption).toHaveBeenCalledTimes(1);
    });

    it('accepts the { geoJSON, specialAreas } form', () => {
        const maps = { plantC: { geoJSON: PLANT, specialAreas: { South: { left: 0, top: 0, width: 1 } } } };
        const m = mount(Chart, chartProps({ option: mapOption('plantC'), maps }));
        expect(alertOf(m)).toBeNull();
        expect(echarts.getMap('plantC').specialAreas).toEqual(maps.plantC.specialAreas);
    });

    it('sanitises an SVG map unless sanitizeTooltip is off', () => {
        const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">' +
            '<script>window.__pwned = 1</script><path name="North" d="M0 0L5 0L5 5Z" onclick="x()"/></svg>';
        const register = jest.spyOn(echarts, 'registerMap');

        mount(Chart, chartProps({ option: BAR, maps: { svgSafe: { svg } } }));
        const safe = (register.mock.calls[0][1] as any).svg as string;
        expect(safe).toContain('<path');
        expect(safe).not.toMatch(/script|onclick/i);

        mount(Chart, chartProps({ option: BAR, maps: { svgRaw: { svg } }, sanitizeTooltip: false }));
        expect((register.mock.calls[1][1] as any).svg).toBe(svg);
    });

    it('ignores malformed entries', () => {
        const register = jest.spyOn(echarts, 'registerMap');
        const maps = { a: null, b: 'text', c: 5, d: {}, e: { svg: 7 }, f: { geoJSON: 'x' }, g: [PLANT], h: { features: 'no' } };
        const m = mount(Chart, chartProps({ maps }));
        expect(register).not.toHaveBeenCalled();
        expect(alertOf(m)).toBeNull();

        const other = mount(Chart, chartProps({ maps: 'not an object' }));
        expect(alertOf(other)).toBeNull();
        expect(other.chart().getOption().series).toHaveLength(1);
    });

    it('skips a map ECharts rejects and keeps the others', () => {
        const realRegister = echarts.registerMap;
        jest.spyOn(echarts, 'registerMap').mockImplementation((name: any, input: any) => {
            if (name === 'bad') throw new Error('cannot parse');
            return realRegister(name, input);
        });
        const m = mount(Chart, chartProps({ maps: { bad: PLANT, plantD: PLANT } }));
        expect(alertOf(m)).toBeNull();
        expect(echarts.getMap('plantD')).toBeTruthy();
    });
});
