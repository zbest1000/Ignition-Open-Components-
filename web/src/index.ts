import { ComponentMeta, ComponentRegistry } from '@inductiveautomation/perspective-client';
import { EChartComponent, EChartMeta } from './components/EChart';
import { registerBuiltInThemes } from './themes';

export { EChartComponent };
export { TEMPLATES } from './templates';
export { BUILT_IN_THEMES } from './themes';

import './css/styles.css';

registerBuiltInThemes();

const components: Array<ComponentMeta> = [
    new EChartMeta(),
];

components.forEach((c: ComponentMeta) => ComponentRegistry.register(c));
