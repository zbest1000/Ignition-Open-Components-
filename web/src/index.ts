import { ComponentMeta, ComponentRegistry } from '@inductiveautomation/perspective-client';
import { registerBuiltInThemes } from './themes';

import { EChartComponent, EChartMeta }                from './components/EChart';
import { LineChartComponent, LineChartMeta }           from './components/LineChart';
import { BarChartComponent, BarChartMeta }             from './components/BarChart';
import { PieChartComponent, PieChartMeta }             from './components/PieChart';
import { ScatterChartComponent, ScatterChartMeta }     from './components/ScatterChart';
import { GaugeChartComponent, GaugeChartMeta }         from './components/GaugeChart';
import { StatChartComponent, StatChartMeta }           from './components/StatChart';
import { HierarchyChartComponent, HierarchyChartMeta } from './components/HierarchyChart';
import { RelationChartComponent, RelationChartMeta }   from './components/RelationChart';
import { RadarChartComponent, RadarChartMeta }         from './components/RadarChart';
import { IndustrialTrendComponent, IndustrialTrendMeta } from './components/IndustrialTrend';
import { IndustrialOEEComponent, IndustrialOEEMeta }     from './components/IndustrialOEE';
import { IndustrialParetoComponent, IndustrialParetoMeta } from './components/IndustrialPareto';

export {
    EChartComponent,
    LineChartComponent, BarChartComponent, PieChartComponent,
    ScatterChartComponent, GaugeChartComponent, StatChartComponent,
    HierarchyChartComponent, RelationChartComponent, RadarChartComponent,
    IndustrialTrendComponent, IndustrialOEEComponent, IndustrialParetoComponent,
};
export { TEMPLATES } from './templates';
export { BUILT_IN_THEMES } from './themes';

import './css/styles.css';

registerBuiltInThemes();

const components: Array<ComponentMeta> = [
    new EChartMeta(),
    new LineChartMeta(),
    new BarChartMeta(),
    new PieChartMeta(),
    new ScatterChartMeta(),
    new GaugeChartMeta(),
    new StatChartMeta(),
    new HierarchyChartMeta(),
    new RelationChartMeta(),
    new RadarChartMeta(),
    new IndustrialTrendMeta(),
    new IndustrialOEEMeta(),
    new IndustrialParetoMeta(),
];

components.forEach((c: ComponentMeta) => ComponentRegistry.register(c));
