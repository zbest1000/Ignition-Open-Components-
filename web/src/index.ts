import { ComponentMeta, ComponentRegistry } from '@inductiveautomation/perspective-client';
import { registerBuiltInThemes } from './themes';

// Universal / advanced
import { EChartMeta }              from './components/EChart';

// Basic chart types
import { LineChartMeta }           from './components/LineChart';
import { BarChartMeta }            from './components/BarChart';
import { PieChartMeta }            from './components/PieChart';
import { ScatterChartMeta }        from './components/ScatterChart';

// KPI / proportion
import { GaugeChartMeta }          from './components/GaugeChart';
import { FunnelChartMeta }         from './components/FunnelChart';

// Financial / statistical
import { CandlestickChartMeta }    from './components/CandlestickChart';
import { BoxplotChartMeta }        from './components/BoxplotChart';
import { HeatmapChartMeta }        from './components/HeatmapChart';

// Hierarchy
import { TreeChartMeta }           from './components/TreeChart';
import { TreemapChartMeta }        from './components/TreemapChart';
import { SunburstChartMeta }       from './components/SunburstChart';

// Relations / flow
import { GraphChartMeta }          from './components/GraphChart';
import { SankeyChartMeta }         from './components/SankeyChart';

// Specialty
import { RadarChartMeta }          from './components/RadarChart';
import { ParallelChartMeta }       from './components/ParallelChart';
import { ThemeRiverChartMeta }     from './components/ThemeRiverChart';
import { CalendarChartMeta }       from './components/CalendarChart';
import { PictorialBarChartMeta }   from './components/PictorialBarChart';
import { CustomChartMeta }         from './components/CustomChart';
import { GraphicChartMeta }        from './components/GraphicChart';
import { DatasetChartMeta }        from './components/DatasetChart';

// Geo / map
import { MapChartMeta }            from './components/MapChart';
import { LinesChartMeta }          from './components/LinesChart';

// Industrial
import { IndustrialTrendMeta }     from './components/IndustrialTrend';
import { IndustrialOEEMeta }       from './components/IndustrialOEE';
import { IndustrialParetoMeta }    from './components/IndustrialPareto';

export { TEMPLATES } from './templates';
export { BUILT_IN_THEMES } from './themes';

import './css/styles.css';

registerBuiltInThemes();

const components: Array<ComponentMeta> = [
    // Universal
    new EChartMeta(),
    // Basic
    new LineChartMeta(),
    new BarChartMeta(),
    new PieChartMeta(),
    new ScatterChartMeta(),
    // KPI
    new GaugeChartMeta(),
    new FunnelChartMeta(),
    // Financial / statistical
    new CandlestickChartMeta(),
    new BoxplotChartMeta(),
    new HeatmapChartMeta(),
    // Hierarchy
    new TreeChartMeta(),
    new TreemapChartMeta(),
    new SunburstChartMeta(),
    // Relations
    new GraphChartMeta(),
    new SankeyChartMeta(),
    // Specialty
    new RadarChartMeta(),
    new ParallelChartMeta(),
    new ThemeRiverChartMeta(),
    new CalendarChartMeta(),
    new PictorialBarChartMeta(),
    new CustomChartMeta(),
    new GraphicChartMeta(),
    new DatasetChartMeta(),
    // Geo
    new MapChartMeta(),
    new LinesChartMeta(),
    // Industrial
    new IndustrialTrendMeta(),
    new IndustrialOEEMeta(),
    new IndustrialParetoMeta(),
];

components.forEach((c: ComponentMeta) => ComponentRegistry.register(c));
