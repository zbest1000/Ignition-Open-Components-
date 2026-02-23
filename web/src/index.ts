import { ComponentMeta, ComponentRegistry } from '@inductiveautomation/perspective-client';
import { EChartComponent, EChartMeta } from './components/EChart';

export { EChartComponent };

import './css/styles.css';

const components: Array<ComponentMeta> = [
    new EChartMeta(),
];

components.forEach((c: ComponentMeta) => ComponentRegistry.register(c));
