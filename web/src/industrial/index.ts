import type { ChartBehaviors } from '../chartDef';
import { BATCH_TIMELINE_ID, batchTimelineBehavior } from './batchTimeline';
import { BULLET_CHART_ID, bulletChartBehavior } from './bulletChart';
import { CAPABILITY_HISTOGRAM_ID, capabilityHistogramBehavior } from './capabilityHistogram';
import { DIAL_GAUGE_ID, dialGaugeBehavior } from './dialGauge';
import { DOWNTIME_TRACKER_ID, downtimeTrackerBehavior } from './downtimeTracker';
import { EVENT_HEATMAP_ID, eventHeatmapBehavior } from './eventHeatmap';
import { FLOW_DIAGRAM_ID, flowDiagramBehavior } from './flowDiagram';
import { GANTT_ID, ganttBehavior } from './gantt';
import { KPI_TILE_ID, kpiTileBehavior } from './kpiTile';
import { METRIC_RINGS_ID, metricRingsBehavior } from './metricRings';
import { OEE_ID, oeeBehavior } from './oee';
import { PARETO_ID, paretoBehavior } from './pareto';
import { RADAR_COMPARISON_ID, radarComparisonBehavior } from './radarComparison';
import { RESOURCE_HEATMAP_ID, resourceHeatmapBehavior } from './resourceHeatmap';
import { SCHEDULE_CALENDAR_ID, scheduleCalendarBehavior } from './scheduleCalendar';
import { SHIFT_CALENDAR_ID, shiftCalendarBehavior } from './shiftCalendar';
import { SPC_ID, spcBehavior } from './spc';
import { STATE_TIMELINE_ID, stateTimelineBehavior } from './stateTimeline';
import { TREND_ID, trendBehavior } from './trend';
import { WATERFALL_ID, waterfallBehavior } from './waterfall';

/**
 * Behaviours of the industrial components, keyed by Perspective component id.
 * Each derives its ECharts option from domain props with a pure `buildOption`.
 */
export const INDUSTRIAL_BEHAVIORS: ChartBehaviors = {
    [TREND_ID]: trendBehavior,
    [OEE_ID]: oeeBehavior,
    [PARETO_ID]: paretoBehavior,
    [SPC_ID]: spcBehavior,
    [METRIC_RINGS_ID]: metricRingsBehavior,
    [BULLET_CHART_ID]: bulletChartBehavior,
    [KPI_TILE_ID]: kpiTileBehavior,
    [DIAL_GAUGE_ID]: dialGaugeBehavior,
    [WATERFALL_ID]: waterfallBehavior,
    [CAPABILITY_HISTOGRAM_ID]: capabilityHistogramBehavior,
    [FLOW_DIAGRAM_ID]: flowDiagramBehavior,
    [EVENT_HEATMAP_ID]: eventHeatmapBehavior,
    [RADAR_COMPARISON_ID]: radarComparisonBehavior,
    [STATE_TIMELINE_ID]: stateTimelineBehavior,
    [GANTT_ID]: ganttBehavior,
    [SCHEDULE_CALENDAR_ID]: scheduleCalendarBehavior,
    [SHIFT_CALENDAR_ID]: shiftCalendarBehavior,
    [DOWNTIME_TRACKER_ID]: downtimeTrackerBehavior,
    [BATCH_TIMELINE_ID]: batchTimelineBehavior,
    [RESOURCE_HEATMAP_ID]: resourceHeatmapBehavior,
};
