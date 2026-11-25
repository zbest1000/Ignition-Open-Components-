import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import {
    Row, asArray, asBoolean, asNumber, asString, isRecord, noDataTitle, readBoolean, readNumber, readProp, readString,
    toLabel, toNumber,
} from './util';

export const FLOW_DIAGRAM_ID = 'open.industrial.FlowDiagram';

export interface FlowDiagramProps {
    /** Rows of `{ source, target, value }`; validated in buildOption. */
    flows: unknown;
    /** Optional per-node overrides, rows of `{ name, color?, label? }`; validated in buildOption. */
    nodes: unknown;
    title: string;
    unit: string;
    decimals: number;
    orientation: string;
    nodeAlign: string;
    showValues: boolean;
    linkColor: string;
    emphasis: string;
    nodeWidth: number;
    nodeGap: number;
    maxLabelLength: number;
    /** Node colour palette; empty means the theme palette. Validated in buildOption. */
    colors: unknown;
}

export interface FlowLink {
    source: string;
    target: string;
    value: number;
}

export interface FlowGraph {
    /** Node names in order of first appearance in the kept links. */
    nodes: string[];
    /** One link per source/target pair (duplicate rows summed), without cycles. */
    links: FlowLink[];
    /** Sum of the links entering each node. */
    inflow: Map<string, number>;
    /** Sum of the links leaving each node. */
    outflow: Map<string, number>;
    /** Number of distinct links left out because they close a loop (self-loops included). */
    dropped: number;
}

const DEFAULT_FLOWS: ReadonlyArray<readonly [string, string, number]> = [
    ['Grid', 'Main bus', 820],
    ['Solar PV', 'Main bus', 310],
    ['Main bus', 'Production lines', 540],
    ['Main bus', 'HVAC', 210],
    ['Main bus', 'Compressed air', 180],
    ['Main bus', 'Lighting & office', 90],
    ['Main bus', 'Losses', 110],
    ['Production lines', 'Useful work', 430],
    ['Production lines', 'Losses', 110],
    ['HVAC', 'Useful work', 150],
    ['HVAC', 'Losses', 60],
    ['Compressed air', 'Useful work', 70],
    ['Compressed air', 'Losses', 110],
    ['Lighting & office', 'Useful work', 75],
    ['Lighting & office', 'Losses', 15],
];

/** Larger values are treated as bad data; the cap also keeps sums finite. */
const MAX_VALUE = 1e15;

function defaultFlows(): Row[] {
    return DEFAULT_FLOWS.map(([source, target, value]) => ({ source, target, value }));
}

function defaultNodes(): Row[] {
    return [
        { name: 'Grid', color: '#5b7fa6' },
        { name: 'Solar PV', color: '#eda100' },
        { name: 'Main bus', color: '#2a78d6' },
        { name: 'Useful work', color: '#1baf7a' },
        { name: 'Losses', color: '#9aa0a6' },
    ];
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
    return (allowed as readonly unknown[]).indexOf(value) !== -1 ? value as T : fallback;
}

/**
 * Aggregates flow rows into a cycle-free graph.
 *
 *  - Rows may be `{ source, target, value }` objects or `[source, target, value]` tuples.
 *  - Rows without a usable source or target, or whose value is not a positive
 *    finite number (up to 1e15), are skipped.
 *  - Rows with the same source and target are summed.
 *  - A Sankey diagram cannot draw a loop (ECharts throws on one), so loops are
 *    broken deterministically: a depth-first walk starts at the nodes nothing
 *    flows into (then at any node not yet reached), in order of first
 *    appearance, following links in order of first appearance; a link that
 *    leads back to a node on the current path is left out. Self-loops are left
 *    out too. `dropped` counts the links left out.
 */
