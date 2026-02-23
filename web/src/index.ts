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
import { CandlestickChartComponent, CandlestickChartMeta } from './components/CandlestickChart';
import { BoxplotChartComponent, BoxplotChartMeta }       from './components/BoxplotChart';
import { HeatmapChartComponent, HeatmapChartMeta }        from './components/HeatmapChart';
import { ParallelChartComponent, ParallelChartMeta }     from './components/ParallelChart';
import { FunnelChartComponent, FunnelChartMeta }          from './components/FunnelChart';
import { ThemeRiverChartComponent, ThemeRiverChartMeta }  from './components/ThemeRiverChart';
import { CalendarChartComponent, CalendarChartMeta }      from './components/CalendarChart';
import { PictorialBarChartComponent, PictorialBarChartMeta } from './components/PictorialBarChart';
import { CustomChartComponent, CustomChartMeta }         from './components/CustomChart';
import { TreeChartComponent, TreeChartMeta }              from './components/TreeChart';
import { GraphicChartComponent, GraphicChartMeta }        from './components/GraphicChart';
import { DatasetChartComponent, DatasetChartMeta }        from './components/DatasetChart';
import { SankeyChartComponent, SankeyChartMeta }          from './components/SankeyChart';
import { GraphChartComponent, GraphChartMeta }            from './components/GraphChart';
import { SunburstChartComponent, SunburstChartMeta }      from './components/SunburstChart';
import { TreemapChartComponent, TreemapChartMeta }        from './components/TreemapChart';
import { MapChartComponent, MapChartMeta }                from './components/MapChart';
import { LinesChartComponent, LinesChartMeta }            from './components/LinesChart';

export {
    EChartComponent,
    LineChartComponent, BarChartComponent, PieChartComponent,
    ScatterChartComponent, GaugeChartComponent, StatChartComponent,
    HierarchyChartComponent, RelationChartComponent, RadarChartComponent,
    IndustrialTrendComponent, IndustrialOEEComponent, IndustrialParetoComponent,
    CandlestickChartComponent, BoxplotChartComponent, HeatmapChartComponent,
    ParallelChartComponent, FunnelChartComponent, ThemeRiverChartComponent,
    CalendarChartComponent, PictorialBarChartComponent, CustomChartComponent,
    TreeChartComponent, GraphicChartComponent, DatasetChartComponent,
    SankeyChartComponent, GraphChartComponent, SunburstChartComponent,
    TreemapChartComponent, MapChartComponent, LinesChartComponent,
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
    new CandlestickChartMeta(),
    new BoxplotChartMeta(),
    new HeatmapChartMeta(),
    new ParallelChartMeta(),
    new FunnelChartMeta(),
    new ThemeRiverChartMeta(),
    new CalendarChartMeta(),
    new PictorialBarChartMeta(),
    new CustomChartMeta(),
    new TreeChartMeta(),
    new GraphicChartMeta(),
    new DatasetChartMeta(),
    new SankeyChartMeta(),
    new GraphChartMeta(),
    new SunburstChartMeta(),
    new TreemapChartMeta(),
    new MapChartMeta(),
    new LinesChartMeta(),
];

components.forEach((c: ComponentMeta) => ComponentRegistry.register(c));
