import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { durationSeries, summariseDurations } from './durations';
import { FALLBACK_COLOR, asString, colorLookup, readProp, readString, titles } from './util';

export const BATCH_TIMELINE_ID = 'open.industrial.BatchTimeline';

export interface BatchTimelineProps {
    /** `{ batch, phase, start, end, status? }` records; validated in buildOption. */
    phases: unknown;
    /** `{ phase: colour }` overrides; validated in buildOption. */
    phaseColors: unknown;
    title: string;
}

const DEFAULT_PHASE_COLORS: ReadonlyArray<readonly [string, string]> = [
    ['Charge', '#5470c6'],
    ['Heat', '#ee6666'],
    ['React', '#fac858'],
    ['Cool', '#73c0de'],
    ['Transfer', '#91cc75'],
    ['CIP', '#999999'],
    ['Hold', '#9a60b4'],
];

function readProps(tree: PropertyTree): BatchTimelineProps {
    return {
        phases: readProp(tree, 'phases', []),
        phaseColors: readProp(tree, 'phaseColors', {}),
        title: readString(tree, 'title', ''),
    };
}

/**
 * Stacked bars of the minutes each batch spent in each phase. See
 * {@link summariseDurations} for how malformed, reversed and overlapping
 * records are handled. The `status` field is not charted.
 */
function buildOption(props: BatchTimelineProps): object {
    const summary = summariseDurations(props.phases, 'batch', 'phase');
    const colors = colorLookup(DEFAULT_PHASE_COLORS, props.phaseColors);

    return {
        title: titles(asString(props.title, '') || 'Batch Timeline', summary.rows.length === 0),
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: summary.series.slice(), bottom: 0 },
        grid: { top: 60, bottom: 60, left: 120, right: 40 },
        xAxis: { type: 'value', name: 'Minutes' },
        yAxis: { type: 'category', data: summary.rows, inverse: true },
        dataZoom: [{ type: 'inside' }],
        series: durationSeries(summary, 'batch', colors, FALLBACK_COLOR),
    };
}

export const batchTimelineBehavior: ChartBehavior<BatchTimelineProps> = { readProps, buildOption };