export function computeFlows(rawFlows: unknown): FlowGraph {
    const order: string[] = [];
    const adjacency = new Map<string, Map<string, FlowLink>>();
    const hasInflow = new Set<string>();
    const selfLoops = new Set<string>();

    const touch = (name: string): Map<string, FlowLink> => {
        let out = adjacency.get(name);
        if (!out) {
            out = new Map<string, FlowLink>();
            adjacency.set(name, out);
            order.push(name);
        }
        return out;
    };

    for (const raw of asArray(rawFlows)) {
        let source: string | null;
        let target: string | null;
        let value: number;
        if (isRecord(raw)) {
            source = toLabel(raw.source);
            target = toLabel(raw.target);
            value = toNumber(raw.value);
        } else if (Array.isArray(raw) && raw.length >= 3) {
            source = toLabel(raw[0]);
            target = toLabel(raw[1]);
            value = toNumber(raw[2]);
        } else {
            continue;
        }
        if (source === null || target === null || !(value > 0 && value <= MAX_VALUE)) continue;
        if (source === target) {
            selfLoops.add(source);
            continue;
        }
        const out = touch(source);
        touch(target);
        const existing = out.get(target);
        if (existing) {
            existing.value += value;
        } else {
            out.set(target, { source, target, value });
            hasInflow.add(target);
        }
    }

    // Iterative depth-first search: 1 = on the current path, 2 = finished.
    const state = new Map<string, number>();
    const links: FlowLink[] = [];
    let dropped = selfLoops.size;
    const visit = (root: string): void => {
        if (state.has(root)) return;
        state.set(root, 1);
        const stack: Array<{ name: string; edges: FlowLink[]; next: number }> = [
            { name: root, edges: Array.from(adjacency.get(root)!.values()), next: 0 },
        ];
        while (stack.length > 0) {
            const frame = stack[stack.length - 1];
            if (frame.next >= frame.edges.length) {
                state.set(frame.name, 2);
                stack.pop();
                continue;
            }
            const link = frame.edges[frame.next++];
            const seen = state.get(link.target);
            if (seen === 1) {
                dropped++;
                continue;
            }
            links.push(link);
            if (seen === undefined) {
                state.set(link.target, 1);
                stack.push({ name: link.target, edges: Array.from(adjacency.get(link.target)!.values()), next: 0 });
            }
        }
    };
    for (const name of order) {
        if (!hasInflow.has(name)) visit(name);
    }
    for (const name of order) visit(name);

    // Keep the links in input order (the walk above visits them depth-first).
    const kept = new Set<FlowLink>(links);
    const ordered: FlowLink[] = [];
    const inflow = new Map<string, number>();
    const outflow = new Map<string, number>();
    const used = new Set<string>();
    for (const name of order) {
        adjacency.get(name)!.forEach(link => {
            if (!kept.has(link)) return;
            ordered.push(link);
            used.add(link.source);
            used.add(link.target);
            outflow.set(link.source, (outflow.get(link.source) ?? 0) + link.value);
            inflow.set(link.target, (inflow.get(link.target) ?? 0) + link.value);
        });
    }
    return { nodes: order.filter(name => used.has(name)), links: ordered, inflow, outflow, dropped };
}

/**
 * Column (layer) of every node, as the Sankey layout places them: the longest
 * path from a source, with end nodes moved to the last column for 'justify',
 * or counted back from the end nodes for 'right'. Returns the columns and the
 * index of the last one.
 */
export function computeColumns(graph: FlowGraph, nodeAlign: string): { columns: Map<string, number>; last: number } {
    const longest = (forward: boolean): Map<string, number> => {
        const next = new Map<string, string[]>();
        const pending = new Map<string, number>();
        graph.nodes.forEach(name => {
            next.set(name, []);
            pending.set(name, 0);
        });
        for (const link of graph.links) {
            const from = forward ? link.source : link.target;
            const to = forward ? link.target : link.source;
            next.get(from)!.push(to);
            pending.set(to, pending.get(to)! + 1);
        }
        const depth = new Map<string, number>();
        const queue = graph.nodes.filter(name => pending.get(name) === 0);
        queue.forEach(name => depth.set(name, 0));
        for (let i = 0; i < queue.length; i++) {
            const name = queue[i];
            for (const to of next.get(name)!) {
                depth.set(to, Math.max(depth.get(to) ?? 0, depth.get(name)! + 1));
                pending.set(to, pending.get(to)! - 1);
                if (pending.get(to) === 0) queue.push(to);
            }
        }
        return depth;
    };
    const depth = longest(true);
    let last = 0;
    depth.forEach(d => { if (d > last) last = d; });
    if (nodeAlign === 'left') return { columns: depth, last };
    const columns = new Map<string, number>();
    if (nodeAlign === 'right') {
        longest(false).forEach((height, name) => columns.set(name, last - height));
    } else {
        graph.nodes.forEach(name => columns.set(name, graph.outflow.has(name) ? depth.get(name) ?? 0 : last));
    }
    return { columns, last };
}

