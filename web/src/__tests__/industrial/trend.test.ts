import { toTrendSeriesData, trendBehavior } from '../../industrial/trend';
import { Opt, expectPlainOption, fakeTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    trendBehavior.buildOption(trendBehavior.readProps(fakeTree(props)));

describe('industrial Trend', () => {
    it('readProps applies the schema defaults', () => {
        expect(trendBehavior.readProps(fakeTree({}))).toEqual({
            data: {}, limits: {}, yAxisLabel: '', showSetpoint: true, showDataZoom: true,
        });
    });

    it('builds PV and SP line series on a time axis', () => {
        const option = build({
            data: { pvData: [[1000, 1], [2000, 2]], spData: [[1000, 5], [2000, 5]] },
            yAxisLabel: 'degC',
        });
        expect(option.xAxis).toEqual({ type: 'time' });
        expect(option.yAxis.name).toBe('degC');
        expect(option.series.map((s: Opt) => s.name)).toEqual(['PV', 'SP']);
        expect(option.legend.data).toEqual(['PV', 'SP']);
        expect(option.series[0].data).toEqual([[1000, 1], [2000, 2]]);
        expect(option.dataZoom).toHaveLength(2);
        expect(option.title.text).toBe('');
    });

    it('hides the setpoint and data zoom when asked, and omits SP when it has no data', () => {
        const data = { pvData: [[1, 1]], spData: [[1, 2]] };
        expect(build({ data, showSetpoint: false }).series).toHaveLength(1);
        expect(build({ data: { pvData: [[1, 1]] } }).series).toHaveLength(1);
        expect(build({ data, showDataZoom: false }).dataZoom).toEqual([]);
    });

    it('converts object rows using timeField / valueField (bug 5)', () => {
        const option = build({
            data: {
                pvData: [{ ts: 1000, pv: 1.5 }, { ts: 2000, pv: '2.5' }, { ts: 3000, pv: null }, { pv: 9 }],
                spData: [{ ts: 1000, pv: 7 }],
                timeField: 'ts', valueField: 'pv',
            },
        });
        // a row with a time but no value is a gap; a row without a time is dropped
        expect(option.series[0].data).toEqual([[1000, 1.5], [2000, 2.5], [3000, null]]);
        expect(option.series[1].data).toEqual([[1000, 7]]);
    });

    it('defaults the field names to t / v, also when they are blank or not strings', () => {
        const rows = [{ t: '2025-01-01T00:00:00Z', v: 3 }];
        expect(build({ data: { pvData: rows } }).series[0].data).toEqual([['2025-01-01T00:00:00Z', 3]]);
        expect(build({ data: { pvData: rows, timeField: '', valueField: null } }).series[0].data)
            .toEqual([['2025-01-01T00:00:00Z', 3]]);
    });

    it('passes [t, v] rows through, mixed with object rows, and skips junk rows', () => {
        const pair = [1000, 1];
        const data = toTrendSeriesData([pair, { t: 2000, v: 2 }, null, 5, 'x', [1], {}, [3000, 3]], 't', 'v');
        expect(data).toEqual([[1000, 1], [2000, 2], [3000, 3]]);
        expect(data[0]).toBe(pair);
    });

    it('does not copy an array that is already all pairs, and keeps large series cheap (bug 5)', () => {
        const big: number[][] = [];
        for (let i = 0; i < 200000; i++) big.push([i * 1000, Math.sin(i)]);
        const started = Date.now();
        const option = build({ data: { pvData: big } });
        expect(Date.now() - started).toBeLessThan(10_000);
        expect(option.series[0].data).toBe(big);
        expect(option.series[0].sampling).toBe('lttb');
        expect(option.series[0].symbol).toBe('none');
        expect(option.series[0].showSymbol).toBe(false);
    });

    it('draws only the limits that are numbers', () => {
        const option = build({
            data: { pvData: [[1, 1]] },
            limits: { hiAlarm: 90, hiWarning: '80', loWarning: null, loAlarm: 'x' },
        });
        const lines = option.series[0].markLine.data;
        expect(lines.map((l: Opt) => [l.label.formatter, l.yAxis])).toEqual([['Hi Alarm', 90], ['Hi Warn', 80]]);
        expect(build({ data: { pvData: [[1, 1]] } }).series[0].markLine).toBeUndefined();
        expect(build({ data: { pvData: [[1, 1]] }, limits: { loAlarm: 0 } }).series[0].markLine.data[0].yAxis).toBe(0);
    });

    it('degrades to an empty chart on malformed data (bug 2)', () => {
        for (const data of [null, 'x', 5, [], { pvData: 'abc' }, { pvData: { $columns: [] } }, { pvData: [null] }]) {
            const option = build({ data });
            expectPlainOption(option);
            expect(option.series).toHaveLength(1);
            expect(option.series[0].data).toEqual([]);
            expect(option.title.text).toBe('No data');
        }
    });
});
