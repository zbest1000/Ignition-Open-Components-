import * as fs from 'fs';
import * as path from 'path';
import { computeColumns, computeFlows, flowDiagramBehavior, formatValue } from '../../industrial/flowDiagram';
import { Opt, expectPlainOption, fakeTree } from './helpers';

const build = (props: Record<string, unknown>): Opt =>
    flowDiagramBehavior.buildOption(flowDiagramBehavior.readProps(fakeTree(props)));
const f = (source: unknown, target: unknown, value: unknown) => ({ source, target, value });
const sankey = (option: Opt) => option.series[0];
const node = (option: Opt, name: string) => sankey(option).data.find((n: Opt) => n.name === name);

describe('industrial Flow Diagram', () => {
    it('readProps defaults match the prop schema', () => {
        const schema = JSON.parse(fs.readFileSync(path.resolve(
            __dirname, '../../../../common/src/main/resources/props/industrial-flow-diagram.props.json'), 'utf8'));
        const defaults = flowDiagramBehavior.readProps(fakeTree({})) as unknown as Record<string, unknown>;
        for (const key of Object.keys(defaults)) {
            expect({ [key]: schema.properties[key].default }).toEqual({ [key]: defaults[key] });
        }
    });

    it('draws the default site energy balance, which is balanced at every intermediate node', () => {
        const option = build({});
        expectPlainOption(option);
        const s = sankey(option);
        expect(s.type).toBe('sankey');
        expect(s.data.map((n: Opt) => n.name)).toEqual([
            'Grid', 'Main bus', 'Solar PV', 'Production lines', 'HVAC', 'Compressed air', 'Lighting & office',
            'Losses', 'Useful work',
        ]);
        expect(s.links).toHaveLength(15);
        const graph = computeFlows(flowDiagramBehavior.readProps(fakeTree({})).flows);
        // 820 + 310 in = 1130 = 540 + 210 + 180 + 90 + 110 out
        expect(graph.inflow.get('Main bus')).toBe(1130);
        expect(graph.outflow.get('Main bus')).toBe(1130);
        for (const name of ['Production lines', 'HVAC', 'Compressed air', 'Lighting & office']) {
            expect(graph.inflow.get(name)).toBe(graph.outflow.get(name));
        }
        // 430 + 150 + 70 + 75 useful, 110 + 110 + 60 + 110 + 15 lost: together the 1130 that came in
        expect(graph.inflow.get('Useful work')).toBe(725);
        expect(graph.inflow.get('Losses')).toBe(405);
        expect(graph.dropped).toBe(0);
        expect(node(option, 'Main bus').label.formatter).toBe('Main bus  1,130 MWh');
        expect(node(option, 'Solar PV').itemStyle).toEqual({ color: '#eda100' });
        expect(node(option, 'HVAC').itemStyle).toBeUndefined();
        expect(option.title[0].subtext).toBe('');
        expect(option.title[1].text).toBe('');
        expect(option.color).toBeUndefined();
    });

    it('sums duplicate rows and skips zero, negative and unusable rows', () => {
        const graph = computeFlows([
            f('A', 'B', 5), f('A', 'B', '2.5'), f('A', 'B', 0), f('A', 'B', -4), f('A', 'B', 'x'), f('A', 'B', NaN),
            f('A', 'B', Infinity), f('', 'B', 1), f('A', null, 1), f(undefined, 'B', 1), f({}, 'B', 1),
            ['B', 'C', 3], ['B', 'C'], null, 7, 'row', f(1, 2, 4),
        ]);
        expect(graph.links).toEqual([f('A', 'B', 7.5), f('B', 'C', 3), f('1', '2', 4)]);
        expect(graph.nodes).toEqual(['A', 'B', 'C', '1', '2']);
        expect(graph.dropped).toBe(0);
        expect(graph.outflow.get('A')).toBe(7.5);
        expect(graph.inflow.get('C')).toBe(3);
    });

    it('drops self-loops and reports them', () => {
        const option = build({ flows: [f('A', 'B', 5), f('B', 'B', 2), f('B', 'B', 1), f('C', 'C', 1)], nodes: [] });
        expect(sankey(option).links.map((l: Opt) => [l.source, l.target, l.value])).toEqual([['A', 'B', 5]]);
        // B and C each loop onto themselves: two distinct links; C has no other flow and is not drawn
        expect(sankey(option).data.map((n: Opt) => n.name)).toEqual(['A', 'B']);
        expect(option.title[0].subtext).toBe('2 circular flows not shown');
    });

    it('breaks cycles by dropping the link that returns to the path, deterministically', () => {
        // A -> B -> C -> A with a true source S feeding A: the walk starts at S, so C -> A is the back edge.
        const rows = [f('B', 'C', 4), f('C', 'A', 1), f('A', 'B', 5), f('S', 'A', 6), f('C', 'D', 3)];
        const graph = computeFlows(rows);
        expect(graph.dropped).toBe(1);
        expect(graph.links).toEqual([f('B', 'C', 4), f('C', 'D', 3), f('A', 'B', 5), f('S', 'A', 6)]);
        expect(computeFlows(rows)).toEqual(graph);
        expect(build({ flows: rows }).title[0].subtext).toBe('1 circular flow not shown');

        // No source at all: the walk starts at the first node named, so the link back to it goes.
        const ring = computeFlows([f('A', 'B', 1), f('B', 'C', 1), f('C', 'A', 1)]);
        expect(ring.links).toEqual([f('A', 'B', 1), f('B', 'C', 1)]);
        expect(ring.dropped).toBe(1);

        // Two-node cycle and a cross link that is not a cycle (A -> C alongside A -> B -> C).
        expect(computeFlows([f('A', 'B', 1), f('B', 'A', 1)]).links).toEqual([f('A', 'B', 1)]);
        const diamond = computeFlows([f('A', 'B', 1), f('B', 'C', 1), f('A', 'C', 1)]);
        expect(diamond.dropped).toBe(0);
        expect(diamond.links).toHaveLength(3);
    });

    it('leaves no cycle in a dense random-looking graph', () => {
        const rows = [];
        for (let i = 0; i < 400; i++) rows.push(f(`N${(i * 7) % 23}`, `N${(i * 13 + 5) % 23}`, 1 + (i % 9)));
        const graph = computeFlows(rows);
        expect(graph.dropped).toBeGreaterThan(0);
        // Kahn's algorithm consumes every node of an acyclic graph.
        const { columns } = computeColumns(graph, 'left');
        expect(columns.size).toBe(graph.nodes.length);
        for (const link of graph.links) {
            expect(columns.get(link.target)!).toBeGreaterThan(columns.get(link.source)!);
        }
    });

    it('survives a very long chain without recursion', () => {
        const rows = [];
        for (let i = 0; i < 20000; i++) rows.push(f(`n${i}`, `n${i + 1}`, 1));
        rows.push(f('n20000', 'n0', 1));
        const graph = computeFlows(rows);
        expect(graph.links).toHaveLength(20000);
        expect(graph.dropped).toBe(1);
    });

    it('handles one flow and 200 flows', () => {
        const one = build({ flows: [f('A', 'B', 5)], nodes: [], unit: '' });
        expect(sankey(one).data.map((n: Opt) => n.label.formatter)).toEqual(['A  5', 'B  5']);
        expect(sankey(one).data.map((n: Opt) => n.label.position)).toEqual(['right', 'left']);

        const rows = [];
        for (let i = 0; i < 200; i++) rows.push(f(`S${i % 8}`, `T${i}`, i + 1));
        const many = build({ flows: rows });
        expectPlainOption(many);
        expect(sankey(many).links).toHaveLength(200);
        expect(sankey(many).data).toHaveLength(208);
    });

    it('places columns as the layout does and points labels inwards', () => {
        const graph = computeFlows([f('A', 'B', 1), f('B', 'C', 1), f('C', 'D', 1), f('A', 'E', 1)]);
        const cols = (align: string) => graph.nodes.map(n => computeColumns(graph, align).columns.get(n));
        // nodes: A B C D E
        expect(cols('left')).toEqual([0, 1, 2, 3, 1]);
        expect(cols('justify')).toEqual([0, 1, 2, 3, 3]);
        expect(cols('right')).toEqual([0, 1, 2, 3, 3]);
        const late = computeFlows([f('A', 'B', 1), f('B', 'C', 1), f('X', 'C', 1)]);
        expect(late.nodes.map(n => computeColumns(late, 'right').columns.get(n))).toEqual([0, 1, 2, 1]);
        expect(late.nodes.map(n => computeColumns(late, 'left').columns.get(n))).toEqual([0, 1, 2, 0]);

        const horizontal = build({});
        expect(node(horizontal, 'Grid').label.position).toBe('right');
        expect(node(horizontal, 'Main bus').label.position).toBe('right');
        expect(node(horizontal, 'HVAC').label.position).toBe('left');
        expect(node(horizontal, 'Losses').label.position).toBe('left');
        const vertical = build({ orientation: 'vertical' });
        expect(sankey(vertical).orient).toBe('vertical');
        expect(node(vertical, 'Grid').label.position).toBe('bottom');
        expect(node(vertical, 'Losses').label.position).toBe('top');
    });

    it('formats values with unit, decimals and thousands separators', () => {
        expect(formatValue(1234567.891, 2, 'kg')).toBe('1,234,567.89 kg');
        expect(formatValue(999.5, 0, '')).toBe('1,000');
        expect(formatValue(0.1 + 0.2, 1, 't')).toBe('0.3 t');
        expect(formatValue(-0.001, 1, '')).toBe('0.0');
        expect(formatValue(-1500, 0, '')).toBe('-1,500');
        expect(formatValue(5, NaN, 'x')).toBe('5 x');
        expect(formatValue(5, 99, '')).toBe('5.000000');

        const option = build({ flows: [f('A', 'B', 0.1), f('A', 'B', 0.2), f('A', 'C', 1200)], nodes: [], unit: 'kWh', decimals: 1 });
        expect(node(option, 'A').label.formatter).toBe('A  1,200.3 kWh');
        expect(node(option, 'A').tooltip.formatter).toBe('<b>A</b><br/>1,200.3 kWh');
        expect(sankey(option).links[0].tooltip.formatter).toBe('A → B: 0.3 kWh (0.0% of A)');
        expect(sankey(option).links[1].tooltip.formatter).toBe('A → C: 1,200.0 kWh (100.0% of A)');
        const single = build({ flows: [f('A', 'B', 4)], nodes: [], unit: '' });
        expect(sankey(single).links[0].tooltip.formatter).toBe('A → B: 4');
    });

    it('shows inflow and outflow separately where a node does not balance', () => {
        const option = build({ flows: [f('A', 'B', 10), f('B', 'C', 7)], nodes: [], unit: 't' });
        expect(node(option, 'B').tooltip.formatter).toBe('<b>B</b><br/>In: 10 t<br/>Out: 7 t');
        expect(node(option, 'B').label.formatter).toBe('B  10 t');
    });

    it('applies node overrides and ignores unusable ones', () => {
        const option = build({
            flows: [f('A', 'B', 1)],
            nodes: [{ name: 'A', color: '#ff0000', label: 'Intake' }, { name: 'B', color: 5, label: '' }, { name: 'Z', color: '#000' },
                null, 'A', { color: '#111' }],
        });
        expect(node(option, 'A').itemStyle).toEqual({ color: '#ff0000' });
        expect(node(option, 'A').label.formatter).toBe('Intake  1 MWh');
        expect(node(option, 'A').tooltip.formatter).toBe('<b>Intake</b><br/>1 MWh');
        expect(node(option, 'B').itemStyle).toBeUndefined();
        expect(node(option, 'B').label.formatter).toBe('B  1 MWh');
        expect(sankey(option).links[0].tooltip.formatter).toBe('Intake → B: 1 MWh');
        expect(sankey(option).data).toHaveLength(2);
    });

    it('shortens long names in labels only, and neutralises markup and template variables', () => {
        const long = 'Secondary reheating furnace number four, north hall';
        const option = build({ flows: [f(long, '<b>{b}</b> & "x"', 2)], nodes: [], maxLabelLength: 20, showValues: false });
        expect(sankey(option).data[0].name).toBe(long);
        expect(sankey(option).data[0].label.formatter).toBe('Secondary reheating…');
        expect(sankey(option).data[0].tooltip.formatter).toContain(long);
        // '{' is followed by a zero-width space in labels, and encoded in the (HTML) tooltips
        expect(sankey(option).data[1].label.formatter).toBe('<b>{​b}</b> & "x"');
        expect(sankey(option).data[1].tooltip.formatter)
            .toBe('<b>&lt;b&gt;&#123;b&#125;&lt;/b&gt; &amp; &quot;x&quot;</b><br/>2 MWh');
        expect(sankey(option).links[0].tooltip.formatter).not.toMatch(/[<>{}]/);
        expect(sankey(build({ flows: [f(long, 'B', 2)], maxLabelLength: 0, showValues: false })).data[0].label.formatter).toBe(long);
    });

    it('passes the layout and style props through, falling back on unknown values', () => {
        const option = build({
            title: 'Energy', nodeAlign: 'left', linkColor: 'source', emphasis: 'trajectory', nodeWidth: 30, nodeGap: 4,
            colors: ['#111111', '', 5, '#222222'],
        });
        const s = sankey(option);
        expect(option.title[0].text).toBe('Energy');
        expect(s.nodeAlign).toBe('left');
        expect(s.lineStyle.color).toBe('source');
        expect(s.emphasis.focus).toBe('trajectory');
        expect(s.nodeWidth).toBe(30);
        expect(s.nodeGap).toBe(4);
        expect(option.color).toEqual(['#111111', '#222222']);
        expect(s.top).toBeGreaterThan(sankey(build({})).top);

        const bad = sankey(build({ orientation: 'diagonal', nodeAlign: 'x', linkColor: '#fff', emphasis: 'all', nodeWidth: -5, nodeGap: 1e9 }));
        expect(bad.orient).toBe('horizontal');
        expect(bad.nodeAlign).toBe('justify');
        expect(bad.lineStyle.color).toBe('gradient');
        expect(bad.emphasis.focus).toBe('adjacency');
        expect(bad.nodeWidth).toBe(2);
        expect(bad.nodeGap).toBe(100);
    });

    it('shows the "No data" notice when nothing can be drawn', () => {
        for (const flows of [[], 'x', [f('A', 'A', 1)], [f('A', 'B', 0)], [{}], {}]) {
            const option = build({ flows });
            expectPlainOption(option);
            expect(option.title[1].text).toBe('No data');
            expect(sankey(option).data).toEqual([]);
            expect(sankey(option).links).toEqual([]);
        }
        expect(build({ flows: [f('A', 'A', 1)] }).title[0].subtext).toBe('1 circular flow not shown');
    });

    it('skips absurdly large values so totals stay finite', () => {
        const graph = computeFlows([f('A', 'B', 1e308), f('A', 'B', 1e308), f('A', 'B', 1e15), f('A', 'C', 2)]);
        expect(graph.links).toEqual([f('A', 'B', 1e15), f('A', 'C', 2)]);
        expectPlainOption(build({ flows: [f('A', 'B', 1e308), f('B', 'C', 1e308)] }));
    });

    it('does not mutate its input', () => {
        const flows = [f('A', 'B', 1), f('A', 'B', 2), f('B', 'A', 1)];
        const copy = JSON.parse(JSON.stringify(flows));
        build({ flows });
        expect(flows).toEqual(copy);
    });
});
