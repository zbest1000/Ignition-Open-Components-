/**
 * Industrial Dark theme — designed for control room environments.
 *
 * Priorities:
 *  - Readability under low-light / glare conditions
 *  - High contrast between data and background
 *  - Subtle gridlines that don't compete with series
 *  - Semantic colours for ok / warning / alarm states
 */
export const industrialDark = {
    darkMode: true,
    color: [
        '#5470c6', '#91cc75', '#fac858', '#ee6666',
        '#73c0de', '#3ba272', '#fc8452', '#9a60b4',
        '#ea7ccc', '#48b8d0', '#c4ccd3', '#61a0a8'
    ],
    backgroundColor: '#1a1a2e',
    textStyle: {
        color: '#d0d0d0',
        fontFamily: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
        fontSize: 12
    },
    title: {
        textStyle:    { color: '#e0e0e0', fontSize: 16, fontWeight: 'bold' },
        subtextStyle: { color: '#999999', fontSize: 12 }
    },
    legend: {
        textStyle:     { color: '#c0c0c0' },
        inactiveColor: '#555555'
    },
    tooltip: {
        backgroundColor: 'rgba(30, 30, 50, 0.92)',
        borderColor:     '#555',
        textStyle:       { color: '#e0e0e0', fontSize: 12 },
        borderWidth: 1
    },
    categoryAxis: {
        axisLine:  { lineStyle: { color: '#555' } },
        axisTick:  { lineStyle: { color: '#555' } },
        axisLabel: { color: '#aaa' },
        splitLine: { lineStyle: { color: '#333', type: 'dashed' } }
    },
    valueAxis: {
        axisLine:  { lineStyle: { color: '#555' } },
        axisTick:  { lineStyle: { color: '#555' } },
        axisLabel: { color: '#aaa' },
        splitLine: { lineStyle: { color: '#2a2a3e', type: 'dashed' } }
    },
    timeAxis: {
        axisLine:  { lineStyle: { color: '#555' } },
        axisTick:  { lineStyle: { color: '#555' } },
        axisLabel: { color: '#aaa' },
        splitLine: { lineStyle: { color: '#2a2a3e', type: 'dashed' } }
    },
    logAxis: {
        axisLine:  { lineStyle: { color: '#555' } },
        axisTick:  { lineStyle: { color: '#555' } },
        axisLabel: { color: '#aaa' },
        splitLine: { lineStyle: { color: '#2a2a3e', type: 'dashed' } }
    },
    dataZoom: {
        backgroundColor:   'rgba(30,30,50,0.4)',
        dataBackgroundColor: 'rgba(80,80,120,0.3)',
        fillerColor:       'rgba(84,112,198,0.2)',
        handleColor:       '#5470c6',
        textStyle:         { color: '#aaa' }
    },
    visualMap: {
        color: ['#ee6666', '#fac858', '#91cc75'],
        textStyle: { color: '#c0c0c0' }
    },
    toolbox: {
        iconStyle: {
            borderColor: '#999'
        },
        emphasis: {
            iconStyle: { borderColor: '#e0e0e0' }
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
        axisLine:  { lineStyle: { color: [[0.3, '#91cc75'], [0.7, '#fac858'], [1, '#ee6666']] } },
        axisTick:  { lineStyle: { color: '#999' } },
        axisLabel: { color: '#ccc' },
        detail:    { color: '#e0e0e0' }
    }
};
