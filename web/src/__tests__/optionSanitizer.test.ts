import { sanitizeOption } from '../utils/optionSanitizer';

const XSS = '<img src=x onerror="window.__pwned = 1">';

/** Parses sanitised HTML and reports whether anything executable is left in it. */
function isInert(html: string): boolean {
    const box = document.createElement('div');
    box.innerHTML = html;
    const all = Array.from(box.querySelectorAll('*'));
    return all.every(el =>
        !['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'STYLE', 'FORM', 'LINK', 'META', 'BASE'].includes(el.tagName) &&
        Array.from(el.attributes).every(a =>
            !/^on/i.test(a.name) && !/^\s*(javascript|data|vbscript):/i.test(a.value)));
}

describe('sanitizeOption — tooltip HTML', () => {
    it('removes event handlers from a global tooltip formatter', () => {
        const out = sanitizeOption({ tooltip: { formatter: `{b}: {c} ${XSS}` } });
        expect(out.tooltip.formatter).not.toMatch(/onerror/i);
        expect(isInert(out.tooltip.formatter)).toBe(true);
        expect(out.tooltip.formatter).toContain('{b}: {c}');
    });

    it('removes script elements', () => {
        const out = sanitizeOption({ tooltip: { formatter: 'a<script>alert(1)</script>b' } });
        expect(out.tooltip.formatter).toBe('ab');
    });

    it.each([
        ['an array of tooltips', { tooltip: [{ formatter: XSS }] }, (o: any) => o.tooltip[0].formatter],
        ['an axis tooltip', { xAxis: { tooltip: { formatter: XSS } } }, (o: any) => o.xAxis.tooltip.formatter],
        ['a series tooltip', { series: [{ type: 'bar', tooltip: { formatter: XSS } }] },
            (o: any) => o.series[0].tooltip.formatter],
        ['a data item tooltip', { series: [{ type: 'bar', data: [1, { value: 2, tooltip: { formatter: XSS } }] }] },
            (o: any) => o.series[0].data[1].tooltip.formatter],
        ['a nested tree node tooltip',
            { series: [{ type: 'tree', data: [{ name: 'a', children: [{ name: 'b', tooltip: { formatter: XSS } }] }] }] },
            (o: any) => o.series[0].data[0].children[0].tooltip.formatter],
        ['a mark line pair', { series: [{ type: 'line', markLine: { data: [[{ tooltip: { formatter: XSS } }, {}]] } }] },
            (o: any) => o.series[0].markLine.data[0][0].tooltip.formatter],
        ['a timeline base option', { baseOption: { tooltip: { formatter: XSS } }, options: [] },
            (o: any) => o.baseOption.tooltip.formatter],
        ['a toolbox tooltip content', { toolbox: { tooltip: { content: XSS } } }, (o: any) => o.toolbox.tooltip.content],
    ])('sanitises %s', (_name, option, pick) => {
        const html = pick(sanitizeOption(option));
        expect(html).not.toMatch(/onerror/i);
        expect(isInert(html)).toBe(true);
    });

    it('keeps harmless formatting markup', () => {
        const formatter = '<b>{b}</b><br><span style="color: red">{c}</span>';
        const out = sanitizeOption({ tooltip: { formatter } });
        const box = document.createElement('div');
        box.innerHTML = out.tooltip.formatter;
        expect(box.querySelector('b')!.textContent).toBe('{b}');
        expect(box.querySelector('span')!.getAttribute('style')).toContain('red');
        expect(box.querySelector('br')).not.toBeNull();
    });

    it('removes javascript: URLs, forms and style elements from formatter markup', () => {
        const out = sanitizeOption({
            tooltip: {
                formatter: '<a href="javascript:alert(1)">x</a><form action="/x"><input name="p"></form>' +
                    '<style>body{display:none}</style>'
            }
        });
        expect(isInert(out.tooltip.formatter)).toBe(true);
        expect(out.tooltip.formatter).not.toMatch(/<input|<form|<style/i);
    });

    it('does not let a data value become a link target or a resource URL through a template placeholder', () => {
        const out = sanitizeOption({ tooltip: { formatter: '<a href="{c}">open</a><img src="{b}">' } });
        expect(out.tooltip.formatter).not.toMatch(/href|src/i);
    });

    it('removes inline styles that load external resources', () => {
        const out = sanitizeOption({
            tooltip: { formatter: '<div style="background:url(https://evil.example/x)">x</div>' }
        });
        expect(out.tooltip.formatter).not.toMatch(/url\(/i);
    });

    it('leaves plain-text template formatters byte-for-byte unchanged', () => {
        const option = { tooltip: { formatter: '{a} <br/>{b}: {c} ({d}%)' } };
        const plain = { tooltip: { formatter: '{b}: {c} kW & rising' } };
        expect(sanitizeOption(plain)).toBe(plain);
        const out = sanitizeOption(option);
        expect(out.tooltip.formatter).toMatch(/^\{a\} <br\s*\/?>\{b\}: \{c\} \(\{d\}%\)$/);
    });

    it('sanitises the data view title and button labels, which ECharts writes as HTML', () => {
        const out = sanitizeOption({ toolbox: { feature: { dataView: { title: XSS, lang: [XSS, 'Close', XSS] } } } });
        const dv = out.toolbox.feature.dataView;
        expect([dv.title, ...dv.lang].every(isInert)).toBe(true);
        expect(dv.lang[1]).toBe('Close');
    });
});

describe('sanitizeOption — CSS', () => {
    it.each([
        'background:url(https://evil.example/t.gif)',
        'background-image: URL( "//evil.example/t.gif" )',
        'background: image-set("https://evil.example/a.png" 1x)',
        'background:u\\72l(https://evil.example/x)',
        'background:/**/url(https://evil.example/x)',
        '@import "https://evil.example/x.css"',
        'width: expression(alert(1))',
    ])('drops extraCssText that could load an external resource: %s', (css) => {
        const out = sanitizeOption({ tooltip: { extraCssText: css } });
        expect(out.tooltip.extraCssText).toBeUndefined();
    });

    it('keeps ordinary extraCssText', () => {
        const option = { tooltip: { extraCssText: 'box-shadow: 0 0 3px rgba(0, 0, 0, 0.3); max-width: 200px;' } };
        expect(sanitizeOption(option)).toBe(option);
    });
});

describe('sanitizeOption — colours', () => {
    const BREAKOUT = 'red"><img src=x onerror="window.__pwned = 1">';

    it('drops colour strings that carry markup or extra CSS', () => {
        const out = sanitizeOption({
            color: ['#fff', BREAKOUT],
            tooltip: { backgroundColor: BREAKOUT, borderColor: 'red;background:url(//evil.example)', borderWidth: '1px"><i>' },
            series: [{ type: 'bar', itemStyle: { color: BREAKOUT }, data: [{ value: 1, itemStyle: { borderColor: BREAKOUT } }] }],
        });
        expect(out.color).toEqual(['#fff', undefined]);
        expect(out.tooltip).toEqual({});
        expect(out.series[0].itemStyle).toEqual({});
        expect(out.series[0].data[0].itemStyle).toEqual({});
    });

    it('keeps real colours, gradients and palettes', () => {
        const option = {
            color: ['#3b6cb5', 'rgba(0, 0, 0, 0.5)', 'hsl(120, 50%, 50%)', 'transparent'],
            backgroundColor: 'rgb(255,255,255)',
            tooltip: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderColor: '#ccc', borderWidth: 1 },
            series: [{
                type: 'bar',
                itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'red' }] } },
                data: [1],
            }],
        };
        expect(sanitizeOption(option)).toBe(option);
    });
});

