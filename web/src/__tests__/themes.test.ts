import { BUILT_IN_THEMES, registerBuiltInThemes } from '../themes';
import { industrialDark } from '../themes/industrialDark';
import { industrialLight } from '../themes/industrialLight';
import { BAR, echarts } from './support/harness';

function chartWithTheme(theme: string) {
    const node = document.createElement('div');
    const chart = echarts.init(node, theme, { renderer: 'svg', width: 400, height: 300 });
    chart.setOption({ ...BAR, title: { text: 'T' }, animation: false });
    return { chart, node };
}

describe('built-in themes', () => {
    beforeAll(() => { registerBuiltInThemes(); });

    it('exports two themes', () => {
        expect(Object.keys(BUILT_IN_THEMES)).toEqual(['IgnitionIndustrialDark', 'IgnitionIndustrialLight']);
    });

    it('has the structure the components rely on', () => {
        for (const theme of [industrialDark, industrialLight]) {
            expect(theme.color.length).toBeGreaterThanOrEqual(6);
            for (const key of ['textStyle', 'title', 'legend', 'tooltip', 'categoryAxis', 'valueAxis', 'gauge']) {
                expect(theme).toHaveProperty(key);
            }
        }
        expect(industrialDark.darkMode).toBe(true);
        expect(industrialLight.darkMode).toBe(false);
        expect(industrialDark.gauge.axisLine.lineStyle.color).toHaveLength(3);
    });

    it('registers idempotently', () => {
        const register = jest.spyOn(echarts, 'registerTheme');
        registerBuiltInThemes();
        expect(register).not.toHaveBeenCalled();
        register.mockRestore();
    });

    it.each([
        ['IgnitionIndustrialDark', industrialDark],
        ['IgnitionIndustrialLight', industrialLight],
    ] as const)('%s is applied by ECharts', (name, theme) => {
        const { chart, node } = chartWithTheme(name);
        const option = chart.getOption();

        expect(option.backgroundColor).toBe(theme.backgroundColor);
        expect(option.color).toEqual(theme.color);
        expect(option.title[0].textStyle.color).toBe(theme.title.textStyle.color);
        expect(option.xAxis[0].axisLine.lineStyle.color).toBe(theme.categoryAxis.axisLine.lineStyle.color);
        expect(option.yAxis[0].splitLine.lineStyle.color).toBe(theme.valueAxis.splitLine.lineStyle.color);

        // The palette and background reach the rendered SVG, not just the option.
        const markup = node.innerHTML.toLowerCase();
        expect(markup).toContain(theme.color[0].toLowerCase());
        chart.dispose();
    });

    it('differs from the ECharts default look', () => {
        const { chart } = chartWithTheme('');
        expect(chart.getOption().color).not.toEqual(industrialLight.color);
        chart.dispose();
    });
});
