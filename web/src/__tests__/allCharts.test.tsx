import { MANIFEST } from '../core/manifest';
import { makeMeta } from '../core/meta';
import { INDUSTRIAL_BEHAVIORS } from '../industrial';
import { TEMPLATES } from '../templates';
import { chartProps, fakeTree, installBrowserStubs, mountComponent } from './support/harness';

jest.mock('../core/glLoader', () => ({ loadGL: jest.fn(() => Promise.resolve()) }));

/**
 * Every 2D component drawn with real ECharts from the props a newly dropped
 * component has. GL charts need WebGL and are covered by the browser smoke test.
 */
describe('default rendering', () => {
    beforeEach(() => {
        installBrowserStubs();
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => { jest.restoreAllMocks(); });

    it.each(MANIFEST.filter(row => !row.gl).map(row => [row.id, row] as const))('%s draws without an error', (id, row) => {
        const meta = makeMeta(row, INDUSTRIAL_BEHAVIORS[id]);
        const props = meta.getPropsReducer!(fakeTree({}));
        const m = mountComponent(meta.getViewComponent(), chartProps({ ...props, renderer: 'svg', lazyUpdate: false }));
        try {
            expect(m.host.querySelector('[role="alert"]')).toBeNull();
            expect(m.root().classList.contains(row.cssClass)).toBe(true);
            expect(m.mount().querySelector('svg')).not.toBeNull();
            expect(m.chart().isDisposed()).toBeFalsy();
        } finally {
            m.unmount();
        }
    });
});

describe('starter templates', () => {
    const Universal = makeMeta(MANIFEST.find(row => row.id === 'open.echarts.EChart')!).getViewComponent();

    beforeEach(() => {
        installBrowserStubs();
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => { jest.restoreAllMocks(); });

    it.each(Object.keys(TEMPLATES))('%s draws without an error', (name) => {
        const m = mountComponent(Universal, chartProps({ option: TEMPLATES[name] }));
        try {
            expect(m.host.querySelector('[role="alert"]')).toBeNull();
            expect(m.chart().getOption().series.length).toBeGreaterThan(0);
        } finally {
            m.unmount();
        }
    });
});
