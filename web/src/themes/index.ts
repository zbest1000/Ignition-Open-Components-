import * as echarts from 'echarts/core';
import { industrialDark } from './industrialDark';
import { industrialLight } from './industrialLight';

export const BUILT_IN_THEMES: Record<string, object> = {
    'IgnitionIndustrialDark':  industrialDark,
    'IgnitionIndustrialLight': industrialLight,
};

let registered = false;

/**
 * Register all built-in themes with the ECharts global registry.
 * Safe to call multiple times — registration is idempotent.
 */
export function registerBuiltInThemes(): void {
    if (registered) return;
    for (const [name, theme] of Object.entries(BUILT_IN_THEMES)) {
        echarts.registerTheme(name, theme);
    }
    registered = true;
}