/** Fixed-point number with thousands separators; independent of the browser locale. */
export function formatValue(value: number, decimals: number, unit: string): string {
    const places = Math.min(6, Math.max(0, Math.round(Number.isFinite(decimals) ? decimals : 0)));
    const fixed = Math.abs(value).toFixed(places);
    const dot = fixed.indexOf('.');
    const whole = dot === -1 ? fixed : fixed.slice(0, dot);
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const text = (value < 0 && Number(fixed) !== 0 ? '-' : '') + grouped + (dot === -1 ? '' : fixed.slice(dot));
    return unit === '' ? text : `${text} ${unit}`;
}

/** Text for a tooltip formatter: HTML-escaped, and braces encoded so no `{a}`-style variable is substituted. */
function tooltipText(text: string): string {
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
        .replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
}

/** Text for a label formatter: a zero-width space after `{` stops `{b}`-style substitution. */
function labelText(text: string): string {
    return text.replace(/\{/g, '{​');
}

function truncate(text: string, maxLength: number): string {
    if (maxLength < 1 || text.length <= maxLength) return text;
    return text.slice(0, Math.max(1, maxLength - 1)).trimEnd() + '…';
}

function readProps(tree: PropertyTree): FlowDiagramProps {
    return {
        flows: readProp(tree, 'flows', defaultFlows()),
        nodes: readProp(tree, 'nodes', defaultNodes()),
        title: readString(tree, 'title', ''),
        unit: readString(tree, 'unit', 'MWh'),
        decimals: readNumber(tree, 'decimals', 0),
        orientation: readString(tree, 'orientation', 'horizontal'),
        nodeAlign: readString(tree, 'nodeAlign', 'justify'),
        showValues: readBoolean(tree, 'showValues', true),
        linkColor: readString(tree, 'linkColor', 'gradient'),
        emphasis: readString(tree, 'emphasis', 'adjacency'),
        nodeWidth: readNumber(tree, 'nodeWidth', 16),
        nodeGap: readNumber(tree, 'nodeGap', 12),
        maxLabelLength: readNumber(tree, 'maxLabelLength', 28),
        colors: readProp(tree, 'colors', []),
    };
}

/**
 * Sankey diagram of flows between nodes.
 *
 * Labels and tooltips are prepared here as fixed strings (one per node and
 * link) because the values need unit and decimals formatting and an option
 * cannot carry formatter functions.
 */
function buildOption(props: FlowDiagramProps): object {
    const graph = computeFlows(props.flows);
    const title = asString(props.title, '');
    const unit = asString(props.unit, '').trim();
    const decimals = asNumber(props.decimals, 0);
    const vertical = props.orientation === 'vertical';
    const nodeAlign = oneOf(props.nodeAlign, ['justify', 'left', 'right'] as const, 'justify');
    const linkColor = oneOf(props.linkColor, ['source', 'target', 'gradient'] as const, 'gradient');
    const focus = oneOf(props.emphasis, ['adjacency', 'trajectory', 'none'] as const, 'adjacency');
    const showValues = asBoolean(props.showValues, true);
    const nodeWidth = Math.min(100, Math.max(2, asNumber(props.nodeWidth, 16)));
    const nodeGap = Math.min(100, Math.max(0, asNumber(props.nodeGap, 12)));
    const maxLabelLength = Math.max(0, Math.floor(asNumber(props.maxLabelLength, 28)));

    const overrides = new Map<string, { color: string; label: string }>();
    for (const raw of asArray(props.nodes)) {
        if (!isRecord(raw)) continue;
        const name = toLabel(raw.name);
        if (name === null) continue;
        overrides.set(name, {
            color: typeof raw.color === 'string' ? raw.color : '',
            label: toLabel(raw.label) ?? '',
        });
    }
    const display = (name: string): string => overrides.get(name)?.label || name;

    const layout = computeColumns(graph, nodeAlign);
    const data: Row[] = graph.nodes.map(name => {
        const inflow = graph.inflow.get(name) ?? 0;
        const outflow = graph.outflow.get(name) ?? 0;
        const through = Math.max(inflow, outflow);
        const label = display(name);
        const short = labelText(truncate(label, maxLabelLength));
        // Labels point towards the middle of the diagram, so none is cut off at an edge.
        const inward = (layout.columns.get(name) ?? 0) * 2 >= layout.last;

        const lines = [`<b>${tooltipText(label)}</b>`];
        if (inflow > 0 && outflow > 0 && Math.abs(inflow - outflow) > 1e-9 * through) {
            lines.push(`In: ${tooltipText(formatValue(inflow, decimals, unit))}`);
            lines.push(`Out: ${tooltipText(formatValue(outflow, decimals, unit))}`);
        } else {
            lines.push(tooltipText(formatValue(through, decimals, unit)));
        }

        const node: Row = {
            name,
            label: {
                formatter: showValues ? `${short}  ${labelText(formatValue(through, decimals, unit))}` : short,
                position: vertical ? (inward ? 'top' : 'bottom') : (inward ? 'left' : 'right'),
            },
            tooltip: { formatter: lines.join('<br/>') },
        };
        const color = overrides.get(name)?.color;
        if (color) node.itemStyle = { color };
        return node;
    });

    const links: Row[] = graph.links.map(link => {
        const total = graph.outflow.get(link.source) ?? 0;
        // Share of the source's output; left out when this link is all of it.
        const share = total > link.value ? ` (${(link.value / total * 100).toFixed(1)}% of ${display(link.source)})` : '';
        return {
            source: link.source,
            target: link.target,
            value: link.value,
            tooltip: {
                formatter: tooltipText(
                    `${display(link.source)} → ${display(link.target)}: ${formatValue(link.value, decimals, unit)}${share}`),
            },
        };
    });

    const notice = graph.dropped === 0 ? ''
        : `${graph.dropped} circular flow${graph.dropped === 1 ? '' : 's'} not shown`;
    const top = (title !== '' ? 30 : 0) + (notice !== '' ? 22 : 0) + 12;

    const series: Row = {
        type: 'sankey',
        orient: vertical ? 'vertical' : 'horizontal',
        nodeAlign,
        nodeWidth,
        nodeGap,
        // Vertical labels are centred on their node, so narrow nodes at the sides need room.
        left: vertical ? 40 : 12, right: vertical ? 40 : 12, top, bottom: 12,
        draggable: false,
        data,
        links,
        label: { fontSize: 12 },
        labelLayout: { hideOverlap: true },
        itemStyle: { borderWidth: 0 },
        lineStyle: { color: linkColor, opacity: 0.35, curveness: 0.5 },
        emphasis: { focus, lineStyle: { opacity: 0.6 } },
    };

    const option: Row = {
        title: [
            { text: title, subtext: notice, left: 'center', top: title !== '' ? 6 : -6, itemGap: 4 },
            noDataTitle(graph.links.length === 0),
        ],
        tooltip: { trigger: 'item', confine: true },
        series: [series],
    };
    const colors = asArray(props.colors).filter((c): c is string => typeof c === 'string' && c !== '');
    if (colors.length > 0) option.color = colors;
    return option;
}

export const flowDiagramBehavior: ChartBehavior<FlowDiagramProps> = { readProps, buildOption };
