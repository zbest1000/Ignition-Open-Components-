import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { durationSeries, summariseDurations } from './durations';
import { FALLBACK_COLOR, asString, colorLookup, readProp, readString, titles } from './util';

export const STATE_TIMELINE_ID = 'open.industrial.StateTimeline';

export interface StateTimelineProps {
    /** `{ lane, start, end, state, color? }` records; validated in buildOption. */
    events: unknown;
    /** `{ state: colour }` overrides; validated in buildOption. */
    stateColors: unknown;
    title: string;
}

const DEFAULT_STATE_COLORS: ReadonlyArray<readonly [string, string]> = [
    ['Running', '#91cc75'],
    ['Idle', '#fac858'],
    ['Alarm', '#ee6666'],
    ['Stopped', '#999999'],
    ['Maintenance', '#73c0de'],
];

function readProps(tree: PropertyTree): StateTimelineProps {
    return {
        events: readProp(tree, 'events', []),
        stateColors: readProp(tree, 'stateColors', {}),
        title: readString(tree, 'title', ''),
    };
}

/**
 * Stacked bars of the time (minutes) each lane spent in each state. See
 * {@link summariseDurations} for how malformed, reversed and overlapping
 * events are handled. Colour precedence: the first event `color` given for a
 * state, then `stateColors`, then the built-in state colours.
 */
function buildOption(props: StateTimelineProps): object {
    const summary = summariseDurations(props.events, 'lane', 'state', 'color');
    const colors = colorLookup(DEFAULT_STATE_COLORS, props.stateColors);

    return {
        title: titles(asString(props.title, '') || 'State Timeline', summary.rows.length === 0),
        tooltip: { trigger: 'axis' },
        legend: { data: summary.series.slice(), bottom: 0 },
        grid: { top: 60, bottom: 60, left: 120, right: 40 },
        xAxis: { type: 'value', name: 'Minutes' },
        yAxis: { type: 'category', data: summary.rows },
        series: durationSeries(summary, 'timeline', colors, FALLBACK_COLOR),
    };
}

export const stateTimelineBehavior: ChartBehavior<StateTimelineProps> = { readProps, buildOption };
