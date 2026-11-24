import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { Row, asArray, asString, noDataTitle, readBoolean, readProp, readString, toLabel, toNumber } from './util';

export const PARETO_ID = 'open.industrial.Pareto';

export interface ParetoProps {
    /** Category labels; validated in buildOption. */
    categories: unknown;
    /** Counts, parallel to `categories`; validated in buildOption. */
    counts: unknown;
    showCumulativeLine: boolean;
    show80PercentLine: boolean;
    barLabel: string;
    lineLabel: string;
}

export interface ParetoData {
    categories: string[];
    counts: number[];
    /** Cumulative share of the total in percent, rounded to 0.1. */
    cumulative: number[];
    total: number;
}

/**
 * Pairs categories with counts, sorts them by count (largest first, ties keep
 * their input order) and computes the cumulative percentage.
 *
 * A Pareto chart is only meaningful for non-negative frequencies sorted in
 * descending order, so negative or non-numeric counts are treated as 0. If
 * the two arrays differ in length the longer one wins: a missing count is 0
 * and a missing category is labelled by its position.
 */
export function computePareto(rawCategories: unknown, rawCounts: unknown): ParetoData {
    const cats = asArray(rawCategories);
    const cnts = asArray(rawCounts);
    const length = Math.max(cats.length, cnts.length);

    const items: Array<{ category: string; count: number }> = [];
    let total = 0;
    for (let i = 0; i < length; i++) {
        const parsed = toNumber(cnts[i]);
        const count = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
        total += count;
        items.push({ category: toLabel(cats[i]) ?? `#${i + 1}`, count });
    }
    // Array.prototype.sort is stable, so equal counts keep their input order.
    items.sort((a, b) => b.count - a.count);

    const cumulative: number[] = [];
    let running = 0;
    for (const item of items) {
        running += item.count;
        cumulative.push(total > 0 ? Math.round(running / total * 1000) / 10 : 0);
    }
    return {
        categories: items.map(item => item.category),
        counts: items.map(item => item.count),
        cumulative,
        total,
    };
}

function readProps(tree: PropertyTree): ParetoProps {
    return {
        categories: readProp(tree, 'categories', ['Mechanical', 'Electrical', 'Operator', 'Material', 'Other']),
        counts: readProp(tree, 'counts', [42, 28, 18, 12, 5]),
        showCumulativeLine: readBoolean(tree, 'showCumulativeLine', true),
        show80PercentLine: readBoolean(tree, 'show80PercentLine', true),
        barLabel: readString(tree, 'barLabel', 'Count'),
        lineLabel: readString(tree, 'lineLabel', 'Cumulative %'),
    };
}

function buildOption(props: ParetoProps): object {
    const pareto = computePareto(props.categories, props.counts);
    const barLabel = asString(props.barLabel, '') || 'Count';
    const lineLabel = asString(props.lineLabel, '') || 'Cumulative %';
    const showLine = props.showCumulativeLine !== false;

    const series: Row[] = [{ name: barLabel, type: 'bar', data: pareto.counts }];
    const yAxis: Row[] = [{ type: 'value', name: barLabel, min: 0 }];

    if (showLine) {
        const line: Row = { name: lineLabel, type: 'line', yAxisIndex: 1, data: pareto.cumulative };
        if (props.show80PercentLine !== false) {
            line.markLine = { data: [{ yAxis: 80, label: { formatter: '80%' } }] };
        }
        series.push(line);
        yAxis.push({ type: 'value', name: '%', min: 0, max: 100, axisLabel: { formatter: '{value}%' } });
    }

    return {
        title: noDataTitle(pareto.categories.length === 0),
        tooltip: { trigger: 'axis' },
        legend: { data: series.map(s => s.name), bottom: 0 },
        grid: { top: 40, bottom: 50 },
        xAxis: { type: 'category', data: pareto.categories },
        yAxis,
        series,
    };
}

export const paretoBehavior: ChartBehavior<ParetoProps> = { readProps, buildOption };
