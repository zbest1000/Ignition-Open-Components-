/**
 * Industrial Light theme — designed for well-lit environments and reports.
 *
 * Priorities:
 *  - Clean, print-friendly appearance
 *  - High contrast on white/light backgrounds
 *  - Subdued gridlines
 *  - Same semantic colour intentions as the dark variant
 */
export const industrialLight = {
    darkMode: false,
    color: [
        '#3b6cb5', '#5ea84e', '#d4a017', '#cc3333',
        '#4ea8c8', '#2d8a5e', '#d46830', '#7a48a0',
        '#c460a8', '#358fa0', '#8c9aa3', '#4a7a7a'
    ],
    backgroundColor: '#ffffff',
    textStyle: {
        color: '#333333',
        fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        fontSize: 12
    },
    title: {
        textStyle:    { color: '#222222', fontSize: 16, fontWeight: 'bold' },
        subtextStyle: { color: '#777777', fontSize: 12 }
    },
    legend: {
        textStyle:     { color: '#444444' },
        inactiveColor: '#cccccc'
    },
    tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor:     '#ccc',
        textStyle:       { color: '#333333', fontSize: 12 },
        borderWidth: 1
    },
    categoryAxis: {
        axisLine:  { lineStyle: { color: '#ccc' } },
        axisTick:  { lineStyle: { color: '#ccc' } },
        axisLabel: { color: '#666' },
        splitLine: { lineStyle: { color: '#eee', type: 'dashed' } }
    },
    valueAxis: {
        axisLine:  { lineStyle: { color: '#ccc' } },
        axisTick:  { lineStyle: { color: '#ccc' } },
        axisLabel: { color: '#666' },
        splitLine: { lineStyle: { color: '#eee', type: 'dashed' } }
    },
    timeAxis: {
        axisLine:  { lineStyle: { color: '#ccc' } },
        axisTick:  { lineStyle: { color: '#ccc' } },
        axisLabel: { color: '#666' },
        splitLine: { lineStyle: { color: '#eee', type: 'dashed' } }
    },
    logAxis: {
        axisLine:  { lineStyle: { color: '#ccc' } },
        axisTick:  { lineStyle: { color: '#ccc' } },
        axisLabel: { color: '#666' },
        splitLine: { lineStyle: { color: '#eee', type: 'dashed' } }
    },
    dataZoom: {
        backgroundColor:   'rgba(240,240,240,0.5)',
        dataBackgroundColor: 'rgba(180,180,180,0.3)',
        fillerColor:       'rgba(59,108,181,0.15)',
        handleColor:       '#3b6cb5',
        textStyle:         { color: '#666' }
    },
    visualMap: {
        color: ['#cc3333', '#d4a017', '#5ea84e'],
        textStyle: { color: '#555' }
    },
    toolbox: {
        iconStyle: {
            borderColor: '#999'
        },
        emphasis: {
            iconStyle: { borderColor: '#333' }
        }
    },
    line: {
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: 2 }
    },
    bar: {
        barMaxWidth: 40
    },
    gauge: {
        axisLine:  { lineStyle: { color: [[0.3, '#5ea84e'], [0.7, '#d4a017'], [1, '#cc3333']] } },
        axisTick:  { lineStyle: { color: '#999' } },
        axisLabel: { color: '#666' },
        detail:    { color: '#333' }
    }
};
