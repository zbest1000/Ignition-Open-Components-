import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { durationSeries, summariseDurations } from './durations';
import { FALLBACK_COLOR, Row, asString, colorLookup, readBoolean, readProp, readString, titles } from './util';

export const DOWNTIME_TRACKER_ID = 'open.industrial.DowntimeTracker';

export interface DowntimeTrackerProps {
    /** `{ equipment, start, end, category, reason? }` records; validated in buildOption. */
    events: unknown;
    /** `{ category: colour }` overrides; validated in buildOption. */
    categoryColors: unknown;
    title: string;
    /** Shows the total downtime as a line under the title. */
    showSummary: boolean;
}

const DEFAULT_CATEGORY_COLORS: ReadonlyArray<readonly [string, string]> = [
    ['Mechanical', '#ee6666'],
    ['Electrical', '#fac858'],
    ['Operator', '#73c0de'],
    ['Changeover', '#5470c6'],
    ['Material', '#91cc75'],
    ['Planned', '#999999'],
];

function readProps(tree: PropertyTree): DowntimeTrackerProps {
    return {
        events: readProp(tree, 'events', []),
        categoryColors: readProp(tree, 'categoryColors', {}),
        title: readString(tree, 'title', ''),
        showSummary: readBoolean(tree, 'showSummary', true),
    };
}

/**
 * Stacked bars of downtime minutes per equipment, split by category. See
 * {@link summariseDurations} for how malformed, reversed and overlapping
 * events are handled. The `reason` field is not charted.
 */
function buildOption(props: DowntimeTrackerProps): object {
    const summary = summariseDurations(props.events, 'equipment', 'category');
    const colors = colorLookup(DEFAULT_CATEGORY_COLORS, props.categoryColors);
    const empty = summary.rows.length === 0;

    const title: Row[] = titles(asString(props.title, '') || 'Downtime Tracker', empty);
    // Always set so that a merged option clears a previous summary.
    title[0].subtext = props.showSummary !== false && !empty
        ? `Total downtime: ${summary.totalMinutes} min`
        : '';

    return {
        title,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { data: summary.series.slice(), bottom: 0 },
        grid: { top: 60, bottom: 60, left: 140, right: 40 },
        xAxis: { type: 'value', name: 'Minutes' },
        yAxis: { type: 'category', data: summary.rows },
        dataZoom: [{ type: 'inside' }],
        series: durationSeries(summary, 'downtime', colors, FALLBACK_COLOR),
    };
}

export const downtimeTrackerBehavior: ChartBehavior<DowntimeTrackerProps> = { readProps, buildOption };
