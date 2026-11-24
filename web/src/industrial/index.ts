import type { ChartBehaviors } from '../chartDef';
import { BATCH_TIMELINE_ID, batchTimelineBehavior } from './batchTimeline';
import { DOWNTIME_TRACKER_ID, downtimeTrackerBehavior } from './downtimeTracker';
import { GANTT_ID, ganttBehavior } from './gantt';
import { OEE_ID, oeeBehavior } from './oee';
import { PARETO_ID, paretoBehavior } from './pareto';
import { RESOURCE_HEATMAP_ID, resourceHeatmapBehavior } from './resourceHeatmap';
import { SCHEDULE_CALENDAR_ID, scheduleCalendarBehavior } from './scheduleCalendar';
import { SHIFT_CALENDAR_ID, shiftCalendarBehavior } from './shiftCalendar';
import { SPC_ID, spcBehavior } from './spc';
import { STATE_TIMELINE_ID, stateTimelineBehavior } from './stateTimeline';
import { TREND_ID, trendBehavior } from './trend';

/**
 * Behaviours of the industrial components, keyed by Perspective component id.
 * Each derives its ECharts option from domain props with a pure `buildOption`.
 */
export const INDUSTRIAL_BEHAVIORS: ChartBehaviors = {
    [TREND_ID]: trendBehavior,
    [OEE_ID]: oeeBehavior,
    [PARETO_ID]: paretoBehavior,
    [SPC_ID]: spcBehavior,
    [STATE_TIMELINE_ID]: stateTimelineBehavior,
    [GANTT_ID]: ganttBehavior,
    [SCHEDULE_CALENDAR_ID]: scheduleCalendarBehavior,
    [SHIFT_CALENDAR_ID]: shiftCalendarBehavior,
    [DOWNTIME_TRACKER_ID]: downtimeTrackerBehavior,
    [BATCH_TIMELINE_ID]: batchTimelineBehavior,
    [RESOURCE_HEATMAP_ID]: resourceHeatmapBehavior,
};