describe('sanitizeOption — URLs', () => {
    it.each([
        'javascript:alert(1)',
        ' JaVaScRiPt:alert(1)',
        'java\tscript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
    ])('drops the unsafe link %j', (url) => {
        const out = sanitizeOption({
            title: { text: 't', link: url, sublink: url },
            series: [{ type: 'treemap', data: [{ name: 'n', link: url, children: [{ name: 'c', link: url }] }] }],
        });
        expect(out.title.link).toBeUndefined();
        expect(out.title.sublink).toBeUndefined();
        expect(out.title.text).toBe('t');
        expect(out.series[0].data[0].link).toBeUndefined();
        expect(out.series[0].data[0].children[0].link).toBeUndefined();
    });

    it.each([
        'https://example.com/a?b=c#d',
        'http://example.com',
        '/data/perspective/client/project',
        '../reports/today',
        'page.html',
        '//cdn.example.com/x',
    ])('keeps the safe link %j', (url) => {
        const option = {
            title: [{ link: url, sublink: url }],
            series: [{ type: 'sunburst', data: [{ name: 'n', link: url }] }],
        };
        expect(sanitizeOption(option)).toBe(option);
    });
});

describe('sanitizeOption — link scope', () => {
    it('does not treat a `link` column of a dataset as a URL', () => {
        const option = { dataset: { source: [{ link: 'pump:1', flow: 3 }] }, series: [{ type: 'bar' }] };
        expect(sanitizeOption(option)).toBe(option);
    });
});

