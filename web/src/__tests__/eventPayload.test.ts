import { CHART_EVENTS, serializeEventParams } from '../utils/eventPayload';

describe('CHART_EVENTS', () => {
    it('keeps the published Perspective event names', () => {
        expect(CHART_EVENTS).toEqual({
            click: 'onClick',
            dblclick: 'onDoubleClick',
            mouseover: 'onMouseOver',
            mouseout: 'onMouseOut',
            legendselectchanged: 'onLegendSelectChanged',
            datazoom: 'onDataZoom',
            brushselected: 'onBrushSelected',
        });
    });
});

describe('serializeEventParams', () => {
    const mouseParams = {
        componentType: 'series', componentSubType: 'bar', componentIndex: 0,
        seriesType: 'bar', seriesIndex: 0, seriesName: 'A', seriesId: 'x',
        name: 'Mon', dataIndex: 2, data: { value: 5, extra: [1, 2] }, dataType: undefined,
        value: 5, color: '#f00', percent: 12.5, borderColor: '#000',
        event: { target: document.createElement('div'), event: new Event('click') },
        $vars: ['seriesName', 'name', 'value'], type: 'click',
    };

    it.each(['click', 'dblclick', 'mouseover', 'mouseout'] as const)('%s delivers the documented fields only', (name) => {
        expect(serializeEventParams(name, mouseParams)).toEqual({
            componentType: 'series', seriesType: 'bar', seriesIndex: 0, seriesName: 'A',
            name: 'Mon', dataIndex: 2, data: { value: 5, extra: [1, 2] },
            value: 5, color: '#f00', percent: 12.5,
        });
    });

    it('legendselectchanged delivers name and selected', () => {
        expect(serializeEventParams('legendselectchanged', {
            type: 'legendselectchanged', name: 'A', selected: { A: false, B: true },
        })).toEqual({ name: 'A', selected: { A: false, B: true } });
    });

    it('datazoom delivers the zoom window, including batched windows', () => {
        expect(serializeEventParams('datazoom', {
            type: 'datazoom', start: 10, end: 60, dataZoomId: 'dz', from: 'ec_1',
        })).toEqual({ start: 10, end: 60, dataZoomId: 'dz' });

        expect(serializeEventParams('datazoom', {
            type: 'datazoom',
            batch: [{ dataZoomId: 'a', start: 0, end: 50, startValue: 1, endValue: 9, type: 'datazoom', from: 'x' }],
        })).toEqual({ batch: [{ dataZoomId: 'a', start: 0, end: 50, startValue: 1, endValue: 9 }] });
    });

    it('brushselected delivers the batch with areas and selected indices', () => {
        const out = serializeEventParams('brushselected', {
            type: 'brushselected',
            batch: [{
                brushId: 'b1', brushIndex: 0, brushName: 'brush',
                areas: [{ brushType: 'rect', range: [[1, 2], [3, 4]], coordRange: [[0, 1], [5, 6]] }],
                selected: [{ seriesId: 's', seriesIndex: 0, seriesName: 'A', dataIndex: [1, 4] }],
                internal: 'dropped',
            }],
        });
        expect(out).toEqual({
            batch: [{
                brushId: 'b1', brushIndex: 0, brushName: 'brush',
                areas: [{ brushType: 'rect', range: [[1, 2], [3, 4]], coordRange: [[0, 1], [5, 6]] }],
                selected: [{ seriesId: 's', seriesIndex: 0, seriesName: 'A', dataIndex: [1, 4] }],
            }],
        });
    });

    it('produces JSON-safe output: no functions, DOM nodes or cycles', () => {
        const data: any = { value: 1, fn: () => 1, node: document.createElement('i') };
        data.self = data;
        const out = serializeEventParams('click', { name: 'x', data });
        expect(out).toEqual({ name: 'x', data: { value: 1 } });
        expect(() => JSON.stringify(out)).not.toThrow();
    });

    it('converts dates and non-finite numbers to JSON-friendly values', () => {
        const out = serializeEventParams('click', { value: [new Date(0), NaN, 1] });
        expect(out).toEqual({ value: ['1970-01-01T00:00:00.000Z', null, 1] });
    });

    it('omits string-typed fields that ECharts leaves null instead of sending null', () => {
        expect(serializeEventParams('click', {
            componentType: 'title', seriesName: null, name: null, dataType: null, value: null, dataIndex: 0,
        })).toEqual({ componentType: 'title', value: null, dataIndex: 0 });

        expect(serializeEventParams('datazoom', { start: 0, end: 5, dataZoomId: null, batch: [{ dataZoomId: null, start: 1 }] }))
            .toEqual({ start: 0, end: 5, batch: [{ start: 1 }] });

        expect(serializeEventParams('brushselected', { batch: [{ brushId: 'b', brushName: null, areas: [] }] }))
            .toEqual({ batch: [{ brushId: 'b', areas: [] }] });

        expect(serializeEventParams('legendselectchanged', { name: null, selected: { A: true } }))
            .toEqual({ selected: { A: true } });
    });

    it('returns an empty object for missing params or an unknown event', () => {
        expect(serializeEventParams('click', null)).toEqual({});
        expect(serializeEventParams('rendered' as any, { name: 'x' })).toEqual({});
    });
});
