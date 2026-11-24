import type { PropertyTree } from '@inductiveautomation/perspective-client';
import type { ChartBehavior } from '../chartDef';
import { asArray, asString, readProp, readString, titles, toLabels, toNumber } from './util';

export const RESOURCE_HEATMAP_ID = 'open.industrial.ResourceHeatmap';

export interface ResourceHeatmapProps {
    /** Row labels (y axis); validated in buildOption. */
    resources: unknown;
    /** Column labels (x axis); validated in buildOption. */
    timeSlots: unknown;
    /** utilization[resourceIndex][timeSlotIndex]; validated in buildOption. */
    utilization: unknown;
    title: string;
    /** Top of the colour scale; anything that is not a positive number means 100. */
    maxValue: unknown;
}

function readProps(tree: PropertyTree): ResourceHeatmapProps {
    return {
        resources: readProp(tree, 'resources', ['Line 1', 'Line 2', 'Line 3', 'Line 4']),
        timeSlots: readProp(tree, 'timeSlots', [
            '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
            '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
        ]),
        utilization: readProp(tree, 'utilization', []),
        title: readString(tree, 'title', ''),
        maxValue: readProp(tree, 'maxValue', 100),
    };
}

/**
 * Resource x time-slot heatmap of utilisation.
 *
 * Only values that were supplied are drawn: an empty or unusable
 * `utilization` gives an empty grid with a "No data" notice (never
 * placeholder values). Rows that are not arrays, cells that are not numbers
 * and cells outside the resource / time-slot axes are skipped.
 */
function buildOption(props: ResourceHeatmapProps): object {
    const resources = toLabels(props.resources);
    const timeSlots = toLabels(props.timeSlots);
    const parsedMax = toNumber(props.maxValue);
    const maxValue = parsedMax > 0 ? parsedMax : 100;

    const data: Array<[number, number, number]> = [];
    const rows = asArray(props.utilization);
    const rowCount = Math.min(rows.length, resources.length);
    for (let r = 0; r < rowCount; r++) {
        const row: unknown = rows[r];
        if (!Array.isArray(row)) continue;
        const cellCount = Math.min(row.length, timeSlots.length);
        for (let t = 0; t < cellCount; t++) {
            const value = toNumber(row[t]);
            if (!Number.isNaN(value)) {
                data.push([t, r, value]);
            }
        }
    }

    return {
        title: titles(asString(props.title, '') || 'Resource Utilization', data.length === 0),
        tooltip: { position: 'top' },
        grid: { top: 60, bottom: 60, left: 100, right: 100 },
        xAxis: { type: 'category', data: timeSlots, splitArea: { show: true } },
        yAxis: { type: 'category', data: resources, splitArea: { show: true } },
        visualMap: {
            min: 0, max: maxValue, calculable: true,
            orient: 'vertical', right: 10, top: 'center',
            inRange: { color: ['#91cc75', '#fac858', '#ee6666'] },
            // The handles are labelled with their value; end texts would repeat them.
            formatter: '{value}%',
        },
        series: [{
            type: 'heatmap',
            data,
            // String template (third data dimension), not a function: functions are stripped by the option sanitiser.
            label: { show: true, formatter: '{@[2]}%' },
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
        }],
    };
}

export const resourceHeatmapBehavior: ChartBehavior<ResourceHeatmapProps> = { readProps, buildOption };
