import { sanitizeOption, serializeEventParams } from '../utils/optionSanitizer';

describe('sanitizeOption', () => {
    it('passes through plain objects unchanged', () => {
        const option = { xAxis: { type: 'category' }, series: [{ type: 'bar', data: [1, 2, 3] }] };
        expect(sanitizeOption(option)).toEqual(option);
    });

    it('strips function values', () => {
        const option = {
            tooltip: {
                trigger: 'axis',
                formatter: function (params: any) { return params.value; }
            }
        };
        const result = sanitizeOption(option);
        expect(result.tooltip.trigger).toBe('axis');
        expect(result.tooltip.formatter).toBeUndefined();
    });

    it('strips nested functions', () => {
        const option = {
            series: [{
                type: 'line',
                label: {
                    formatter: () => 'test',
                    show: true
                }
            }]
        };
        const result = sanitizeOption(option);
        expect(result.series[0].label.show).toBe(true);
        expect(result.series[0].label.formatter).toBeUndefined();
    });

    it('preserves null and undefined values', () => {
        const option = { a: null, b: undefined, c: 0, d: '' };
        const result = sanitizeOption(option);
        expect(result.a).toBeNull();
        expect(result.c).toBe(0);
        expect(result.d).toBe('');
    });

    it('preserves booleans and numbers', () => {
        const option = { animation: true, animationDuration: 300, darkMode: false };
        expect(sanitizeOption(option)).toEqual(option);
    });

    it('handles circular references without crashing', () => {
        const option: any = { a: 1 };
        option.self = option;
        const result = sanitizeOption(option);
        expect(result.a).toBe(1);
        expect(result.self).toBeUndefined();
    });

    it('caps large arrays', () => {
        const bigArray = new Array(6000).fill(1);
        const option = { series: [{ data: bigArray }] };
        const result = sanitizeOption(option);
        expect(result.series[0].data.length).toBe(5000);
    });

    it('caps long strings', () => {
        const longStr = 'x'.repeat(60000);
        const option = { title: { text: longStr } };
        const result = sanitizeOption(option);
        expect(result.title.text.length).toBe(50000);
    });

    it('handles deeply nested objects up to max depth', () => {
        let obj: any = { value: 'leaf' };
        for (let i = 0; i < 25; i++) {
            obj = { child: obj };
        }
        const result = sanitizeOption(obj);
        let depth = 0;
        let current = result;
        while (current && current.child) {
            depth++;
            current = current.child;
        }
        expect(depth).toBeLessThanOrEqual(20);
    });

    it('handles empty objects and arrays', () => {
        expect(sanitizeOption({})).toEqual({});
        expect(sanitizeOption({ data: [] })).toEqual({ data: [] });
    });
});

describe('serializeEventParams', () => {
    it('extracts allowed keys from event params', () => {
        const params = {
            componentType: 'series',
            seriesType: 'bar',
            seriesIndex: 0,
            seriesName: 'Sales',
            name: 'Mon',
            dataIndex: 0,
            value: 120,
            color: '#5470c6',
            event: { target: {} }
        };
        const result = serializeEventParams(params);
        expect(result.componentType).toBe('series');
        expect(result.seriesType).toBe('bar');
        expect(result.value).toBe(120);
        expect(result.event).toBeUndefined();
    });

    it('excludes unknown keys', () => {
        const params = {
            seriesName: 'Test',
            unknownKey: 'should not appear',
            $el: {}
        };
        const result = serializeEventParams(params);
        expect(result.seriesName).toBe('Test');
        expect(result.unknownKey).toBeUndefined();
        expect(result.$el).toBeUndefined();
    });

    it('handles null/undefined input', () => {
        expect(serializeEventParams(null)).toEqual({});
        expect(serializeEventParams(undefined)).toEqual({});
        expect(serializeEventParams('string')).toEqual({});
    });

    it('strips functions from nested param values', () => {
        const params = {
            data: { value: 42, callback: () => {} }
        };
        const result = serializeEventParams(params);
        expect(result.data.value).toBe(42);
        expect(result.data.callback).toBeUndefined();
    });
});