describe('sanitizeOption — functions', () => {
    it('drops function values and keeps their siblings', () => {
        const option = {
            tooltip: { trigger: 'axis', formatter: (p: any) => p.value },
            series: [{ type: 'line', label: { show: true, formatter: () => 'x' }, data: [1, 2] }],
        };
        const out = sanitizeOption(option);
        expect(out.tooltip).toEqual({ trigger: 'axis' });
        expect(out.series[0].label).toEqual({ show: true });
        expect(out.series[0].data).toBe(option.series[0].data);
    });
});

describe('sanitizeOption — valid options are left alone', () => {
    it('returns the very same object when nothing needs changing', () => {
        const option = {
            title: { text: 'Flow' },
            tooltip: { trigger: 'axis' },
            xAxis: { type: 'category', data: ['a', 'b'] },
            yAxis: {},
            series: [{ type: 'bar', data: [1, 2] }, { type: 'line', data: [[0, 1], [1, 2]] }],
        };
        expect(sanitizeOption(option)).toBe(option);
    });

    it('does not mutate its input', () => {
        const option = { tooltip: { formatter: XSS }, series: [{ type: 'bar', data: [1] }] };
        const snapshot = JSON.parse(JSON.stringify(option));
        const out = sanitizeOption(option);
        expect(option).toEqual(snapshot);
        expect(out).not.toBe(option);
    });

    it('copies only the path to a change', () => {
        const option = {
            tooltip: { formatter: XSS },
            xAxis: { type: 'category', data: ['a'] },
            series: [{ type: 'bar', data: [1, 2, 3] }],
        };
        const out = sanitizeOption(option);
        expect(out.xAxis).toBe(option.xAxis);
        expect(out.series).toBe(option.series);
    });

    it('keeps tree data nested far deeper than 20 levels', () => {
        const root: any = { name: 'n0' };
        let node = root;
        for (let i = 1; i <= 200; i++) {
            node.children = [{ name: `n${i}` }];
            node = node.children[0];
        }
        node.value = 42;
        const option = { series: [{ type: 'sunburst', data: [root] }] };
        const out = sanitizeOption(option);
        expect(out).toBe(option);
        let depth = 0;
        let cursor = out.series[0].data[0];
        while (cursor.children) { cursor = cursor.children[0]; depth++; }
        expect(depth).toBe(200);
        expect(cursor.value).toBe(42);
    });

    it('keeps every use of an object that is referenced more than once', () => {
        const style = { color: '#123456', width: 2 };
        const point = { value: 5, itemStyle: style };
        const option = {
            series: [
                { type: 'line', lineStyle: style, data: [point, point] },
                { type: 'line', lineStyle: style, data: [point] },
            ],
        };
        const out = sanitizeOption(option);
        expect(out).toEqual(option);
        expect(out.series[1].lineStyle).toEqual(style);
        expect(out.series[0].data[1]).toEqual(point);
    });

    it('still sanitises an unsafe object every time it is referenced', () => {
        const tip = { formatter: XSS };
        const out = sanitizeOption({ series: [{ type: 'bar', tooltip: tip }, { type: 'bar', tooltip: tip }] });
        expect(isInert(out.series[0].tooltip.formatter)).toBe(true);
        expect(isInert(out.series[1].tooltip.formatter)).toBe(true);
    });

    it('breaks a true cycle without throwing and keeps the rest', () => {
        const series: any = { type: 'bar', data: [1, 2] };
        series.self = series;
        const out = sanitizeOption({ series: [series] });
        expect(out.series[0].type).toBe('bar');
        expect(out.series[0].data).toEqual([1, 2]);
        expect(out.series[0].self).toBeUndefined();
    });

    it('does not truncate or copy large numeric data', () => {
        const flat = Array.from({ length: 200_000 }, (_, i) => i);
        const pairs = Array.from({ length: 200_000 }, (_, i) => [i, i * 2]);
        const option = { series: [{ type: 'line', data: flat }, { type: 'scatter', data: pairs }] };
        const started = performance.now();
        const out = sanitizeOption(option);
        const elapsed = performance.now() - started;
        expect(out).toBe(option);
        expect(out.series[0].data.length).toBe(200_000);
        // The old deep clone took hundreds of milliseconds here; a scan is far cheaper.
        expect(elapsed).toBeLessThan(250);
    });

    it('passes typed arrays through untouched', () => {
        const data = new Float32Array([1, 2, 3]);
        const option = { series: [{ type: 'line', data }] };
        expect(sanitizeOption(option).series[0].data).toBe(data);
    });

    it('returns non-object input as given', () => {
        expect(sanitizeOption(null)).toBeNull();
        expect(sanitizeOption(undefined)).toBeUndefined();
        expect(sanitizeOption('x')).toBe('x');
    });
});
