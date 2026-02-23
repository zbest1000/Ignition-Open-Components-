import { BUILT_IN_THEMES, registerBuiltInThemes } from '../themes';
import { industrialDark } from '../themes/industrialDark';
import { industrialLight } from '../themes/industrialLight';

jest.mock('echarts/core', () => ({
    registerTheme: jest.fn(),
    use: jest.fn(),
}));

const echarts = require('echarts/core');

describe('Built-in themes', () => {
    it('exports two themes', () => {
        expect(Object.keys(BUILT_IN_THEMES)).toEqual([
            'IgnitionIndustrialDark',
            'IgnitionIndustrialLight'
        ]);
    });

    it('IgnitionIndustrialDark has required structure', () => {
        expect(industrialDark.darkMode).toBe(true);
        expect(industrialDark.backgroundColor).toBe('#1a1a2e');
        expect(Array.isArray(industrialDark.color)).toBe(true);
        expect(industrialDark.color.length).toBeGreaterThanOrEqual(6);
        expect(industrialDark.textStyle).toBeDefined();
        expect(industrialDark.title).toBeDefined();
        expect(industrialDark.legend).toBeDefined();
        expect(industrialDark.tooltip).toBeDefined();
        expect(industrialDark.categoryAxis).toBeDefined();
        expect(industrialDark.valueAxis).toBeDefined();
        expect(industrialDark.gauge).toBeDefined();
    });

    it('IgnitionIndustrialLight has required structure', () => {
        expect(industrialLight.darkMode).toBe(false);
        expect(industrialLight.backgroundColor).toBe('#ffffff');
        expect(Array.isArray(industrialLight.color)).toBe(true);
        expect(industrialLight.color.length).toBeGreaterThanOrEqual(6);
        expect(industrialLight.textStyle).toBeDefined();
    });

    it('registerBuiltInThemes calls echarts.registerTheme for each theme', () => {
        (echarts.registerTheme as jest.Mock).mockClear();
        registerBuiltInThemes();
        expect(echarts.registerTheme).toHaveBeenCalledWith('IgnitionIndustrialDark', industrialDark);
        expect(echarts.registerTheme).toHaveBeenCalledWith('IgnitionIndustrialLight', industrialLight);
    });

    it('dark theme gauge has alarm/warning/ok ranges', () => {
        const gaugeColors = industrialDark.gauge.axisLine.lineStyle.color;
        expect(Array.isArray(gaugeColors)).toBe(true);
        expect(gaugeColors.length).toBe(3);
    });
});
