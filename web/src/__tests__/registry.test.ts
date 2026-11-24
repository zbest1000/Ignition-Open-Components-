import '../index';
import { MANIFEST } from '../core/manifest';
import { INDUSTRIAL_BEHAVIORS } from '../industrial';
import { fakeTree } from './support/harness';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const registered: any[] = require('@inductiveautomation/perspective-client').__registered;

describe('component registry', () => {
    const manifestIds = MANIFEST.map(row => row.id);
    const registeredIds = registered.map(meta => meta.getComponentType());

    it('has unique ids, each in a known namespace', () => {
        expect(manifestIds.length).toBeGreaterThan(0);
        expect(new Set(manifestIds).size).toBe(manifestIds.length);
        expect(manifestIds.filter(id => !/^open\.(echarts|industrial)\.[A-Za-z0-9]+$/.test(id))).toEqual([]);
    });

    it('registers every manifest id exactly once', () => {
        expect([...registeredIds].sort()).toEqual([...manifestIds].sort());
    });

    it('has a behaviour for every industrial component and for nothing else', () => {
        const industrial = manifestIds.filter(id => id.startsWith('open.industrial.'));
        expect(Object.keys(INDUSTRIAL_BEHAVIORS).sort()).toEqual([...industrial].sort());
    });

    it('gives every row a distinct CSS class', () => {
        expect(new Set(MANIFEST.map(row => row.cssClass)).size).toBe(MANIFEST.length);
    });

    it.each(MANIFEST.map(row => [row.id, row] as const))('%s registers the size and default props of its row', (id, row) => {
        const meta = registered.find(m => m.getComponentType() === id);
        expect(meta.getDefaultSize()).toEqual(row.size);
        expect(typeof meta.getViewComponent()).toBe('function');

        const props = meta.getPropsReducer(fakeTree({}));
        expect(props).toMatchObject({
            theme: '', renderer: 'canvas', autoResize: true, resizeDebounceMs: 150, notMerge: false,
            lazyUpdate: true, showLoading: false, loadingOptions: {}, sanitizeTooltip: true, ariaLabel: '', maps: {},
        });
        if (id.startsWith('open.industrial.')) {
            expect(props.option).toEqual({});
            expect(typeof props.domain).toBe('object');
        } else {
            expect(props.option).toEqual(row.defaultOption || {});
            expect(props.domain).toBeUndefined();
        }
    });
});
