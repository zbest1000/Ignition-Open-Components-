import { declaresRichTextTooltip, sanitizeOption } from '../utils/optionSanitizer';

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
        const out = sanitizeOption(option);
        // Same object back means nothing was cloned. No wall-clock assertion:
        // shared CI runners under coverage are too variable for one to be reliable.
        expect(out).toBe(option);
        expect(out.series[0].data).toBe(flat);
        expect(out.series[1].data).toBe(pairs);
        expect(out.series[0].data.length).toBe(200_000);
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

describe('sanitizeOption — rules follow the key, wherever it appears (review regressions)', () => {
    const BREAKOUT = 'red"></div>' + XSS + '<div style="';

    it.each([
        ['a series', { series: [{ type: 'bar', tooltip: XSS, data: [1] }] }, (o: any) => o.series[0].tooltip],
        ['a data item', { series: [{ type: 'bar', data: [{ value: 1, tooltip: XSS }] }] }, (o: any) => o.series[0].data[0].tooltip],
        ['a mark point', { series: [{ type: 'bar', markPoint: { data: [{ coord: [0, 1], tooltip: XSS }] } }] },
            (o: any) => o.series[0].markPoint.data[0].tooltip],
        ['a graphic element', { graphic: { elements: [{ type: 'rect', tooltip: XSS }] } }, (o: any) => o.graphic.elements[0].tooltip],
        ['the option root', { tooltip: XSS }, (o: any) => o.tooltip],
    ])('sanitises a string-valued tooltip on %s', (_name, option, pick) => {
        const html = pick(sanitizeOption(option));
        expect(typeof html).toBe('string');
        expect(html).not.toMatch(/onerror/i);
        expect(isInert(html)).toBe(true);
    });

    it.each([
        ['series level', { series: [{ type: 'sunburst', nodeClick: 'link', link: 'javascript:alert(1)', data: [] }] },
            (o: any) => o.series[0]],
        ['a level', { series: [{ type: 'sunburst', levels: [{}, { link: 'javascript:alert(1)' }], data: [] }] },
            (o: any) => o.series[0].levels[1]],
        ['an unknown holder', { anything: { deep: [{ sublink: 'vbscript:x' }] } }, (o: any) => o.anything.deep[0]],
    ])('drops an unsafe link at %s', (_name, option, pick) => {
        const holder = pick(sanitizeOption(option));
        expect(holder.link).toBeUndefined();
        expect(holder.sublink).toBeUndefined();
    });

    it.each([
        ' \tJaVa\nScRiPt:alert(1)', '\u0001javascript:alert(1)', 'java\u0000script:alert(1)', 'data :text/html,x'.replace(' ', '\t'),
        'vb\rscript:x', 'ms-msdt:/id', 'Line: 4',
    ])('drops the link %j: only http, https and relative URLs are opened', (url) => {
        expect(sanitizeOption({ series: [{ data: [{ link: url }] }] }).series[0].data[0].link).toBeUndefined();
    });

    it.each(['color0', 'borderColor0', 'borderColorDoji', 'textShadowColor', 'textBorderColor', 'areaColor',
        'inactiveColor', 'textareaColor', 'fill', 'stroke'])('drops markup in the colour key %s', (key) => {
        const out = sanitizeOption({ series: [{ type: 'candlestick', itemStyle: { [key]: BREAKOUT, opacity: 1 } }] });
        expect(out.series[0].itemStyle).toEqual({ opacity: 1 });
    });

    it('keeps modern CSS colour syntax', () => {
        const option = {
            color: ['var(--a)', 'transparent', 'inherit', 'hsl(120deg 75% 25% / 60%)', 'color-mix(in srgb, red 50%, blue)', 'rgb(1 2 3)'],
            backgroundColor: 'var(--neutral-10, #fff)',
            series: [{ type: 'candlestick', itemStyle: { color0: '#0a0', borderColor0: 'rgb(0, 128, 0)' } }],
        };
        expect(sanitizeOption(option)).toBe(option);
    });

    it.each([
        ['textStyle.fontFamily', { tooltip: { textStyle: { fontFamily: 'x;background-image:url(http://evil.invalid/leak)' } } },
            (o: any) => o.tooltip.textStyle.fontFamily],
        ['global textStyle.fontFamily', { textStyle: { fontFamily: 'x;background:url(//evil.invalid)' } }, (o: any) => o.textStyle.fontFamily],
        ['textStyle.decoration', { tooltip: { textStyle: { decoration: 'none;background:url(//evil.invalid)' } } },
            (o: any) => o.tooltip.textStyle.decoration],
        ['textStyle.align', { tooltip: { textStyle: { align: 'left;background:url(//evil.invalid)' } } }, (o: any) => o.tooltip.textStyle.align],
        ['textStyle.fontWeight', { tooltip: { textStyle: { fontWeight: 'bold;background:url(//evil.invalid)' } } },
            (o: any) => o.tooltip.textStyle.fontWeight],
        ['padding', { tooltip: { padding: '5px;background:url(//evil.invalid)' } }, (o: any) => o.tooltip.padding],
        ['padding array', { tooltip: { padding: [5, '5px;background:url(//evil.invalid)'] } }, (o: any) => o.tooltip.padding[1]],
        ['borderRadius', { tooltip: { borderRadius: '4;background:url(//evil.invalid)' } }, (o: any) => o.tooltip.borderRadius],
        ['shadowBlur', { tooltip: { shadowBlur: '4px red;background:url(//evil.invalid)' } }, (o: any) => o.tooltip.shadowBlur],
        ['shadowOffsetX', { series: [{ tooltip: { shadowOffsetX: '1;background:url(//evil.invalid)' } }] },
            (o: any) => o.series[0].tooltip.shadowOffsetX],
        ['transitionDuration', { tooltip: { transitionDuration: '1;background:url(//evil.invalid)' } },
            (o: any) => o.tooltip.transitionDuration],
        ['an unlisted tooltip field', { tooltip: { somethingNew: 'x;background:url(//evil.invalid)' } }, (o: any) => o.tooltip.somethingNew],
        ['extraCssText outside a tooltip', { legend: { extraCssText: 'background:url(//evil.invalid)' } }, (o: any) => o.legend.extraCssText],
    ])('drops CSS injected through %s', (_name, option, pick) => {
        expect(pick(sanitizeOption(option))).toBeUndefined();
    });

    it('keeps ordinary tooltip styling, including quoted font families', () => {
        const option = {
            textStyle: { fontFamily: '"Inter", "Segoe UI", sans-serif' },
            tooltip: {
                trigger: 'axis', position: 'top', className: 'my tip', appendTo: 'body > .host',
                padding: [5, 10], borderRadius: 4, shadowBlur: 10,
                textStyle: { fontFamily: "'Arial', sans-serif", fontWeight: 'bold', fontSize: 12, align: 'left' },
                axisPointer: { type: 'cross', label: { formatter: 'T < 5; P > 2: {value}' } },
                extraCssText: 'box-shadow: 0 0 3px rgba(0,0,0,.3); font-family: "Segoe UI", sans-serif; width: calc(100% - 4px)',
            },
        };
        expect(sanitizeOption(option)).toBe(option);
    });

    it('treats every template variable, including {f}, {g} and {@dimension}, as untrusted in URL attributes', () => {
        const out = sanitizeOption({
            tooltip: { formatter: '<a href="{f}">x</a><a href="{g0}">y</a><a href="{@url}">z</a><a href="{@[2]}">w</a>' },
        });
        expect(out.tooltip.formatter).not.toMatch(/href/i);
    });

    it('keeps a template variable in a URL whose scheme and host are fixed', () => {
        const formatter = '<img src="/icons/{b}.png"><a href="/detail/{b}">f</a><a href="https://example.com/q?id={c}">g</a>' +
            '<a href="../p/{b}">h</a>';
        const out = sanitizeOption({ tooltip: { formatter } });
        const box = document.createElement('div');
        box.innerHTML = out.tooltip.formatter;
        expect(Array.from(box.querySelectorAll('a')).map(a => a.getAttribute('href')))
            .toEqual(['/detail/{b}', 'https://example.com/q?id={c}', '../p/{b}']);
        expect(box.querySelector('img')!.getAttribute('src')).toBe('/icons/{b}.png');

        const unsafe = sanitizeOption({ tooltip: { formatter: '<a href="//{b}/x">a</a><a href="https://{b}/x">b</a><a href="{b}/x">c</a>' } });
        expect(unsafe.tooltip.formatter).not.toMatch(/href/i);
    });

    it('leaves dataset values alone: a column named color or link is data', () => {
        const option = {
            dataset: [
                { source: [{ product: 'A', color: 'Red; metallic', link: 'Line: 4', tooltip: '<b>x</b>' }], dimensions: ['product', 'color'] },
                { source: { color: ['<none>', 'a;b'], link: ['javascript:x'] } },
                { source: [['color', 'link'], ['a;b', 'pump:1']] },
            ],
            series: [{ type: 'bar' }],
        };
        expect(sanitizeOption(option)).toBe(option);
    });

    it('does not HTML-sanitise formatters when told the tooltip renders as rich text', () => {
        const option = {
            tooltip: { renderMode: 'richText', formatter: 'T < 5 & P > 2: {c}' },
            series: [{ type: 'bar', tooltip: 'x <y> z', data: [{ value: 1, tooltip: { formatter: 'a <b' } }] }],
        };
        expect(declaresRichTextTooltip(option)).toBe(true);
        expect(sanitizeOption(option, { richTextTooltip: true })).toBe(option);
        // Without that assurance it is treated as HTML.
        expect(sanitizeOption(option)).not.toBe(option);
    });

    it.each([
        [{ tooltip: { renderMode: 'html' } }],
        [{ tooltip: {} }],
        [{}],
        [{ tooltip: [{ renderMode: 'richText' }, {}] }],
        [{ baseOption: { tooltip: { renderMode: 'richText' } }, options: [] }],
        [{ tooltip: { renderMode: 'richText' }, media: [] }],
        [null],
    ])('does not take %j as a rich text tooltip', (option) => {
        expect(declaresRichTextTooltip(option)).toBe(false);
    });
});

