import * as React from 'react';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import type { PComponent, PropertyTree } from '@inductiveautomation/perspective-client';

// The mock maps echarts/core to the real, full ECharts build.
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const echarts = require('echarts/core');

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

type ResizeCallback = () => void;

/** The fake size of every element; jsdom does no layout. */
export const layout = { width: 600, height: 400 };

class FakeResizeObserver {
    static instances: FakeResizeObserver[] = [];
    observed: Element[] = [];
    disconnected = false;
    constructor(private readonly callback: ResizeCallback) {
        FakeResizeObserver.instances.push(this);
    }
    observe(el: Element) { this.observed.push(el); }
    unobserve() { /* not used */ }
    disconnect() { this.disconnected = true; this.observed = []; }
    fire() { if (!this.disconnected) this.callback(); }
}

/** Live observers; call `fire()` on them to simulate the element changing size. */
export function resizeObservers(): FakeResizeObserver[] {
    return FakeResizeObserver.instances.filter(o => !o.disconnected);
}

/** Gives jsdom the few browser features ECharts and the component rely on. */
export function installBrowserStubs(): void {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => layout.width });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => layout.height });
    (globalThis as any).ResizeObserver = FakeResizeObserver;
    FakeResizeObserver.instances = [];
    layout.width = 600;
    layout.height = 400;
}

/** A PropertyTree stand-in: every `readX(path, fallback)` returns a fresh copy of the stored value. */
export function fakeTree(values: Record<string, any>): PropertyTree {
    const read = (path: string, fallback?: any) =>
        path in values ? JSON.parse(JSON.stringify(values[path])) : fallback;
    return new Proxy({}, {
        get: (_target, name) => (typeof name === 'string' && name.startsWith('read') ? read : undefined),
    }) as PropertyTree;
}

export interface Mounted {
    host: HTMLElement;
    root(): HTMLElement;
    mount(): HTMLElement;
    chart(): any;
    events: Array<[string, any]>;
    update(props: Record<string, any>): void;
    unmount(): void;
}

/** Renders a Perspective component the way the client does: props in `props`, root attributes from `emit`. */
export function mountComponent(Component: PComponent, initial: Record<string, any>): Mounted {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const reactRoot: Root = createRoot(host);
    const events: Array<[string, any]> = [];
    let current = initial;

    const element = () => React.createElement(Component as React.ComponentClass<any>, {
        props: current,
        emit: (e: { classes?: string[] } = {}) => ({ className: (e.classes || []).join(' '), 'data-component': 'x' }),
        componentEvents: { fireComponentEvent: (name: string, payload: any) => { events.push([name, payload]); } },
    });

    act(() => { reactRoot.render(element()); });

    const mounted: Mounted = {
        host,
        events,
        root: () => host.firstElementChild as HTMLElement,
        mount: () => host.querySelector('.open-echarts-mount') as HTMLElement,
        chart: () => echarts.getInstanceByDom(mounted.mount()),
        update(props) {
            current = { ...current, ...props };
            act(() => { reactRoot.render(element()); });
        },
        unmount() {
            act(() => { reactRoot.unmount(); });
            host.remove();
        },
    };
    return mounted;
}

/** Runs pending animation frames and timers inside act(). */
export function flush(ms = 50): void {
    act(() => { jest.advanceTimersByTime(ms); });
}

/** Resolves pending promise callbacks inside act(). */
export async function settle(): Promise<void> {
    await act(async () => {
        for (let i = 0; i < 5; i++) await Promise.resolve();
    });
}

export const BAR = {
    xAxis: { type: 'category', data: ['a', 'b'] },
    yAxis: {},
    series: [{ type: 'bar', name: 'A', data: [1, 2] }],
};

/** Passes the sanitiser and option merging, then throws inside ECharts: a cartesian series without axes. */
export const BROKEN = { series: [{ type: 'line', data: [1, 2] }] };

/** Shared chart props with the defaults the props reducer would supply, on the SVG renderer jsdom can run. */
export function chartProps(overrides: Record<string, any> = {}): Record<string, any> {
    return {
        option: BAR,
        theme: '',
        renderer: 'svg',
        autoResize: true,
        resizeDebounceMs: 150,
        notMerge: false,
        lazyUpdate: false,
        showLoading: false,
        loadingOptions: {},
        sanitizeTooltip: true,
        ariaLabel: '',
        maps: {},
        ...overrides,
    };
}
