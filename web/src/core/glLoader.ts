let pending: Promise<void> | null = null;

/**
 * Loads echarts-gl (3D and WebGL series) on first use and registers it with
 * ECharts. It is a separate chunk so sessions without a GL chart never
 * download it. Charts must be created after this resolves: an ECharts
 * instance only knows the series types registered before it was created.
 */
export function loadGL(): Promise<void> {
    if (!pending) {
        const load = import(/* webpackChunkName: "echarts-gl" */ 'echarts-gl').then(() => undefined);
        pending = load;
        // A failed download must not be remembered, or the chart could never recover.
        load.catch(() => { if (pending === load) pending = null; });
    }
    return pending;
}