describe('sanitizeOption — work done on large data', () => {
    /** An array row that counts how often its elements are read. */
    function countedRow(values: any[]) {
        const reads = { count: 0 };
        const row = new Proxy(values, {
            get(target, prop, receiver) {
                if (typeof prop === 'string' && /^\d+$/.test(prop) && prop !== '0') reads.count++;
                return Reflect.get(target, prop, receiver);
            },
        });
        return { row, reads };
    }

    it('does not walk rows that are tuples of values', () => {
        const rows = Array.from({ length: 1000 }, (_, i) => countedRow([i, i * 2, 'label']));
        const option = { series: [{ type: 'scatter', data: rows.map(r => r.row) }], dataset: { source: rows.map(r => r.row) } };
        expect(sanitizeOption(option)).toBe(option);
        expect(rows.reduce((sum, r) => sum + r.reads.count, 0)).toBe(0);
    });

    it('still walks rows that start with an object, such as mark line pairs', () => {
        const out: any = sanitizeOption({ series: [{ markLine: { data: [[{ tooltip: XSS }, { name: 'end', tooltip: { formatter: XSS } }]] } }] });
        expect(out.series[0].markLine.data[0][0].tooltip).not.toMatch(/onerror/);
        expect(out.series[0].markLine.data[0][1].tooltip.formatter).not.toMatch(/onerror/);
    });

    it('checks every data item object, however many there are', () => {
        const data = Array.from({ length: 5000 }, (_, i) => ({ name: 'n' + i, value: [i, i], itemStyle: { color: '#fff' } }));
        (data[4999].itemStyle as any).color = 'red"><img src=x onerror=1>';
        const out = sanitizeOption({ series: [{ type: 'scatter', data }] });
        expect(out.series[0].data[4999].itemStyle).toEqual({});
        expect(out.series[0].data[0]).toBe(data[0]);
    });
});
